import type { CategorySlug, ExpenseCategorySlug, IncomeCategorySlug } from "./types";

export interface CategoryMeta {
  slug: CategorySlug;
  label: string;
  shortLabel: string;
  color: string;
  icon: string;
  kind: "expense" | "income";
}

export const EXPENSE_CATEGORIES: Record<ExpenseCategorySlug, CategoryMeta> = {
  alimentacao: {
    slug: "alimentacao",
    label: "Alimentação",
    shortLabel: "Comida",
    color: "#F5B8D1",
    icon: "Utensils",
    kind: "expense",
  },
  moradia: {
    slug: "moradia",
    label: "Moradia",
    shortLabel: "Casa",
    color: "#C9BEF8",
    icon: "Home",
    kind: "expense",
  },
  transporte: {
    slug: "transporte",
    label: "Transporte",
    shortLabel: "Transp.",
    color: "#ACEFD6",
    icon: "Car",
    kind: "expense",
  },
  lazer: {
    slug: "lazer",
    label: "Lazer",
    shortLabel: "Lazer",
    color: "#F3EE9D",
    icon: "Sparkles",
    kind: "expense",
  },
  saude: {
    slug: "saude",
    label: "Saúde",
    shortLabel: "Saúde",
    color: "#A8E4F7",
    icon: "HeartPulse",
    kind: "expense",
  },
  compras: {
    slug: "compras",
    label: "Compras",
    shortLabel: "Compras",
    color: "#F7CFA8",
    icon: "ShoppingBag",
    kind: "expense",
  },
  assinaturas: {
    slug: "assinaturas",
    label: "Assinaturas",
    shortLabel: "Assin.",
    color: "#DFC2FA",
    icon: "Repeat",
    kind: "expense",
  },
  educacao: {
    slug: "educacao",
    label: "Educação",
    shortLabel: "Educ.",
    color: "#C4F0B2",
    icon: "GraduationCap",
    kind: "expense",
  },
  outros: {
    slug: "outros",
    label: "Outros",
    shortLabel: "Outros",
    color: "#E6E8F0",
    icon: "CircleDot",
    kind: "expense",
  },
};

export const INCOME_CATEGORIES: Record<IncomeCategorySlug, CategoryMeta> = {
  salario: {
    slug: "salario",
    label: "Salário",
    shortLabel: "Salário",
    color: "#ACEFD6",
    icon: "Wallet",
    kind: "income",
  },
  freelance: {
    slug: "freelance",
    label: "Freelance",
    shortLabel: "Freela",
    color: "#DCEFA2",
    icon: "Briefcase",
    kind: "income",
  },
  rendimentos: {
    slug: "rendimentos",
    label: "Rendimentos",
    shortLabel: "Rend.",
    color: "#B8EBF5",
    icon: "TrendingUp",
    kind: "income",
  },
  outros_entrada: {
    slug: "outros_entrada",
    label: "Outras entradas",
    shortLabel: "Entrada",
    color: "#D8F3DC",
    icon: "PlusCircle",
    kind: "income",
  },
};

export const ALL_CATEGORIES: Record<CategorySlug, CategoryMeta> = {
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
};

export const EXPENSE_CATEGORY_SLUGS = Object.keys(EXPENSE_CATEGORIES) as ExpenseCategorySlug[];
export const INCOME_CATEGORY_SLUGS = Object.keys(INCOME_CATEGORIES) as IncomeCategorySlug[];

export function getCategoryMeta(slug: string): CategoryMeta {
  if (slug in ALL_CATEGORIES) {
    return ALL_CATEGORIES[slug as CategorySlug];
  }
  return EXPENSE_CATEGORIES.outros;
}

export function isExpenseCategory(slug: string): slug is ExpenseCategorySlug {
  return slug in EXPENSE_CATEGORIES;
}
