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
    color: "#F59E0B",
    icon: "Utensils",
    kind: "expense",
  },
  moradia: {
    slug: "moradia",
    label: "Moradia",
    shortLabel: "Casa",
    color: "#3B82F6",
    icon: "Home",
    kind: "expense",
  },
  transporte: {
    slug: "transporte",
    label: "Transporte",
    shortLabel: "Transp.",
    color: "#06B6D4",
    icon: "Car",
    kind: "expense",
  },
  lazer: {
    slug: "lazer",
    label: "Lazer",
    shortLabel: "Lazer",
    color: "#EC4899",
    icon: "Sparkles",
    kind: "expense",
  },
  saude: {
    slug: "saude",
    label: "Saúde",
    shortLabel: "Saúde",
    color: "#10B981",
    icon: "HeartPulse",
    kind: "expense",
  },
  compras: {
    slug: "compras",
    label: "Compras",
    shortLabel: "Compras",
    color: "#8B5CF6",
    icon: "ShoppingBag",
    kind: "expense",
  },
  assinaturas: {
    slug: "assinaturas",
    label: "Assinaturas",
    shortLabel: "Assin.",
    color: "#6366F1",
    icon: "Repeat",
    kind: "expense",
  },
  educacao: {
    slug: "educacao",
    label: "Educação",
    shortLabel: "Educ.",
    color: "#14B8A6",
    icon: "GraduationCap",
    kind: "expense",
  },
  outros: {
    slug: "outros",
    label: "Outros",
    shortLabel: "Outros",
    color: "#94A3B8",
    icon: "CircleDot",
    kind: "expense",
  },
};

export const INCOME_CATEGORIES: Record<IncomeCategorySlug, CategoryMeta> = {
  salario: {
    slug: "salario",
    label: "Salário",
    shortLabel: "Salário",
    color: "#22C55E",
    icon: "Wallet",
    kind: "income",
  },
  freelance: {
    slug: "freelance",
    label: "Freelance",
    shortLabel: "Freela",
    color: "#34D399",
    icon: "Briefcase",
    kind: "income",
  },
  rendimentos: {
    slug: "rendimentos",
    label: "Rendimentos",
    shortLabel: "Rend.",
    color: "#4ADE80",
    icon: "TrendingUp",
    kind: "income",
  },
  outros_entrada: {
    slug: "outros_entrada",
    label: "Outras entradas",
    shortLabel: "Entrada",
    color: "#86EFAC",
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
