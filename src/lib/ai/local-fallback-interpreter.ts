import { EXPENSE_CATEGORY_SLUGS } from "@/lib/finance/categories";
import { parseBRLToCents } from "@/lib/finance/money";
import type { CategorySlug, ExpenseCategorySlug, IncomeCategorySlug } from "@/lib/finance/types";
import type { FinanceInterpreter, InterpretRequest } from "./gemini-interpreter";
import { dolIntentSchema, type DolIntent } from "./schema";

function guessCategory(text: string, kind: "expense" | "income"): CategorySlug {
  const lower = text.toLowerCase();
  if (kind === "income") {
    if (/(sal[aá]rio|pagamento|holerite|empresa)/.test(lower)) return "salario";
    if (/(freela|freelance|projeto|bico|consultoria)/.test(lower)) return "freelance";
    if (/(dividendo|rendimento|juros|cdb|pix|investimento)/.test(lower)) return "rendimentos";
    return "outros_entrada";
  }

  if (/(almo[çc]o|jantar|caf[eé]|lanche|mercado|supermercado|ifood|pizza|padaria|restaurante|comida)/.test(lower)) {
    return "alimentacao";
  }
  if (/(aluguel|condom[ií]nio|luz|energia|[áa]gua|internet|g[áa]s|iptu|casa|moradia)/.test(lower)) {
    return "moradia";
  }
  if (/(uber|99|t[áa]xi|gasolina|combust[ií]vel|metr[ôo]|ônibus|estacionamento|transporte|passagem)/.test(lower)) {
    return "transporte";
  }
  if (/(cinema|show|bar|viagem|jogo|game|lazer|festa|parque|teatro)/.test(lower)) {
    return "lazer";
  }
  if (/(farm[áa]cia|m[eé]dico|exame|academia|dentista|sa[úu]de|rem[eé]dio|plano)/.test(lower)) {
    return "saude";
  }
  if (/(netflix|spotify|icloud|youtube|assinatura|streaming|chatgpt|prime)/.test(lower)) {
    return "assinaturas";
  }
  if (/(curso|livro|faculdade|escola|aula|educa[çc][ãa]o)/.test(lower)) {
    return "educacao";
  }
  if (/(t[êe]nis|roupa|camisa|celular|notebook|shopping|compra|loja|amazon|sapato)/.test(lower)) {
    return "compras";
  }
  return "outros";
}

