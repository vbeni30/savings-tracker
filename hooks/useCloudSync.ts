"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveGoals } from "@/lib/goals";
import { needsSyncConflictChoice } from "@/lib/sync/conflict";
import {
  buildSyncPayload,
  combineSyncPayloads,
  emptySyncPayload,
  isEmptyPayload,
  mergeSyncPayload,
} from "@/lib/sync/merge";
import { markOpeningBalanceSetup, saveLedger } from "@/lib/storage";
import type { LedgerEntry } from "@/types";
import type { SavingsGoal } from "@/types/ai";
import type { SyncPayload, SyncStatus } from "@/types/sync";

export type SyncConflict = {
  local: SyncPayload;
  remote: SyncPayload;
};

type UseCloudSyncOptions = {
  ready: boolean;
  entries: LedgerEntry[];
  goals: SavingsGoal[];
  openingDone: boolean;
  onApply: (payload: SyncPayload) => void;
};

export type SyncConflictResolution = "cloud" | "device" | "merge";

const PUSH_MERGE_MAX_ATTEMPTS = 5;

async function fetchRemote(): Promise<{ enabled: boolean; data: SyncPayload | null }> {
  const response = await fetch("/api/sync", { credentials: "include" });
  if (response.status === 401) throw new Error("unauthorized");
  if (!response.ok) throw new Error("fetch failed");
  return (await response.json()) as { enabled: boolean; data: SyncPayload | null };
}

type PushRemoteResult =
  | { kind: "saved" }
  | { kind: "serverMerged"; payload: SyncPayload }
  | { kind: "conflict"; server: SyncPayload };

async function pushRemote(payload: SyncPayload): Promise<PushRemoteResult> {
  const response = await fetch("/api/sync", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 409) {
    const body = (await response.json()) as { server?: SyncPayload };
    if (body.server) return { kind: "conflict", server: body.server };
    throw new Error("push failed");
  }

  if (!response.ok) throw new Error("push failed");

  const body = (await response.json()) as { merged?: boolean; data?: SyncPayload };
  if (body.merged && body.data) {
    return { kind: "serverMerged", payload: body.data };
  }

  return { kind: "saved" };
}

/** Push payload; merge with server on conflict or when server union-merges a stale client copy. */
async function pushWithMerge(
  payload: SyncPayload,
  onMerged: (merged: SyncPayload) => void,
): Promise<SyncPayload> {
  let toPush = payload;

  for (let attempt = 0; attempt < PUSH_MERGE_MAX_ATTEMPTS; attempt += 1) {
    const result = await pushRemote(toPush);

    if (result.kind === "saved") return toPush;

    if (result.kind === "serverMerged") {
      toPush = buildSyncPayload(
        result.payload.ledger,
        result.payload.goals,
        result.payload.openingDone,
      );
      onMerged(toPush);
      return toPush;
    }

    const merged = combineSyncPayloads(toPush, result.server);
    toPush = buildSyncPayload(merged.ledger, merged.goals, merged.openingDone);
    onMerged(toPush);
  }

  throw new Error("sync push conflict");
}

export function useCloudSync({
  ready,
  entries,
  goals,
  openingDone,
  onApply,
}: UseCloudSyncOptions) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);

  const initialDone = useRef(false);
  const applyingRemote = useRef(false);
  const pushInFlight = useRef(false);
  const syncEnabledRef = useRef(true);
  const lastPushedAt = useRef<string | null>(null);

  const applyPayload = useCallback(
    (payload: SyncPayload) => {
      applyingRemote.current = true;
      onApply(payload);
      saveLedger(payload.ledger);
      saveGoals(payload.goals);
      if (payload.openingDone) markOpeningBalanceSetup();
      lastPushedAt.current = payload.updatedAt;
      setLastSyncedAt(payload.updatedAt);
      queueMicrotask(() => {
        applyingRemote.current = false;
      });
    },
    [onApply],
  );

  const finishPush = useCallback(
    async (payload: SyncPayload) => {
      if (pushInFlight.current) return;
      pushInFlight.current = true;
      applyingRemote.current = true;
      try {
        const pushed = await pushWithMerge(payload, (merged) => {
          applyPayload(merged);
        });
        lastPushedAt.current = pushed.updatedAt;
        setLastSyncedAt(pushed.updatedAt);
        setStatus("synced");
      } finally {
        pushInFlight.current = false;
        applyingRemote.current = false;
      }
    },
    [applyPayload],
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
          syncEnabledRef.current = false;
          setSyncEnabled(false);
          setStatus("disabled");
          initialDone.current = true;
          return;
        }

        syncEnabledRef.current = true;
        setSyncEnabled(true);
        const local = buildSyncPayload(entries, goals, openingDone);
        const remoteData = remote.data ?? emptySyncPayload();

        if (needsSyncConflictChoice(local, remoteData)) {
          setConflict({ local, remote: remoteData });
          setStatus("synced");
          initialDone.current = true;
          return;
        }

        const { payload, appliedRemote } = mergeSyncPayload(local, remote.data);

        if (appliedRemote) {
          applyPayload(payload);
          setStatus("synced");
        } else if (!isEmptyPayload(payload)) {
          await finishPush(payload);
        } else {
          setLastSyncedAt(remoteData.updatedAt || null);
          setStatus("synced");
        }

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
    if (
      !ready ||
      !initialDone.current ||
      !syncEnabledRef.current ||
      applyingRemote.current ||
      pushInFlight.current
    ) {
      return;
    }
    if (conflict) return;

    const payload = buildSyncPayload(entries, goals, openingDone);
    if (payload.updatedAt === lastPushedAt.current) return;

    setStatus("syncing");
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await finishPush(payload);
        } catch {
          setStatus("error");
        }
      })();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [ready, entries, goals, openingDone, conflict, finishPush]);

  const syncNow = useCallback(async () => {
    if (!syncEnabledRef.current) return;
    setStatus("syncing");
    try {
      const remote = await fetchRemote();
      const local = buildSyncPayload(entries, goals, openingDone);
      const remoteData = remote.data ?? emptySyncPayload();

      if (needsSyncConflictChoice(local, remoteData)) {
        setConflict({ local, remote: remoteData });
        setStatus("synced");
        return;
      }

      const { payload, appliedRemote } = mergeSyncPayload(local, remote.data);
      if (appliedRemote) applyPayload(payload);

      const toPush = buildSyncPayload(payload.ledger, payload.goals, payload.openingDone);
      await finishPush(toPush);
    } catch {
      setStatus("error");
    }
  }, [entries, goals, openingDone, applyPayload, finishPush]);

  const resolveConflict = useCallback(
    async (mode: SyncConflictResolution) => {
      if (!conflict) return;
      setStatus("syncing");

      const localNow = buildSyncPayload(entries, goals, openingDone);
      let resolved: SyncPayload;
      if (mode === "cloud") {
        resolved = conflict.remote;
      } else if (mode === "device") {
        resolved = localNow;
      } else {
        resolved = combineSyncPayloads(localNow, conflict.remote);
      }

      applyPayload(resolved);
      setConflict(null);

      try {
        const pushed = buildSyncPayload(resolved.ledger, resolved.goals, resolved.openingDone);
        await finishPush(pushed);
      } catch {
        setStatus("error");
      }
    },
    [conflict, entries, goals, openingDone, applyPayload, finishPush],
  );

  return {
    syncStatus: status,
    syncNow,
    lastSyncedAt,
    syncEnabled,
    conflict,
    resolveConflict,
  };
}
