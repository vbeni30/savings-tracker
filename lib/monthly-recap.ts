import { computeBalances } from "@/lib/ledger";
import { paydaysInMonth } from "@/lib/payday";
import {
  currentMonthLabel,
  entriesForPeriod,
  savingsRate,
} from "@/lib/stats";
import type { Currency, LedgerEntry, Totals } from "@/types";

export type MonthlyRecap = {
  monthLabel: string;
  savedAdded: Totals;
  spendableSpent: Totals;
  receivedFromPaydays: Totals;
  saveRateEtb: number;
  saveRateUsd: number;
  paydaysLogged: number;
  plannedPaydays: number;
  plannedSave: Totals;
};

function emptyTotals(): Totals {
  return { etb: 0, usd: 0 };
}

function addTotal(totals: Totals, currency: Currency, amount: number) {
  if (currency === "ETB") totals.etb += amount;
  else totals.usd += amount;
}

export function buildMonthlyRecap(entries: LedgerEntry[], ref = new Date()): MonthlyRecap {
  const monthEntries = entriesForPeriod(entries, "month");
  const monthLabel = currentMonthLabel(ref);
  const year = ref.getFullYear();
  const month = ref.getMonth();

  const savedAdded = emptyTotals();
  const spendableSpent = emptyTotals();
  const receivedFromPaydays = emptyTotals();
  let paydaysLogged = 0;

  for (const entry of monthEntries) {
    if (entry.type === "payday") {
      paydaysLogged += 1;
      const saveAmt = entry.saveAmount ?? entry.amount;
      const recv = entry.received ?? saveAmt + (entry.keepAmount ?? 0);
      addTotal(savedAdded, entry.currency, saveAmt);
      addTotal(receivedFromPaydays, entry.currency, recv);
    }
    if (entry.type === "opening_balance" && entry.pool === "saved") {
      addTotal(savedAdded, entry.currency, entry.amount);
    }
    if (entry.type === "adjustment" && entry.pool === "saved") {
      addTotal(savedAdded, entry.currency, entry.amount);
    }
    if (entry.type === "expense" && entry.pool === "spendable") {
      addTotal(spendableSpent, entry.currency, entry.amount);
    }
  }

  const monthBalances = computeBalances(monthEntries);
  const saveRateEtb = savingsRate(monthBalances.received.etb, monthBalances.saved.etb);
  const saveRateUsd = savingsRate(monthBalances.received.usd, monthBalances.saved.usd);

  const planned = paydaysInMonth(year, month);
  const plannedSave = emptyTotals();
  for (const { rule } of planned) {
    addTotal(plannedSave, rule.currency, rule.save);
  }

  return {
    monthLabel,
    savedAdded,
    spendableSpent,
    receivedFromPaydays,
    saveRateEtb,
    saveRateUsd,
    paydaysLogged,
    plannedPaydays: planned.length,
    plannedSave,
  };
}
