"use client";

import dynamic from "next/dynamic";
import React, { Component, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Layers, PieChart, X } from "lucide-react";
import { formatBRL, formatMonthLabel } from "@/lib/finance/money";
import type {
  ExpenseCategorySlug,
  FutureMonthCommitment,
  MonthSummary,
} from "@/lib/finance/types";
import { triggerTactileFeedback } from "@/lib/tactile";
import { FallbackCommitments2D, FallbackDonut2D } from "./Fallback2DStage";

const Donut3DScene = dynamic(() => import("./Donut3DScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-[var(--surface-2)]/40" />,
});

const Commitments3DScene = dynamic(() => import("./Commitments3DScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-[var(--surface-2)]/40" />,
});

class StageErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

interface FinanceStage3DProps {
  summary: MonthSummary;
  future: FutureMonthCommitment[];
  selectedCategory: ExpenseCategorySlug | null;
  highlightedCategory: ExpenseCategorySlug | null;
  onSelectCategory: (slug: ExpenseCategorySlug | null) => void;
  onOpenBudgetPrompt: () => void;
  isDark: boolean;
}

export function FinanceStage3D({
  summary,
  future,
  selectedCategory,
  highlightedCategory,
  onSelectCategory,
  onOpenBudgetPrompt,
  isDark,
}: FinanceStage3DProps) {
  const [stageTab, setStageTab] = useState<"donut" | "commitments">("donut");
  const [collapsedMobile, setCollapsedMobile] = useState(false);
  const [selectedFutureMonth, setSelectedFutureMonth] = useState<string | null>(
    future[0]?.billing_month ?? null
  );

  const selectedSlice = summary.slices.find((s) => s.category_slug === selectedCategory) ?? null;
  const activeFuture =
    future.find((m) => m.billing_month === selectedFutureMonth) ?? future[0] ?? null;

  const percentDisplay =
    summary.percent_used !== null ? `${Math.round(summary.percent_used)}%` : null;

  return (
    <section className="relative flex flex-col rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3.5 shadow-sm lg:h-full lg:p-5">
      {/* Cabeçalho do Palco */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] p-0.5">
          <button
            type="button"
            onClick={() => {
              triggerTactileFeedback("tap");
              setStageTab("donut");
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              stageTab === "donut"
                ? "bg-[var(--surface-1)] text-[var(--text-primary)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <PieChart className="h-3.5 w-3.5" />
            Pizza 3D
          </button>
          <button
            type="button"
            onClick={() => {
              triggerTactileFeedback("tap");
              setStageTab("commitments");
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              stageTab === "commitments"
                ? "bg-[var(--surface-1)] text-[var(--text-primary)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Compromissos
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerTactileFeedback("tap");
              onOpenBudgetPrompt();
            }}
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            {summary.budget_cents ? `Teto ${formatBRL(summary.budget_cents)}` : "Definir teto"}
          </button>

          <button
            type="button"
            onClick={() => setCollapsedMobile((v) => !v)}
            aria-label={collapsedMobile ? "Expandir palco 3D" : "Recolher palco 3D"}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] lg:hidden"
          >
            {collapsedMobile ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Área 3D */}
      {!collapsedMobile && (
        <div className="mt-2 flex flex-col lg:mt-4 lg:flex-1 lg:min-h-0">
          {stageTab === "donut" ? (
            <>
              <div className="relative h-48 w-full sm:h-56 lg:h-auto lg:min-h-[240px] lg:flex-1">
                <StageErrorBoundary
                  fallback={
                    <FallbackDonut2D
                      slices={summary.slices}
                      selectedCategory={selectedCategory}
                      onSelectCategory={(slug) => {
                        triggerTactileFeedback("slice");
                        onSelectCategory(slug);
                      }}
                    />
                  }
                >
                  <Donut3DScene
                    slices={summary.slices}
                    selectedCategory={selectedCategory}
                    highlightedCategory={highlightedCategory}
                    onSelectCategory={(slug) => {
                      triggerTactileFeedback("slice");
                      onSelectCategory(slug);
                    }}
                    isDark={isDark}
                  />
                </StageErrorBoundary>
              </div>

              {/* HUD inferior separado do Canvas para nunca sobrepor o 3D */}
              <div className="mt-1 flex items-center justify-between px-1">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    {selectedSlice
                      ? selectedSlice.label
                      : summary.reference_mode === "budget"
                        ? "Do teto mensal"
                        : summary.reference_mode === "income"
                          ? "Das entradas"
                          : "Total gasto"}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">
                      {selectedSlice
                        ? formatBRL(selectedSlice.amount_cents)
                        : formatBRL(summary.total_expense_cents)}
                    </span>
                    {selectedSlice ? (
                      <span className="font-mono text-xs font-medium text-[var(--accent)]">
                        {selectedSlice.percentage_of_expenses}%
                      </span>
                    ) : (
                      percentDisplay && (
                        <span
                          className={`font-mono text-xs font-semibold ${
                            (summary.percent_used ?? 0) > 100
                              ? "text-rose-400"
                              : "text-[var(--accent)]"
                          }`}
                        >
                          {percentDisplay}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {selectedSlice && (
                  <button
                    type="button"
                    onClick={() => onSelectCategory(null)}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)]/90 px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] backdrop-blur-sm"
                  >
                    <X className="h-3 w-3" />
                    Limpar
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="relative h-48 w-full sm:h-56 lg:h-auto lg:min-h-[240px] lg:flex-1">
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

              {activeFuture && (
                <div className="mt-1 flex items-end justify-between px-1">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      {formatMonthLabel(activeFuture.billing_month)}
                    </p>
                    <p className="font-mono text-xl font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatBRL(activeFuture.total_cents)}
                    </p>
                  </div>
                  <div className="flex gap-3 text-[11px] font-mono tabular-nums text-[var(--text-secondary)]">
                    <span>Fixas {formatBRL(activeFuture.fixed_cents)}</span>
                    <span className="text-[var(--accent)]">
                      Parc. {formatBRL(activeFuture.installment_cents)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Legenda clicável compacta */}
      {summary.slices.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[var(--border-subtle)] pt-2.5">
          {summary.slices.slice(0, 6).map((slice) => {
            const active = selectedCategory === slice.category_slug;
            return (
              <button
                key={slice.category_slug}
                type="button"
                onClick={() => {
                  triggerTactileFeedback("slice");
                  onSelectCategory(active ? null : slice.category_slug);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  active
                    ? "border-[var(--text-primary)] bg-[var(--surface-2)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-2)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span>{slice.label}</span>
                <span className="font-mono tabular-nums opacity-80">
                  {Math.round(slice.percentage_of_expenses)}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* KPIs compactos */}
      <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-[var(--border-subtle)] pt-2.5 text-center sm:text-left">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Entradas
          </p>
          <p className="font-mono text-sm font-semibold tabular-nums text-[var(--accent)]">
            {formatBRL(summary.total_income_cents)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Fixas + Parc.
          </p>
          <p className="font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {formatBRL(summary.fixed_expense_cents + summary.installment_expense_cents)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Saldo
          </p>
          <p
            className={`font-mono text-sm font-semibold tabular-nums ${
              summary.balance_cents < 0 ? "text-rose-400" : "text-[var(--text-primary)]"
            }`}
          >
            {formatBRL(summary.balance_cents)}
          </p>
        </div>
      </div>
    </section>
  );
}
