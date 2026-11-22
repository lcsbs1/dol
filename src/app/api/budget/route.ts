import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertCsrfAndOrigin, requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { loadFullMonthState } from "@/lib/finance/executor";
import { getCurrentBillingMonth, isValidBillingMonth } from "@/lib/finance/money";
import type { CategorySlug } from "@/lib/finance/types";

const budgetPutSchema = z.object({
  billing_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  category_slug: z.string().min(1).max(32).nullable().optional(),
  limit_cents: z.number().int().positive().max(100_000_000).optional(),
  theme_preference: z.enum(["dark", "light", "system"]).optional(),
  sound_enabled: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  if (!assertCsrfAndOrigin(request)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  }
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const parsed = budgetPutSchema.parse(await request.json());
    const repo = getRepository();
    const activeMonth =
      parsed.billing_month && isValidBillingMonth(parsed.billing_month)
        ? parsed.billing_month
        : getCurrentBillingMonth();

    if (parsed.limit_cents !== undefined) {
      const cat = (parsed.category_slug ?? null) as CategorySlug | null;
      await repo.upsertMonthlyBudget(session.userId, activeMonth, cat, parsed.limit_cents);
      if (cat === null) {
        await repo.updateProfile(session.userId, { default_budget_cents: parsed.limit_cents });
      }
    }

    if (parsed.theme_preference !== undefined || parsed.sound_enabled !== undefined) {
      await repo.updateProfile(session.userId, {
        theme_preference: parsed.theme_preference,
        sound_enabled: parsed.sound_enabled,
      });
    }

    const state = await loadFullMonthState(repo, session.userId, activeMonth);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar preferências.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
