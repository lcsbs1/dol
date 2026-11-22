import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertCsrfAndOrigin, requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/db";
import { loadFullMonthState } from "@/lib/finance/executor";
import { getCurrentBillingMonth, isValidBillingMonth } from "@/lib/finance/money";
import type { CategorySlug } from "@/lib/finance/types";

const patchSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  amount_cents: z.number().int().positive().max(100_000_000).optional(),
  category_slug: z.string().min(1).max(32).optional(),
  occurred_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  activeMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  scope: z.enum(["single", "plan", "rule"]).optional(),
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
    const parsed = patchSchema.parse(await request.json());
    const repo = getRepository();
    let activeMonth =
      parsed.activeMonth && isValidBillingMonth(parsed.activeMonth)
        ? parsed.activeMonth
        : getCurrentBillingMonth();

    // Suporte a item virtual projetado: recurring:<ruleId>:<YYYY-MM>
    if (id.startsWith("recurring:")) {
      const [, ruleId, month] = id.split(":");
      if (!ruleId || !month || !isValidBillingMonth(month)) {
        return NextResponse.json({ error: "Item recorrente inválido." }, { status: 400 });
      }
      activeMonth = month;
      const rule = await repo.getRecurringRuleById(session.userId, ruleId);
      if (!rule) {
        return NextResponse.json({ error: "Regra não encontrada." }, { status: 404 });
      }

      if (parsed.scope === "rule") {
        await repo.updateRecurringRule(session.userId, rule.id, {
          title: parsed.title,
          amount_cents: parsed.amount_cents,
          category_slug: parsed.category_slug as CategorySlug | undefined,
        });
      } else {
        await repo.upsertRecurringMonthOverride(session.userId, rule, month, {
          title: parsed.title,
          amount_cents: parsed.amount_cents,
          category_slug: parsed.category_slug as CategorySlug | undefined,
        });
      }
    } else {
      const existing = await repo.getTransactionById(session.userId, id);
      if (!existing) {
        return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
      }
      activeMonth = parsed.activeMonth ?? existing.billing_month;

      const updated = await repo.updateTransaction(session.userId, id, {
        title: parsed.title,
        amount_cents: parsed.amount_cents,
        category_slug: parsed.category_slug as CategorySlug | undefined,
        occurred_on: parsed.occurred_on,
        billing_month: parsed.occurred_on ? parsed.occurred_on.slice(0, 7) : undefined,
      });

      if (!updated) {
        return NextResponse.json({ error: "Falha ao atualizar." }, { status: 404 });
      }
    }

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
  const scope = request.nextUrl.searchParams.get("scope") ?? "single";
  const rawMonth = request.nextUrl.searchParams.get("month");
  let activeMonth =
    rawMonth && isValidBillingMonth(rawMonth) ? rawMonth : getCurrentBillingMonth();

  try {
    const repo = getRepository();

    if (id.startsWith("recurring:")) {
      const [, ruleId, month] = id.split(":");
      if (!ruleId || !month || !isValidBillingMonth(month)) {
        return NextResponse.json({ error: "Item recorrente inválido." }, { status: 400 });
      }
      activeMonth = month;
      const rule = await repo.getRecurringRuleById(session.userId, ruleId);
      if (!rule) {
        return NextResponse.json({ error: "Regra não encontrada." }, { status: 404 });
      }

      if (scope === "rule") {
        await repo.updateRecurringRule(session.userId, rule.id, { active: false });
      } else {
        await repo.upsertRecurringMonthOverride(session.userId, rule, month, {
          is_skipped: true,
        });
      }
    } else {
      const existing = await repo.getTransactionById(session.userId, id);
      if (!existing) {
        return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
      }
      activeMonth = rawMonth && isValidBillingMonth(rawMonth) ? rawMonth : existing.billing_month;

      if (scope === "plan" && existing.installment_plan_id) {
        await repo.deleteInstallmentPlan(session.userId, existing.installment_plan_id);
      } else if (existing.recurring_rule_id && scope === "single") {
        const rule = await repo.getRecurringRuleById(session.userId, existing.recurring_rule_id);
        if (rule) {
          await repo.upsertRecurringMonthOverride(session.userId, rule, existing.billing_month, {
            is_skipped: true,
          });
        } else {
          await repo.deleteTransaction(session.userId, id);
        }
      } else {
        await repo.deleteTransaction(session.userId, id);
      }
    }

    const state = await loadFullMonthState(repo, session.userId, activeMonth);
    return NextResponse.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao remover item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
