import type { Currency } from "@/types";

const enNumber = new Intl.NumberFormat("en-US");
const enDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatAmount(amount: number, currency: Currency): string {
  const formatted = enNumber.format(Math.round(amount));
  return currency === "USD" ? `$${formatted}` : `${formatted} ETB`;
}

export function formatDate(date: Date): string {
  return enDate.format(date);
}

export function formatWhenLabel(days: number, date: Date): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days · ${formatDate(date)}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
