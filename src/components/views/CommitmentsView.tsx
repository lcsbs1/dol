"use client";

import dynamic from "next/dynamic";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  MessageCircle,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getCategoryMeta } from "@/lib/finance/categories";
import {
  buildOccurredOnForMonth,
  formatBRL,
  formatCompactBRL,
  formatMonthLongLabel,
  formatMonthShortName,
} from "@/lib/finance/money";
import type {
  EffectiveMonthItem,
  FutureMonthCommitment,
  InstallmentPlanRecord,
  RecurringRuleRecord,
} from "@/lib/finance/types";
import { triggerTactileFeedback } from "@/lib/tactile";
import { CategoryIcon } from "../CategoryIcon";
import { FallbackCommitments2D } from "../stage/Fallback2DStage";
import { StageErrorBoundary } from "../stage/StageErrorBoundary";

const Commitments3DScene = dynamic(() => import("../stage/Commitments3DScene"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-2xl bg-[var(--surface-2)]/40" />
  ),
});

interface CommitmentsViewProps {
  mode: "all" | "parcelas" | "fixas";
  activeMonth: string;
  onChangeMonth: (offset: number) => void;
  future: FutureMonthCommitment[];
  recurringRules: RecurringRuleRecord[];
  installmentPlans: InstallmentPlanRecord[];
  monthItems: EffectiveMonthItem[];
  onSelectItem: (item: EffectiveMonthItem) => void;
  onOpenChatWithPrefill: (prefill?: string) => void;
  onOpenSearch: () => void;
  onOpenMenu: () => void;
  isDark: boolean;
}

