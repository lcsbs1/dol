"use client";

import { formatMonthLabel } from "@/lib/finance/money";
import type { CategorySlice, ExpenseCategorySlug, FutureMonthCommitment } from "@/lib/finance/types";

export function FallbackDonut2D({
  slices,
  selectedCategory,
  onSelectCategory,
}: {
  slices: CategorySlice[];
  selectedCategory: ExpenseCategorySlug | null;
  onSelectCategory: (slug: ExpenseCategorySlug | null) => void;
}) {
  const total = slices.reduce((acc, s) => acc + s.amount_cents, 0);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90">
        {total === 0 ? (
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="22"
          />
        ) : (
          slices.map((slice) => {
            const fraction = slice.amount_cents / total;
            const dash = Math.max(4, fraction * circumference - 3);
            const offset = -accumulatedOffset;
            accumulatedOffset += fraction * circumference;
            const active = selectedCategory === slice.category_slug;

            return (
              <circle
                key={slice.category_slug}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={active ? 27 : 22}
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
                className="cursor-pointer transition-all duration-200"
                onClick={() =>
                  onSelectCategory(active ? null : slice.category_slug)
                }
              />
            );
          })
        )}
      </svg>
    </div>
  );
}

export function FallbackCommitments2D({
  future,
  selectedMonth,
  onSelectMonth,
}: {
  future: FutureMonthCommitment[];
  selectedMonth: string | null;
  onSelectMonth: (month: string) => void;
}) {
  const maxTotal = Math.max(1, ...future.map((m) => m.total_cents));

  return (
    <div className="flex h-full w-full items-end justify-center gap-3 px-4 pb-6 pt-8">
      {future.map((m) => {
        const fixedH = Math.round((m.fixed_cents / maxTotal) * 110);
        const instH = Math.round((m.installment_cents / maxTotal) * 110);
        const active = selectedMonth === m.billing_month;

        return (
          <button
            key={m.billing_month}
            type="button"
            onClick={() => onSelectMonth(m.billing_month)}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className={`flex w-8 flex-col justify-end gap-0.5 rounded-t-md transition-transform ${
                active ? "scale-105" : "opacity-85 hover:opacity-100"
              }`}
            >
              {instH > 0 && (
                <div
                  className="w-full rounded-sm bg-emerald-500"
                  style={{ height: Math.max(4, instH) }}
                />
              )}
              <div
                className="w-full rounded-sm bg-slate-500/70"
                style={{ height: Math.max(6, fixedH) }}
              />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {formatMonthLabel(m.billing_month).slice(0, 3)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
