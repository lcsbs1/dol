import crypto from "crypto";
import fs from "fs";
import path from "path";
import { addMonths, buildOccurredOnForMonth } from "@/lib/finance/money";
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
  TransactionRecord,
  VaultConfigRecord,
} from "@/lib/finance/types";
import type {
  CreateInstallmentPlanInput,
  CreateRecurringRuleInput,
  CreateTransactionInput,
  FinanceRepository,
  UpdateRecurringRuleInput,
  UpdateTransactionInput,
  VaultStatus,
} from "./repository";

interface LocalStoreData {
  profiles: ProfileRecord[];
  vault_config: VaultConfigRecord | null;
  monthly_budgets: MonthlyBudgetRecord[];
  recurring_rules: RecurringRuleRecord[];
  installment_plans: InstallmentPlanRecord[];
  transactions: TransactionRecord[];
  chat_events: ChatEventRecord[];
}

const DATA_FILE_PATH = path.join(process.cwd(), ".dol-dev-data.json");

function emptyStore(): LocalStoreData {
  return {
    profiles: [],
    vault_config: null,
    monthly_budgets: [],
    recurring_rules: [],
    installment_plans: [],
    transactions: [],
    chat_events: [],
  };
}

function readStore(): LocalStoreData {
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      return emptyStore();
    }
    const raw = fs.readFileSync(DATA_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LocalStoreData>;
    return {
      profiles: parsed.profiles ?? [],
      vault_config: parsed.vault_config ?? null,
      monthly_budgets: parsed.monthly_budgets ?? [],
      recurring_rules: parsed.recurring_rules ?? [],
      installment_plans: parsed.installment_plans ?? [],
      transactions: parsed.transactions ?? [],
      chat_events: parsed.chat_events ?? [],
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(data: LocalStoreData): void {
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export class LocalDevFinanceRepository implements FinanceRepository {
  async getVaultStatus(): Promise<VaultStatus> {
    const store = readStore();
    if (!store.vault_config) {
      return {
        initialized: false,
        lockedUntil: null,
        failedAttempts: 0,
        ownerUserId: null,
      };
    }
    return {
      initialized: true,
      lockedUntil: store.vault_config.locked_until,
      failedAttempts: store.vault_config.failed_attempts,
      ownerUserId: store.vault_config.owner_user_id,
    };
  }

  async getVaultConfig(): Promise<VaultConfigRecord | null> {
    return readStore().vault_config;
  }

  async setupVaultPin(pinHash: string, preferredUserId?: string): Promise<{ userId: string }> {
    const store = readStore();
    const userId = preferredUserId ?? crypto.randomUUID();
    const now = new Date().toISOString();

    if (!store.profiles.some((p) => p.id === userId)) {
      store.profiles.push({
        id: userId,
        display_name: "Pessoal",
        currency: "BRL",
        default_budget_cents: null,
        theme_preference: "dark",
        sound_enabled: true,
        created_at: now,
      });
    }

    store.vault_config = {
      id: true,
      owner_user_id: userId,
      pin_hash: pinHash,
      failed_attempts: 0,
      locked_until: null,
      updated_at: now,
    };

    writeStore(store);
    return { userId };
  }

  async recordFailedPinAttempt(failedAttempts: number, lockedUntil: string | null): Promise<void> {
    const store = readStore();
    if (!store.vault_config) return;
    store.vault_config.failed_attempts = failedAttempts;
    store.vault_config.locked_until = lockedUntil;
    store.vault_config.updated_at = new Date().toISOString();
    writeStore(store);
  }

  async resetFailedPinAttempts(): Promise<void> {
    const store = readStore();
    if (!store.vault_config) return;
    store.vault_config.failed_attempts = 0;
    store.vault_config.locked_until = null;
    store.vault_config.updated_at = new Date().toISOString();
    writeStore(store);
  }

  async getProfile(userId: string): Promise<ProfileRecord | null> {
    return readStore().profiles.find((p) => p.id === userId) ?? null;
  }

  async updateProfile(
    userId: string,
    patch: {
      display_name?: string;
      default_budget_cents?: number | null;
      theme_preference?: ThemePreference;
      sound_enabled?: boolean;
    }
  ): Promise<ProfileRecord> {
    const store = readStore();
    const profile = store.profiles.find((p) => p.id === userId);
    if (!profile) throw new Error("Perfil não encontrado");

    if (patch.display_name !== undefined) {
      profile.display_name = patch.display_name;
    }
    if (patch.default_budget_cents !== undefined) {
      profile.default_budget_cents = patch.default_budget_cents;
    }
    if (patch.theme_preference !== undefined) {
      profile.theme_preference = patch.theme_preference;
    }
    if (patch.sound_enabled !== undefined) {
      profile.sound_enabled = patch.sound_enabled;
    }

    writeStore(store);
    return profile;
  }

  async listTransactionsForMonth(userId: string, billingMonth: string): Promise<TransactionRecord[]> {
    return readStore()
      .transactions.filter((t) => t.user_id === userId && t.billing_month === billingMonth)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async listTransactionsInMonths(userId: string, billingMonths: string[]): Promise<TransactionRecord[]> {
    const set = new Set(billingMonths);
    return readStore().transactions.filter(
      (t) => t.user_id === userId && set.has(t.billing_month)
    );
  }

  async getTransactionById(userId: string, transactionId: string): Promise<TransactionRecord | null> {
    return (
      readStore().transactions.find((t) => t.user_id === userId && t.id === transactionId) ?? null
    );
  }

  async createTransactions(
    userId: string,
    items: CreateTransactionInput[]
  ): Promise<TransactionRecord[]> {
    const store = readStore();
    const now = new Date().toISOString();
    const created: TransactionRecord[] = items.map((item, idx) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      kind: item.kind,
      title: item.title,
      amount_cents: item.amount_cents,
      category_slug: item.category_slug,
      occurred_on: item.occurred_on,
      billing_month: item.billing_month,
      installment_plan_id: item.installment_plan_id ?? null,
      installment_number: item.installment_number ?? null,
      installment_total: item.installment_total ?? null,
      recurring_rule_id: item.recurring_rule_id ?? null,
      is_recurring_override: item.is_recurring_override ?? false,
      is_skipped: item.is_skipped ?? false,
      created_at: new Date(Date.now() + idx).toISOString() || now,
    }));

    store.transactions.push(...created);
    writeStore(store);
    return created;
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    patch: UpdateTransactionInput
  ): Promise<TransactionRecord | null> {
    const store = readStore();
    const tx = store.transactions.find((t) => t.user_id === userId && t.id === transactionId);
    if (!tx) return null;

    if (patch.title !== undefined) tx.title = patch.title;
    if (patch.amount_cents !== undefined) tx.amount_cents = patch.amount_cents;
    if (patch.category_slug !== undefined) tx.category_slug = patch.category_slug;
    if (patch.occurred_on !== undefined) tx.occurred_on = patch.occurred_on;
    if (patch.billing_month !== undefined) tx.billing_month = patch.billing_month;
    if (patch.kind !== undefined) tx.kind = patch.kind;

    writeStore(store);
    return tx;
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
    const store = readStore();
    const before = store.transactions.length;
    store.transactions = store.transactions.filter(
      (t) => !(t.user_id === userId && t.id === transactionId)
    );
    if (store.transactions.length === before) return false;
    writeStore(store);
    return true;
  }

  async deleteLatestUserAction(
    userId: string,
    billingMonth: string
  ): Promise<{ removedCount: number; title: string; amountCents: number } | null> {
    const store = readStore();
    const candidates = store.transactions
      .filter((t) => t.user_id === userId && t.billing_month === billingMonth && !t.is_skipped)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const latest = candidates[0];
    if (!latest) return null;

    if (latest.installment_plan_id) {
      const plan = store.installment_plans.find(
        (p) => p.user_id === userId && p.id === latest.installment_plan_id
      );
      store.transactions = store.transactions.filter(
        (t) => !(t.user_id === userId && t.installment_plan_id === latest.installment_plan_id)
      );
      store.installment_plans = store.installment_plans.filter(
        (p) => !(p.user_id === userId && p.id === latest.installment_plan_id)
      );
      writeStore(store);
      return {
        removedCount: plan?.installment_count ?? latest.installment_total ?? 1,
        title: plan?.title ?? latest.title,
        amountCents: plan?.total_amount_cents ?? latest.amount_cents,
      };
    }

    store.transactions = store.transactions.filter(
      (t) => !(t.user_id === userId && t.id === latest.id)
    );
    writeStore(store);
    return {
      removedCount: 1,
      title: latest.title,
      amountCents: latest.amount_cents,
    };
  }

  async createInstallmentPlan(
    userId: string,
    input: CreateInstallmentPlanInput
  ): Promise<{ plan: InstallmentPlanRecord; installments: TransactionRecord[] }> {
    const store = readStore();
    const plan: InstallmentPlanRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: input.title,
      category_slug: input.category_slug,
      total_amount_cents: input.total_amount_cents,
      installment_count: input.installment_count,
      start_month: input.start_month,
      created_at: new Date().toISOString(),
    };

    store.installment_plans.push(plan);
    writeStore(store);

    const installments = await this.createTransactions(
      userId,
      input.installment_amounts_cents.map((cents, index) => {
        const month = addMonths(input.start_month, index);
        return {
          kind: "expense",
          title: input.title,
          amount_cents: cents,
          category_slug: input.category_slug,
          occurred_on: buildOccurredOnForMonth(month, input.occurred_day),
          billing_month: month,
          installment_plan_id: plan.id,
          installment_number: index + 1,
          installment_total: input.installment_count,
        };
      })
    );

    return { plan, installments };
  }

  async listInstallmentPlans(userId: string): Promise<InstallmentPlanRecord[]> {
    return readStore()
      .installment_plans.filter((p) => p.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async deleteInstallmentPlan(userId: string, planId: string): Promise<boolean> {
    const store = readStore();
    const before = store.installment_plans.length;
    store.installment_plans = store.installment_plans.filter(
      (p) => !(p.user_id === userId && p.id === planId)
    );
    store.transactions = store.transactions.filter(
      (t) => !(t.user_id === userId && t.installment_plan_id === planId)
    );
    if (store.installment_plans.length === before) return false;
    writeStore(store);
    return true;
  }

  async listRecurringRules(userId: string): Promise<RecurringRuleRecord[]> {
    return readStore()
      .recurring_rules.filter((r) => r.user_id === userId)
      .sort((a, b) => a.day_of_month - b.day_of_month);
  }

  async getRecurringRuleById(
    userId: string,
    ruleId: string
  ): Promise<RecurringRuleRecord | null> {
    return (
      readStore().recurring_rules.find((r) => r.user_id === userId && r.id === ruleId) ?? null
    );
  }

  async createRecurringRule(
    userId: string,
    input: CreateRecurringRuleInput
  ): Promise<RecurringRuleRecord> {
    const store = readStore();
    const rule: RecurringRuleRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      kind: input.kind,
      title: input.title,
      amount_cents: input.amount_cents,
      category_slug: input.category_slug,
      day_of_month: input.day_of_month,
      start_month: input.start_month,
      end_month: null,
      active: true,
      created_at: new Date().toISOString(),
    };
    store.recurring_rules.push(rule);
    writeStore(store);
    return rule;
  }

  async updateRecurringRule(
    userId: string,
    ruleId: string,
    patch: UpdateRecurringRuleInput
  ): Promise<RecurringRuleRecord | null> {
    const store = readStore();
    const rule = store.recurring_rules.find((r) => r.user_id === userId && r.id === ruleId);
    if (!rule) return null;

    if (patch.title !== undefined) rule.title = patch.title;
    if (patch.amount_cents !== undefined) rule.amount_cents = patch.amount_cents;
    if (patch.category_slug !== undefined) rule.category_slug = patch.category_slug;
    if (patch.day_of_month !== undefined) rule.day_of_month = patch.day_of_month;
    if (patch.active !== undefined) rule.active = patch.active;
    if (patch.end_month !== undefined) rule.end_month = patch.end_month;

    writeStore(store);
    return rule;
  }

  async deleteRecurringRule(userId: string, ruleId: string): Promise<boolean> {
    const store = readStore();
    const before = store.recurring_rules.length;
    store.recurring_rules = store.recurring_rules.filter(
      (r) => !(r.user_id === userId && r.id === ruleId)
    );
    if (store.recurring_rules.length === before) return false;
    writeStore(store);
    return true;
  }

  async upsertRecurringMonthOverride(
    userId: string,
    rule: RecurringRuleRecord,
    billingMonth: string,
    patch: {
      title?: string;
      amount_cents?: number;
      category_slug?: CategorySlug;
      is_skipped?: boolean;
    }
  ): Promise<TransactionRecord> {
    const store = readStore();
    const existing = store.transactions.find(
      (t) =>
        t.user_id === userId &&
        t.recurring_rule_id === rule.id &&
        t.billing_month === billingMonth
    );

    if (existing) {
      if (patch.title !== undefined) existing.title = patch.title;
      if (patch.amount_cents !== undefined) existing.amount_cents = patch.amount_cents;
      if (patch.category_slug !== undefined) existing.category_slug = patch.category_slug;
      if (patch.is_skipped !== undefined) existing.is_skipped = patch.is_skipped;
      existing.is_recurring_override = true;
      writeStore(store);
      return existing;
    }

    const [created] = await this.createTransactions(userId, [
      {
        kind: rule.kind,
        title: patch.title ?? rule.title,
        amount_cents: patch.amount_cents ?? rule.amount_cents,
        category_slug: patch.category_slug ?? rule.category_slug,
        occurred_on: buildOccurredOnForMonth(billingMonth, rule.day_of_month),
        billing_month: billingMonth,
        recurring_rule_id: rule.id,
        is_recurring_override: true,
        is_skipped: patch.is_skipped ?? false,
      },
    ]);
    return created;
  }

  async listMonthlyBudgets(userId: string, billingMonth: string): Promise<MonthlyBudgetRecord[]> {
    return readStore().monthly_budgets.filter(
      (b) => b.user_id === userId && b.billing_month === billingMonth
    );
  }

  async upsertMonthlyBudget(
    userId: string,
    billingMonth: string,
    categorySlug: CategorySlug | null,
    limitCents: number
  ): Promise<MonthlyBudgetRecord> {
    const store = readStore();
    const existing = store.monthly_budgets.find(
      (b) =>
        b.user_id === userId &&
        b.billing_month === billingMonth &&
        b.category_slug === categorySlug
    );
    if (existing) {
      existing.limit_cents = limitCents;
      writeStore(store);
      return existing;
    }

    const record: MonthlyBudgetRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      billing_month: billingMonth,
      category_slug: categorySlug,
      limit_cents: limitCents,
      created_at: new Date().toISOString(),
    };
    store.monthly_budgets.push(record);
    writeStore(store);
    return record;
  }

  async deleteMonthlyBudget(
    userId: string,
    billingMonth: string,
    categorySlug: CategorySlug | null
  ): Promise<boolean> {
    const store = readStore();
    const before = store.monthly_budgets.length;
    store.monthly_budgets = store.monthly_budgets.filter(
      (b) =>
        !(
          b.user_id === userId &&
          b.billing_month === billingMonth &&
          b.category_slug === categorySlug
        )
    );
    if (store.monthly_budgets.length === before) return false;
    writeStore(store);
    return true;
  }

  async listChatEvents(
    userId: string,
    billingMonth: string,
    limit = 60
  ): Promise<ChatEventRecord[]> {
    const events = readStore()
      .chat_events.filter((e) => e.user_id === userId && e.billing_month === billingMonth)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return events.slice(-limit);
  }

  async createChatEvent<T extends DolCardType>(
    userId: string,
    input: {
      billing_month: string;
      user_input_text: string;
      input_mode: InputMode;
      card_type: T;
      payload_json: DolCardPayloadMap[T];
    }
  ): Promise<ChatEventRecord<T>> {
    const store = readStore();
    const record: ChatEventRecord<T> = {
      id: crypto.randomUUID(),
      user_id: userId,
      billing_month: input.billing_month,
      user_input_text: input.user_input_text,
      input_mode: input.input_mode,
      card_type: input.card_type,
      payload_json: input.payload_json,
      created_at: new Date().toISOString(),
    };
    store.chat_events.push(record);
    writeStore(store);
    return record;
  }
}
