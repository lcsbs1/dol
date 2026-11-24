"use client";

import { motion } from "framer-motion";
import { ChevronLeft, Mic, Sparkles } from "lucide-react";
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
  onBack?: () => void;
  showHeader?: boolean;
}

const SAMPLE_CARDS = [
  { title: "Salário", subtitle: "6000 todo mês", prompt: "Salário 6000 todo mês" },
  { title: "Aluguel", subtitle: "1800 todo dia 5", prompt: "Aluguel 1800 todo dia 5" },
  { title: "Almoço e Uber", subtitle: "42 e 18", prompt: "Almoço 42 e Uber 18" },
  { title: "Tênis", subtitle: "600 em 6x", prompt: "Tênis 600 em 6x" },
];

export function DolStream({
  events,
  processing,
  onSelectItem,
  onSelectCategory,
  onQuickPrompt,
  onBack,
  showHeader = true,
}: DolStreamProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length, processing]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showHeader && (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-[var(--border-subtle)] px-4 py-3.5 sm:px-5">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                triggerTactileFeedback("tap");
                onBack();
              }}
              aria-label="Voltar ao início"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-3)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
            Fale ou digite um gasto
          </h2>
        </div>
      )}

      {events.length === 0 && !processing ? (
        <div className="flex flex-1 flex-col justify-between px-4 py-6 sm:px-5">
          <div className="my-auto flex flex-col items-center text-center">
            <div className="dol-hero-gradient flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm">
              <Sparkles className="h-5 w-5 text-[#111216]" />
            </div>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-[var(--text-secondary)]">
              Toque em qualquer exemplo abaixo para testar ou envie por voz e texto.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {SAMPLE_CARDS.map((sample) => (
              <button
                key={sample.prompt}
                type="button"
                onClick={() => {
                  triggerTactileFeedback("tap");
                  onQuickPrompt(sample.prompt);
                }}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)]"
              >
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {sample.title}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {sample.subtitle}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-2.5"
            >
              {/* Fala / texto do usuário (à direita) */}
              <div className="flex justify-end">
                <div className="inline-flex max-w-[84%] items-center gap-1.5 rounded-2xl rounded-br-sm border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)]">
                  {event.input_mode === "voice" && (
                    <Mic className="h-3 w-3 shrink-0 text-[var(--accent)]" />
                  )}
                  <span>{event.user_input_text}</span>
                </div>
              </div>

              {/* Resposta silenciosa visual/tátil do dol (à esquerda) */}
              <div className="max-w-[96%] sm:max-w-[92%]">
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
            <div className="inline-flex items-center gap-1.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#EAF295] [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#E7F5DC] [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#D5C2FA]" />
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
