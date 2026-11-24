"use client";

import dynamic from "next/dynamic";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Menu,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { formatBRL, formatMonthLongLabel, formatMonthShortName } from "@/lib/finance/money";
import type { ExpenseCategorySlug, MonthSummary } from "@/lib/finance/types";
import { triggerTactileFeedback } from "@/lib/tactile";
import type { DolNavSection } from "../navigation/DolNavigation";
import { FallbackDonut2D } from "../stage/Fallback2DStage";
import { StageErrorBoundary } from "../stage/StageErrorBoundary";

const Donut3DScene = dynamic(() => import("../stage/Donut3DScene"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-2xl bg-[var(--surface-2)]/40" />
  ),
});

interface DashboardHomeViewProps {
  summary: MonthSummary;
  activeMonth: string;
  onChangeMonth: (offset: number) => void;
  displayName: string;
  selectedCategory: ExpenseCategorySlug | null;
  highlightedCategory: ExpenseCategorySlug | null;
  onSelectCategory: (slug: ExpenseCategorySlug | null) => void;
  onOpenBudgetPrompt: (categorySlug?: ExpenseCategorySlug | null) => void;
  onOpenChatWithPrefill: (prefill?: string) => void;
  onNavigate: (section: DolNavSection) => void;
  onOpenSearch: () => void;
  onOpenMenu: () => void;
  onOpenNameModal: () => void;
  isDark: boolean;
}

