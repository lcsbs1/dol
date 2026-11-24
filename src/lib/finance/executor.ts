import type { DolIntent } from "@/lib/ai/schema";
import type { FinanceRepository } from "@/lib/db/repository";
import { isExpenseCategory } from "./categories";
import {
  addMonths,
  buildOccurredOnForMonth,
  getCurrentBillingMonth,
  getTodayISO,
  splitInstallments,
} from "./money";
import { computeFutureCommitments, computeMonthSummary, isRecurringRuleActiveForMonth } from "./summary";
import type {
  CategorySlug,
  DolCardPayloadMap,
  DolCardType,
  EffectiveMonthItem,
  ExpenseCategorySlug,
  FutureMonthCommitment,
  InstallmentPlanRecord,
  MonthSummary,
  MonthlyBudgetRecord,
  ProfileRecord,
  RecurringRuleRecord,
} from "./types";

export interface FullMonthPayload {
  summary: MonthSummary;
  futureCommitments: FutureMonthCommitment[];
  recurringRules: RecurringRuleRecord[];
  installmentPlans: InstallmentPlanRecord[];
  budgets: MonthlyBudgetRecord[];
  profile: ProfileRecord | null;
}

export async function loadFullMonthState(
  repo: FinanceRepository,
  userId: string,
  billingMonth: string
): Promise<FullMonthPayload> {
  const futureMonths = Array.from({ length: 6 }, (_, i) => addMonths(billingMonth, i));
  const [monthTransactions, futureTransactions, recurringRules, installmentPlans, budgets, profile] =
    await Promise.all([
      repo.listTransactionsForMonth(userId, billingMonth),
      repo.listTransactionsInMonths(userId, futureMonths),
      repo.listRecurringRules(userId),
      repo.listInstallmentPlans(userId),
      repo.listMonthlyBudgets(userId, billingMonth),
      repo.getProfile(userId),
    ]);

  const summary = computeMonthSummary({
    billingMonth,
    transactions: monthTransactions,
    recurringRules,
    budgets,
    profile,
  });

  const futureCommitments = computeFutureCommitments(
    billingMonth,
    6,
    futureTransactions,
    recurringRules
  );

  return {
    summary,
    futureCommitments,
    recurringRules,
    installmentPlans,
    budgets,
    profile,
  };
}

export interface ExecutionResult<T extends DolCardType = DolCardType> {
  cardType: T;
  payload: DolCardPayloadMap[T];
  targetMonth: string;
  highlightCategory: ExpenseCategorySlug | null;
}

