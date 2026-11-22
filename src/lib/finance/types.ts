export type ExpenseCategorySlug =
  | "alimentacao"
  | "moradia"
  | "transporte"
  | "lazer"
  | "saude"
  | "compras"
  | "assinaturas"
  | "educacao"
  | "outros";

export type IncomeCategorySlug =
  | "salario"
  | "freelance"
  | "rendimentos"
  | "outros_entrada";

export type CategorySlug = ExpenseCategorySlug | IncomeCategorySlug;

export type TransactionKind = "expense" | "income";
export type ThemePreference = "dark" | "light" | "system";
export type InputMode = "voice" | "text";

export interface ProfileRecord {
  id: string;
  display_name: string;
  currency: "BRL";
  default_budget_cents: number | null;
  theme_preference: ThemePreference;
  sound_enabled: boolean;
  created_at: string;
}

export interface VaultConfigRecord {
  id: true;
  owner_user_id: string;
  pin_hash: string;
  failed_attempts: number;
  locked_until: string | null;
  updated_at: string;
}

export interface MonthlyBudgetRecord {
  id: string;
  user_id: string;
  billing_month: string;
  category_slug: CategorySlug | null;
  limit_cents: number;
  created_at: string;
}

export interface RecurringRuleRecord {
  id: string;
  user_id: string;
  kind: TransactionKind;
  title: string;
  amount_cents: number;
  category_slug: CategorySlug;
  day_of_month: number;
  start_month: string;
  end_month: string | null;
  active: boolean;
  created_at: string;
}

export interface InstallmentPlanRecord {
  id: string;
  user_id: string;
  title: string;
  category_slug: ExpenseCategorySlug;
  total_amount_cents: number;
  installment_count: number;
  start_month: string;
  created_at: string;
}

export interface TransactionRecord {
  id: string;
  user_id: string;
  kind: TransactionKind;
  title: string;
  amount_cents: number;
  category_slug: CategorySlug;
  occurred_on: string;
  billing_month: string;
  installment_plan_id: string | null;
  installment_number: number | null;
  installment_total: number | null;
  recurring_rule_id: string | null;
  is_recurring_override: boolean;
  is_skipped: boolean;
  created_at: string;
}

export interface EffectiveMonthItem {
  id: string; // transaction id ou virtual `recurring:<ruleId>:<month>`
  sourceType: "single" | "installment" | "recurring_projected" | "recurring_override";
  kind: TransactionKind;
  title: string;
  amount_cents: number;
  category_slug: CategorySlug;
  occurred_on: string;
  billing_month: string;
  installment_plan_id: string | null;
  installment_number: number | null;
  installment_total: number | null;
  recurring_rule_id: string | null;
  created_at: string;
}

export interface CategorySlice {
  category_slug: ExpenseCategorySlug;
  label: string;
  color: string;
  amount_cents: number;
  percentage_of_expenses: number;
  budget_limit_cents: number | null;
  transaction_count: number;
}

export interface MonthSummary {
  billing_month: string;
  total_expense_cents: number;
  total_income_cents: number;
  balance_cents: number;
  fixed_expense_cents: number;
  installment_expense_cents: number;
  variable_expense_cents: number;
  budget_cents: number | null;
  reference_mode: "budget" | "income" | "none";
  reference_cents: number | null;
  percent_used: number | null;
  slices: CategorySlice[];
  items: EffectiveMonthItem[];
}

export interface FutureMonthCommitment {
  billing_month: string;
  fixed_cents: number;
  installment_cents: number;
  total_cents: number;
}

export type DolCardType =
  | "transaction_batch"
  | "installment"
  | "recurring"
  | "budget"
  | "summary"
  | "category_detail"
  | "installments_timeline"
  | "fixed_list"
  | "comparison"
  | "clarify"
  | "off_topic"
  | "undo";

export interface DolCardPayloadMap {
  transaction_batch: {
    items: EffectiveMonthItem[];
    total_cents: number;
    kind: TransactionKind;
  };
  installment: {
    plan: InstallmentPlanRecord;
    installments: TransactionRecord[];
    first_installment_cents: number;
  };
  recurring: {
    rule: RecurringRuleRecord;
  };
  budget: {
    billing_month: string;
    category_slug: CategorySlug | null;
    limit_cents: number;
    percent_used: number | null;
  };
  summary: {
    summary: MonthSummary;
  };
  category_detail: {
    billing_month: string;
    category_slug: ExpenseCategorySlug;
    total_cents: number;
    percentage_of_expenses: number;
    items: EffectiveMonthItem[];
  };
  installments_timeline: {
    plans: InstallmentPlanRecord[];
    future: FutureMonthCommitment[];
  };
  fixed_list: {
    rules: RecurringRuleRecord[];
    total_fixed_expense_cents: number;
    total_fixed_income_cents: number;
  };
  comparison: {
    current_month: string;
    previous_month: string;
    current_expense_cents: number;
    previous_expense_cents: number;
    delta_percent: number | null;
    top_changes: Array<{
      category_slug: ExpenseCategorySlug;
      current_cents: number;
      previous_cents: number;
    }>;
  };
  clarify: {
    draft_kind: TransactionKind;
    draft_title: string;
    draft_category_slug: CategorySlug;
    resolved_amount_cents?: number;
  };
  off_topic: {
    reason: "out_of_scope";
  };
  undo: {
    removed_count: number;
    removed_title: string;
    removed_amount_cents: number;
  };
}

export interface ChatEventRecord<T extends DolCardType = DolCardType> {
  id: string;
  user_id: string;
  billing_month: string;
  user_input_text: string;
  input_mode: InputMode;
  card_type: T;
  payload_json: DolCardPayloadMap[T];
  created_at: string;
}