export function DashboardHomeView({
  summary,
  activeMonth,
  onChangeMonth,
  displayName,
  selectedCategory,
  highlightedCategory,
  onSelectCategory,
  onOpenBudgetPrompt,
  onOpenChatWithPrefill,
  onNavigate,
  onOpenSearch,
  onOpenMenu,
  onOpenNameModal,
  isDark,
}: DashboardHomeViewProps) {
  const [mobileChartMode, setMobileChartMode] = useState<"bars" | "3d">("bars");
  const selectedSlice =
    summary.slices.find((s) => s.category_slug === selectedCategory) ?? null;

  const progressPct = Math.min(100, Math.round(summary.percent_used ?? 0));
  const overBudget = (summary.percent_used ?? 0) > 100;
  const maxBarPct = Math.max(
    1,
    ...summary.slices.slice(0, 5).map((s) => s.percentage_of_expenses)
  );
  const initial = (displayName.trim()[0] || "D").toUpperCase();

  return (
    <>
      {/* ======================= MOBILE HOME (Mockup #1 Esquerda) ======================= */}
      <div className="flex-1 overflow-y-auto pb-24 lg:hidden">
        {/* Cabeçalho curvo pastel */}
        <div className="dol-hero-gradient rounded-b-[32px] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-12">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  triggerTactileFeedback("tap");
                  onOpenNameModal();
                }}
                aria-label="Editar nome do perfil"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111216] text-sm font-bold text-[#F3F5A6]"
              >
                {initial}
              </button>
              <button
                type="button"
                onClick={onOpenNameModal}
                className="truncate text-left text-lg font-bold tracking-tight text-[#111216]"
              >
                Olá, {displayName}!
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
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
            </div>
          </div>

          {/* Seletor compacto de mês */}
          <div className="mt-3 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold text-[#111216]">
              <button
                type="button"
                aria-label="Mês anterior"
                onClick={() => {
                  triggerTactileFeedback("tap");
                  onChangeMonth(-1);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/10"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-20 text-center">
                {formatMonthShortName(activeMonth)} {activeMonth.slice(0, 4)}
              </span>
              <button
                type="button"
                aria-label="Próximo mês"
                onClick={() => {
                  triggerTactileFeedback("tap");
                  onChangeMonth(1);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/10"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Card escuro sobreposto: Saldo do mês */}
        <div className="-mt-8 mx-4 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 text-center shadow-lg">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Saldo do mês
          </p>
          <p
            className={`mt-1 text-3xl font-bold tabular-nums tracking-tight ${
              summary.balance_cents < 0 ? "text-rose-400" : "text-[var(--text-primary)]"
            }`}
          >
            {formatBRL(summary.balance_cents)}
          </p>
        </div>

        {/* Entradas recentes e Gastos recentes */}
        <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
            <p className="text-xs text-[var(--text-secondary)]">Entradas recentes</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[var(--text-primary)]">
              {formatBRL(summary.total_income_cents)}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
            <p className="text-xs text-[var(--text-secondary)]">Gastos recentes</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[var(--text-primary)]">
              {formatBRL(summary.total_expense_cents)}
            </p>
          </div>
        </div>

        {/* 3 Action Tiles */}
        <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              triggerTactileFeedback("tap");
              onOpenChatWithPrefill("");
            }}
            className="flex flex-col items-center justify-center gap-2 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-1)] py-3.5 transition-colors hover:bg-[var(--surface-2)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5B8D1] text-[#111216]">
              <Minus className="h-4 w-4 stroke-[2.5]" />
            </span>
            <span className="text-xs font-medium text-[var(--text-primary)]">Gasto</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerTactileFeedback("tap");
              onOpenChatWithPrefill("Recebi ");
            }}
            className="flex flex-col items-center justify-center gap-2 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-1)] py-3.5 transition-colors hover:bg-[var(--surface-2)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ACEFD6] text-[#111216]">
              <Plus className="h-4 w-4 stroke-[2.5]" />
            </span>
            <span className="text-xs font-medium text-[var(--text-primary)]">Entrada</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerTactileFeedback("tap");
              onNavigate("transacoes");
            }}
            className="flex flex-col items-center justify-center gap-2 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-1)] py-3.5 transition-colors hover:bg-[var(--surface-2)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D5C2FA] text-[#111216]">
              <Check className="h-4 w-4 stroke-[2.5]" />
            </span>
            <span className="text-xs font-medium text-[var(--text-primary)]">
              Ver transações
            </span>
          </button>
        </div>

        {/* Relatório do mês */}
        <section className="mx-4 mt-3 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
              Relatório do mês
            </h2>
            <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setMobileChartMode("bars")}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  mobileChartMode === "bars"
                    ? "bg-[var(--surface-1)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                Barras
              </button>
              <button
                type="button"
                onClick={() => setMobileChartMode("3d")}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  mobileChartMode === "3d"
                    ? "bg-[var(--surface-1)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                3D
              </button>
            </div>
          </div>

          {summary.slices.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-[var(--text-muted)]">
                Sem gastos registrados neste mês.
              </p>
              <button
                type="button"
                onClick={() => onOpenChatWithPrefill("")}
                className="mt-3 rounded-full bg-[var(--surface-2)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)]"
              >
                Registrar gasto
              </button>
            </div>
          ) : mobileChartMode === "bars" ? (
            <>
              <div className="mt-5 flex h-36 items-end gap-2.5">
                {summary.slices.slice(0, 5).map((slice) => {
                  const active = selectedCategory === slice.category_slug;
                  const barHeight = Math.max(
                    32,
                    Math.round((slice.percentage_of_expenses / maxBarPct) * 124)
                  );
                  return (
                    <button
                      key={slice.category_slug}
                      type="button"
                      onClick={() => {
                        triggerTactileFeedback("slice");
                        onSelectCategory(active ? null : slice.category_slug);
                      }}
                      className="flex flex-1 flex-col items-center justify-end"
                    >
                      <div
                        className={`flex w-full items-end justify-center rounded-2xl pb-2 transition-all ${
                          active ? "ring-2 ring-[var(--text-primary)]" : ""
                        }`}
                        style={{
                          height: `${barHeight}px`,
                          backgroundColor: slice.color,
                        }}
                      >
                        <span className="text-xs font-bold tabular-nums text-[#111216]">
                          {Math.round(slice.percentage_of_expenses)}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedSlice && (
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-[var(--surface-2)] px-3.5 py-2 text-xs">
                  <span className="font-medium text-[var(--text-primary)]">
                    {selectedSlice.label} · {formatBRL(selectedSlice.amount_cents)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(null)}
                    className="text-[var(--text-muted)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                {summary.slices.slice(0, 5).map((slice) => (
                  <button
                    key={slice.category_slug}
                    type="button"
                    onClick={() => {
                      triggerTactileFeedback("slice");
                      onSelectCategory(
                        selectedCategory === slice.category_slug
                          ? null
                          : slice.category_slug
                      );
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-[4px]"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span>{slice.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-3">
              <div className="relative h-56 w-full">
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

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
                    {selectedSlice
                      ? formatBRL(selectedSlice.amount_cents)
                      : formatBRL(summary.total_expense_cents)}
                  </span>
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                    {selectedSlice ? selectedSlice.label : "gastos"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ======================= DESKTOP DASHBOARD (Mockup #3 Centro) ======================= */}
      <div className="hidden min-h-0 flex-1 flex-col lg:flex">
        {/* Seletor de mês centralizado */}
        <div className="flex shrink-0 items-center justify-center gap-4 pt-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => {
              triggerTactileFeedback("tap");
              onChangeMonth(-1);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="min-w-44 text-center text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {formatMonthLongLabel(activeMonth)}
          </h1>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => {
              triggerTactileFeedback("tap");
              onChangeMonth(1);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* 3 Stat Cards */}
        <div className="mt-4 grid shrink-0 grid-cols-3 gap-3.5">
          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Saldo</p>
            <p
              className={`mt-1.5 text-2xl font-bold tabular-nums tracking-tight ${
                summary.balance_cents < 0 ? "text-rose-400" : "text-[var(--text-primary)]"
              }`}
            >
              {formatBRL(summary.balance_cents)}
            </p>
          </div>

          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Entradas</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
              {formatBRL(summary.total_income_cents)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerTactileFeedback("tap");
              onOpenBudgetPrompt(null);
            }}
            className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 text-left transition-colors hover:border-[var(--border-strong)]"
          >
            <p className="text-xs font-medium text-[var(--text-secondary)]">Gastos</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
              {formatBRL(summary.total_expense_cents)}
            </p>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className={`h-full rounded-full transition-all ${
                  overBudget ? "bg-rose-400" : "dol-progress-gradient"
                }`}
                style={{ width: `${Math.max(summary.percent_used ? 6 : 0, progressPct)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs tabular-nums text-[var(--text-secondary)]">
              {summary.percent_used !== null ? (
                <>
                  <span className="font-semibold text-[var(--accent)]">
                    {Math.round(summary.percent_used)}%
                  </span>{" "}
                  {summary.reference_mode === "budget" ? "do teto" : "das entradas"}
                </>
              ) : (
                <span className="text-[var(--text-muted)]">Definir teto</span>
              )}
            </p>
          </button>
        </div>

        {/* Grande Card Donut 3D */}
        <section className="relative mt-4 flex min-h-[300px] flex-1 flex-col rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
          {selectedSlice && (
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </button>
          )}

          <div className="relative min-h-[230px] flex-1">
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

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]">
                {selectedSlice
                  ? formatBRL(selectedSlice.amount_cents)
                  : formatBRL(summary.total_expense_cents)}
              </span>
              <span className="mt-0.5 text-xs font-medium text-[var(--text-secondary)]">
                {selectedSlice
                  ? `${selectedSlice.label} · ${Math.round(selectedSlice.percentage_of_expenses)}%`
                  : "gastos"}
              </span>
            </div>
          </div>

          {summary.slices.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-[var(--border-subtle)] pt-3">
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
                    className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs transition-opacity ${
                      selectedCategory && !active
                        ? "opacity-45 hover:opacity-80"
                        : "opacity-100"
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-[4px]"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="font-medium text-[var(--text-primary)]">
                      {slice.label}
                    </span>
                    <span className="tabular-nums text-[var(--text-muted)]">
                      {Math.round(slice.percentage_of_expenses)}%
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
