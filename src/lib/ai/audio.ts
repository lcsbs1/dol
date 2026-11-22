export const MAX_AUDIO_BYTES = 2 * 1024 * 1024; // 2 MB

const SUPPORTED_AUDIO_MIMES = new Set([
  "audio/m4a",
  "audio/aac",
  "audio/webm",
  "audio/ogg",
  "audio/mp3",
  "audio/mpeg",
  "audio/wav",
  "audio/flac",
  "audio/opus",
]);

export type SupportedAudioMime =
  | "audio/m4a"
  | "audio/aac"
  | "audio/webm"
  | "audio/ogg"
  | "audio/mp3"
  | "audio/mpeg"
  | "audio/wav"
  | "audio/flac"
  | "audio/opus";

/**
 * Normaliza MIME types vindos de browsers (ex.: Safari iOS `audio/mp4;codecs=mp4a.40.2` -> `audio/m4a`).
 */
export function normalizeAudioMimeType(rawMime: string): SupportedAudioMime | null {
  const base = rawMime.split(";")[0]?.trim().toLowerCase();
  if (!base) return null;

  if (base === "audio/mp4" || base === "audio/x-m4a") {
    return "audio/m4a";
  }

  if (SUPPORTED_AUDIO_MIMES.has(base)) {
    return base as SupportedAudioMime;
  }

  return null;
}
