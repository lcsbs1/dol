"use client";

import {
  Briefcase,
  Car,
  CircleDot,
  GraduationCap,
  HeartPulse,
  Home,
  PlusCircle,
  Repeat,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Utensils,
  Wallet,
} from "lucide-react";

const ICON_MAP = {
  Utensils,
  Home,
  Car,
  Sparkles,
  HeartPulse,
  ShoppingBag,
  Repeat,
  GraduationCap,
  CircleDot,
  Wallet,
  Briefcase,
  TrendingUp,
  PlusCircle,
} as const;

export function CategoryIcon({
  name,
  className = "h-4 w-4",
  color,
}: {
  name: string;
  className?: string;
  color?: string;
}) {
  const Icon = ICON_MAP[name as keyof typeof ICON_MAP] ?? CircleDot;
  return <Icon className={className} style={color ? { color } : undefined} />;
}
