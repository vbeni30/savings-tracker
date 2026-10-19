import type { Currency, LedgerEntry } from "@/types";

const DEFAULT_LOOKBACK_DAYS = 30;

export type RunwayResult = {
  currency: Currency;
  spendable: number;
  dailyBurn: number | null;
  daysLeft: number | null;
  lookbackDays: number;
  spentInWindow: number;
};

function spendableExpensesInWindow(
  entries: LedgerEntry[],
  currency: Currency,
  lookbackDays: number,
  ref = new Date(),
): number {
  const cutoff = new Date(ref);
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  cutoff.setHours(0, 0, 0, 0);

  let total = 0;
  for (const entry of entries) {
    if (entry.type !== "expense" || entry.currency !== currency || entry.pool !== "spendable") {
      continue;
    }
    const date = new Date(entry.date);
    if (date >= cutoff) total += entry.amount;
  }
  return total;
}

export function computeRunway(
  entries: LedgerEntry[],
  currency: Currency,
  spendable: number,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
  ref = new Date(),
): RunwayResult {
  const spentInWindow = spendableExpensesInWindow(entries, currency, lookbackDays, ref);
  const dailyBurn = spentInWindow > 0 ? spentInWindow / lookbackDays : null;
  let daysLeft: number | null = null;

  if (spendable <= 0) {
    daysLeft = 0;
  } else if (dailyBurn && dailyBurn > 0) {
    daysLeft = Math.floor(spendable / dailyBurn);
  }

  return {
    currency,
    spendable,
    dailyBurn,
    daysLeft,
    lookbackDays,
    spentInWindow,
  };
}

export function formatRunwayLabel(result: RunwayResult): string {
  if (result.daysLeft === null) {
    if (result.spendable <= 0) return "No spendable left";
    return "No recent spendable expenses";
  }
  if (result.daysLeft === 0) return "Spendable depleted";
  if (result.daysLeft === 1) return "~1 day at recent pace";
  if (result.daysLeft > 365) return "365+ days at recent pace";
  return `~${result.daysLeft} days at recent pace`;
}
