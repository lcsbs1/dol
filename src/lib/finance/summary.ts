import { EXPENSE_CATEGORIES, isExpenseCategory } from "./categories";
import { addMonths, buildOccurredOnForMonth } from "./money";
import type {
  CategorySlice,
  EffectiveMonthItem,
  ExpenseCategorySlug,
  FutureMonthCommitment,
  MonthSummary,
  MonthlyBudgetRecord,
  ProfileRecord,
  RecurringRuleRecord,
  TransactionRecord,
} from "./types";

interface ComputeSummaryInput {
  billingMonth: string;
  transactions: TransactionRecord[];
  recurringRules: RecurringRuleRecord[];
  budgets: MonthlyBudgetRecord[];
  profile: Pick<ProfileRecord, "default_budget_cents"> | null;
}

export function isRecurringRuleActiveForMonth(
  rule: RecurringRuleRecord,
  billingMonth: string
): boolean {
  if (!rule.active) return false;
  if (rule.start_month > billingMonth) return false;
  if (rule.end_month && rule.end_month < billingMonth) return false;
  return true;
}

export function buildEffectiveMonthItems({
  billingMonth,
  transactions,
  recurringRules,
}: Pick<ComputeSummaryInput, "billingMonth" | "transactions" | "recurringRules">): EffectiveMonthItem[] {
  const overrideByRule = new Map<string, TransactionRecord>();
  const regularItems: EffectiveMonthItem[] = [];

  for (const tx of transactions) {
    if (tx.billing_month !== billingMonth) continue;

    if (tx.recurring_rule_id && tx.is_recurring_override) {
      overrideByRule.set(tx.recurring_rule_id, tx);
    }

    if (tx.is_skipped) continue;

    const sourceType: EffectiveMonthItem["sourceType"] = tx.installment_plan_id
      ? "installment"
      : tx.recurring_rule_id && tx.is_recurring_override
        ? "recurring_override"
        : "single";

    regularItems.push({
      id: tx.id,
      sourceType,
      kind: tx.kind,
      title: tx.title,
      amount_cents: tx.amount_cents,
      category_slug: tx.category_slug,
      occurred_on: tx.occurred_on,
      billing_month: tx.billing_month,
      installment_plan_id: tx.installment_plan_id,
      installment_number: tx.installment_number,
      installment_total: tx.installment_total,
      recurring_rule_id: tx.recurring_rule_id,
      created_at: tx.created_at,
    });
  }

  for (const rule of recurringRules) {
    if (!isRecurringRuleActiveForMonth(rule, billingMonth)) continue;
    if (overrideByRule.has(rule.id)) continue;

    regularItems.push({
      id: `recurring:${rule.id}:${billingMonth}`,
      sourceType: "recurring_projected",
      kind: rule.kind,
      title: rule.title,
      amount_cents: rule.amount_cents,
      category_slug: rule.category_slug,
      occurred_on: buildOccurredOnForMonth(billingMonth, rule.day_of_month),
      billing_month: billingMonth,
      installment_plan_id: null,
      installment_number: null,
      installment_total: null,
      recurring_rule_id: rule.id,
      created_at: rule.created_at,
    });
  }

  return regularItems.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
}

