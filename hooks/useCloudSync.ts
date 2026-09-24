"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveGoals } from "@/lib/goals";
import {
  buildSyncPayload,
  emptySyncPayload,
  isEmptyPayload,
  mergeSyncPayload,
} from "@/lib/sync/merge";
import { markOpeningBalanceSetup, saveLedger } from "@/lib/storage";
import type { LedgerEntry } from "@/types";
import type { SavingsGoal } from "@/types/ai";
import type { SyncPayload, SyncStatus } from "@/types/sync";

type UseCloudSyncOptions = {
  ready: boolean;
  entries: LedgerEntry[];
  goals: SavingsGoal[];
  openingDone: boolean;
  onApply: (payload: SyncPayload) => void;
};

async function fetchRemote(): Promise<{ enabled: boolean; data: SyncPayload | null }> {
  const response = await fetch("/api/sync", { credentials: "include" });
  if (response.status === 401) throw new Error("unauthorized");
  if (!response.ok) throw new Error("fetch failed");
  return (await response.json()) as { enabled: boolean; data: SyncPayload | null };
}

async function pushRemote(payload: SyncPayload): Promise<SyncPayload | null> {
  const response = await fetch("/api/sync", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 409) {
    const body = (await response.json()) as { server?: SyncPayload };
    return body.server ?? null;
  }

  if (!response.ok) throw new Error("push failed");
  return null;
}

export function useCloudSync({
  ready,
  entries,
  goals,
  openingDone,
  onApply,
}: UseCloudSyncOptions) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const initialDone = useRef(false);
  const applyingRemote = useRef(false);
  const syncEnabled = useRef(true);
  const lastPushedAt = useRef<string | null>(null);

  const applyPayload = useCallback(
    (payload: SyncPayload) => {
      applyingRemote.current = true;
      onApply(payload);
      saveLedger(payload.ledger);
      saveGoals(payload.goals);
      if (payload.openingDone) markOpeningBalanceSetup();
      lastPushedAt.current = payload.updatedAt;
      queueMicrotask(() => {
        applyingRemote.current = false;
      });
    },
    [onApply],
  );

  useEffect(() => {
    if (!ready || initialDone.current) return;

    let cancelled = false;

    const runInitial = async () => {
      setStatus("syncing");
      try {
        const remote = await fetchRemote();
        if (cancelled) return;

        if (!remote.enabled) {
          syncEnabled.current = false;
          setStatus("disabled");
          initialDone.current = true;
          return;
        }

        syncEnabled.current = true;
        const local = buildSyncPayload(entries, goals, openingDone);
        const { payload, appliedRemote } = mergeSyncPayload(local, remote.data);

        if (appliedRemote) {
          applyPayload(payload);
        } else if (!isEmptyPayload(payload)) {
          await pushRemote(payload);
          lastPushedAt.current = payload.updatedAt;
        }

        setStatus("synced");
        initialDone.current = true;
      } catch {
        if (!cancelled) setStatus("offline");
        initialDone.current = true;
      }
    };

    void runInitial();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when ready
  }, [ready]);

  useEffect(() => {
    if (!ready || !initialDone.current || !syncEnabled.current || applyingRemote.current) {
      return;
    }

    const payload = buildSyncPayload(entries, goals, openingDone);
    if (payload.updatedAt === lastPushedAt.current) return;

    setStatus("syncing");
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const conflict = await pushRemote(payload);
          if (conflict) {
            applyPayload(conflict);
          } else {
            lastPushedAt.current = payload.updatedAt;
          }
          setStatus("synced");
        } catch {
          setStatus("error");
        }
      })();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [ready, entries, goals, openingDone, applyPayload]);

  const syncNow = useCallback(async () => {
    if (!syncEnabled.current) return;
    setStatus("syncing");
    try {
      const remote = await fetchRemote();
      const local = buildSyncPayload(entries, goals, openingDone);
      const { payload } = mergeSyncPayload(local, remote.data ?? emptySyncPayload());
      applyPayload(payload);
      const pushed = buildSyncPayload(payload.ledger, payload.goals, payload.openingDone);
      const conflict = await pushRemote(pushed);
      if (conflict) applyPayload(conflict);
      else lastPushedAt.current = pushed.updatedAt;
      setStatus("synced");
    } catch {
      setStatus("error");
    }
  }, [entries, goals, openingDone, applyPayload]);

  return { syncStatus: status, syncNow };
}
