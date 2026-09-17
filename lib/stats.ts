import { computeBalances } from "@/lib/ledger";
import { PAYDAY_RULES } from "@/lib/rules";
import { daysUntil, nextOccurrence } from "@/lib/payday";
import type {
  Balances,
  Currency,
  LedgerEntry,
  SourcePeriod,
  SourceSavings,
  Totals,
  UpcomingItem,
} from "@/types";

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

export function filterLedgerEntries(
  entries: LedgerEntry[],
  filter: "all" | Currency,
): LedgerEntry[] {
  if (filter === "all") return entries;
  return entries.filter((entry) => entry.currency === filter);
}

export function sourceRowsFromBalances(balances: Balances, currency: Currency): SourceSavings[] {
  const rules = PAYDAY_RULES.filter((rule) => rule.currency === currency);
  const rows = rules.map((rule) => {
    const source = balances.bySource.find((item) => item.ruleId === rule.id);
    const saved = source?.saved ?? 0;
    const received = source?.received ?? 0;
    return { rule, saved, received, share: 0 };
  });

  const total = rows.reduce((sum, row) => sum + row.saved, 0);
  return rows.map((row) => ({
    ...row,
    share: total > 0 ? (row.saved / total) * 100 : 0,
  }));
}

export function isInCurrentMonth(dateStr: string, ref = new Date()): boolean {
  const date = new Date(dateStr);
  return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
}

export function entriesForPeriod(entries: LedgerEntry[], period: SourcePeriod): LedgerEntry[] {
  if (period === "all") return entries;
  return entries.filter((entry) => isInCurrentMonth(entry.date));
}

export function balancesForPeriod(entries: LedgerEntry[], period: SourcePeriod): Balances {
  return computeBalances(entriesForPeriod(entries, period));
}

export function currentMonthLabel(ref = new Date()): string {
  return ref.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function hasSourceActivity(row: SourceSavings, period: SourcePeriod): boolean {
  if (row.saved > 0 || row.received > 0) return true;
  if (
    period === "month" &&
    ((row.savedAllTime ?? 0) > 0 || (row.receivedAllTime ?? 0) > 0)
  ) {
    return true;
  }
  return false;
}

export function sourceRowsForPeriod(
  entries: LedgerEntry[],
  currency: Currency,
  period: SourcePeriod,
): SourceSavings[] {
  const allTimeRows = sourceRowsFromBalances(computeBalances(entries), currency);

  let rows: SourceSavings[];
  if (period === "all") {
    rows = allTimeRows;
  } else {
    const monthRows = sourceRowsFromBalances(balancesForPeriod(entries, "month"), currency);
    rows = monthRows.map((row) => {
      const allTime = allTimeRows.find((item) => item.rule.id === row.rule.id);
      return {
        ...row,
        savedAllTime: allTime?.saved ?? 0,
        receivedAllTime: allTime?.received ?? 0,
      };
    });
  }

  return rows.filter((row) => hasSourceActivity(row, period));
}

export function hasLoggedPaydays(entries: LedgerEntry[]): boolean {
  return entries.some((entry) => entry.type === "payday");
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
