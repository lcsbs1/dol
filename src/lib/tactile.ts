"use client";

export type TactileKind = "tap" | "confirm" | "slice" | "undo" | "guardrail";

let audioCtx: AudioContext | null = null;
let hiddenSwitchLabel: HTMLLabelElement | null = null;
let soundEnabledState = true;

export function setTactileSoundEnabled(enabled: boolean): void {
  soundEnabledState = enabled;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function triggerIosSwitchHaptic(): void {
  if (typeof document === "undefined") return;
  try {
    if (!hiddenSwitchLabel) {
      const label = document.createElement("label");
      label.setAttribute("aria-hidden", "true");
      label.style.position = "fixed";
      label.style.left = "-9999px";
      label.style.top = "-9999px";
      label.style.opacity = "0.001";
      label.style.pointerEvents = "none";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      label.appendChild(input);
      document.body.appendChild(label);
      hiddenSwitchLabel = label;
    }
    hiddenSwitchLabel.click();
  } catch {
    // Ignora silenciosamente se o navegador não suportar
  }
}

export function triggerHaptic(kind: TactileKind = "tap"): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      if (kind === "confirm") navigator.vibrate([10, 22, 14]);
      else if (kind === "guardrail") navigator.vibrate([22, 35, 22]);
      else if (kind === "undo") navigator.vibrate([14, 18]);
      else navigator.vibrate(8);
    } catch {
      // Ignora em browsers que bloqueiam vibrate
    }
  }
  triggerIosSwitchHaptic();
}

export function playTactileSound(kind: TactileKind): void {
  if (!soundEnabledState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.connect(gain);

    if (kind === "tap" || kind === "slice") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(kind === "slice" ? 540 : 420, now);
      osc.frequency.exponentialRampToValueAtTime(kind === "slice" ? 680 : 280, now + 0.045);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
      osc.start(now);
      osc.stop(now + 0.06);
      return;
    }

    if (kind === "confirm") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.06);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.17);
      return;
    }

    if (kind === "undo") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.11);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
      return;
    }

    // guardrail
    osc.type = "square";
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.setValueAtTime(140, now + 0.07);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.start(now);
    osc.stop(now + 0.17);
  } catch {
    // Silencioso caso AudioContext esteja bloqueado
  }
}

export function triggerTactileFeedback(kind: TactileKind): void {
  triggerHaptic(kind);
  playTactileSound(kind);
}
