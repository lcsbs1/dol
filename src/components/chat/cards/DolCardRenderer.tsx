"use client";

import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  Pencil,
  RotateCcw,
  ShieldAlert,
  Target,
} from "lucide-react";
import { useState } from "react";
import { getCategoryMeta } from "@/lib/finance/categories";
import { formatBRL, formatMonthLabel, parseBRLToCents } from "@/lib/finance/money";
import type {
  ChatEventRecord,
  DolCardPayloadMap,
  EffectiveMonthItem,
  ExpenseCategorySlug,
} from "@/lib/finance/types";
import { triggerTactileFeedback } from "@/lib/tactile";
import { CategoryIcon } from "../../CategoryIcon";

interface CardActionsProps {
  onSelectItem: (item: EffectiveMonthItem) => void;
  onSelectCategory: (slug: ExpenseCategorySlug | null) => void;
  onQuickPrompt: (text: string) => void;
}

export function DolCardRenderer({
  event,
  actions,
}: {
  event: ChatEventRecord;
  actions: CardActionsProps;
}) {
  switch (event.card_type) {
    case "transaction_batch":
      return (
        <TransactionBatchCard
          payload={event.payload_json as DolCardPayloadMap["transaction_batch"]}
          onSelectItem={actions.onSelectItem}
          onUndo={() => actions.onQuickPrompt("desfazer último")}
        />
      );
    case "installment":
      return (
        <InstallmentCard
          payload={event.payload_json as DolCardPayloadMap["installment"]}
          onSelectItem={actions.onSelectItem}
        />
      );
    case "recurring":
      return (
        <RecurringCard
          payload={event.payload_json as DolCardPayloadMap["recurring"]}
          billingMonth={event.billing_month}
          onSelectItem={actions.onSelectItem}
        />
      );
    case "budget":
      return <BudgetCard payload={event.payload_json as DolCardPayloadMap["budget"]} />;
    case "summary":
      return (
        <SummaryVisualCard
          payload={event.payload_json as DolCardPayloadMap["summary"]}
          onSelectCategory={actions.onSelectCategory}
        />
      );
    case "category_detail":
      return (
        <CategoryDetailCard
          payload={event.payload_json as DolCardPayloadMap["category_detail"]}
          onSelectItem={actions.onSelectItem}
        />
      );
    case "installments_timeline":
      return (
        <InstallmentsTimelineCard
          payload={event.payload_json as DolCardPayloadMap["installments_timeline"]}
        />
      );
    case "fixed_list":
      return (
        <FixedListCard
          payload={event.payload_json as DolCardPayloadMap["fixed_list"]}
          billingMonth={event.billing_month}
          onSelectItem={actions.onSelectItem}
        />
      );
    case "comparison":
      return <ComparisonCard payload={event.payload_json as DolCardPayloadMap["comparison"]} />;
    case "clarify":
      return (
        <ClarifyValueCard
          payload={event.payload_json as DolCardPayloadMap["clarify"]}
          onComplete={(title, amountText) =>
            actions.onQuickPrompt(`${title} ${amountText}`)
          }
        />
      );
    case "undo":
      return <UndoCard payload={event.payload_json as DolCardPayloadMap["undo"]} />;
    case "off_topic":
      return <OffTopicGuardCard />;
  }
}

