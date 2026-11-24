"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getCategoryMeta,
} from "@/lib/finance/categories";
import { parseBRLToCents } from "@/lib/finance/money";
import type { CategorySlug, EffectiveMonthItem } from "@/lib/finance/types";
import { triggerTactileFeedback } from "@/lib/tactile";
import { CategoryIcon } from "../CategoryIcon";

interface EditItemSheetProps {
  item: EffectiveMonthItem | null;
  activeMonth: string;
  onClose: () => void;
  onSave: (
    item: EffectiveMonthItem,
    patch: {
      title: string;
      amount_cents: number;
      category_slug: CategorySlug;
      scope: "single" | "rule";
    }
  ) => Promise<void>;
  onDelete: (
    item: EffectiveMonthItem,
    scope: "single" | "plan" | "rule"
  ) => Promise<void>;
}

export function EditItemSheet({
  item,
  onClose,
  onSave,
  onDelete,
}: EditItemSheetProps) {
  const [title, setTitle] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [categorySlug, setCategorySlug] = useState<CategorySlug>("outros");
  const [applyToRule, setApplyToRule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setAmountInput((item.amount_cents / 100).toFixed(2).replace(".", ","));
    setCategorySlug(item.category_slug);
    setApplyToRule(false);
    setError(null);
  }, [item]);

  if (!item) return null;

  const isRecurring =
    item.sourceType === "recurring_projected" || item.sourceType === "recurring_override";
  const isInstallment = Boolean(item.installment_plan_id);
  const categories =
    item.kind === "income"
      ? Object.values(INCOME_CATEGORIES)
      : Object.values(EXPENSE_CATEGORIES);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    const cents = parseBRLToCents(amountInput);
    if (!cents) {
      setError("Informe um valor válido maior que zero.");
      triggerTactileFeedback("guardrail");
      return;
    }
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Informe um nome para o item.");
      triggerTactileFeedback("guardrail");
      return;
    }

    setSaving(true);
    try {
      await onSave(item, {
        title: cleanTitle,
        amount_cents: cents,
        category_slug: categorySlug,
        scope: isRecurring && applyToRule ? "rule" : "single",
      });
      triggerTactileFeedback("confirm");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(scope: "single" | "plan" | "rule") {
    if (!item) return;
    setSaving(true);
    try {
      await onDelete(item, scope);
      triggerTactileFeedback("undo");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover.");
    } finally {
      setSaving(false);
    }
  }

  const meta = getCategoryMeta(categorySlug);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        <motion.form
          onSubmit={handleSave}
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="relative z-10 w-full max-w-md rounded-t-[28px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 pb-7 sm:rounded-[28px] sm:pb-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${meta.color}26` }}
              >
                <CategoryIcon name={meta.icon} color={meta.color} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Editar lançamento
                </h2>
                {isInstallment && (
                  <p className="text-[11px] tabular-nums text-[var(--text-muted)]">
                    Parcela {item.installment_number}/{item.installment_total}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar edição"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Descrição
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lilac)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Valor (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3.5 py-2.5 text-base font-semibold tabular-nums text-[var(--text-primary)] focus:border-[var(--accent-lilac)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                Categoria
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {categories.map((cat) => {
                  const selected = categorySlug === cat.slug;
                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => {
                        triggerTactileFeedback("tap");
                        setCategorySlug(cat.slug);
                      }}
                      className={`flex items-center gap-1.5 rounded-2xl border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                        selected
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                          : "border-[var(--border-subtle)] bg-[var(--surface-2)]/60 text-[var(--text-secondary)]"
                      }`}
                    >
                      <CategoryIcon name={cat.icon} color={cat.color} className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{cat.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isRecurring && (
              <label className="flex items-center gap-2.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)]/50 px-3 py-2 text-xs text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={applyToRule}
                  onChange={(e) => setApplyToRule(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#D5C2FA]"
                />
                <span>Alterar para todos os próximos meses (regra fixa)</span>
              </label>
            )}

            {error && <p className="text-xs font-medium text-rose-400">{error}</p>}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] transition-opacity hover:opacity-95 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Salvar alterações
            </button>

            {isInstallment ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleDelete("single")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-xs font-medium text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Só esta parcela
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleDelete("plan")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Todo parcelamento
                </button>
              </div>
            ) : isRecurring ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleDelete("single")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2.5 text-xs font-medium text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Pular este mês
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleDelete("rule")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Encerrar fixa
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDelete("single")}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir lançamento
              </button>
            )}
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  );
}
