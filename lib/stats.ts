import { PAYDAY_RULES } from "@/lib/rules";
import { daysUntil, nextOccurrence } from "@/lib/payday";
import type { SavingsEntry, SourceSavings, Totals, UpcomingItem } from "@/types";

const DAYS_IN_MONTH = 30;

export function monthlyProjection(): Totals {
  return PAYDAY_RULES.reduce(
    (acc, rule) => {
      const occurrences = rule.freqDays ? DAYS_IN_MONTH / rule.freqDays : 1;
      const monthly = rule.save * occurrences;
      if (rule.currency === "ETB") acc.etb += monthly;
      else acc.usd += monthly;
      return acc;
    },
    { etb: 0, usd: 0 },
  );
}

export function savingsRate(received: number, save: number): number {
  if (received <= 0) return 0;
  return (save / received) * 100;
}

export function filterEntries(
  entries: SavingsEntry[],
  filter: "all" | "ETB" | "USD",
): SavingsEntry[] {
  if (filter === "all") return entries;
  return entries.filter((entry) => entry.currency === filter);
}

export function savingsBySource(entries: SavingsEntry[], currency: "ETB" | "USD"): SourceSavings[] {
  const rules = PAYDAY_RULES.filter((rule) => rule.currency === currency);
  const rows = rules.map((rule) => {
    const saved = entries
      .filter((entry) => entry.who === rule.who)
      .reduce((sum, entry) => sum + entry.save, 0);
    return { rule, saved, share: 0 };
  });

  const total = rows.reduce((sum, row) => sum + row.saved, 0);
  return rows.map((row) => ({
    ...row,
    share: total > 0 ? (row.saved / total) * 100 : 0,
  }));
}

export function upcomingSchedule(from = new Date()): UpcomingItem[] {
  return PAYDAY_RULES.map((rule) => {
    const date = nextOccurrence(rule, from);
    return { rule, date, days: daysUntil(date) };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function overallSavingsRate(): number {
  const receivedPerMonth = PAYDAY_RULES.reduce((sum, rule) => {
    const occurrences = rule.freqDays ? DAYS_IN_MONTH / rule.freqDays : 1;
    return sum + rule.received * occurrences;
  }, 0);
  const savedPerMonth = PAYDAY_RULES.reduce((sum, rule) => {
    const occurrences = rule.freqDays ? DAYS_IN_MONTH / rule.freqDays : 1;
    return sum + rule.save * occurrences;
  }, 0);
  return savingsRate(receivedPerMonth, savedPerMonth);
}
