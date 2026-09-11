import type { PaydayRule } from "@/types";

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function nextOccurrence(rule: PaydayRule, from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);

  if (rule.freqDays && rule.anchor) {
    let anchor = new Date(`${rule.anchor}T00:00:00`);
    while (anchor < d) {
      anchor = new Date(anchor.getTime() + rule.freqDays * 86_400_000);
    }
    return anchor;
  }

  if (rule.freqMonthly === "end") {
    const year = d.getFullYear();
    let month = d.getMonth();
    let candidate = new Date(year, month, lastDayOfMonth(year, month));
    if (candidate < d) {
      month += 1;
      candidate = new Date(year, month, lastDayOfMonth(year, month));
    }
    return candidate;
  }

  if (typeof rule.freqMonthly === "number") {
    const year = d.getFullYear();
    let month = d.getMonth();
    let day = Math.min(rule.freqMonthly, lastDayOfMonth(year, month));
    let candidate = new Date(year, month, day);
    if (candidate < d) {
      month += 1;
      day = Math.min(rule.freqMonthly, lastDayOfMonth(year, month));
      candidate = new Date(year, month, day);
    }
    return candidate;
  }

  return d;
}

export function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - now.getTime()) / 86_400_000);
}

export function getNextPayday(rules: PaydayRule[], from = new Date()) {
  const upcoming = rules
    .map((rule) => ({ rule, date: nextOccurrence(rule, from) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return upcoming[0];
}