function cleanTitle(raw: string): string {
  const cleaned = raw
    .replace(/r\$\s*[\d.,]+/gi, "")
    .replace(/\b\d+[.,]?\d*\s*(reais|real|conto|pila)?\b/gi, "")
    .replace(/\b(gastei|paguei|comprei|recebi|ganhei|entrou|em|no|na|de|do|da|com|por|todo\s+m[eê]s|fixo|fixa|mensal|todo\s+dia\s+\d+)\b/gi, " ")
    .replace(/\b\d+\s*x\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Lançamento";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1, 50);
}

/**
 * Fallback determinístico para desenvolvimento local quando GEMINI_API_KEY não estiver configurada.
 */
export class LocalFallbackInterpreter implements FinanceInterpreter {
  async interpret(input: InterpretRequest): Promise<DolIntent> {
    if (input.audio) {
      throw new Error(
        "Para transcrição de voz, configure GEMINI_API_KEY no arquivo .env.local."
      );
    }

    const text = (input.text ?? "").trim();
    const lower = text.toLowerCase();

    if (!text) {
      return { intent: "off_topic", transcript: "" };
    }

    // Desfazer
    if (/(desfaz|apaga|remove|cancela).*(último|ultimo|anterior)|^desfazer$/i.test(lower)) {
      return { intent: "undo_last", transcript: text };
    }

    // Consultas rápidas
    if (/(compar|m[eê]s passado|m[eê]s anterior)/.test(lower)) {
      return { intent: "query_comparison", transcript: text };
    }
    if (/(parcela|parcelamento|futuro|pr[oó]ximos meses)/.test(lower) && !/\d+\s*x/.test(lower)) {
      return { intent: "query_installments", transcript: text };
    }
    if (/(quais.*fix|minhas.*fix|contas fixas|despesas fixas|^fixas$)/.test(lower)) {
      return { intent: "query_fixed", transcript: text };
    }
    if (/(resumo|como t[áa]|quanto gastei|saldo|meu m[eê]s|^resumo$)/.test(lower)) {
      return { intent: "query_month_summary", transcript: text };
    }

    for (const slug of EXPENSE_CATEGORY_SLUGS) {
      if (lower.includes(slug) && /(quanto|ver|mostrar|detalhe|gastei em|com )/.test(lower)) {
        return {
          intent: "query_category",
          transcript: text,
          category_slug: slug as ExpenseCategorySlug,
        };
      }
    }

    // Definir teto
    if (/(teto|limite|or[çc]amento|meta de gasto)/.test(lower)) {
      const match = text.match(/(\d+(?:[.,]\d{1,2})?)/);
      const cents = match ? parseBRLToCents(match[1]) : null;
      if (cents) {
        return dolIntentSchema.parse({
          intent: "set_budget",
          transcript: text,
          limit_brl: cents / 100,
          category_slug: null,
        });
      }
    }

    // Parcelamento (ex: "tênis 600 em 6x" ou "6x de 100")
    const perInstMatch = lower.match(/(\d{1,2})\s*(?:x|parcelas?)\s*de\s*(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/);
    if (perInstMatch) {
      const count = Number(perInstMatch[1]);
      const cents = parseBRLToCents(perInstMatch[2]);
      if (count >= 2 && count <= 60 && cents) {
        return dolIntentSchema.parse({
          intent: "record_installment",
          transcript: text,
          title: cleanTitle(text),
          category_slug: guessCategory(text, "expense") as ExpenseCategorySlug,
          amount_brl: cents / 100,
          amount_mode: "per_installment",
          installment_count: count,
        });
      }
    }

    const totalInstMatch = lower.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:reais\s*)?(?:em\s*)?(\d{1,2})\s*(?:x|vezes|parcelas?)/);
    if (totalInstMatch) {
      const cents = parseBRLToCents(totalInstMatch[1]);
      const count = Number(totalInstMatch[2]);
      if (count >= 2 && count <= 60 && cents) {
        return dolIntentSchema.parse({
          intent: "record_installment",
          transcript: text,
          title: cleanTitle(text),
          category_slug: guessCategory(text, "expense") as ExpenseCategorySlug,
          amount_brl: cents / 100,
          amount_mode: "total",
          installment_count: count,
        });
      }
    }

    const isIncome = /(sal[aá]rio|recebi|ganhei|entrou|freela|rendimento)/.test(lower);
    const kind = isIncome ? "income" : "expense";

    // Recorrente / fixa
    if (/(todo m[eê]s|fixo|fixa|mensal|todo dia \d+)/.test(lower)) {
      const dayMatch = lower.match(/todo dia\s+(\d{1,2})/);
      const day = dayMatch ? Math.min(31, Math.max(1, Number(dayMatch[1]))) : 5;
      const cleanedForAmount = text.replace(/todo dia\s+\d{1,2}/gi, "");
      const numMatch = cleanedForAmount.match(/(\d+(?:[.,]\d{1,2})?)/);
      const cents = numMatch ? parseBRLToCents(numMatch[1]) : null;
      if (cents) {
        return dolIntentSchema.parse({
          intent: "record_recurring",
          transcript: text,
          kind,
          title: cleanTitle(text),
          amount_brl: cents / 100,
          category_slug: guessCategory(text, kind),
          day_of_month: day,
        });
      }
    }

    // Múltiplos lançamentos separados por "e" ou vírgula
    const parts = text.split(/\s+(?:e|,)\s+/i).filter(Boolean);
    const parsedItems: Array<{
      kind: "expense" | "income";
      title: string;
      amount_brl: number;
      category_slug: CategorySlug;
    }> = [];

    for (const part of parts) {
      const numMatch = part.match(/(\d+(?:\.\d{3})*(?:[.,]\d{1,2})?)/);
      if (!numMatch) continue;
      const cents = parseBRLToCents(numMatch[1]);
      if (!cents) continue;
      const itemKind = /(sal[aá]rio|recebi|ganhei|entrou|freela)/.test(part.toLowerCase())
        ? "income"
        : kind;
      parsedItems.push({
        kind: itemKind,
        title: cleanTitle(part),
        amount_brl: cents / 100,
        category_slug: guessCategory(part, itemKind) as CategorySlug | IncomeCategorySlug,
      });
    }

    if (parsedItems.length > 0) {
      return dolIntentSchema.parse({
        intent: "record_transactions",
        transcript: text,
        items: parsedItems,
      });
    }

    // Mencionou gasto sem valor
    if (/(gastei|paguei|comprei|almo[çc]o|mercado|uber|caf[eé]|farm[áa]cia)/.test(lower)) {
      return dolIntentSchema.parse({
        intent: "needs_clarification",
        transcript: text,
        draft_kind: kind,
        draft_title: cleanTitle(text),
        draft_category_slug: guessCategory(text, kind),
        missing_field: "amount",
      });
    }

    return { intent: "off_topic", transcript: text };
  }
}
