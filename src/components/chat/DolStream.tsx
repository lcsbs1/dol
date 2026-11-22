"use client";

import { motion } from "framer-motion";
import { Mic, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import type {
  ChatEventRecord,
  EffectiveMonthItem,
  ExpenseCategorySlug,
} from "@/lib/finance/types";
import { triggerTactileFeedback } from "@/lib/tactile";
import { DolCardRenderer } from "./cards/DolCardRenderer";

interface DolStreamProps {
  events: ChatEventRecord[];
  processing: boolean;
  onSelectItem: (item: EffectiveMonthItem) => void;
  onSelectCategory: (slug: ExpenseCategorySlug | null) => void;
  onQuickPrompt: (text: string) => void;
}

const SAMPLE_CHIPS = [
  "Salário 6000 todo mês",
  "Aluguel 1800 todo dia 5",
  "Almoço 42 e Uber 18",
  "Tênis 600 em 6x",
];

export function DolStream({
  events,
  processing,
  onSelectItem,
  onSelectCategory,
  onQuickPrompt,
}: DolStreamProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length, processing]);

  if (events.length === 0 && !processing) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)]">
          <Sparkles className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <h2 className="mt-4 text-base font-semibold tracking-tight text-[var(--text-primary)]">
          Fale ou digite um gasto
        </h2>
        <p className="mt-1 max-w-xs text-xs text-[var(--text-muted)]">
          Toque em qualquer exemplo abaixo para testar o fluxo visual.
        </p>

        <div className="mt-5 flex max-w-sm flex-wrap justify-center gap-2">
          {SAMPLE_CHIPS.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                triggerTactileFeedback("tap");
                onQuickPrompt(sample);
              }}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-3.5 py-4 sm:px-5">
      {events.map((event) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-2"
        >
          {/* Fala / texto do usuário (à direita) */}
          <div className="flex justify-end">
            <div className="inline-flex max-w-[82%] items-center gap-1.5 rounded-2xl rounded-br-sm bg-[var(--surface-3)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)]">
              {event.input_mode === "voice" && (
                <Mic className="h-3 w-3 shrink-0 text-[var(--accent)]" />
              )}
              <span>{event.user_input_text}</span>
            </div>
          </div>

          {/* Resposta silenciosa visual/tátil do dol (à esquerda) */}
          <div className="max-w-[95%] sm:max-w-[88%]">
            <DolCardRenderer
              event={event}
              actions={{
                onSelectItem,
                onSelectCategory,
                onQuickPrompt,
              }}
            />
          </div>
        </motion.div>
      ))}

      {processing && (
        <div className="flex items-center gap-1.5 px-2 py-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.2s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.1s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--accent)]" />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
