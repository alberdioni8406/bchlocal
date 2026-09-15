import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMzn(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("pt-MZ", {
    style: "currency",
    currency: "MZN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatBch(amount: number | string, decimals = 6): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${n.toFixed(decimals)} BCH`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getTrustBadge(completedTx: number, avgRating: number): string {
  if (completedTx >= 50 && avgRating >= 4.5) return "Trusted";
  if (completedTx >= 10) return "Established";
  return "New";
}
