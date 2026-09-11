"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { exportEntries, importEntries, loadEntries, saveEntries } from "@/lib/storage";
import type { PaydayRule, SavingsEntry, Totals } from "@/types";

function createEntry(rule: PaydayRule): SavingsEntry {
  return {
    id: crypto.randomUUID(),
    who: rule.who,
    currency: rule.currency,
    save: rule.save,
    iconKey: rule.iconKey,
    date: new Date().toISOString(),
  };
}

function computeTotals(entries: SavingsEntry[]): Totals {
  return entries.reduce(
    (acc, entry) => {
      if (entry.currency === "ETB") acc.etb += entry.save;
      else acc.usd += entry.save;
      return acc;
    },
    { etb: 0, usd: 0 },
  );
}

export function useEntries() {
  const [entries, setEntries] = useState<SavingsEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(loadEntries());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveEntries(entries);
  }, [entries, loaded]);

  const totals = useMemo(() => computeTotals(entries), [entries]);

  const logPayday = useCallback((rule: PaydayRule) => {
    setEntries((current) => [createEntry(rule), ...current]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const undoLast = useCallback(() => {
    setEntries((current) => current.slice(1));
  }, []);

  const handleExport = useCallback(() => {
    exportEntries(entries);
  }, [entries]);

  const handleImport = useCallback(async (file: File) => {
    const imported = await importEntries(file);
    setEntries(imported);
  }, []);

  return {
    entries,
    loaded,
    totals,
    logPayday,
    removeEntry,
    undoLast,
    handleExport,
    handleImport,
  };
}
