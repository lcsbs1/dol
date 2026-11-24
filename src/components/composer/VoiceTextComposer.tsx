"use client";

import { motion } from "framer-motion";
import { Mic, SendHorizontal, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { triggerTactileFeedback } from "@/lib/tactile";

interface VoiceTextComposerProps {
  busy: boolean;
  onSendText: (text: string) => Promise<void>;
  onSendAudio: (blob: Blob) => Promise<void>;
  prefillText?: string | null;
  onConsumePrefill?: () => void;
}

const QUICK_CHIPS = [
  { label: "Resumo", prompt: "Como tá meu mês?" },
  { label: "Fixas", prompt: "Quais são minhas despesas fixas?" },
  { label: "Parcelas", prompt: "Ver meus parcelamentos futuros" },
  { label: "Comparar", prompt: "Comparar com mês passado" },
];

export function VoiceTextComposer({
  busy,
  onSendText,
  onSendAudio,
  prefillText,
  onConsumePrefill,
}: VoiceTextComposerProps) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cancelledRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (prefillText !== undefined && prefillText !== null) {
      setText(prefillText);
      setTimeout(() => inputRef.current?.focus(), 60);
      onConsumePrefill?.();
    }
  }, [prefillText, onConsumePrefill]);

  const cleanupRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
    setSeconds(0);
    setLevel(0);
  };

  useEffect(() => {
    return () => cleanupRecording();
  }, []);

  async function startRecording() {
    if (busy || recording) return;
    setVoiceError(null);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setVoiceError("Microfone indisponível neste navegador.");
      triggerTactileFeedback("guardrail");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      cancelledRef.current = false;

      const mimeCandidates = [
        "audio/mp4",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg",
      ];
      const chosenMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      // Monitora volume para anel visual reativo
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tickLevel = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setLevel(Math.min(1, avg / 90));
          rafRef.current = requestAnimationFrame(tickLevel);
        };
        tickLevel();
      } catch {
        // Segue sem medidor caso AudioContext falhe
      }

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const wasCancelled = cancelledRef.current;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || chosenMime || "audio/webm",
        });
        cleanupRecording();
        if (!wasCancelled && blob.size > 0) {
          void onSendAudio(blob);
        }
      };

      recorder.start(250);
      triggerTactileFeedback("tap");
      setRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 29) {
            recorder.stop();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      cleanupRecording();
      setVoiceError("Permissão de microfone negada.");
      triggerTactileFeedback("guardrail");
    }
  }

  function stopAndSend() {
    cancelledRef.current = false;
    recorderRef.current?.stop();
  }

  function cancelRecording() {
    triggerTactileFeedback("undo");
    cancelledRef.current = true;
    holdStartRef.current = null;
    recorderRef.current?.stop();
  }

  function handleMicPointerDown() {
    if (busy || recording) return;
    holdStartRef.current = Date.now();
    void startRecording();
  }

  function handleMicPointerUp() {
    if (!recording || holdStartRef.current === null) {
      holdStartRef.current = null;
      return;
    }
    const elapsed = Date.now() - holdStartRef.current;
    holdStartRef.current = null;
    if (elapsed >= 450) {
      stopAndSend();
    }
  }

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    triggerTactileFeedback("tap");
    setText("");
    await onSendText(trimmed);
  }

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-1)]/95 px-3.5 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md">
      {/* Chips rápidos */}
      <div className="no-scrollbar mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled={busy || recording}
            onClick={() => {
              triggerTactileFeedback("tap");
              void onSendText(chip.prompt);
            }}
            className="shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {voiceError && (
        <p className="mb-1.5 text-[11px] font-medium text-rose-400">{voiceError}</p>
      )}

      {recording ? (
        <div className="flex items-center justify-between gap-3 rounded-[24px] border border-[var(--border-strong)] bg-[var(--accent-soft)] px-3.5 py-2">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: 1 + level * 0.42 }}
              transition={{ duration: 0.08 }}
              className="dol-mic-button flex h-10 w-10 items-center justify-center rounded-[16px]"
            >
              <Mic className="h-4 w-4 text-[#111216]" />
            </motion.div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Ouvindo...
              </p>
              <p className="text-[11px] tabular-nums text-[var(--text-secondary)]">
                00:{String(seconds).padStart(2, "0")} / 00:30
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              aria-label="Cancelar gravação"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)]"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={stopAndSend}
              aria-label="Enviar gravação"
              className="dol-mic-button inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-[#111216]"
            >
              <Square className="h-3 w-3 fill-current" />
              Enviar
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleTextSubmit}
          className="flex items-center gap-2 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-1.5 transition-colors focus-within:border-[var(--border-strong)]"
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            disabled={busy}
            onPointerDown={handleMicPointerDown}
            onPointerUp={handleMicPointerUp}
            onPointerCancel={handleMicPointerUp}
            aria-label="Falar gasto por voz"
            className="dol-mic-button flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] transition-opacity disabled:opacity-50"
          >
            <Mic className="h-5 w-5 text-[#111216]" />
          </motion.button>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            placeholder="Digite ou segure para falar"
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none disabled:opacity-50"
          />

          <motion.button
            type="submit"
            whileTap={{ scale: 0.92 }}
            disabled={busy || text.trim().length === 0}
            aria-label="Enviar texto"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors ${
              text.trim().length > 0
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "text-[var(--text-muted)] opacity-50"
            }`}
          >
            <SendHorizontal className="h-4 w-4" />
          </motion.button>
        </form>
      )}
    </div>
  );
}
