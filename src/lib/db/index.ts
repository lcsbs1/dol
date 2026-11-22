import { LocalDevFinanceRepository } from "./local-repository";
import type { FinanceRepository } from "./repository";
import { SupabaseFinanceRepository } from "./supabase-repository";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

let cachedRepo: FinanceRepository | null = null;

export function getRepository(): FinanceRepository {
  if (isSupabaseConfigured()) {
    if (!cachedRepo) {
      cachedRepo = new SupabaseFinanceRepository();
    }
    return cachedRepo;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Supabase não configurado em produção. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  if (!cachedRepo) {
    cachedRepo = new LocalDevFinanceRepository();
  }
  return cachedRepo;
}
