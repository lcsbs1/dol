"use client";

import { motion } from "framer-motion";
import { Delete, Lock, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { triggerTactileFeedback } from "@/lib/tactile";

interface PinVaultScreenProps {
  needsPinSetup: boolean;
  lockedUntil: string | null;
  onAuthenticated: () => void;
}

export function PinVaultScreen({
  needsPinSetup,
  lockedUntil: initialLockedUntil,
  onAuthenticated,
}: PinVaultScreenProps) {
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(initialLockedUntil);

  const isLocked = Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now());

  const triggerError = useCallback((message: string) => {
    triggerTactileFeedback("guardrail");
    setErrorMsg(message);
    setShaking(true);
    setPin("");
    setTimeout(() => setShaking(false), 450);
  }, []);

  const submitPin = useCallback(
    async (fullPin: string) => {
      if (needsPinSetup) {
        if (!firstPin) {
          triggerTactileFeedback("tap");
          setFirstPin(fullPin);
          setPin("");
          setErrorMsg(null);
          return;
        }
        if (firstPin !== fullPin) {
          setFirstPin(null);
          triggerError("Os PINs não coincidiram. Tente novamente.");
          return;
        }
      }

      setSubmitting(true);
      setErrorMsg(null);
      try {
        const endpoint = needsPinSetup ? "/api/auth/setup" : "/api/auth/unlock";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Dol-Request": "1",
          },
          body: JSON.stringify({ pin: fullPin }),
        });

        const data = (await res.json()) as {
          authenticated?: boolean;
          error?: string;
          lockedUntil?: string | null;
        };

        if (!res.ok) {
          if (data.lockedUntil) setLockedUntil(data.lockedUntil);
          if (needsPinSetup) setFirstPin(null);
          triggerError(data.error ?? "PIN inválido.");
          return;
        }

        triggerTactileFeedback("confirm");
        onAuthenticated();
      } catch {
        triggerError("Falha de conexão com o cofre.");
      } finally {
        setSubmitting(false);
      }
    },
    [firstPin, needsPinSetup, onAuthenticated, triggerError]
  );

  const appendDigit = useCallback(
    (digit: string) => {
      if (submitting || isLocked) return;
      if (pin.length >= 6) return;
      triggerTactileFeedback("tap");
      const next = pin + digit;
      setPin(next);
      setErrorMsg(null);
      if (next.length === 6) {
        void submitPin(next);
      }
    },
    [isLocked, pin, submitPin, submitting]
  );

  const removeDigit = useCallback(() => {
    if (submitting || pin.length === 0) return;
    triggerTactileFeedback("tap");
    setPin((prev) => prev.slice(0, -1));
  }, [pin.length, submitting]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) {
        appendDigit(e.key);
      } else if (e.key === "Backspace") {
        removeDigit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [appendDigit, removeDigit]);

  const title = needsPinSetup
    ? firstPin
      ? "Confirme seu PIN"
      : "Crie o PIN do seu cofre"
    : "Desbloquear dol";

  const subtitle = needsPinSetup
    ? firstPin
      ? "Digite os mesmos 6 dígitos"
      : "Proteção pessoal de 6 dígitos"
    : isLocked
      ? "Cofre bloqueado temporariamente"
      : "Digite seu PIN de 6 dígitos";

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg-canvas)] px-6 py-10">
      <div className="flex w-full max-w-xs flex-col items-center">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)]">
          {needsPinSetup ? (
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
          ) : (
            <Lock className="h-5 w-5 text-[var(--text-primary)]" />
          )}
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>

        {/* Indicadores de 6 dígitos */}
        <motion.div
          animate={shaking ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="my-8 flex items-center gap-3.5"
        >
          {Array.from({ length: 6 }, (_, i) => {
            const filled = i < pin.length;
            return (
              <motion.span
                key={i}
                animate={{
                  scale: filled ? 1.15 : 1,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className={`h-3.5 w-3.5 rounded-full border transition-colors ${
                  filled
                    ? "border-[var(--accent)] bg-[var(--accent)]"
                    : "border-[var(--border-strong)] bg-transparent"
                }`}
              />
            );
          })}
        </motion.div>

        <div className="mb-4 min-h-5 text-center">
          {errorMsg && (
            <p className="text-xs font-medium text-rose-400">{errorMsg}</p>
          )}
        </div>

        {/* Teclado numérico tátil */}
        <div className="grid w-full grid-cols-3 gap-3">
          {keys.map((digit) => (
            <motion.button
              key={digit}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => appendDigit(digit)}
              disabled={submitting || isLocked}
              className="flex h-16 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] font-mono text-xl font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40"
            >
              {digit}
            </motion.button>
          ))}

          <div />

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => appendDigit("0")}
            disabled={submitting || isLocked}
            className="flex h-16 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] font-mono text-xl font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40"
          >
            0
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={removeDigit}
            disabled={submitting || pin.length === 0}
            aria-label="Apagar dígito"
            className="flex h-16 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-30"
          >
            <Delete className="h-5 w-5" />
          </motion.button>
        </div>
      </div>
    </main>
  );
}
