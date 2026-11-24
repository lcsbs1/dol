"use client";

import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { getCategoryMeta } from "@/lib/finance/categories";
import { formatBRL, formatMonthLongLabel, formatMonthShortName } from "@/lib/finance/money";
import type {
  CategorySlug,
  ExpenseCategorySlug,
  MonthSummary,
  MonthlyBudgetRecord,
} from "@/lib/finance/types";
import { triggerTactileFeedback } from "@/lib/tactile";
import { CategoryIcon } from "../CategoryIcon";

interface BudgetsViewProps {
  summary: MonthSummary;
  budgets: MonthlyBudgetRecord[];
  activeMonth: string;
  onChangeMonth: (offset: number) => void;
  onOpenBudgetPrompt: (categorySlug?: ExpenseCategorySlug | null) => void;
  onDeleteBudget: (categorySlug: CategorySlug | null) => Promise<void>;
  onOpenSearch: () => void;
  onOpenMenu: () => void;
}

export function BudgetsView({
  summary,
  budgets,
  activeMonth,
  onChangeMonth,
  onOpenBudgetPrompt,
  onDeleteBudget,
  onOpenSearch,
  onOpenMenu,
}: BudgetsViewProps) {
  const categoryBudgets = budgets.filter(
    (b): b is MonthlyBudgetRecord & { category_slug: ExpenseCategorySlug } =>
      b.category_slug !== null
  );

  const sliceBySlug = new Map(
    summary.slices.map((s) => [s.category_slug, s])
  );

  const unbudgetedSlices = summary.slices.filter(
    (s) => !categoryBudgets.some((b) => b.category_slug === s.category_slug)
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] lg:px-0 lg:pb-2 lg:pt-0">
      {/* Mobile Top Row */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <button
          type="button"
          onClick={() => {
            triggerTactileFeedback("tap");
            onOpenMenu();
          }}
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-1)] text-[var(--text-primary)]"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] px-2 py-1 text-xs font-medium text-[var(--text-primary)]">
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
          onClick={onOpenSearch}
          aria-label="Buscar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-1)] text-[var(--text-primary)]"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Meus tetos do mês
        </h1>

        <div className="hidden items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] lg:inline-flex">
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

      {/* Card Gradiente "Novo teto" (Mockup #2 Direita) */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => {
            triggerTactileFeedback("tap");
            onOpenBudgetPrompt(null);
          }}
          className="dol-hero-gradient flex min-h-[104px] w-full flex-col justify-between rounded-[26px] p-5 text-left transition-transform active:scale-[0.99] sm:max-w-sm"
        >
          <div className="flex w-full justify-end">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#111216]/25">
              <Plus className="h-4 w-4 text-[#111216]" />
            </span>
          </div>
          <span className="text-lg font-bold tracking-tight text-[#111216]">
            Novo teto
          </span>
        </button>
      </div>

      {/* Lista de Tetos */}
      <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {summary.budget_cents && (
          <BudgetProgressCard
            title="Teto geral"
            limitCents={summary.budget_cents}
            spentCents={summary.total_expense_cents}
            onEdit={() => onOpenBudgetPrompt(null)}
            onDelete={() => void onDeleteBudget(null)}
          />
        )}

        {categoryBudgets.map((budget) => {
          const meta = getCategoryMeta(budget.category_slug);
          const slice = sliceBySlug.get(budget.category_slug);
          return (
            <BudgetProgressCard
              key={budget.id}
              title={meta.label}
              icon={meta.icon}
              color={meta.color}
              limitCents={budget.limit_cents}
              spentCents={slice?.amount_cents ?? 0}
              onEdit={() => onOpenBudgetPrompt(budget.category_slug)}
              onDelete={() => void onDeleteBudget(budget.category_slug)}
            />
          );
        })}
      </div>

      {/* Categorias com gastos ainda sem teto */}
      {unbudgetedSlices.length > 0 && (
        <div className="mt-6">
          <p className="mb-2.5 text-xs font-medium text-[var(--text-secondary)]">
            Definir teto por categoria com gasto neste mês
          </p>
          <div className="flex flex-wrap gap-2">
            {unbudgetedSlices.map((slice) => (
              <button
                key={slice.category_slug}
                type="button"
                onClick={() => {
                  triggerTactileFeedback("tap");
                  onOpenBudgetPrompt(slice.category_slug);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span>{slice.label}</span>
                <Plus className="h-3 w-3 text-[var(--text-muted)]" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BudgetProgressCard({
  title,
  icon,
  color,
  limitCents,
  spentCents,
  onEdit,
  onDelete,
}: {
  title: string;
  icon?: string;
  color?: string;
  limitCents: number;
  spentCents: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rawPct = Math.round((spentCents / Math.max(1, limitCents)) * 100);
  const barPct = Math.min(100, rawPct);
  const over = rawPct > 100;

  return (
    <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          {icon && (
            <CategoryIcon name={icon} color={color} className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold tabular-nums ${
              over ? "text-rose-400" : "text-[var(--text-primary)]"
            }`}
          >
            {rawPct}%
          </span>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Remover ${title}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Barra larga em gradiente pastel (Mockup #2 Direita) */}
      <button
        type="button"
        onClick={onEdit}
        className="mt-3 block h-5 w-full overflow-hidden rounded-full bg-[var(--surface-2)] text-left"
      >
        <div
          className={`h-full rounded-full transition-all ${
            over ? "bg-rose-400" : "dol-progress-gradient"
          }`}
          style={{ width: `${Math.max(rawPct > 0 ? 8 : 0, barPct)}%` }}
        />
      </button>

      <div className="mt-3 flex items-end justify-between gap-2 text-xs">
        <div>
          <p className="text-[11px] text-[var(--text-muted)]">Limite</p>
          <p className="font-semibold tabular-nums text-[var(--text-primary)]">
            {formatBRL(limitCents)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-[var(--text-muted)]">Gasto</p>
          <p
            className={`font-semibold tabular-nums ${
              over ? "text-rose-400" : "text-[var(--accent)]"
            }`}
          >
            {formatBRL(spentCents)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-[var(--text-muted)]">Restante</p>
          <p className="tabular-nums text-[var(--text-secondary)]">
            {formatBRL(spentCents)} de {formatBRL(limitCents)}
          </p>
        </div>
      </div>
    </div>
  );
}
