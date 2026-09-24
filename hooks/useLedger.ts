"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { computeBalances } from "@/lib/ledger";
import {
  exportLedger,
  hasOpeningBalanceSetup,
  importLedger,
  loadLedger,
  markOpeningBalanceSetup,
  saveLedger,
} from "@/lib/storage";
import type { Balances, Currency, LedgerEntry, PaydayRule, Pool } from "@/types";
import type { SyncPayload } from "@/types/sync";

function createPaydayEntry(rule: PaydayRule): LedgerEntry {
  return {
    id: crypto.randomUUID(),
    type: "payday",
    who: rule.who,
    sourceId: rule.id,
    currency: rule.currency,
    amount: rule.save,
    pool: "saved",
    iconKey: rule.iconKey,
    date: new Date().toISOString(),
    received: rule.received,
    saveAmount: rule.save,
    keepAmount: rule.keep,
  };
}

export function useLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openingDone, setOpeningDone] = useState(true);

  useEffect(() => {
    const data = loadLedger();
    setEntries(data);
    setOpeningDone(hasOpeningBalanceSetup());
    setLoaded(true);
    if (data.length > 0) saveLedger(data);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveLedger(entries);
  }, [entries, loaded]);

  const balances = useMemo(() => computeBalances(entries), [entries]);

  const logPayday = useCallback((rule: PaydayRule) => {
    setEntries((current) => [createPaydayEntry(rule), ...current]);
  }, []);

  const logExpense = useCallback(
    (params: { amount: number; currency: Currency; pool: Pool; note?: string }) => {
      if (params.amount <= 0) return;
      setEntries((current) => [
        {
          id: crypto.randomUUID(),
          type: "expense",
          who: "Expense",
          currency: params.currency,
          amount: params.amount,
          pool: params.pool,
          iconKey: "wallet",
          note: params.note?.trim() || undefined,
          date: new Date().toISOString(),
        },
        ...current,
      ]);
    },
    [],
  );

  const addOpeningBalances = useCallback(
    (params: { savedEtb: number; spendableEtb: number; savedUsd: number }) => {
      const batch: LedgerEntry[] = [];
      const date = new Date().toISOString();

      if (params.savedEtb > 0) {
        batch.push({
          id: crypto.randomUUID(),
          type: "opening_balance",
          who: "Opening balance",
          currency: "ETB",
          amount: params.savedEtb,
          pool: "saved",
          iconKey: "wallet",
          note: "Saved ETB before tracking",
          date,
        });
      }

      if (params.spendableEtb > 0) {
        batch.push({
          id: crypto.randomUUID(),
          type: "opening_balance",
          who: "Opening balance",
          currency: "ETB",
          amount: params.spendableEtb,
          pool: "spendable",
          iconKey: "wallet",
          note: "Spendable ETB before tracking",
          date,
        });
      }

      if (params.savedUsd > 0) {
        batch.push({
          id: crypto.randomUUID(),
          type: "opening_balance",
          who: "Opening balance",
          currency: "USD",
          amount: params.savedUsd,
          pool: "saved",
          iconKey: "wallet",
          note: "Saved USD before tracking",
          date,
        });
      }

      if (batch.length > 0) {
        setEntries((current) => [...batch, ...current]);
      }

      markOpeningBalanceSetup();
      setOpeningDone(true);
    },
    [],
  );

  const adjustBalance = useCallback(
    (params: {
      amount: number;
      currency: Currency;
      pool: Pool;
      direction: "add" | "subtract";
      note?: string;
    }) => {
      if (params.amount <= 0) return;

      if (params.direction === "subtract") {
        logExpense({
          amount: params.amount,
          currency: params.currency,
          pool: params.pool,
          note: params.note?.trim() || "Balance correction",
        });
        return;
      }

      setEntries((current) => [
        {
          id: crypto.randomUUID(),
          type: "adjustment",
          who: "Balance adjustment",
          currency: params.currency,
          amount: params.amount,
          pool: params.pool,
          iconKey: "wallet",
          note: params.note?.trim() || undefined,
          date: new Date().toISOString(),
        },
        ...current,
      ]);
    },
    [logExpense],
  );

  const skipOpeningBalance = useCallback(() => {
    markOpeningBalanceSetup();
    setOpeningDone(true);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const undoLast = useCallback(() => {
    setEntries((current) => current.slice(1));
  }, []);

  const handleExport = useCallback(() => {
    exportLedger(entries);
  }, [entries]);

  const handleImport = useCallback(async (file: File) => {
    const imported = await importLedger(file);
    setEntries(imported);
    markOpeningBalanceSetup();
    setOpeningDone(true);
  }, []);

  const applyRemoteState = useCallback((payload: SyncPayload) => {
    setEntries(payload.ledger);
    saveLedger(payload.ledger);
    if (payload.openingDone) {
      markOpeningBalanceSetup();
      setOpeningDone(true);
    }
  }, []);

  return {
    entries,
    loaded,
    balances,
    openingDone,
    logPayday,
    logExpense,
    addOpeningBalances,
    adjustBalance,
    skipOpeningBalance,
    removeEntry,
    undoLast,
    handleExport,
    handleImport,
    applyRemoteState,
  };
}
