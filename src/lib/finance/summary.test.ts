import { describe, expect, it } from "vitest";
import { computeFutureCommitments, computeMonthSummary } from "./summary";
import type { RecurringRuleRecord, TransactionRecord } from "./types";

const baseRule: RecurringRuleRecord = {
  id: "rule-1",
  user_id: "user-1",
  kind: "expense",
  title: "Aluguel",
  amount_cents: 180000,
  category_slug: "moradia",
  day_of_month: 5,
  start_month: "2026-11",
  end_month: null,
  active: true,
  created_at: "2026-11-01T00:00:00.000Z",
};

describe("computeMonthSummary", () => {
  it("projects active recurring expenses and combines single + installment transactions", () => {
    const txs: TransactionRecord[] = [
      {
        id: "tx-1",
        user_id: "user-1",
        kind: "expense",
        title: "Almoço",
        amount_cents: 4500,
        category_slug: "alimentacao",
        occurred_on: "2026-11-10",
        billing_month: "2026-11",
        installment_plan_id: null,
        installment_number: null,
        installment_total: null,
        recurring_rule_id: null,
        is_recurring_override: false,
        is_skipped: false,
        created_at: "2026-11-10T12:00:00.000Z",
      },
      {
        id: "tx-2",
        user_id: "user-1",
        kind: "expense",
        title: "Tênis",
        amount_cents: 10000,
        category_slug: "compras",
        occurred_on: "2026-11-10",
        billing_month: "2026-11",
        installment_plan_id: "plan-1",
        installment_number: 1,
        installment_total: 6,
        recurring_rule_id: null,
        is_recurring_override: false,
        is_skipped: false,
        created_at: "2026-11-10T12:05:00.000Z",
      },
    ];

    const summary = computeMonthSummary({
      billingMonth: "2026-11",
      transactions: txs,
      recurringRules: [baseRule],
      budgets: [
        {
          id: "b-1",
          user_id: "user-1",
          billing_month: "2026-11",
          category_slug: null,
          limit_cents: 400000,
          created_at: "2026-11-01T00:00:00.000Z",
        },
      ],
      profile: null,
    });

    expect(summary.total_expense_cents).toBe(194500);
    expect(summary.fixed_expense_cents).toBe(180000);
    expect(summary.installment_expense_cents).toBe(10000);
    expect(summary.variable_expense_cents).toBe(4500);
    expect(summary.reference_mode).toBe("budget");
    expect(summary.percent_used).toBe(48.6);
  });

  it("respects recurring single-month skip override without deleting the rule", () => {
    const skippedOverride: TransactionRecord = {
      id: "tx-skip",
      user_id: "user-1",
      kind: "expense",
      title: "Aluguel",
      amount_cents: 180000,
      category_slug: "moradia",
      occurred_on: "2026-12-05",
      billing_month: "2026-12",
      installment_plan_id: null,
      installment_number: null,
      installment_total: null,
      recurring_rule_id: "rule-1",
      is_recurring_override: true,
      is_skipped: true,
      created_at: "2026-12-01T00:00:00.000Z",
    };

    const summary = computeMonthSummary({
      billingMonth: "2026-12",
      transactions: [skippedOverride],
      recurringRules: [baseRule],
      budgets: [],
      profile: null,
    });

    expect(summary.total_expense_cents).toBe(0);
    expect(summary.items).toHaveLength(0);
  });

  it("computes 6-month future commitments stacking fixed and installment expenses", () => {
    const decInstallment: TransactionRecord = {
      id: "tx-inst-2",
      user_id: "user-1",
      kind: "expense",
      title: "Tênis",
      amount_cents: 10000,
      category_slug: "compras",
      occurred_on: "2026-12-10",
      billing_month: "2026-12",
      installment_plan_id: "plan-1",
      installment_number: 2,
      installment_total: 6,
      recurring_rule_id: null,
      is_recurring_override: false,
      is_skipped: false,
      created_at: "2026-11-10T12:05:00.000Z",
    };

    const future = computeFutureCommitments("2026-11", 3, [decInstallment], [baseRule]);
    expect(future).toHaveLength(3);
    expect(future[0]).toEqual({
      billing_month: "2026-11",
      fixed_cents: 180000,
      installment_cents: 0,
      total_cents: 180000,
    });
    expect(future[1]).toEqual({
      billing_month: "2026-12",
      fixed_cents: 180000,
      installment_cents: 10000,
      total_cents: 190000,
    });
  });
});
