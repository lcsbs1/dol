import { NextResponse, type NextRequest } from "next/server";
import { assertCsrfAndOrigin, clearSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  if (!assertCsrfAndOrigin(request)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  }
  const response = NextResponse.json({ authenticated: false });
  clearSessionCookie(response);
  return response;
}