export function computeMonthSummary({
  billingMonth,
  transactions,
  recurringRules,
  budgets,
  profile,
}: ComputeSummaryInput): MonthSummary {
  const items = buildEffectiveMonthItems({ billingMonth, transactions, recurringRules });

  let totalExpenseCents = 0;
  let totalIncomeCents = 0;
  let fixedExpenseCents = 0;
  let installmentExpenseCents = 0;
  let variableExpenseCents = 0;

  const categoryTotals = new Map<ExpenseCategorySlug, { amount: number; count: number }>();

  for (const item of items) {
    if (item.kind === "income") {
      totalIncomeCents += item.amount_cents;
      continue;
    }

    totalExpenseCents += item.amount_cents;

    if (item.sourceType === "installment") {
      installmentExpenseCents += item.amount_cents;
    } else if (
      item.sourceType === "recurring_projected" ||
      item.sourceType === "recurring_override"
    ) {
      fixedExpenseCents += item.amount_cents;
    } else {
      variableExpenseCents += item.amount_cents;
    }

    const cat: ExpenseCategorySlug = isExpenseCategory(item.category_slug)
      ? item.category_slug
      : "outros";
    const current = categoryTotals.get(cat) ?? { amount: 0, count: 0 };
    current.amount += item.amount_cents;
    current.count += 1;
    categoryTotals.set(cat, current);
  }

  const monthGlobalBudget = budgets.find(
    (b) => b.billing_month === billingMonth && b.category_slug === null
  );
  const budgetCents = monthGlobalBudget?.limit_cents ?? profile?.default_budget_cents ?? null;

  let referenceMode: MonthSummary["reference_mode"] = "none";
  let referenceCents: number | null = null;
  let percentUsed: number | null = null;

  if (budgetCents && budgetCents > 0) {
    referenceMode = "budget";
    referenceCents = budgetCents;
    percentUsed = Math.round((totalExpenseCents / budgetCents) * 1000) / 10;
  } else if (totalIncomeCents > 0) {
    referenceMode = "income";
    referenceCents = totalIncomeCents;
    percentUsed = Math.round((totalExpenseCents / totalIncomeCents) * 1000) / 10;
  }

  const categoryBudgetMap = new Map<string, number>();
  for (const b of budgets) {
    if (b.billing_month === billingMonth && b.category_slug) {
      categoryBudgetMap.set(b.category_slug, b.limit_cents);
    }
  }

  const slices: CategorySlice[] = Array.from(categoryTotals.entries())
    .map(([slug, stat]) => {
      const meta = EXPENSE_CATEGORIES[slug];
      return {
        category_slug: slug,
        label: meta.label,
        color: meta.color,
        amount_cents: stat.amount,
        percentage_of_expenses:
          totalExpenseCents > 0
            ? Math.round((stat.amount / totalExpenseCents) * 1000) / 10
            : 0,
        budget_limit_cents: categoryBudgetMap.get(slug) ?? null,
        transaction_count: stat.count,
      };
    })
    .sort((a, b) => b.amount_cents - a.amount_cents);

  return {
    billing_month: billingMonth,
    total_expense_cents: totalExpenseCents,
    total_income_cents: totalIncomeCents,
    balance_cents: totalIncomeCents - totalExpenseCents,
    fixed_expense_cents: fixedExpenseCents,
    installment_expense_cents: installmentExpenseCents,
    variable_expense_cents: variableExpenseCents,
    budget_cents: budgetCents,
    reference_mode: referenceMode,
    reference_cents: referenceCents,
    percent_used: percentUsed,
    slices,
    items,
  };
}

export function computeFutureCommitments(
  baseMonth: string,
  monthsAhead: number,
  futureTransactions: TransactionRecord[],
  recurringRules: RecurringRuleRecord[]
): FutureMonthCommitment[] {
  const result: FutureMonthCommitment[] = [];

  for (let i = 0; i < monthsAhead; i++) {
    const month = addMonths(baseMonth, i);
    const items = buildEffectiveMonthItems({
      billingMonth: month,
      transactions: futureTransactions,
      recurringRules,
    });

    let fixedCents = 0;
    let installmentCents = 0;

    for (const item of items) {
      if (item.kind !== "expense") continue;
      if (item.sourceType === "installment") {
        installmentCents += item.amount_cents;
      } else if (
        item.sourceType === "recurring_projected" ||
        item.sourceType === "recurring_override"
      ) {
        fixedCents += item.amount_cents;
      }
    }

    result.push({
      billing_month: month,
      fixed_cents: fixedCents,
      installment_cents: installmentCents,
      total_cents: fixedCents + installmentCents,
    });
  }

  return result;
}
