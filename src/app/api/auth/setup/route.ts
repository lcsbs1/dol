import { NextResponse, type NextRequest } from "next/server";
import { hashPin, validatePinFormat } from "@/lib/auth/pin";
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
      return NextResponse.json(
        { error: "O PIN deve ter exatamente 6 dígitos." },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const status = await repo.getVaultStatus();
    if (status.initialized) {
      return NextResponse.json(
        { error: "O cofre já foi configurado." },
        { status: 409 }
      );
    }

    const pinHash = hashPin(pin);
    const preferredOwner = process.env.VAULT_OWNER_ID?.trim() || undefined;
    const { userId } = await repo.setupVaultPin(pinHash, preferredOwner);

    const token = await createSessionToken(userId, "vault");
    const response = NextResponse.json({ authenticated: true });
    attachSessionCookie(response, token);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao configurar PIN.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
