import { NextResponse } from "next/server";
import { isGeminiConfigured } from "@/lib/ai";
import { getAuthMode, getServerSession } from "@/lib/auth/session";
import { getRepository, isSupabaseConfigured } from "@/lib/db";

export async function GET() {
  try {
    const repo = getRepository();
    const [session, vaultStatus] = await Promise.all([
      getServerSession(),
      repo.getVaultStatus(),
    ]);

    return NextResponse.json({
      authenticated: Boolean(session),
      needsPinSetup: !vaultStatus.initialized,
      lockedUntil: vaultStatus.lockedUntil,
      authMode: getAuthMode(),
      storageMode: isSupabaseConfigured() ? "supabase" : "local",
      aiMode: isGeminiConfigured() ? "gemini" : "local-fallback",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao verificar status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
