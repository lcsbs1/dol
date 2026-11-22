import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "dol_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export type AuthMode = "vault" | "supabase";

export interface AppSession {
  userId: string;
  mode: AuthMode;
}

const globalForSecret = globalThis as unknown as {
  __dolDevSessionSecret?: string;
};

export function getAuthMode(): AuthMode {
  return process.env.AUTH_MODE === "supabase" ? "supabase" : "vault";
}

function getSessionSecretKey(): Uint8Array {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured && configured.length >= 32) {
    return new TextEncoder().encode(configured);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET com pelo menos 32 caracteres é obrigatório em produção.");
  }

  if (!globalForSecret.__dolDevSessionSecret) {
    globalForSecret.__dolDevSessionSecret = crypto
      .createHash("sha256")
      .update(`dol-local-dev-${process.cwd()}`)
      .digest("hex");
  }

  return new TextEncoder().encode(globalForSecret.__dolDevSessionSecret);
}

export async function createSessionToken(
  userId: string,
  mode: AuthMode = "vault"
): Promise<string> {
  const secret = getSessionSecretKey();
  return new SignJWT({ mode })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .setJti(crypto.randomUUID())
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<AppSession | null> {
  try {
    const secret = getSessionSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (typeof payload.sub !== "string" || !payload.sub) {
      return null;
    }

    const mode: AuthMode = payload.mode === "supabase" ? "supabase" : "vault";
    return {
      userId: payload.sub,
      mode,
    };
  } catch {
    return null;
  }
}

export function attachSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function getServerSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}

export async function requireSession(request: NextRequest): Promise<AppSession | null> {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}

export function assertCsrfAndOrigin(request: NextRequest): boolean {
  const customHeader = request.headers.get("x-dol-request");
  if (customHeader !== "1") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const host = request.headers.get("host");
      if (host && originUrl.host !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}
