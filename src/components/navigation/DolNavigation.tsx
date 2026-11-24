"use client";

import {
  ArrowLeftRight,
  CalendarClock,
  Home,
  Layers,
  Lock,
  MessageCircle,
  Moon,
  Pencil,
  Sun,
  Target,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { triggerTactileFeedback } from "@/lib/tactile";

export type DolNavSection =
  | "inicio"
  | "transacoes"
  | "parcelas"
  | "fixas"
  | "tetos"
  | "chat";

const DESKTOP_ITEMS: Array<{
  id: Exclude<DolNavSection, "chat">;
  label: string;
  icon: typeof Home;
}> = [
  { id: "inicio", label: "Início", icon: Home },
  { id: "transacoes", label: "Transações", icon: ArrowLeftRight },
  { id: "parcelas", label: "Parcelas", icon: Layers },
  { id: "fixas", label: "Fixas", icon: CalendarClock },
  { id: "tetos", label: "Tetos", icon: Target },
];

export function DesktopSidebar({
  activeSection,
  onSelect,
  soundEnabled,
  onToggleSound,
  theme,
  onToggleTheme,
  onLock,
}: {
  activeSection: DolNavSection;
  onSelect: (section: DolNavSection) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onLock: () => void;
}) {
  return (
    <aside className="hidden w-52 shrink-0 flex-col justify-between rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 lg:flex">
      <div>
        <button
          type="button"
          onClick={() => {
            triggerTactileFeedback("tap");
            onSelect("inicio");
          }}
          className="px-2 text-left text-2xl font-bold tracking-tight text-[var(--text-primary)]"
        >
          dol
        </button>

        <nav className="mt-8 space-y-1.5" aria-label="Navegação principal">
          {DESKTOP_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerTactileFeedback("tap");
                  onSelect(item.id);
                }}
                className={`relative flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--surface-2)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]/60 hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {active && (
                  <span className="dol-progress-gradient absolute bottom-0 left-4 right-4 h-[2px] rounded-full opacity-90" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center justify-between gap-1.5 border-t border-[var(--border-subtle)] pt-4">
        <button
          type="button"
          onClick={onLock}
          aria-label="Bloquear cofre"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
        >
          <Lock className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? "Silenciar som tátil" : "Ativar som tátil"}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Alternar tema"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileBottomDock({
  activeSection,
  onSelect,
}: {
  activeSection: DolNavSection;
  onSelect: (section: DolNavSection) => void;
}) {
  if (activeSection === "chat") return null;

  const isCommitments = activeSection === "parcelas" || activeSection === "fixas";

  return (
    <nav
      aria-label="Barra inferior"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--surface-1)]/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
        <button
          type="button"
          onClick={() => {
            triggerTactileFeedback("tap");
            onSelect("inicio");
          }}
          className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium ${
            activeSection === "inicio"
              ? "text-[var(--accent)]"
              : "text-[var(--text-muted)]"
          }`}
        >
          <Home className="h-4 w-4" />
          <span>Início</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerTactileFeedback("tap");
            onSelect("transacoes");
          }}
          className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium ${
            activeSection === "transacoes"
              ? "text-[var(--accent)]"
              : "text-[var(--text-muted)]"
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span>Extrato</span>
        </button>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              triggerTactileFeedback("tap");
              onSelect("chat");
            }}
            aria-label="Abrir chat de voz"
            className="dol-mic-button -mt-4 flex h-12 w-12 items-center justify-center rounded-[18px] text-[#111216] transition-transform active:scale-95"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerTactileFeedback("tap");
            onSelect("parcelas");
          }}
          className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium ${
            isCommitments ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Fixas</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerTactileFeedback("tap");
            onSelect("tetos");
          }}
          className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium ${
            activeSection === "tetos"
              ? "text-[var(--accent)]"
              : "text-[var(--text-muted)]"
          }`}
        >
          <Target className="h-4 w-4" />
          <span>Tetos</span>
        </button>
      </div>
    </nav>
  );
}

export function MobileMenuDrawer({
  open,
  onClose,
  activeSection,
  onSelect,
  displayName,
  onOpenNameModal,
  soundEnabled,
  onToggleSound,
  theme,
  onToggleTheme,
  onLock,
}: {
  open: boolean;
  onClose: () => void;
  activeSection: DolNavSection;
  onSelect: (section: DolNavSection) => void;
  displayName: string;
  onOpenNameModal: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onLock: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/65 backdrop-blur-xs"
      />
      <div className="relative z-10 flex h-full w-72 max-w-[82vw] flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              dol
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNameModal();
            }}
            className="mt-4 flex w-full items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3.5 py-2.5 text-left"
          >
            <div>
              <p className="text-xs text-[var(--text-muted)]">Perfil</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {displayName}
              </p>
            </div>
            <Pencil className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          </button>

          <div className="mt-5 space-y-1">
            {DESKTOP_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    triggerTactileFeedback("tap");
                    onSelect(item.id);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium ${
                    active
                      ? "bg-[var(--surface-2)] text-[var(--accent)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                triggerTactileFeedback("tap");
                onSelect("chat");
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Chat de voz</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
          <button
            type="button"
            onClick={onToggleSound}
            className="flex w-full items-center justify-between rounded-2xl bg-[var(--surface-2)] px-3.5 py-2.5 text-xs font-medium text-[var(--text-primary)]"
          >
            <span>Som tátil</span>
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Alternar tema"
            className="flex w-full items-center justify-between rounded-2xl bg-[var(--surface-2)] px-3.5 py-2.5 text-xs font-medium text-[var(--text-primary)]"
          >
            <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onLock}
            aria-label="Bloquear cofre"
            className="flex w-full items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-400"
          >
            <span>Bloquear cofre</span>
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