function TransactionBatchCard({
  payload,
  onSelectItem,
  onUndo,
}: {
  payload: DolCardPayloadMap["transaction_batch"];
  onSelectItem: (item: EffectiveMonthItem) => void;
  onUndo: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3">
      <div className="space-y-1.5">
        {payload.items.map((item) => {
          const meta = getCategoryMeta(item.category_slug);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerTactileFeedback("tap");
                onSelectItem(item);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${meta.color}20` }}
                >
                  <CategoryIcon name={meta.icon} color={meta.color} className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">{meta.label}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`font-mono text-sm font-semibold tabular-nums ${
                    item.kind === "income" ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  {item.kind === "income" ? "+" : ""}
                  {formatBRL(item.amount_cents)}
                </span>
                <Pencil className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 text-[11px]">
        <span className="font-mono font-medium tabular-nums text-[var(--text-secondary)]">
          Total {formatBRL(payload.total_cents)}
        </span>
        <button
          type="button"
          onClick={() => {
            triggerTactileFeedback("tap");
            onUndo();
          }}
          className="inline-flex items-center gap-1 font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <RotateCcw className="h-3 w-3" />
          Desfazer
        </button>
      </div>
    </div>
  );
}

function InstallmentCard({
  payload,
  onSelectItem,
}: {
  payload: DolCardPayloadMap["installment"];
  onSelectItem: (item: EffectiveMonthItem) => void;
}) {
  const meta = getCategoryMeta(payload.plan.category_slug);
  const firstTx = payload.installments[0];

  const handleTap = () => {
    if (!firstTx) return;
    triggerTactileFeedback("tap");
    onSelectItem({
      id: firstTx.id,
      sourceType: "installment",
      kind: "expense",
      title: firstTx.title,
      amount_cents: firstTx.amount_cents,
      category_slug: firstTx.category_slug,
      occurred_on: firstTx.occurred_on,
      billing_month: firstTx.billing_month,
      installment_plan_id: payload.plan.id,
      installment_number: firstTx.installment_number,
      installment_total: payload.plan.installment_count,
      recurring_rule_id: null,
      created_at: firstTx.created_at,
    });
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3.5 text-left transition-colors hover:bg-[var(--surface-2)]/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${meta.color}20` }}
          >
            <CategoryIcon name={meta.icon} color={meta.color} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {payload.plan.title}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {meta.label} · 1/{payload.plan.installment_count} neste mês
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {formatBRL(payload.first_installment_cents)}/mês
          </p>
          <p className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
            Total {formatBRL(payload.plan.total_amount_cents)}
          </p>
        </div>
      </div>

      {/* Barra segmentada de parcelas */}
      <div className="mt-3 flex gap-1">
        {Array.from({ length: Math.min(12, payload.plan.installment_count) }, (_, idx) => (
          <span
            key={idx}
            className={`h-1.5 flex-1 rounded-full ${
              idx === 0 ? "bg-[var(--accent)]" : "bg-[var(--surface-3)]"
            }`}
          />
        ))}
      </div>
    </button>
  );
}

function RecurringCard({
  payload,
  billingMonth,
  onSelectItem,
}: {
  payload: DolCardPayloadMap["recurring"];
  billingMonth: string;
  onSelectItem: (item: EffectiveMonthItem) => void;
}) {
  const { rule } = payload;
  const meta = getCategoryMeta(rule.category_slug);

  return (
    <button
      type="button"
      onClick={() => {
        triggerTactileFeedback("tap");
        onSelectItem({
          id: `recurring:${rule.id}:${billingMonth}`,
          sourceType: "recurring_projected",
          kind: rule.kind,
          title: rule.title,
          amount_cents: rule.amount_cents,
          category_slug: rule.category_slug,
          occurred_on: `${billingMonth}-${String(rule.day_of_month).padStart(2, "0")}`,
          billing_month: billingMonth,
          installment_plan_id: null,
          installment_number: null,
          installment_total: null,
          recurring_rule_id: rule.id,
          created_at: rule.created_at,
        });
      }}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3.5 text-left transition-colors hover:bg-[var(--surface-2)]/60"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${meta.color}20` }}
        >
          <CategoryIcon name={meta.icon} color={meta.color} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{rule.title}</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
            <CalendarClock className="h-3 w-3" />
            Fixa · dia {rule.day_of_month}
          </span>
        </div>
      </div>

      <span
        className={`font-mono text-sm font-semibold tabular-nums ${
          rule.kind === "income" ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
        }`}
      >
        {rule.kind === "income" ? "+" : ""}
        {formatBRL(rule.amount_cents)}
      </span>
    </button>
  );
}

function BudgetCard({ payload }: { payload: DolCardPayloadMap["budget"] }) {
  const pct = Math.min(100, Math.round(payload.percent_used ?? 0));
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {payload.category_slug
              ? `Teto · ${getCategoryMeta(payload.category_slug).label}`
              : "Teto mensal"}
          </span>
        </div>
        <span className="font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
          {formatBRL(payload.limit_cents)}
        </span>
      </div>
      {payload.percent_used !== null && (
        <div className="mt-2.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div
              className={`h-full rounded-full transition-all ${
                (payload.percent_used ?? 0) > 100 ? "bg-rose-500" : "bg-[var(--accent)]"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
            {Math.round(payload.percent_used)}% utilizado
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryVisualCard({
  payload,
  onSelectCategory,
}: {
  payload: DolCardPayloadMap["summary"];
  onSelectCategory: (slug: ExpenseCategorySlug | null) => void;
}) {
  const { summary } = payload;
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3.5">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[var(--surface-2)] p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Gastos</p>
          <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)]">
            {formatBRL(summary.total_expense_cents)}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--surface-2)] p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Entradas</p>
          <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-[var(--accent)]">
            {formatBRL(summary.total_income_cents)}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--surface-2)] p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Saldo</p>
          <p
            className={`mt-0.5 font-mono text-xs font-semibold tabular-nums ${
              summary.balance_cents < 0 ? "text-rose-400" : "text-[var(--text-primary)]"
            }`}
          >
            {formatBRL(summary.balance_cents)}
          </p>
        </div>
      </div>

      {summary.slices.length > 0 && (
        <div className="mt-3 space-y-2">
          {summary.slices.slice(0, 4).map((slice) => (
            <button
              key={slice.category_slug}
              type="button"
              onClick={() => {
                triggerTactileFeedback("slice");
                onSelectCategory(slice.category_slug);
              }}
              className="block w-full text-left"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-primary)]">{slice.label}</span>
                <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                  {formatBRL(slice.amount_cents)} · {Math.round(slice.percentage_of_expenses)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, slice.percentage_of_expenses)}%`,
                    backgroundColor: slice.color,
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryDetailCard({
  payload,
  onSelectItem,
}: {
  payload: DolCardPayloadMap["category_detail"];
  onSelectItem: (item: EffectiveMonthItem) => void;
}) {
  const meta = getCategoryMeta(payload.category_slug);
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CategoryIcon name={meta.icon} color={meta.color} />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{meta.label}</span>
        </div>
        <div className="text-right font-mono tabular-nums">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {formatBRL(payload.total_cents)}
          </span>
          <span className="ml-2 text-xs text-[var(--accent)]">
            {Math.round(payload.percentage_of_expenses)}%
          </span>
        </div>
      </div>

      {payload.items.length > 0 && (
        <div className="mt-2.5 space-y-1 border-t border-[var(--border-subtle)] pt-2">
          {payload.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerTactileFeedback("tap");
                onSelectItem(item);
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--surface-2)]"
            >
              <span className="truncate text-[var(--text-secondary)]">{item.title}</span>
              <span className="font-mono font-medium tabular-nums text-[var(--text-primary)]">
                {formatBRL(item.amount_cents)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InstallmentsTimelineCard({
  payload,
}: {
  payload: DolCardPayloadMap["installments_timeline"];
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3.5">
      <div className="grid grid-cols-3 gap-2">
        {payload.future.slice(0, 6).map((m) => (
          <div key={m.billing_month} className="rounded-xl bg-[var(--surface-2)] p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {formatMonthLabel(m.billing_month)}
            </p>
            <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)]">
              {formatBRL(m.total_cents)}
            </p>
            {m.installment_cents > 0 && (
              <p className="font-mono text-[10px] tabular-nums text-[var(--accent)]">
                Parc. {formatBRL(m.installment_cents)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FixedListCard({
  payload,
  billingMonth,
  onSelectItem,
}: {
  payload: DolCardPayloadMap["fixed_list"];
  billingMonth: string;
  onSelectItem: (item: EffectiveMonthItem) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3.5">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 text-xs">
        <span className="font-semibold text-[var(--text-primary)]">
          Fixas ({payload.rules.length})
        </span>
        <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
          {formatBRL(payload.total_fixed_expense_cents)}/mês
        </span>
      </div>

      <div className="mt-2 space-y-1">
        {payload.rules.map((rule) => {
          const meta = getCategoryMeta(rule.category_slug);
          return (
            <button
              key={rule.id}
              type="button"
              onClick={() => {
                triggerTactileFeedback("tap");
                onSelectItem({
                  id: `recurring:${rule.id}:${billingMonth}`,
                  sourceType: "recurring_projected",
                  kind: rule.kind,
                  title: rule.title,
                  amount_cents: rule.amount_cents,
                  category_slug: rule.category_slug,
                  occurred_on: `${billingMonth}-${String(rule.day_of_month).padStart(2, "0")}`,
                  billing_month: billingMonth,
                  installment_plan_id: null,
                  installment_number: null,
                  installment_total: null,
                  recurring_rule_id: rule.id,
                  created_at: rule.created_at,
                });
              }}
              className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-xs hover:bg-[var(--surface-2)]"
            >
              <div className="flex items-center gap-2">
                <CategoryIcon name={meta.icon} color={meta.color} className="h-3.5 w-3.5" />
                <span className="text-[var(--text-primary)]">{rule.title}</span>
                <span className="text-[10px] text-[var(--text-muted)]">dia {rule.day_of_month}</span>
              </div>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  rule.kind === "income" ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                }`}
              >
                {rule.kind === "income" ? "+" : ""}
                {formatBRL(rule.amount_cents)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonCard({ payload }: { payload: DolCardPayloadMap["comparison"] }) {
  const up = (payload.delta_percent ?? 0) > 0;
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-[var(--text-muted)]">
            {formatMonthLabel(payload.previous_month)} → {formatMonthLabel(payload.current_month)}
          </p>
          <p className="font-mono text-base font-semibold tabular-nums text-[var(--text-primary)]">
            {formatBRL(payload.current_expense_cents)}
          </p>
        </div>
        {payload.delta_percent !== null && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-semibold tabular-nums ${
              up ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"
            }`}
          >
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {payload.delta_percent > 0 ? `+${payload.delta_percent}%` : `${payload.delta_percent}%`}
          </span>
        )}
      </div>
    </div>
  );
}

function ClarifyValueCard({
  payload,
  onComplete,
}: {
  payload: DolCardPayloadMap["clarify"];
  onComplete: (title: string, amountText: string) => void;
}) {
  const [val, setVal] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const meta = getCategoryMeta(payload.draft_category_slug);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseBRLToCents(val);
    if (!cents) {
      triggerTactileFeedback("guardrail");
      return;
    }
    triggerTactileFeedback("confirm");
    setSubmitted(true);
    onComplete(payload.draft_title, (cents / 100).toFixed(2).replace(".", ","));
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-3"
    >
      <div className="flex items-center gap-2">
        <CategoryIcon name={meta.icon} color={meta.color} />
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          {payload.draft_title} · R$?
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          disabled={submitted}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitted}
          aria-label="Confirmar valor"
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-white disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

function UndoCard({ payload }: { payload: DolCardPayloadMap["undo"] }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3.5 py-2 text-xs">
      <RotateCcw className="h-3.5 w-3.5 text-[var(--text-muted)]" />
      <span className="font-medium text-[var(--text-secondary)]">
        {payload.removed_count > 0
          ? `Removido: ${payload.removed_title} (${formatBRL(payload.removed_amount_cents)})`
          : "Nada para desfazer neste mês"}
      </span>
    </div>
  );
}

function OffTopicGuardCard() {
  return (
    <motion.div
      initial={{ x: -6 }}
      animate={{ x: [0, -5, 5, -3, 3, 0] }}
      transition={{ duration: 0.35 }}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)]"
    >
      <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
      <span>dol · apenas finanças</span>
    </motion.div>
  );
}
