import { describe, expect, it } from "vitest";
import { dolIntentSchema } from "./schema";

describe("dolIntentSchema", () => {
  it("accepts valid financial intents", () => {
    const parsed = dolIntentSchema.parse({
      intent: "record_installment",
      transcript: "tênis 600 em 6x",
      title: "Tênis",
      category_slug: "compras",
      amount_brl: 600,
      amount_mode: "total",
      installment_count: 6,
    });
    expect(parsed.intent).toBe("record_installment");
  });

  it("accepts off_topic strictly without conversational payload", () => {
    const parsed = dolIntentSchema.parse({
      intent: "off_topic",
      transcript: "receita de bolo",
    });
    expect(parsed.intent).toBe("off_topic");
  });

  it("rejects invalid installment counts or negative amounts", () => {
    expect(() =>
      dolIntentSchema.parse({
        intent: "record_installment",
        transcript: "teste",
        title: "Algo",
        category_slug: "compras",
        amount_brl: -10,
        amount_mode: "total",
        installment_count: 1,
      })
    ).toThrow();
  });
});
