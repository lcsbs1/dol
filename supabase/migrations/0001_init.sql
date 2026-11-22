-- ============================================================================
-- dol — Schema inicial (Supabase Postgres)
-- Preparado com user_id, índices compostos e RLS para multi-usuário futuro
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Perfis de usuário
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL DEFAULT 'Pessoal',
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL')),
  default_budget_cents BIGINT CHECK (default_budget_cents IS NULL OR default_budget_cents > 0),
  theme_preference TEXT NOT NULL DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light', 'system')),
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Configuração do cofre único (acesso exclusivo via service_role no servidor)
CREATE TABLE IF NOT EXISTS public.vault_config (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tetos mensais (geral ou por categoria)
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  billing_month TEXT NOT NULL CHECK (billing_month ~ '^\d{4}-\d{2}$'),
  category_slug TEXT,
  limit_cents BIGINT NOT NULL CHECK (limit_cents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS monthly_budgets_unique_idx
  ON public.monthly_budgets (user_id, billing_month, COALESCE(category_slug, '__all__'));

-- 4. Regras recorrentes (despesas e entradas fixas)
CREATE TABLE IF NOT EXISTS public.recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
  title TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  category_slug TEXT NOT NULL,
  day_of_month INT NOT NULL DEFAULT 5 CHECK (day_of_month BETWEEN 1 AND 31),
  start_month TEXT NOT NULL CHECK (start_month ~ '^\d{4}-\d{2}$'),
  end_month TEXT CHECK (end_month IS NULL OR end_month ~ '^\d{4}-\d{2}$'),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recurring_rules_user_active_idx
  ON public.recurring_rules (user_id, active, start_month);

-- 5. Planos de parcelamento
CREATE TABLE IF NOT EXISTS public.installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  total_amount_cents BIGINT NOT NULL CHECK (total_amount_cents > 0),
  installment_count INT NOT NULL CHECK (installment_count BETWEEN 2 AND 60),
  start_month TEXT NOT NULL CHECK (start_month ~ '^\d{4}-\d{2}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS installment_plans_user_start_idx
  ON public.installment_plans (user_id, start_month);

-- 6. Transações (avulsas, parcelas geradas e overrides/skips de fixas)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
  title TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  category_slug TEXT NOT NULL,
  occurred_on DATE NOT NULL,
  billing_month TEXT NOT NULL CHECK (billing_month ~ '^\d{4}-\d{2}$'),
  installment_plan_id UUID REFERENCES public.installment_plans(id) ON DELETE CASCADE,
  installment_number INT CHECK (installment_number IS NULL OR installment_number >= 1),
  installment_total INT CHECK (installment_total IS NULL OR installment_total >= 2),
  recurring_rule_id UUID REFERENCES public.recurring_rules(id) ON DELETE SET NULL,
  is_recurring_override BOOLEAN NOT NULL DEFAULT false,
  is_skipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_month_idx
  ON public.transactions (user_id, billing_month, created_at DESC);

CREATE INDEX IF NOT EXISTS transactions_installment_plan_idx
  ON public.transactions (installment_plan_id)
  WHERE installment_plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_recurring_month_idx
  ON public.transactions (user_id, recurring_rule_id, billing_month)
  WHERE recurring_rule_id IS NOT NULL;

-- 7. Eventos visuais do stream do chat
CREATE TABLE IF NOT EXISTS public.chat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  billing_month TEXT NOT NULL CHECK (billing_month ~ '^\d{4}-\d{2}$'),
  user_input_text TEXT NOT NULL,
  input_mode TEXT NOT NULL CHECK (input_mode IN ('voice', 'text')),
  card_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_events_user_month_idx
  ON public.chat_events (user_id, billing_month, created_at DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.vault_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_config FORCE ROW LEVEL SECURITY;

ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules FORCE ROW LEVEL SECURITY;

ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_plans FORCE ROW LEVEL SECURITY;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.chat_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_events FORCE ROW LEVEL SECURITY;

-- Políticas para multi-usuário futuro (usando (select auth.uid()) para performance)
CREATE POLICY profiles_self_policy ON public.profiles
  FOR ALL TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY monthly_budgets_user_policy ON public.monthly_budgets
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY recurring_rules_user_policy ON public.recurring_rules
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY installment_plans_user_policy ON public.installment_plans
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY transactions_user_policy ON public.transactions
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY chat_events_user_policy ON public.chat_events
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- vault_config não possui políticas públicas: somente service_role (backend) acessa.
