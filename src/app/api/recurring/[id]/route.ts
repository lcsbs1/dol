import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertCsrfAndOrigin, requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { loadFullMonthState } from "@/lib/finance/executor";
import { getCurrentBillingMonth, isValidBillingMonth } from "@/lib/finance/money";
import type { CategorySlug } from "@/lib/finance/types";

const recurringPatchSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  amount_cents: z.number().int().positive().max(100_000_000).optional(),
  category_slug: z.string().min(1).max(32).optional(),
  day_of_month: z.number().int().min(1).max(31).optional(),
  active: z.boolean().optional(),
  activeMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!assertCsrfAndOrigin(request)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  }
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const parsed = recurringPatchSchema.parse(await request.json());
    const repo = getRepository();
    const updated = await repo.updateRecurringRule(session.userId, id, {
      title: parsed.title,
      amount_cents: parsed.amount_cents,
      category_slug: parsed.category_slug as CategorySlug | undefined,
      day_of_month: parsed.day_of_month,
      active: parsed.active,
    });

    if (!updated) {
      return NextResponse.json({ error: "Regra não encontrada." }, { status: 404 });
    }

    const activeMonth =
      parsed.activeMonth && isValidBillingMonth(parsed.activeMonth)
        ? parsed.activeMonth
        : getCurrentBillingMonth();
    const state = await loadFullMonthState(repo, session.userId, activeMonth);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dados inválidos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!assertCsrfAndOrigin(request)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  }
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const rawMonth = request.nextUrl.searchParams.get("month");
  const activeMonth =
    rawMonth && isValidBillingMonth(rawMonth) ? rawMonth : getCurrentBillingMonth();

  try {
    const repo = getRepository();
    const deleted = await repo.deleteRecurringRule(session.userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Regra não encontrada." }, { status: 404 });
    }

    const state = await loadFullMonthState(repo, session.userId, activeMonth);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao excluir regra.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