export function CommitmentsView({
  mode,
  activeMonth,
  onChangeMonth,
  future,
  recurringRules,
  installmentPlans,
  monthItems,
  onSelectItem,
  onOpenChatWithPrefill,
  onOpenSearch,
  onOpenMenu,
  isDark,
}: CommitmentsViewProps) {
  const [filter, setFilter] = useState<"all" | "parcelas" | "fixas">(
    mode === "fixas" ? "fixas" : "all"
  );
  const [selectedFutureMonth, setSelectedFutureMonth] = useState<string | null>(
    future[0]?.billing_month ?? null
  );

  useEffect(() => {
    setFilter(mode === "fixas" ? "fixas" : "all");
  }, [mode]);

  const activeFuture =
    future.find((m) => m.billing_month === selectedFutureMonth) ?? future[0] ?? null;

  const activeInstallmentItems = monthItems.filter(
    (i) => i.sourceType === "installment" && i.installment_plan_id
  );
  const activeRuleList = recurringRules.filter((r) => r.active);
  const expenseRules = activeRuleList.filter((r) => r.kind === "expense");
  const incomeRules = activeRuleList.filter((r) => r.kind === "income");

  const makeRuleItem = (rule: RecurringRuleRecord): EffectiveMonthItem => ({
    id: `recurring:${rule.id}:${activeMonth}`,
    sourceType: "recurring_projected",
    kind: rule.kind,
    title: rule.title,
    amount_cents: rule.amount_cents,
    category_slug: rule.category_slug,
    occurred_on: buildOccurredOnForMonth(activeMonth, rule.day_of_month),
    billing_month: activeMonth,
    installment_plan_id: null,
    installment_number: null,
    installment_total: null,
    recurring_rule_id: rule.id,
    created_at: rule.created_at,
  });

  const installmentCards = installmentPlans.map((plan) => {
    const monthTx = activeInstallmentItems.find(
      (i) => i.installment_plan_id === plan.id
    );
    const currentNumber = monthTx?.installment_number ?? 1;
    const monthlyCents =
      monthTx?.amount_cents ?? Math.round(plan.total_amount_cents / plan.installment_count);
    const pct = Math.min(
      100,
      Math.round((currentNumber / Math.max(1, plan.installment_count)) * 100)
    );
    return { plan, monthTx, currentNumber, monthlyCents, pct };
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-24 lg:pb-2">
      {/* Cabeçalho Mobile (Mockup #2 Esquerda) */}
      <div className="dol-hero-gradient rounded-b-[32px] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6 lg:hidden">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              triggerTactileFeedback("tap");
              onOpenMenu();
            }}
            aria-label="Abrir menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111216] text-[#F5F6FA]"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold text-[#111216]">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => onChangeMonth(-1)}
              className="flex h-6 w-6 items-center justify-center rounded-full"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-1">
              {formatMonthShortName(activeMonth)} {activeMonth.slice(0, 4)}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => onChangeMonth(1)}
              className="flex h-6 w-6 items-center justify-center rounded-full"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerTactileFeedback("tap");
              onOpenSearch();
            }}
            aria-label="Buscar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111216] text-[#F5F6FA]"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#111216]">
          Parcelas e fixas
        </h1>
      </div>

      {/* Cabeçalho Desktop (Mockup #4) */}
      <div className="hidden shrink-0 items-center justify-between gap-4 pb-4 lg:flex">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Compromissos
          </h1>
          <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] px-2 py-1 text-xs font-medium text-[var(--text-primary)]">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => onChangeMonth(-1)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-28 text-center">
              {formatMonthLongLabel(activeMonth)}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => onChangeMonth(1)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] p-1 text-xs font-medium">
            {(
              [
                { id: "all", label: "Todos" },
                { id: "parcelas", label: "Parcelas" },
                { id: "fixas", label: "Fixas" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`rounded-full px-3 py-1 transition-colors ${
                  filter === opt.id
                    ? "bg-[var(--surface-2)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onOpenChatWithPrefill("")}
            className="dol-mic-button inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-[#111216]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Falar gasto
          </button>
        </div>
      </div>

      {/* Card Superior: Próximos 6 meses (3D pastel bars) */}
      <section className="mx-4 -mt-3 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 sm:p-5 lg:mx-0 lg:mt-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] sm:text-base">
            Próximos 6 meses
          </h2>
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#EAF295]" />
              fixas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#D5C2FA]" />
              parcelas
            </span>
          </div>
        </div>

        {/* Rótulos totais por mês */}
        <div className="mt-4 grid grid-cols-6 gap-1 text-center">
          {future.slice(0, 6).map((m) => (
            <button
              key={m.billing_month}
              type="button"
              onClick={() => {
                triggerTactileFeedback("slice");
                setSelectedFutureMonth(m.billing_month);
              }}
              className={`whitespace-nowrap text-[10px] font-semibold tabular-nums tracking-tight sm:text-xs ${
                activeFuture?.billing_month === m.billing_month
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {m.total_cents === 0
                ? "R$ 0"
                : formatCompactBRL(m.total_cents).replace(/\s+mil$/, "k")}
            </button>
          ))}
        </div>

        {/* Palco 3D de barras empilhadas */}
        <div className="h-44 w-full sm:h-52">
          <StageErrorBoundary
            fallback={
              <FallbackCommitments2D
                future={future}
                selectedMonth={selectedFutureMonth}
                onSelectMonth={(m) => {
                  triggerTactileFeedback("slice");
                  setSelectedFutureMonth(m);
                }}
              />
            }
          >
            <Commitments3DScene
              future={future}
              selectedMonth={selectedFutureMonth}
              onSelectMonth={(m) => {
                triggerTactileFeedback("slice");
                setSelectedFutureMonth(m);
              }}
              isDark={isDark}
            />
          </StageErrorBoundary>
        </div>

        {/* Meses abaixo */}
        <div className="grid grid-cols-6 gap-1 text-center">
          {future.slice(0, 6).map((m) => (
            <button
              key={m.billing_month}
              type="button"
              onClick={() => setSelectedFutureMonth(m.billing_month)}
              className={`text-xs font-medium ${
                activeFuture?.billing_month === m.billing_month
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-muted)]"
              }`}
            >
              {formatMonthShortName(m.billing_month)}
            </button>
          ))}
        </div>

        {activeFuture && (
          <div className="mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
            <span className="font-medium capitalize text-[var(--text-secondary)]">
              {formatMonthLongLabel(activeFuture.billing_month)} ·{" "}
              <strong className="tabular-nums text-[var(--text-primary)]">
                {formatBRL(activeFuture.total_cents)}
              </strong>
            </span>
            <span className="tabular-nums text-[var(--text-muted)]">
              Fixas {formatBRL(activeFuture.fixed_cents)} · Parc.{" "}
              {formatBRL(activeFuture.installment_cents)}
            </span>
          </div>
        )}
      </section>

      {/* Filtro compacto no Mobile */}
      <div className="mx-4 mt-3 flex gap-2 lg:hidden">
        {(
          [
            { id: "all", label: "Todos" },
            { id: "parcelas", label: "Parcelamentos" },
            { id: "fixas", label: "Fixas" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFilter(opt.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === opt.id
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Área Inferior: Parcelamentos + Despesas fixas (Desktop 2 colunas / Mobile cards) */}
      <div
        className={`mx-4 mt-3 grid gap-3.5 lg:mx-0 lg:mt-4 ${
          filter === "all" ? "lg:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {(filter === "all" || filter === "parcelas") && (
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Parcelamentos
              </h2>
              <button
                type="button"
                onClick={() => onOpenChatWithPrefill("")}
                aria-label="Novo parcelamento"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {installmentCards.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                Nenhum parcelamento ativo.
              </p>
            ) : (
              <div className="mt-3.5 space-y-2.5">
                {installmentCards.map(({ plan, monthTx, currentNumber, monthlyCents, pct }) => {
                  const meta = getCategoryMeta(plan.category_slug);
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      disabled={!monthTx}
                      onClick={() => {
                        if (monthTx) {
                          triggerTactileFeedback("tap");
                          onSelectItem(monthTx);
                        }
                      }}
                      className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3.5 text-left transition-colors hover:bg-[var(--surface-3)] disabled:opacity-70"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${meta.color}26` }}
                          >
                            <CategoryIcon name={meta.icon} color={meta.color} className="h-4 w-4" />
                          </div>
                          <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                            {plan.title} ·{" "}
                            <span className="tabular-nums text-[var(--text-secondary)]">
                              {currentNumber}/{plan.installment_count} ·{" "}
                              {formatBRL(monthlyCents)}
                            </span>
                          </span>
                        </div>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
                          {pct}%
                        </span>
                      </div>

                      <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-1)]">
                        <div
                          className="dol-progress-gradient h-full rounded-full"
                          style={{ width: `${Math.max(8, pct)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {(filter === "all" || filter === "fixas") && (
          <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Despesas fixas
              </h2>
              <button
                type="button"
                onClick={() => onOpenChatWithPrefill("")}
                aria-label="Nova fixa"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {expenseRules.length === 0 ? (
              <p className="py-5 text-center text-xs text-[var(--text-muted)]">
                Nenhuma despesa fixa ativa.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[var(--border-subtle)]">
                {expenseRules.map((rule) => {
                  const meta = getCategoryMeta(rule.category_slug);
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => {
                        triggerTactileFeedback("tap");
                        onSelectItem(makeRuleItem(rule));
                      }}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left transition-opacity hover:opacity-85"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${meta.color}26` }}
                        >
                          <CategoryIcon name={meta.icon} color={meta.color} className="h-4 w-4" />
                        </div>
                        <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {rule.title}{" "}
                          <span className="text-xs font-normal text-[var(--text-muted)]">
                            · dia {rule.day_of_month}
                          </span>
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                        {formatBRL(rule.amount_cents)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bloco Entradas fixas */}
            <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  Entradas fixas
                </span>
                <button
                  type="button"
                  onClick={() => onOpenChatWithPrefill("Salário ")}
                  aria-label="Adicionar entrada fixa"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {incomeRules.length === 0 ? (
                <p className="py-2 text-xs text-[var(--text-muted)]">
                  Nenhuma entrada recorrente.
                </p>
              ) : (
                <div className="mt-1 divide-y divide-[var(--border-subtle)]">
                  {incomeRules.map((rule) => (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => {
                        triggerTactileFeedback("tap");
                        onSelectItem(makeRuleItem(rule));
                      }}
                      className="flex w-full items-center justify-between py-2.5 text-left"
                    >
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {rule.title}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-[var(--accent-mint)]">
                        +{formatBRL(rule.amount_cents)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
