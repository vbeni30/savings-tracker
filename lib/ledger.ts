import { PAYDAY_RULES } from "@/lib/rules";
import type {
  AffordabilityResult,
  Balances,
  Currency,
  LedgerEntry,
  Pool,
  SavingsEntry,
  SourceBalance,
  Totals,
} from "@/types";

function emptyTotals(): Totals {
  return { etb: 0, usd: 0 };
}

function addToTotals(totals: Totals, currency: Currency, amount: number) {
  if (currency === "ETB") totals.etb += amount;
  else totals.usd += amount;
}

function subtractFromTotals(totals: Totals, currency: Currency, amount: number) {
  addToTotals(totals, currency, -amount);
}

export function findRuleIdByWho(who: string): string | undefined {
  return PAYDAY_RULES.find((rule) => rule.who === who)?.id;
}

export function migrateLegacyEntries(legacy: SavingsEntry[]): LedgerEntry[] {
  return legacy.map((entry) => {
    const rule = PAYDAY_RULES.find((item) => item.who === entry.who);
    return {
      id: entry.id,
      type: "payday",
      who: entry.who,
      sourceId: rule?.id,
      currency: entry.currency,
      amount: entry.save,
      pool: "saved",
      iconKey: entry.iconKey,
      date: entry.date,
      received: rule?.received ?? entry.save,
      saveAmount: entry.save,
      keepAmount: rule?.keep ?? 0,
    };
  });
}

export function computeBalances(entries: LedgerEntry[]): Balances {
  const saved = emptyTotals();
  const spendable = emptyTotals();
  const received = emptyTotals();

  const sourceMap = new Map<string, SourceBalance>();
  for (const rule of PAYDAY_RULES) {
    sourceMap.set(rule.id, {
      ruleId: rule.id,
      who: rule.who,
      currency: rule.currency,
      cls: rule.cls,
      iconKey: rule.iconKey,
      received: 0,
      saved: 0,
    });
  }

  for (const entry of entries) {
    if (entry.type === "payday") {
      const saveAmt = entry.saveAmount ?? entry.amount;
      const keepAmt = entry.keepAmount ?? 0;
      const recv = entry.received ?? saveAmt + keepAmt;

      addToTotals(saved, entry.currency, saveAmt);
      addToTotals(spendable, entry.currency, keepAmt);
      addToTotals(received, entry.currency, recv);

      if (entry.sourceId && sourceMap.has(entry.sourceId)) {
        const source = sourceMap.get(entry.sourceId)!;
        source.received += recv;
        source.saved += saveAmt;
      }
    }

    if (entry.type === "opening_balance" || entry.type === "adjustment") {
      const target = entry.pool === "saved" ? saved : spendable;
      addToTotals(target, entry.currency, entry.amount);
      if (entry.type === "opening_balance" && entry.pool === "saved" && entry.sourceId) {
        const source = sourceMap.get(entry.sourceId);
        if (source) source.saved += entry.amount;
      }
    }

    if (entry.type === "expense") {
      const target = entry.pool === "saved" ? saved : spendable;
      subtractFromTotals(target, entry.currency, entry.amount);
    }
  }

  return {
    saved,
    spendable,
    received,
    bySource: Array.from(sourceMap.values()).filter(
      (source) => source.received > 0 || source.saved > 0,
    ),
  };
}

export function getPoolBalance(balances: Balances, currency: Currency, pool: Pool): number {
  const bucket = pool === "saved" ? balances.saved : balances.spendable;
  return currency === "ETB" ? bucket.etb : bucket.usd;
}

export function canAfford(
  balances: Balances,
  amount: number,
  currency: Currency,
  preferPool: Pool = "spendable",
): AffordabilityResult {
  const spendable = getPoolBalance(balances, currency, "spendable");
  const saved = getPoolBalance(balances, currency, "saved");

  if (preferPool === "spendable" && spendable >= amount) {
    return {
      ok: true,
      usePool: "spendable",
      remainingAfter: spendable - amount,
      message: `Yes — use spendable ${currency}. You'll have ${(spendable - amount).toLocaleString("en-US")} left for daily costs.`,
    };
  }

  if (saved >= amount) {
    return {
      ok: true,
      usePool: "saved",
      remainingAfter: saved - amount,
      message: `Possible from savings, but this touches money you planned to keep. ${(saved - amount).toLocaleString("en-US")} ${currency} would remain saved.`,
    };
  }

  if (spendable + saved >= amount) {
    return {
      ok: true,
      usePool: "spendable",
      remainingAfter: spendable + saved - amount,
      message: `Tight — you'd need both spendable (${spendable.toLocaleString("en-US")}) and some savings (${saved.toLocaleString("en-US")}) ${currency}.`,
    };
  }

  return {
    ok: false,
    usePool: preferPool,
    remainingAfter: spendable,
    message: `Not enough — you have ${spendable.toLocaleString("en-US")} spendable and ${saved.toLocaleString("en-US")} saved ${currency}.`,
  };
}

export function entryLabel(entry: LedgerEntry): string {
  if (entry.type === "payday") return entry.who;
  if (entry.type === "expense") return entry.note?.trim() || "Expense";
  if (entry.type === "opening_balance") return "Opening balance";
  return entry.note?.trim() || "Adjustment";
}

export function entryIsCredit(entry: LedgerEntry): boolean {
  return entry.type === "payday" || entry.type === "opening_balance" || entry.type === "adjustment";
}

export function entryDisplayAmount(entry: LedgerEntry): number {
  if (entry.type === "payday") return entry.saveAmount ?? entry.amount;
  return entry.amount;
}
