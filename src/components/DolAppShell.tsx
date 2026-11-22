"use client";

import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Moon,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  addMonths,
  formatMonthLabel,
  getCurrentBillingMonth,
  parseBRLToCents,
} from "@/lib/finance/money";
import type {
  CategorySlug,
  ChatEventRecord,
  EffectiveMonthItem,
  ExpenseCategorySlug,
  FutureMonthCommitment,
  MonthSummary,
  ProfileRecord,
} from "@/lib/finance/types";
import { setTactileSoundEnabled, triggerTactileFeedback } from "@/lib/tactile";
import { DolStream } from "./chat/DolStream";
import { EditItemSheet } from "./chat/EditItemSheet";
import { VoiceTextComposer } from "./composer/VoiceTextComposer";
import { FinanceStage3D } from "./stage/FinanceStage3D";
import { PinVaultScreen } from "./vault/PinVaultScreen";

interface AuthStatusResponse {
  authenticated: boolean;
  needsPinSetup: boolean;
  lockedUntil: string | null;
}

interface SummaryApiResponse {
  summary: MonthSummary;
  futureCommitments: FutureMonthCommitment[];
  profile: ProfileRecord | null;
  chatEvents: ChatEventRecord[];
}

export function DolAppShell() {
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [activeMonth, setActiveMonth] = useState<string>(() => getCurrentBillingMonth());
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [future, setFuture] = useState<FutureMonthCommitment[]>([]);
  const [events, setEvents] = useState<ChatEventRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategorySlug | null>(null);
  const [highlightedCategory, setHighlightedCategory] = useState<ExpenseCategorySlug | null>(null);
  const [editingItem, setEditingItem] = useState<EffectiveMonthItem | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    setTactileSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  const loadMonth = useCallback(async (month: string) => {
    const res = await fetch(`/api/summary?month=${encodeURIComponent(month)}`);
    if (res.status === 401) {
      setAuthStatus((prev) =>
        prev ? { ...prev, authenticated: false } : { authenticated: false, needsPinSetup: false, lockedUntil: null }
      );
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as SummaryApiResponse;
    setSummary(data.summary);
    setFuture(data.futureCommitments);
    setEvents(data.chatEvents);
    if (data.profile) {
      if (data.profile.theme_preference === "light" || data.profile.theme_preference === "dark") {
        setTheme(data.profile.theme_preference);
      }
      setSoundEnabled(data.profile.sound_enabled);
    }
  }, []);

  const checkAuthAndLoad = useCallback(async () => {
    const res = await fetch("/api/auth/status");
    const status = (await res.json()) as AuthStatusResponse;
    setAuthStatus(status);
    if (status.authenticated) {
      await loadMonth(activeMonth);
    }
  }, [activeMonth, loadMonth]);

  useEffect(() => {
    void checkAuthAndLoad();
  }, [checkAuthAndLoad]);

  useEffect(() => {
    if (authStatus?.authenticated) {
      setSelectedCategory(null);
      void loadMonth(activeMonth);
    }
  }, [activeMonth, authStatus?.authenticated, loadMonth]);

  const showToast = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };

  const applyServerState = (data: {
    summary: MonthSummary;
    futureCommitments: FutureMonthCommitment[];
    event?: ChatEventRecord;
    highlightCategory?: ExpenseCategorySlug | null;
  }) => {
    setSummary(data.summary);
    setFuture(data.futureCommitments);
    if (data.event) {
      setEvents((prev) => [...prev, data.event!]);
      if (data.event.card_type === "off_topic") {
        triggerTactileFeedback("guardrail");
      } else if (data.event.card_type === "undo") {
        triggerTactileFeedback("undo");
      } else {
        triggerTactileFeedback("confirm");
      }
    }
    if (data.highlightCategory) {
      setHighlightedCategory(data.highlightCategory);
      setTimeout(() => setHighlightedCategory(null), 2200);
    }
  };

  const handleSendText = async (text: string) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/dol", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Dol-Request": "1",
        },
        body: JSON.stringify({ text, activeMonth }),
      });
      const data = await res.json();
      if (!res.ok) {
        triggerTactileFeedback("guardrail");
        showToast(data.error ?? "Erro ao processar.");
        return;
      }
      applyServerState(data);
    } catch {
      showToast("Falha de rede.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSendAudio = async (blob: Blob) => {
    setProcessing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      form.append("activeMonth", activeMonth);

      const res = await fetch("/api/dol", {
        method: "POST",
        headers: {
          "X-Dol-Request": "1",
        },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        triggerTactileFeedback("guardrail");
        showToast(data.error ?? "Erro ao processar áudio.");
        return;
      }
      applyServerState(data);
    } catch {
      showToast("Falha ao enviar áudio.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveEdit = async (
    item: EffectiveMonthItem,
    patch: {
      title: string;
      amount_cents: number;
      category_slug: CategorySlug;
      scope: "single" | "rule";
    }
  ) => {
    const res = await fetch(`/api/transactions/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Dol-Request": "1",
      },
      body: JSON.stringify({
        ...patch,
        activeMonth,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Erro ao salvar.");
    setSummary(data.summary);
    setFuture(data.futureCommitments);
  };

  const handleDeleteEdit = async (
    item: EffectiveMonthItem,
    scope: "single" | "plan" | "rule"
  ) => {
    const res = await fetch(
      `/api/transactions/${encodeURIComponent(item.id)}?scope=${scope}&month=${encodeURIComponent(activeMonth)}`,
      {
        method: "DELETE",
        headers: { "X-Dol-Request": "1" },
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Erro ao remover.");
    setSummary(data.summary);
    setFuture(data.futureCommitments);
  };

  const toggleTheme = async () => {
    triggerTactileFeedback("tap");
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await fetch("/api/budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Dol-Request": "1" },
      body: JSON.stringify({ billing_month: activeMonth, theme_preference: next }),
    }).catch(() => {});
  };

  const toggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setTactileSoundEnabled(next);
    if (next) triggerTactileFeedback("tap");
    await fetch("/api/budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Dol-Request": "1" },
      body: JSON.stringify({ billing_month: activeMonth, sound_enabled: next }),
    }).catch(() => {});
  };

  const handleLock = async () => {
    triggerTactileFeedback("tap");
    await fetch("/api/auth/lock", {
      method: "POST",
      headers: { "X-Dol-Request": "1" },
    });
    setAuthStatus({ authenticated: false, needsPinSetup: false, lockedUntil: null });
  };

  const handleSaveBudgetModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseBRLToCents(budgetInput);
    if (!cents) {
      triggerTactileFeedback("guardrail");
      return;
    }
    const res = await fetch("/api/budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Dol-Request": "1" },
      body: JSON.stringify({ billing_month: activeMonth, limit_cents: cents }),
    });
    if (res.ok) {
      const data = await res.json();
      setSummary(data.summary);
      setFuture(data.futureCommitments);
      triggerTactileFeedback("confirm");
      setBudgetModalOpen(false);
    }
  };

  if (!authStatus) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-canvas)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (!authStatus.authenticated) {
    return (
      <PinVaultScreen
        needsPinSetup={authStatus.needsPinSetup}
        lockedUntil={authStatus.lockedUntil}
        onAuthenticated={() => {
          setAuthStatus({ authenticated: true, needsPinSetup: false, lockedUntil: null });
          void loadMonth(activeMonth);
        }}
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Top Bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-1)]/80 px-3.5 py-2.5 backdrop-blur-md sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] font-mono text-sm font-bold tracking-tight text-white">
            dol
          </span>

          <div className="flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] px-1.5 py-0.5">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => {
                triggerTactileFeedback("tap");
                setActiveMonth((m) => addMonths(m, -1));
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-20 text-center text-xs font-semibold capitalize text-[var(--text-primary)]">
              {formatMonthLabel(activeMonth)}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => {
                triggerTactileFeedback("tap");
                setActiveMonth((m) => addMonths(m, 1));
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void toggleSound()}
            aria-label={soundEnabled ? "Silenciar som tátil" : "Ativar som tátil"}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => void toggleTheme()}
            aria-label="Alternar tema"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => void handleLock()}
            aria-label="Bloquear cofre"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </header>

      {errorToast && (
        <div className="mx-auto mt-2 rounded-full border border-rose-500/30 bg-rose-500/15 px-4 py-1.5 text-xs font-medium text-rose-400">
          {errorToast}
        </div>
      )}

      {/* Modelo A Responsivo: Palco 3D Vivo + Stream dol */}
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 p-3 lg:grid lg:grid-cols-12 lg:gap-4 lg:p-4">
        <div className="shrink-0 lg:col-span-5 lg:min-h-0">
          {summary && (
            <FinanceStage3D
              summary={summary}
              future={future}
              selectedCategory={selectedCategory}
              highlightedCategory={highlightedCategory}
              onSelectCategory={setSelectedCategory}
              onOpenBudgetPrompt={() => {
                setBudgetInput(
                  summary.budget_cents
                    ? (summary.budget_cents / 100).toFixed(2).replace(".", ",")
                    : ""
                );
                setBudgetModalOpen(true);
              }}
              isDark={theme === "dark"}
            />
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-1)]/50 lg:col-span-7">
          <DolStream
            events={events}
            processing={processing}
            onSelectItem={setEditingItem}
            onSelectCategory={setSelectedCategory}
            onQuickPrompt={(p) => void handleSendText(p)}
          />

          <VoiceTextComposer
            busy={processing}
            onSendText={handleSendText}
            onSendAudio={handleSendAudio}
          />
        </div>
      </div>

      {/* Sheet de edição de card */}
      <EditItemSheet
        item={editingItem}
        activeMonth={activeMonth}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
        onDelete={handleDeleteEdit}
      />

      {/* Popover rápido de teto mensal */}
      {budgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={(e) => void handleSaveBudgetModal(e)}
            className="w-full max-w-xs rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5"
          >
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Teto de {formatMonthLabel(activeMonth)}
            </h2>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              placeholder="Ex: 4000,00"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="mt-3 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3.5 py-2.5 font-mono text-base tabular-nums text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBudgetModalOpen(false)}
                className="rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white"
              >
                Salvar teto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
