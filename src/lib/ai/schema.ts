import { z } from "zod";
import { EXPENSE_CATEGORY_SLUGS, INCOME_CATEGORY_SLUGS } from "@/lib/finance/categories";

const allCategorySlugs = [...EXPENSE_CATEGORY_SLUGS, ...INCOME_CATEGORY_SLUGS] as [
  string,
  ...string[],
];

export const categorySlugSchema = z.enum(allCategorySlugs);
export const expenseCategorySlugSchema = z.enum(
  EXPENSE_CATEGORY_SLUGS as [string, ...string[]]
);

const transactionItemSchema = z.object({
  kind: z.enum(["expense", "income"]),
  title: z.string().min(1).max(80),
  amount_brl: z.number().positive(),
  category_slug: categorySlugSchema,
  occurred_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const dolIntentSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("record_transactions"),
    transcript: z.string().min(1).max(400),
    items: z.array(transactionItemSchema).min(1).max(12),
  }),
  z.object({
    intent: z.literal("record_installment"),
    transcript: z.string().min(1).max(400),
    title: z.string().min(1).max(80),
    category_slug: expenseCategorySlugSchema,
    amount_brl: z.number().positive(),
    amount_mode: z.enum(["total", "per_installment"]),
    installment_count: z.number().int().min(2).max(60),
    start_month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
  }),
  z.object({
    intent: z.literal("record_recurring"),
    transcript: z.string().min(1).max(400),
    kind: z.enum(["expense", "income"]),
    title: z.string().min(1).max(80),
    amount_brl: z.number().positive(),
    category_slug: categorySlugSchema,
    day_of_month: z.number().int().min(1).max(31).optional(),
  }),
  z.object({
    intent: z.literal("set_budget"),
    transcript: z.string().min(1).max(400),
    limit_brl: z.number().positive(),
    category_slug: expenseCategorySlugSchema.nullable().optional(),
  }),
  z.object({
    intent: z.literal("query_month_summary"),
    transcript: z.string().min(1).max(400),
    billing_month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
  }),
  z.object({
    intent: z.literal("query_category"),
    transcript: z.string().min(1).max(400),
    category_slug: expenseCategorySlugSchema,
    billing_month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
  }),
  z.object({
    intent: z.literal("query_installments"),
    transcript: z.string().min(1).max(400),
  }),
  z.object({
    intent: z.literal("query_fixed"),
    transcript: z.string().min(1).max(400),
  }),
  z.object({
    intent: z.literal("query_comparison"),
    transcript: z.string().min(1).max(400),
    billing_month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
  }),
  z.object({
    intent: z.literal("undo_last"),
    transcript: z.string().min(1).max(400),
  }),
  z.object({
    intent: z.literal("needs_clarification"),
    transcript: z.string().min(1).max(400),
    draft_kind: z.enum(["expense", "income"]),
    draft_title: z.string().min(1).max(80),
    draft_category_slug: categorySlugSchema,
    missing_field: z.literal("amount"),
  }),
  z.object({
    intent: z.literal("off_topic"),
    transcript: z.string().min(1).max(400),
  }),
]);

export type DolIntent = z.infer<typeof dolIntentSchema>;

export const DOL_INTENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
        "record_transactions",
        "record_installment",
        "record_recurring",
        "set_budget",
        "query_month_summary",
        "query_category",
        "query_installments",
        "query_fixed",
        "query_comparison",
        "undo_last",
        "needs_clarification",
        "off_topic",
      ],
    },
    transcript: {
      type: "string",
      description: "Transcrição curta e literal do que o usuário disse ou digitou.",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["expense", "income"] },
          title: { type: "string" },
          amount_brl: { type: "number" },
          category_slug: { type: "string", enum: allCategorySlugs },
          occurred_on: { type: "string" },
        },
        required: ["kind", "title", "amount_brl", "category_slug"],
      },
    },
    title: { type: "string" },
    kind: { type: "string", enum: ["expense", "income"] },
    category_slug: { type: "string", enum: allCategorySlugs },
    amount_brl: { type: "number" },
    amount_mode: { type: "string", enum: ["total", "per_installment"] },
    installment_count: { type: "integer" },
    start_month: { type: "string" },
    day_of_month: { type: "integer" },
    limit_brl: { type: "number" },
    billing_month: { type: "string" },
    draft_kind: { type: "string", enum: ["expense", "income"] },
    draft_title: { type: "string" },
    draft_category_slug: { type: "string", enum: allCategorySlugs },
    missing_field: { type: "string", enum: ["amount"] },
  },
  required: ["intent", "transcript"],
};
