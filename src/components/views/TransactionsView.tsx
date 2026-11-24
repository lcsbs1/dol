"use client";

import {
  ChevronLeft,
  ChevronRight,
  Menu,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCategoryMeta } from "@/lib/finance/categories";
import { formatBRL, formatMonthLongLabel, formatMonthShortName } from "@/lib/finance/money";
import type {
  EffectiveMonthItem,
  ExpenseCategorySlug,
  MonthSummary,
} from "@/lib/finance/types";
import { triggerTactileFeedback } from "@/lib/tactile";
import { CategoryIcon } from "../CategoryIcon";

interface TransactionsViewProps {
  summary: MonthSummary;
  activeMonth: string;
  onChangeMonth: (offset: number) => void;
  focusSearchTrigger: number;
  selectedCategory: ExpenseCategorySlug | null;
  onSelectCategory: (slug: ExpenseCategorySlug | null) => void;
  onSelectItem: (item: EffectiveMonthItem) => void;
  onOpenChatWithPrefill: (prefill?: string) => void;
  onOpenMenu: () => void;
}

type KindFilter = "all" | "expense" | "income" | "fixed" | "installment";

export function TransactionsView({
  summary,
  activeMonth,
  onChangeMonth,
  focusSearchTrigger,
  selectedCategory,
  onSelectCategory,
  onSelectItem,
  onOpenChatWithPrefill,
  onOpenMenu,
}: TransactionsViewProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<KindFilter>("all");
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (focusSearchTrigger > 0) {
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [focusSearchTrigger]);

  const filteredItems = summary.items.filter((item) => {
    if (selectedCategory && item.category_slug !== selectedCategory) {
      return false;
    }
    if (filter === "expense" && item.kind !== "expense") return false;
    if (filter === "income" && item.kind !== "income") return false;
    if (
      filter === "fixed" &&
      item.sourceType !== "recurring_projected" &&
      item.sourceType !== "recurring_override"
    ) {
      return false;
    }
    if (filter === "installment" && item.sourceType !== "installment") return false;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const meta = getCategoryMeta(item.category_slug);
      return (
        item.title.toLowerCase().includes(q) ||
        meta.label.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
          onClick={() => onOpenChatWithPrefill("")}
          aria-label="Registrar lançamento"
          className="dol-mic-button flex h-9 w-9 items-center justify-center rounded-full text-[#111216]"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Transações
        </h1>

        <div className="hidden items-center gap-3 lg:flex">
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

      {/* Busca e Filtros */}
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar lançamento ou categoria..."
            className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lilac)] focus:outline-none"
          />
        </div>

        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {(
            [
              { id: "all", label: "Todos" },
              { id: "expense", label: "Gastos" },
              { id: "income", label: "Entradas" },
              { id: "fixed", label: "Fixas" },
              { id: "installment", label: "Parcelas" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === opt.id
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                  : "border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {selectedCategory && (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-1 text-xs text-[var(--text-secondary)]"
          >
            <span>Filtro: {getCategoryMeta(selectedCategory).label}</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Lista de Lançamentos */}
      <div className="mt-4 space-y-2">
        {filteredItems.length === 0 ? (
          <div className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Nenhum lançamento encontrado neste mês.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const meta = getCategoryMeta(item.category_slug);
            const tag =
              item.sourceType === "installment"
                ? `${item.installment_number}/${item.installment_total}`
                : item.sourceType === "recurring_projected" ||
                    item.sourceType === "recurring_override"
                  ? "fixa"
                  : item.occurred_on.slice(8, 10) + "/" + item.occurred_on.slice(5, 7);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerTactileFeedback("tap");
                  onSelectItem(item);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${meta.color}26` }}
                  >
                    <CategoryIcon name={meta.icon} color={meta.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {meta.label} · {tag}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    item.kind === "income"
                      ? "text-[var(--accent-mint)]"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  {item.kind === "income" ? "+" : ""}
                  {formatBRL(item.amount_cents)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
