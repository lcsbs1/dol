import { GeminiFinanceInterpreter, type FinanceInterpreter } from "./gemini-interpreter";
import { LocalFallbackInterpreter } from "./local-fallback-interpreter";

export function isGeminiConfigured(): boolean {
  return Boolean(
    (process.env.GEMINI_API_KEY || process.env.Gemini_API_Key)?.trim()
  );
}

export function getFinanceInterpreter(): FinanceInterpreter {
  const apiKey = (
    process.env.GEMINI_API_KEY || process.env.Gemini_API_Key
  )?.trim();

  if (apiKey) {
    return new GeminiFinanceInterpreter(apiKey);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("GEMINI_API_KEY é obrigatória em produção.");
  }

  return new LocalFallbackInterpreter();
}
