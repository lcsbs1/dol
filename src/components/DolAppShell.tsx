"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/finance/categories";
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
  InstallmentPlanRecord,
  MonthSummary,
  MonthlyBudgetRecord,
  ProfileRecord,
  RecurringRuleRecord,
} from "@/lib/finance/types";
import { setTactileSoundEnabled, triggerTactileFeedback } from "@/lib/tactile";
import { DolStream } from "./chat/DolStream";
import { EditItemSheet } from "./chat/EditItemSheet";
import { VoiceTextComposer } from "./composer/VoiceTextComposer";
import {
  DesktopSidebar,
  MobileBottomDock,
  MobileMenuDrawer,
  type DolNavSection,
} from "./navigation/DolNavigation";
import { PinVaultScreen } from "./vault/PinVaultScreen";
import { BudgetsView } from "./views/BudgetsView";
import { CommitmentsView } from "./views/CommitmentsView";
import { DashboardHomeView } from "./views/DashboardHomeView";
import { TransactionsView } from "./views/TransactionsView";

interface AuthStatusResponse {
  authenticated: boolean;
  needsPinSetup: boolean;
  lockedUntil: string | null;
}

interface FullMonthPayloadResponse {
  summary: MonthSummary;
  futureCommitments: FutureMonthCommitment[];
  recurringRules?: RecurringRuleRecord[];
  installmentPlans?: InstallmentPlanRecord[];
  budgets?: MonthlyBudgetRecord[];
  profile: ProfileRecord | null;
  chatEvents?: ChatEventRecord[];
  event?: ChatEventRecord;
  highlightCategory?: ExpenseCategorySlug | null;
}

