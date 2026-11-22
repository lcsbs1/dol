import { describe, expect, it } from "vitest";
import {
  addMonths,
  formatBRL,
  parseBRLToCents,
  splitInstallments,
} from "./money";

describe("money utilities", () => {
  it("parses Brazilian and dot-decimal BRL amounts accurately into cents", () => {
    expect(parseBRLToCents("45,50")).toBe(4550);
    expect(parseBRLToCents("R$ 1.250,90")).toBe(125090);
    expect(parseBRLToCents("1.800")).toBe(180000);
    expect(parseBRLToCents(42.9)).toBe(4290);
    expect(parseBRLToCents("0")).toBeNull();
    expect(parseBRLToCents("-10")).toBeNull();
  });

  it("splits installments evenly and distributes remainder across first installments", () => {
    const parts = splitInstallments(10000, 3);
    expect(parts).toEqual([3334, 3333, 3333]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000);

    const exact = splitInstallments(60000, 6);
    expect(exact).toEqual([10000, 10000, 10000, 10000, 10000, 10000]);
  });

  it("advances billing months across year boundaries", () => {
    expect(addMonths("2026-11", 1)).toBe("2026-12");
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("formats cents in BRL", () => {
    expect(formatBRL(123456)).toContain("1.234,56");
  });
});
