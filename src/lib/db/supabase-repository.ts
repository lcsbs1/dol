import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  if (!url || !serviceKey) {
    throw new Error("Configuração do Supabase ausente (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export class SupabaseFinanceRepository implements FinanceRepository {
  private readonly client: SupabaseClient;

  constructor() {
    this.client = createSupabaseAdmin();
  }

  async getVaultStatus(): Promise<VaultStatus> {
    const { data, error } = await this.client
      .from("vault_config")
      .select("owner_user_id, failed_attempts, locked_until")
      .eq("id", true)
      .maybeSingle();

    if (error) throw new Error(`Erro ao consultar vault_config: ${error.message}`);
    if (!data) {
      return {
        initialized: false,
        lockedUntil: null,
        failedAttempts: 0,
        ownerUserId: null,
      };
    }

    return {
      initialized: true,
      lockedUntil: data.locked_until,
      failedAttempts: data.failed_attempts,
      ownerUserId: data.owner_user_id,
    };
  }

  async getVaultConfig(): Promise<VaultConfigRecord | null> {
    const { data, error } = await this.client
      .from("vault_config")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    if (error) throw new Error(`Erro ao carregar vault_config: ${error.message}`);
    return (data as VaultConfigRecord | null) ?? null;
  }

  async setupVaultPin(pinHash: string, preferredUserId?: string): Promise<{ userId: string }> {
    const profileId = preferredUserId ?? crypto.randomUUID();
    const { data: profile, error: profileErr } = await this.client
      .from("profiles")
      .upsert({ id: profileId, display_name: "Pessoal" }, { onConflict: "id" })
      .select("id")
      .single();

    if (profileErr || !profile) {
      throw new Error(`Erro ao criar perfil do cofre: ${profileErr?.message}`);
    }

    const { error: vaultErr } = await this.client.from("vault_config").insert({
      id: true,
      owner_user_id: profile.id,
      pin_hash: pinHash,
      failed_attempts: 0,
      locked_until: null,
    });

    if (vaultErr) {
      throw new Error(`Erro ao salvar PIN do cofre: ${vaultErr.message}`);
    }

    return { userId: profile.id as string };
  }

  async recordFailedPinAttempt(failedAttempts: number, lockedUntil: string | null): Promise<void> {
    const { error } = await this.client
      .from("vault_config")
      .update({
        failed_attempts: failedAttempts,
        locked_until: lockedUntil,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    if (error) throw new Error(error.message);
  }

  async resetFailedPinAttempts(): Promise<void> {
    const { error } = await this.client
      .from("vault_config")
      .update({
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    if (error) throw new Error(error.message);
  }

  async getProfile(userId: string): Promise<ProfileRecord | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as ProfileRecord | null) ?? null;
  }

  async updateProfile(
    userId: string,
    patch: {
      default_budget_cents?: number | null;
      theme_preference?: ThemePreference;
      sound_enabled?: boolean;
    }
  ): Promise<ProfileRecord> {
    const updatePayload: Record<string, unknown> = {};
    if (patch.default_budget_cents !== undefined) {
      updatePayload.default_budget_cents = patch.default_budget_cents;
    }
    if (patch.theme_preference !== undefined) {
      updatePayload.theme_preference = patch.theme_preference;
    }
    if (patch.sound_enabled !== undefined) {
      updatePayload.sound_enabled = patch.sound_enabled;
    }

    const { data, error } = await this.client
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Perfil não encontrado");
    return data as ProfileRecord;
  }

  async listTransactionsForMonth(userId: string, billingMonth: string): Promise<TransactionRecord[]> {
    const { data, error } = await this.client
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("billing_month", billingMonth)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data as TransactionRecord[]) ?? [];
  }

  async listTransactionsInMonths(userId: string, billingMonths: string[]): Promise<TransactionRecord[]> {
    if (billingMonths.length === 0) return [];
    const { data, error } = await this.client
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .in("billing_month", billingMonths);

    if (error) throw new Error(error.message);
    return (data as TransactionRecord[]) ?? [];
  }

  async getTransactionById(userId: string, transactionId: string): Promise<TransactionRecord | null> {
    const { data, error } = await this.client
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("id", transactionId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as TransactionRecord | null) ?? null;
  }

  async createTransactions(
    userId: string,
    items: CreateTransactionInput[]
  ): Promise<TransactionRecord[]> {
    const rows = items.map((item) => ({
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
    }));

    const { data, error } = await this.client
      .from("transactions")
      .insert(rows)
      .select("*");

    if (error) throw new Error(error.message);
    return (data as TransactionRecord[]) ?? [];
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    patch: UpdateTransactionInput
  ): Promise<TransactionRecord | null> {
    const allowed: Record<string, unknown> = {};
    if (patch.title !== undefined) allowed.title = patch.title;
    if (patch.amount_cents !== undefined) allowed.amount_cents = patch.amount_cents;
    if (patch.category_slug !== undefined) allowed.category_slug = patch.category_slug;
    if (patch.occurred_on !== undefined) allowed.occurred_on = patch.occurred_on;
    if (patch.billing_month !== undefined) allowed.billing_month = patch.billing_month;
    if (patch.kind !== undefined) allowed.kind = patch.kind;

    const { data, error } = await this.client
      .from("transactions")
      .update(allowed)
      .eq("user_id", userId)
      .eq("id", transactionId)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as TransactionRecord | null) ?? null;
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("transactions")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("id", transactionId);

    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  async deleteLatestUserAction(
    userId: string,
    billingMonth: string
  ): Promise<{ removedCount: number; title: string; amountCents: number } | null> {
    const { data: latestTx } = await this.client
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("billing_month", billingMonth)
      .eq("is_skipped", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestTx) return null;
    const tx = latestTx as TransactionRecord;

    if (tx.installment_plan_id) {
      const { data: plan } = await this.client
        .from("installment_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("id", tx.installment_plan_id)
        .maybeSingle();

      await this.deleteInstallmentPlan(userId, tx.installment_plan_id);
      const typedPlan = plan as InstallmentPlanRecord | null;
      return {
        removedCount: typedPlan?.installment_count ?? tx.installment_total ?? 1,
        title: typedPlan?.title ?? tx.title,
        amountCents: typedPlan?.total_amount_cents ?? tx.amount_cents,
      };
    }

    await this.deleteTransaction(userId, tx.id);
    return {
      removedCount: 1,
      title: tx.title,
      amountCents: tx.amount_cents,
    };
  }

  async createInstallmentPlan(
    userId: string,
    input: CreateInstallmentPlanInput
  ): Promise<{ plan: InstallmentPlanRecord; installments: TransactionRecord[] }> {
    const { data: planData, error: planError } = await this.client
      .from("installment_plans")
      .insert({
        user_id: userId,
        title: input.title,
        category_slug: input.category_slug,
        total_amount_cents: input.total_amount_cents,
        installment_count: input.installment_count,
        start_month: input.start_month,
      })
      .select("*")
      .single();

    if (planError || !planData) {
      throw new Error(planError?.message ?? "Erro ao criar parcelamento");
    }

    const plan = planData as InstallmentPlanRecord;

    const txRows: CreateTransactionInput[] = input.installment_amounts_cents.map((cents, index) => {
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
    });

    const installments = await this.createTransactions(userId, txRows);
    return { plan, installments };
  }

  async listInstallmentPlans(userId: string): Promise<InstallmentPlanRecord[]> {
    const { data, error } = await this.client
      .from("installment_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data as InstallmentPlanRecord[]) ?? [];
  }

  async deleteInstallmentPlan(userId: string, planId: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("installment_plans")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("id", planId);

    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  async listRecurringRules(userId: string): Promise<RecurringRuleRecord[]> {
    const { data, error } = await this.client
      .from("recurring_rules")
      .select("*")
      .eq("user_id", userId)
      .order("day_of_month", { ascending: true });

    if (error) throw new Error(error.message);
    return (data as RecurringRuleRecord[]) ?? [];
  }

  async getRecurringRuleById(
    userId: string,
    ruleId: string
  ): Promise<RecurringRuleRecord | null> {
    const { data, error } = await this.client
      .from("recurring_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("id", ruleId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as RecurringRuleRecord | null) ?? null;
  }

  async createRecurringRule(
    userId: string,
    input: CreateRecurringRuleInput
  ): Promise<RecurringRuleRecord> {
    const { data, error } = await this.client
      .from("recurring_rules")
      .insert({
        user_id: userId,
        kind: input.kind,
        title: input.title,
        amount_cents: input.amount_cents,
        category_slug: input.category_slug,
        day_of_month: input.day_of_month,
        start_month: input.start_month,
      })
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Erro ao criar regra recorrente");
    return data as RecurringRuleRecord;
  }

  async updateRecurringRule(
    userId: string,
    ruleId: string,
    patch: UpdateRecurringRuleInput
  ): Promise<RecurringRuleRecord | null> {
    const allowed: Record<string, unknown> = {};
    if (patch.title !== undefined) allowed.title = patch.title;
    if (patch.amount_cents !== undefined) allowed.amount_cents = patch.amount_cents;
    if (patch.category_slug !== undefined) allowed.category_slug = patch.category_slug;
    if (patch.day_of_month !== undefined) allowed.day_of_month = patch.day_of_month;
    if (patch.active !== undefined) allowed.active = patch.active;
    if (patch.end_month !== undefined) allowed.end_month = patch.end_month;

    const { data, error } = await this.client
      .from("recurring_rules")
      .update(allowed)
      .eq("user_id", userId)
      .eq("id", ruleId)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as RecurringRuleRecord | null) ?? null;
  }

  async deleteRecurringRule(userId: string, ruleId: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("recurring_rules")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("id", ruleId);

    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
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
    const { data: existing } = await this.client
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("recurring_rule_id", rule.id)
      .eq("billing_month", billingMonth)
      .maybeSingle();

    if (existing) {
      const { data, error } = await this.client
        .from("transactions")
        .update({
          title: patch.title ?? existing.title,
          amount_cents: patch.amount_cents ?? existing.amount_cents,
          category_slug: patch.category_slug ?? existing.category_slug,
          is_skipped: patch.is_skipped ?? existing.is_skipped,
          is_recurring_override: true,
        })
        .eq("user_id", userId)
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error || !data) throw new Error(error?.message ?? "Erro ao atualizar exceção fixa");
      return data as TransactionRecord;
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
    const { data, error } = await this.client
      .from("monthly_budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("billing_month", billingMonth);

    if (error) throw new Error(error.message);
    return (data as MonthlyBudgetRecord[]) ?? [];
  }

  async upsertMonthlyBudget(
    userId: string,
    billingMonth: string,
    categorySlug: CategorySlug | null,
    limitCents: number
  ): Promise<MonthlyBudgetRecord> {
    let query = this.client
      .from("monthly_budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("billing_month", billingMonth);

    query = categorySlug === null
      ? query.is("category_slug", null)
      : query.eq("category_slug", categorySlug);

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      const { data, error } = await this.client
        .from("monthly_budgets")
        .update({ limit_cents: limitCents })
        .eq("id", existing.id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Erro ao atualizar teto");
      return data as MonthlyBudgetRecord;
    }

    const { data, error } = await this.client
      .from("monthly_budgets")
      .insert({
        user_id: userId,
        billing_month: billingMonth,
        category_slug: categorySlug,
        limit_cents: limitCents,
      })
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Erro ao salvar teto");
    return data as MonthlyBudgetRecord;
  }

  async listChatEvents(
    userId: string,
    billingMonth: string,
    limit = 60
  ): Promise<ChatEventRecord[]> {
    const { data, error } = await this.client
      .from("chat_events")
      .select("*")
      .eq("user_id", userId)
      .eq("billing_month", billingMonth)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data as ChatEventRecord[]) ?? [];
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
    const { data, error } = await this.client
      .from("chat_events")
      .insert({
        user_id: userId,
        billing_month: input.billing_month,
        user_input_text: input.user_input_text,
        input_mode: input.input_mode,
        card_type: input.card_type,
        payload_json: input.payload_json,
      })
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Erro ao salvar evento no stream");
    return data as ChatEventRecord<T>;
  }
}
