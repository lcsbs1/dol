import type {
  CategorySlug,
  ChatEventRecord,
  DolCardPayloadMap,
  DolCardType,
  InputMode,
  InstallmentPlanRecord,
  MonthlyBudgetRecord,
  ProfileRecord,
  RecurringRuleRecord,
  ThemePreference,
  TransactionKind,
  TransactionRecord,
  VaultConfigRecord,
} from "@/lib/finance/types";

export interface VaultStatus {
  initialized: boolean;
  lockedUntil: string | null;
  failedAttempts: number;
  ownerUserId: string | null;
}

export interface CreateTransactionInput {
  kind: TransactionKind;
  title: string;
  amount_cents: number;
  category_slug: CategorySlug;
  occurred_on: string;
  billing_month: string;
  installment_plan_id?: string | null;
  installment_number?: number | null;
  installment_total?: number | null;
  recurring_rule_id?: string | null;
  is_recurring_override?: boolean;
  is_skipped?: boolean;
}

export interface UpdateTransactionInput {
  title?: string;
  amount_cents?: number;
  category_slug?: CategorySlug;
  occurred_on?: string;
  billing_month?: string;
  kind?: TransactionKind;
}

export interface CreateInstallmentPlanInput {
  title: string;
  category_slug: "alimentacao" | "moradia" | "transporte" | "lazer" | "saude" | "compras" | "assinaturas" | "educacao" | "outros";
  total_amount_cents: number;
  installment_count: number;
  start_month: string;
  occurred_day: number;
  installment_amounts_cents: number[];
}

export interface CreateRecurringRuleInput {
  kind: TransactionKind;
  title: string;
  amount_cents: number;
  category_slug: CategorySlug;
  day_of_month: number;
  start_month: string;
}

export interface UpdateRecurringRuleInput {
  title?: string;
  amount_cents?: number;
  category_slug?: CategorySlug;
  day_of_month?: number;
  active?: boolean;
  end_month?: string | null;
}

export interface FinanceRepository {
  // Vault & Perfil
  getVaultStatus(): Promise<VaultStatus>;
  getVaultConfig(): Promise<VaultConfigRecord | null>;
  setupVaultPin(pinHash: string, preferredUserId?: string): Promise<{ userId: string }>;
  recordFailedPinAttempt(failedAttempts: number, lockedUntil: string | null): Promise<void>;
  resetFailedPinAttempts(): Promise<void>;

  getProfile(userId: string): Promise<ProfileRecord | null>;
  updateProfile(
    userId: string,
    patch: {
      default_budget_cents?: number | null;
      theme_preference?: ThemePreference;
      sound_enabled?: boolean;
    }
  ): Promise<ProfileRecord>;

  // Transações
  listTransactionsForMonth(userId: string, billingMonth: string): Promise<TransactionRecord[]>;
  listTransactionsInMonths(userId: string, billingMonths: string[]): Promise<TransactionRecord[]>;
  getTransactionById(userId: string, transactionId: string): Promise<TransactionRecord | null>;
  createTransactions(userId: string, items: CreateTransactionInput[]): Promise<TransactionRecord[]>;
  updateTransaction(
    userId: string,
    transactionId: string,
    patch: UpdateTransactionInput
  ): Promise<TransactionRecord | null>;
  deleteTransaction(userId: string, transactionId: string): Promise<boolean>;
  deleteLatestUserAction(
    userId: string,
    billingMonth: string
  ): Promise<{ removedCount: number; title: string; amountCents: number } | null>;

  // Parcelamentos
  createInstallmentPlan(
    userId: string,
    input: CreateInstallmentPlanInput
  ): Promise<{ plan: InstallmentPlanRecord; installments: TransactionRecord[] }>;
  listInstallmentPlans(userId: string): Promise<InstallmentPlanRecord[]>;
  deleteInstallmentPlan(userId: string, planId: string): Promise<boolean>;

  // Despesas e Entradas Fixas
  listRecurringRules(userId: string): Promise<RecurringRuleRecord[]>;
  getRecurringRuleById(userId: string, ruleId: string): Promise<RecurringRuleRecord | null>;
  createRecurringRule(userId: string, input: CreateRecurringRuleInput): Promise<RecurringRuleRecord>;
  updateRecurringRule(
    userId: string,
    ruleId: string,
    patch: UpdateRecurringRuleInput
  ): Promise<RecurringRuleRecord | null>;
  deleteRecurringRule(userId: string, ruleId: string): Promise<boolean>;
  upsertRecurringMonthOverride(
    userId: string,
    rule: RecurringRuleRecord,
    billingMonth: string,
    patch: { title?: string; amount_cents?: number; category_slug?: CategorySlug; is_skipped?: boolean }
  ): Promise<TransactionRecord>;

  // Tetos Mensais
  listMonthlyBudgets(userId: string, billingMonth: string): Promise<MonthlyBudgetRecord[]>;
  upsertMonthlyBudget(
    userId: string,
    billingMonth: string,
    categorySlug: CategorySlug | null,
    limitCents: number
  ): Promise<MonthlyBudgetRecord>;

  // Stream de Eventos
  listChatEvents(userId: string, billingMonth: string, limit?: number): Promise<ChatEventRecord[]>;
  createChatEvent<T extends DolCardType>(
    userId: string,
    input: {
      billing_month: string;
      user_input_text: string;
      input_mode: InputMode;
      card_type: T;
      payload_json: DolCardPayloadMap[T];
    }
  ): Promise<ChatEventRecord<T>>;
}
