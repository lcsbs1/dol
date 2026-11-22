import { NextResponse, type NextRequest } from "next/server";
import {
  LOCKOUT_MINUTES,
  MAX_PIN_ATTEMPTS,
  validatePinFormat,
  verifyPin,
} from "@/lib/auth/pin";
import {
  assertCsrfAndOrigin,
  attachSessionCookie,
  createSessionToken,
} from "@/lib/auth/session";
import { getRepository } from "@/lib/db";

export async function POST(request: NextRequest) {
  if (!assertCsrfAndOrigin(request)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { pin?: string };
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";

    if (!validatePinFormat(pin)) {
      return NextResponse.json({ error: "PIN inválido." }, { status: 400 });
    }

    const repo = getRepository();
    const vault = await repo.getVaultConfig();
    if (!vault) {
      return NextResponse.json(
        { error: "Cofre ainda não configurado." },
        { status: 404 }
      );
    }

    if (vault.locked_until && new Date(vault.locked_until).getTime() > Date.now()) {
      return NextResponse.json(
        {
          error: "Cofre temporariamente bloqueado.",
          lockedUntil: vault.locked_until,
        },
        { status: 429 }
      );
    }

    const valid = verifyPin(pin, vault.pin_hash);
    if (!valid) {
      const nextAttempts = vault.failed_attempts + 1;
      const shouldLock = nextAttempts >= MAX_PIN_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
        : null;
      await repo.recordFailedPinAttempt(shouldLock ? 0 : nextAttempts, lockedUntil);

      return NextResponse.json(
        {
          error: shouldLock ? "Muitas tentativas. Aguarde." : "PIN incorreto.",
          remainingAttempts: shouldLock ? 0 : MAX_PIN_ATTEMPTS - nextAttempts,
          lockedUntil,
        },
        { status: shouldLock ? 429 : 401 }
      );
    }

    await repo.resetFailedPinAttempts();
    const token = await createSessionToken(vault.owner_user_id, "vault");
    const response = NextResponse.json({ authenticated: true });
    attachSessionCookie(response, token);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao desbloquear.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
