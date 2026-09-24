import { PAYDAY_RULES } from "@/lib/rules";
import type { PaydayRule, UpcomingItem } from "@/types";

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

/** All payday occurrences in a calendar month (local time). */
export function paydaysInMonth(year: number, month: number): UpcomingItem[] {
  const monthStart = new Date(year, month, 1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(year, month, lastDayOfMonth(year, month));
  monthEnd.setHours(23, 59, 59, 999);

  const items: UpcomingItem[] = [];

  for (const rule of PAYDAY_RULES) {
    if (rule.freqDays) {
      let cursor = nextOccurrence(rule, monthStart);
      while (cursor <= monthEnd) {
        items.push({ rule, date: new Date(cursor), days: daysUntil(cursor) });
        cursor = new Date(cursor.getTime() + rule.freqDays * 86_400_000);
      }
      continue;
    }

    if (rule.freqMonthly === "end") {
      const date = new Date(year, month, lastDayOfMonth(year, month));
      items.push({ rule, date, days: daysUntil(date) });
      continue;
    }

    if (typeof rule.freqMonthly === "number") {
      const last = lastDayOfMonth(year, month);
      if (rule.freqMonthly <= last) {
        const date = new Date(year, month, rule.freqMonthly);
        items.push({ rule, date, days: daysUntil(date) });
      }
    }
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}
