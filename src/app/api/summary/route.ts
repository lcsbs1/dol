import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { loadFullMonthState } from "@/lib/finance/executor";
import { getCurrentBillingMonth, isValidBillingMonth } from "@/lib/finance/money";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rawMonth = request.nextUrl.searchParams.get("month");
  const billingMonth =
    rawMonth && isValidBillingMonth(rawMonth) ? rawMonth : getCurrentBillingMonth();

  try {
    const repo = getRepository();
    const [state, chatEvents] = await Promise.all([
      loadFullMonthState(repo, session.userId, billingMonth),
      repo.listChatEvents(session.userId, billingMonth),
    ]);

    return NextResponse.json({
      ...state,
      chatEvents,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao carregar resumo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
