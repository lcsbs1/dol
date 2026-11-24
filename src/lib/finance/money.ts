const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brlCompactFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatBRL(cents: number): string {
  return brlFormatter.format(cents / 100);
}

export function formatCompactBRL(cents: number): string {
  if (Math.abs(cents) < 100_000) {
    return formatBRL(cents);
  }
  return brlCompactFormatter.format(cents / 100);
}

/**
 * Converte string/número BRL ou decimal em centavos inteiros.
 * Aceita "45,50", "1.200,00", "45.5", "R$ 600", 42.9.
 */
export function parseBRLToCents(raw: string | number): number | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return Math.round(raw * 100);
  }

  const cleaned = raw
    .replace(/r\$\s*/gi, "")
    .replace(/\s+/g, "")
    .trim();

  if (!cleaned) return null;

  let normalized = cleaned;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    // Ex: 1.250,50 -> 1250.50
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // Ex: 45,50 -> 45.50
    normalized = normalized.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    // Ex: 1.800 -> 1800
    normalized = normalized.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const cents = Math.round(parsed * 100);
  return cents > 0 ? cents : null;
}

/**
 * Divide um total em centavos em N parcelas inteiras distribuindo o resto nas primeiras.
 * Ex.: splitInstallments(10000, 3) -> [3334, 3333, 3333] (soma = 10000).
 */
export function splitInstallments(totalCents: number, count: number): number[] {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new Error("Total de centavos deve ser inteiro positivo");
  }
  if (!Number.isInteger(count) || count < 1 || count > 60) {
    throw new Error("Quantidade de parcelas deve ser entre 1 e 60");
  }

  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  return Array.from({ length: count }, (_, idx) => (idx < remainder ? base + 1 : base));
}

export function isValidBillingMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

export function getCurrentBillingMonth(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getTodayISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addMonths(billingMonth: string, offset: number): string {
  if (!isValidBillingMonth(billingMonth)) {
    throw new Error(`Mês inválido: ${billingMonth}`);
  }
  const [yearStr, monthStr] = billingMonth.split("-");
  const totalMonths = Number(yearStr) * 12 + (Number(monthStr) - 1) + offset;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

export function formatMonthLabel(billingMonth: string): string {
  if (!isValidBillingMonth(billingMonth)) return billingMonth;
  const [y, m] = billingMonth.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
}

export function formatMonthLongLabel(billingMonth: string): string {
  if (!isValidBillingMonth(billingMonth)) return billingMonth;
  const [y, m] = billingMonth.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const monthName = d.toLocaleDateString("pt-BR", { month: "long" });
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${capitalized} ${y}`;
}

export function formatMonthShortName(billingMonth: string): string {
  if (!isValidBillingMonth(billingMonth)) return billingMonth;
  const [y, m] = billingMonth.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const short = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return short.charAt(0).toUpperCase() + short.slice(1);
}

export function buildOccurredOnForMonth(billingMonth: string, dayOfMonth: number): string {
  const [y, m] = billingMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const clampedDay = Math.min(Math.max(1, dayOfMonth), lastDay);
  return `${billingMonth}-${String(clampedDay).padStart(2, "0")}`;
}