export async function executeDolIntent(
  repo: FinanceRepository,
  userId: string,
  intent: DolIntent,
  activeMonth: string
): Promise<ExecutionResult> {
  const todayISO = getTodayISO();
  const currentMonth = getCurrentBillingMonth();
  const defaultOccurredOn =
    activeMonth === currentMonth ? todayISO : buildOccurredOnForMonth(activeMonth, 15);

  switch (intent.intent) {
    case "record_transactions": {
      const created = await repo.createTransactions(
        userId,
        intent.items.map((item) => {
          const occurredOn = item.occurred_on ?? defaultOccurredOn;
          const billingMonth = occurredOn.slice(0, 7);
          return {
            kind: item.kind,
            title: item.title,
            amount_cents: Math.round(item.amount_brl * 100),
            category_slug: item.category_slug as CategorySlug,
            occurred_on: occurredOn,
            billing_month: billingMonth,
          };
        })
      );

      const items: EffectiveMonthItem[] = created.map((tx) => ({
        id: tx.id,
        sourceType: "single",
        kind: tx.kind,
        title: tx.title,
        amount_cents: tx.amount_cents,
        category_slug: tx.category_slug,
        occurred_on: tx.occurred_on,
        billing_month: tx.billing_month,
        installment_plan_id: null,
        installment_number: null,
        installment_total: null,
        recurring_rule_id: null,
        created_at: tx.created_at,
      }));

      const totalCents = items.reduce((acc, item) => acc + item.amount_cents, 0);
      const firstExpense = items.find((i) => i.kind === "expense");
      const highlightCategory =
        firstExpense && isExpenseCategory(firstExpense.category_slug)
          ? firstExpense.category_slug
          : null;

      return {
        cardType: "transaction_batch",
        targetMonth: items[0]?.billing_month ?? activeMonth,
        highlightCategory,
        payload: {
          items,
          total_cents: totalCents,
          kind: items[0]?.kind ?? "expense",
        },
      };
    }

    case "record_installment": {
      const startMonth = intent.start_month ?? activeMonth;
      const baseCents = Math.round(intent.amount_brl * 100);
      const totalCents =
        intent.amount_mode === "per_installment"
          ? baseCents * intent.installment_count
          : baseCents;
      const installmentAmounts = splitInstallments(totalCents, intent.installment_count);
      const occurredDay = startMonth === currentMonth ? new Date().getDate() : 10;

      const { plan, installments } = await repo.createInstallmentPlan(userId, {
        title: intent.title,
        category_slug: intent.category_slug as ExpenseCategorySlug,
        total_amount_cents: totalCents,
        installment_count: intent.installment_count,
        start_month: startMonth,
        occurred_day: occurredDay,
        installment_amounts_cents: installmentAmounts,
      });

      return {
        cardType: "installment",
        targetMonth: startMonth,
        highlightCategory: plan.category_slug,
        payload: {
          plan,
          installments,
          first_installment_cents: installmentAmounts[0] ?? 0,
        },
      };
    }

    case "record_recurring": {
      const rule = await repo.createRecurringRule(userId, {
        kind: intent.kind,
        title: intent.title,
        amount_cents: Math.round(intent.amount_brl * 100),
        category_slug: intent.category_slug as CategorySlug,
        day_of_month: intent.day_of_month ?? 5,
        start_month: activeMonth,
      });

      return {
        cardType: "recurring",
        targetMonth: activeMonth,
        highlightCategory:
          rule.kind === "expense" && isExpenseCategory(rule.category_slug)
            ? rule.category_slug
            : null,
        payload: { rule },
      };
    }

    case "set_budget": {
      const limitCents = Math.round(intent.limit_brl * 100);
      const categorySlug = (intent.category_slug ?? null) as CategorySlug | null;
      await repo.upsertMonthlyBudget(userId, activeMonth, categorySlug, limitCents);
      if (categorySlug === null) {
        await repo.updateProfile(userId, { default_budget_cents: limitCents });
      }
      const state = await loadFullMonthState(repo, userId, activeMonth);

      return {
        cardType: "budget",
        targetMonth: activeMonth,
        highlightCategory:
          categorySlug && isExpenseCategory(categorySlug) ? categorySlug : null,
        payload: {
          billing_month: activeMonth,
          category_slug: categorySlug,
          limit_cents: limitCents,
          percent_used: state.summary.percent_used,
        },
      };
    }

    case "query_month_summary": {
      const month = intent.billing_month ?? activeMonth;
      const state = await loadFullMonthState(repo, userId, month);
      return {
        cardType: "summary",
        targetMonth: month,
        highlightCategory: state.summary.slices[0]?.category_slug ?? null,
        payload: { summary: state.summary },
      };
    }

    case "query_category": {
      const month = intent.billing_month ?? activeMonth;
      const cat = intent.category_slug as ExpenseCategorySlug;
      const state = await loadFullMonthState(repo, userId, month);
      const items = state.summary.items.filter(
        (item) => item.kind === "expense" && item.category_slug === cat
      );
      const slice = state.summary.slices.find((s) => s.category_slug === cat);
      return {
        cardType: "category_detail",
        targetMonth: month,
        highlightCategory: cat,
        payload: {
          billing_month: month,
          category_slug: cat,
          total_cents: slice?.amount_cents ?? 0,
          percentage_of_expenses: slice?.percentage_of_expenses ?? 0,
          items,
        },
      };
    }

    case "query_installments": {
      const state = await loadFullMonthState(repo, userId, activeMonth);
      return {
        cardType: "installments_timeline",
        targetMonth: activeMonth,
        highlightCategory: null,
        payload: {
          plans: state.installmentPlans,
          future: state.futureCommitments,
        },
      };
    }

    case "query_fixed": {
      const allRules = await repo.listRecurringRules(userId);
      const activeRules = allRules.filter((r) => isRecurringRuleActiveForMonth(r, activeMonth));
      const totalExpense = activeRules
        .filter((r) => r.kind === "expense")
        .reduce((acc, r) => acc + r.amount_cents, 0);
      const totalIncome = activeRules
        .filter((r) => r.kind === "income")
        .reduce((acc, r) => acc + r.amount_cents, 0);

      return {
        cardType: "fixed_list",
        targetMonth: activeMonth,
        highlightCategory: null,
        payload: {
          rules: activeRules,
          total_fixed_expense_cents: totalExpense,
          total_fixed_income_cents: totalIncome,
        },
      };
    }

    case "query_comparison": {
      const curMonth = intent.billing_month ?? activeMonth;
      const prevMonth = addMonths(curMonth, -1);
      const [curState, prevState] = await Promise.all([
        loadFullMonthState(repo, userId, curMonth),
        loadFullMonthState(repo, userId, prevMonth),
      ]);

      const curTotal = curState.summary.total_expense_cents;
      const prevTotal = prevState.summary.total_expense_cents;
      const deltaPercent =
        prevTotal > 0 ? Math.round(((curTotal - prevTotal) / prevTotal) * 1000) / 10 : null;

      const prevSliceMap = new Map(
        prevState.summary.slices.map((s) => [s.category_slug, s.amount_cents])
      );
      const topChanges = curState.summary.slices.slice(0, 4).map((s) => ({
        category_slug: s.category_slug,
        current_cents: s.amount_cents,
        previous_cents: prevSliceMap.get(s.category_slug) ?? 0,
      }));

      return {
        cardType: "comparison",
        targetMonth: curMonth,
        highlightCategory: null,
        payload: {
          current_month: curMonth,
          previous_month: prevMonth,
          current_expense_cents: curTotal,
          previous_expense_cents: prevTotal,
          delta_percent: deltaPercent,
          top_changes: topChanges,
        },
      };
    }

    case "undo_last": {
      const removed = await repo.deleteLatestUserAction(userId, activeMonth);
      return {
        cardType: "undo",
        targetMonth: activeMonth,
        highlightCategory: null,
        payload: {
          removed_count: removed?.removedCount ?? 0,
          removed_title: removed?.title ?? "Nenhum item encontrado",
          removed_amount_cents: removed?.amountCents ?? 0,
        },
      };
    }

    case "needs_clarification": {
      return {
        cardType: "clarify",
        targetMonth: activeMonth,
        highlightCategory: null,
        payload: {
          draft_kind: intent.draft_kind,
          draft_title: intent.draft_title,
          draft_category_slug: intent.draft_category_slug as CategorySlug,
        },
      };
    }

    case "off_topic": {
      return {
        cardType: "off_topic",
        targetMonth: activeMonth,
        highlightCategory: null,
        payload: { reason: "out_of_scope" },
      };
    }
  }
}