export function DolAppShell() {
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [activeMonth, setActiveMonth] = useState<string>(() => getCurrentBillingMonth());
  const [activeSection, setActiveSection] = useState<DolNavSection>("inicio");

  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [future, setFuture] = useState<FutureMonthCommitment[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRuleRecord[]>([]);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlanRecord[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudgetRecord[]>([]);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [events, setEvents] = useState<ChatEventRecord[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategorySlug | null>(null);
  const [highlightedCategory, setHighlightedCategory] =
    useState<ExpenseCategorySlug | null>(null);
  const [editingItem, setEditingItem] = useState<EffectiveMonthItem | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopChatDrawer, setDesktopChatDrawer] = useState(false);
  const [composerPrefill, setComposerPrefill] = useState<string | null>(null);
  const [focusSearchTrigger, setFocusSearchTrigger] = useState(0);

  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState<ExpenseCategorySlug | null>(null);
  const [budgetInput, setBudgetInput] = useState("");

  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    setTactileSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  const applyFullMonthState = useCallback((data: FullMonthPayloadResponse) => {
    setSummary(data.summary);
    setFuture(data.futureCommitments);
    if (data.recurringRules) setRecurringRules(data.recurringRules);
    if (data.installmentPlans) setInstallmentPlans(data.installmentPlans);
    if (data.budgets) setBudgets(data.budgets);
    if (data.chatEvents) setEvents(data.chatEvents);
    if (data.profile) {
      setProfile(data.profile);
      if (
        data.profile.theme_preference === "light" ||
        data.profile.theme_preference === "dark"
      ) {
        setTheme(data.profile.theme_preference);
      }
      setSoundEnabled(data.profile.sound_enabled);
    }
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
  }, []);

  const loadMonth = useCallback(
    async (month: string) => {
      const res = await fetch(`/api/summary?month=${encodeURIComponent(month)}`);
      if (res.status === 401) {
        setAuthStatus((prev) =>
          prev
            ? { ...prev, authenticated: false }
            : { authenticated: false, needsPinSetup: false, lockedUntil: null }
        );
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as FullMonthPayloadResponse;
      applyFullMonthState(data);
    },
    [applyFullMonthState]
  );

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
      const data = (await res.json()) as FullMonthPayloadResponse & { error?: string };
      if (!res.ok) {
        triggerTactileFeedback("guardrail");
        showToast(data.error ?? "Erro ao processar.");
        return;
      }
      applyFullMonthState(data);
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
      const data = (await res.json()) as FullMonthPayloadResponse & { error?: string };
      if (!res.ok) {
        triggerTactileFeedback("guardrail");
        showToast(data.error ?? "Erro ao processar áudio.");
        return;
      }
      applyFullMonthState(data);
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
    const data = (await res.json()) as FullMonthPayloadResponse & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Erro ao salvar.");
    applyFullMonthState(data);
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
    const data = (await res.json()) as FullMonthPayloadResponse & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Erro ao remover.");
    applyFullMonthState(data);
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
    setMobileMenuOpen(false);
    await fetch("/api/auth/lock", {
      method: "POST",
      headers: { "X-Dol-Request": "1" },
    });
    setAuthStatus({ authenticated: false, needsPinSetup: false, lockedUntil: null });
  };

  const openBudgetModal = (categorySlug: ExpenseCategorySlug | null = null) => {
    setBudgetCategory(categorySlug);
    const existing =
      categorySlug === null
        ? summary?.budget_cents ?? null
        : budgets.find((b) => b.category_slug === categorySlug)?.limit_cents ?? null;
    setBudgetInput(
      existing ? (existing / 100).toFixed(2).replace(".", ",") : ""
    );
    setBudgetModalOpen(true);
  };

  const handleSelectBudgetCategoryInModal = (nextCategory: ExpenseCategorySlug | null) => {
    setBudgetCategory(nextCategory);
    const existing =
      nextCategory === null
        ? summary?.budget_cents ?? null
        : budgets.find((b) => b.category_slug === nextCategory)?.limit_cents ?? null;
    setBudgetInput(
      existing ? (existing / 100).toFixed(2).replace(".", ",") : ""
    );
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
      body: JSON.stringify({
        billing_month: activeMonth,
        category_slug: budgetCategory,
        limit_cents: cents,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as FullMonthPayloadResponse;
      applyFullMonthState(data);
      triggerTactileFeedback("confirm");
      setBudgetModalOpen(false);
    }
  };

  const handleDeleteBudget = async (categorySlug: CategorySlug | null) => {
    const query = new URLSearchParams({ month: activeMonth });
    if (categorySlug) query.set("category", categorySlug);

    const res = await fetch(`/api/budget?${query.toString()}`, {
      method: "DELETE",
      headers: { "X-Dol-Request": "1" },
    });
    if (res.ok) {
      const data = (await res.json()) as FullMonthPayloadResponse;
      applyFullMonthState(data);
      triggerTactileFeedback("undo");
      setBudgetModalOpen(false);
    }
  };

  const handleSaveNameModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      triggerTactileFeedback("guardrail");
      return;
    }
    const res = await fetch("/api/budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Dol-Request": "1" },
      body: JSON.stringify({ billing_month: activeMonth, display_name: trimmed }),
    });
    if (res.ok) {
      const data = (await res.json()) as FullMonthPayloadResponse;
      applyFullMonthState(data);
      triggerTactileFeedback("confirm");
      setNameModalOpen(false);
    }
  };

  const handleOpenChatWithPrefill = (prefill?: string) => {
    if (prefill !== undefined) {
      setComposerPrefill(prefill);
    }
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      if (activeSection !== "inicio") {
        setDesktopChatDrawer(true);
      }
    } else {
      setActiveSection("chat");
    }
  };

  const handleOpenSearch = () => {
    setActiveSection("transacoes");
    setFocusSearchTrigger((n) => n + 1);
  };

  const handleChangeMonth = (offset: number) => {
    setActiveMonth((m) => addMonths(m, offset));
  };

  const displayName =
    profile?.display_name && profile.display_name !== "Pessoal"
      ? profile.display_name
      : "Lucas";

  const hasBudgetForModalCategory =
    budgetCategory === null
      ? Boolean(summary?.budget_cents)
      : budgets.some((b) => b.category_slug === budgetCategory);

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

  const desktopEffectiveSection =
    activeSection === "chat" ? "inicio" : activeSection;
  const showDesktopRightColumn = desktopEffectiveSection === "inicio";

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Glow suave pastel superior */}
      <div className="dol-ambient-glow pointer-events-none fixed inset-x-0 top-0 z-0 h-80" />

      {errorToast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full border border-rose-500/30 bg-rose-500/15 px-4 py-1.5 text-xs font-medium text-rose-400 backdrop-blur-md">
          {errorToast}
        </div>
      )}

      {/* Workspace Principal (Desktop 2 ou 3 colunas / Mobile tela única fluida) */}
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 gap-4 lg:p-5">
        <DesktopSidebar
          activeSection={desktopEffectiveSection}
          onSelect={(section) => {
            setDesktopChatDrawer(false);
            setActiveSection(section);
          }}
          soundEnabled={soundEnabled}
          onToggleSound={() => void toggleSound()}
          theme={theme}
          onToggleTheme={() => void toggleTheme()}
          onLock={() => void handleLock()}
        />

        {/* Área Central Dinâmica */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!summary ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]" />
            </div>
          ) : (
            <>
              {(activeSection === "inicio" || activeSection === "chat") && (
                <div
                  className={
                    activeSection === "chat"
                      ? "hidden min-h-0 flex-1 flex-col lg:flex"
                      : "flex min-h-0 flex-1 flex-col"
                  }
                >
                  <DashboardHomeView
                    summary={summary}
                    activeMonth={activeMonth}
                    onChangeMonth={handleChangeMonth}
                    displayName={displayName}
                    selectedCategory={selectedCategory}
                    highlightedCategory={highlightedCategory}
                    onSelectCategory={setSelectedCategory}
                    onOpenBudgetPrompt={openBudgetModal}
                    onOpenChatWithPrefill={handleOpenChatWithPrefill}
                    onNavigate={(s) => setActiveSection(s)}
                    onOpenSearch={handleOpenSearch}
                    onOpenMenu={() => setMobileMenuOpen(true)}
                    onOpenNameModal={() => {
                      setNameInput(displayName);
                      setNameModalOpen(true);
                    }}
                    isDark={theme === "dark"}
                  />
                </div>
              )}

              {activeSection === "transacoes" && (
                <TransactionsView
                  summary={summary}
                  activeMonth={activeMonth}
                  onChangeMonth={handleChangeMonth}
                  focusSearchTrigger={focusSearchTrigger}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onSelectItem={setEditingItem}
                  onOpenChatWithPrefill={handleOpenChatWithPrefill}
                  onOpenMenu={() => setMobileMenuOpen(true)}
                />
              )}

              {(activeSection === "parcelas" || activeSection === "fixas") && (
                <CommitmentsView
                  mode={activeSection === "fixas" ? "fixas" : "parcelas"}
                  activeMonth={activeMonth}
                  onChangeMonth={handleChangeMonth}
                  future={future}
                  recurringRules={recurringRules}
                  installmentPlans={installmentPlans}
                  monthItems={summary.items}
                  onSelectItem={setEditingItem}
                  onOpenChatWithPrefill={handleOpenChatWithPrefill}
                  onOpenSearch={handleOpenSearch}
                  onOpenMenu={() => setMobileMenuOpen(true)}
                  isDark={theme === "dark"}
                />
              )}

              {activeSection === "tetos" && (
                <BudgetsView
                  summary={summary}
                  budgets={budgets}
                  activeMonth={activeMonth}
                  onChangeMonth={handleChangeMonth}
                  onOpenBudgetPrompt={openBudgetModal}
                  onDeleteBudget={handleDeleteBudget}
                  onOpenSearch={handleOpenSearch}
                  onOpenMenu={() => setMobileMenuOpen(true)}
                />
              )}
            </>
          )}
        </main>

        {/* Coluna Chat / Composer (fixa na direita em Início no Desktop, fullscreen no Mobile Chat, ou drawer em outras abas Desktop) */}
        <aside
          className={`${
            activeSection === "chat"
              ? "fixed inset-0 z-30 flex flex-col bg-[var(--bg-canvas)] lg:static lg:inset-auto lg:z-auto"
              : desktopChatDrawer
                ? "hidden lg:fixed lg:bottom-5 lg:right-5 lg:top-5 lg:z-40 lg:flex lg:shadow-2xl"
                : showDesktopRightColumn
                  ? "hidden lg:flex"
                  : "hidden"
          } min-h-0 shrink-0 flex-col overflow-hidden lg:w-[350px] lg:rounded-[28px] lg:border lg:border-[var(--border-subtle)] lg:bg-[var(--surface-1)] xl:w-[390px]`}
        >
          {desktopChatDrawer && (
            <button
              type="button"
              onClick={() => setDesktopChatDrawer(false)}
              aria-label="Fechar painel de voz"
              className="absolute right-3.5 top-3.5 z-10 hidden h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] lg:flex"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <DolStream
            events={events}
            processing={processing}
            onSelectItem={setEditingItem}
            onSelectCategory={(slug) => {
              setSelectedCategory(slug);
              if (activeSection === "chat") {
                setActiveSection("inicio");
              }
            }}
            onQuickPrompt={(p) => void handleSendText(p)}
            onBack={
              activeSection === "chat"
                ? () => setActiveSection("inicio")
                : undefined
            }
          />

          <VoiceTextComposer
            busy={processing}
            onSendText={handleSendText}
            onSendAudio={handleSendAudio}
            prefillText={composerPrefill}
            onConsumePrefill={() => setComposerPrefill(null)}
          />
        </aside>
      </div>

      {/* Navegação Inferior & Gaveta Mobile */}
      <MobileBottomDock
        activeSection={activeSection}
        onSelect={setActiveSection}
      />

      <MobileMenuDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeSection={activeSection}
        onSelect={setActiveSection}
        displayName={displayName}
        onOpenNameModal={() => {
          setNameInput(displayName);
          setNameModalOpen(true);
        }}
        soundEnabled={soundEnabled}
        onToggleSound={() => void toggleSound()}
        theme={theme}
        onToggleTheme={() => void toggleTheme()}
        onLock={() => void handleLock()}
      />

      {/* Sheet de edição de card */}
      <EditItemSheet
        item={editingItem}
        activeMonth={activeMonth}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
        onDelete={handleDeleteEdit}
      />

      {/* Modal de Teto (Geral ou por Categoria) */}
      {budgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
          <form
            onSubmit={(e) => void handleSaveBudgetModal(e)}
            className="w-full max-w-sm rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Teto de {formatMonthLabel(activeMonth)}
              </h2>
              <button
                type="button"
                onClick={() => setBudgetModalOpen(false)}
                aria-label="Fechar modal"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-4 mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Categoria do teto
            </label>
            <select
              value={budgetCategory ?? "__all__"}
              onChange={(e) =>
                handleSelectBudgetCategoryInModal(
                  e.target.value === "__all__"
                    ? null
                    : (e.target.value as ExpenseCategorySlug)
                )
              }
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lilac)] focus:outline-none"
            >
              <option value="__all__">Geral do mês</option>
              {Object.values(EXPENSE_CATEGORIES).map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.label}
                </option>
              ))}
            </select>

            <label className="mt-3.5 mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Limite (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              placeholder="Ex: 1000,00"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3.5 py-2.5 text-base font-semibold tabular-nums text-[var(--text-primary)] focus:border-[var(--accent-lilac)] focus:outline-none"
            />

            <div className="mt-5 flex items-center justify-between gap-2">
              {hasBudgetForModalCategory ? (
                <button
                  type="button"
                  onClick={() => void handleDeleteBudget(budgetCategory)}
                  className="rounded-2xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10"
                >
                  Remover teto
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="rounded-2xl px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-ink)]"
                >
                  Salvar teto
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal rápido de nome de perfil */}
      {nameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
          <form
            onSubmit={(e) => void handleSaveNameModal(e)}
            className="w-full max-w-xs rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5"
          >
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Como deseja ser chamado?
            </h2>
            <input
              type="text"
              autoFocus
              maxLength={40}
              placeholder="Ex: Lucas"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="mt-3 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-lilac)] focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNameModalOpen(false)}
                className="rounded-2xl px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-ink)]"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
