import type { SyncPayload } from "@/types/sync";

export function emptySyncPayload(): SyncPayload {
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    ledger: [],
    goals: [],
    openingDone: false,
  };
}

export function isEmptyPayload(payload: SyncPayload): boolean {
  return (
    payload.ledger.length === 0 &&
    payload.goals.length === 0 &&
    !payload.openingDone
  );
}

export function buildSyncPayload(
  ledger: SyncPayload["ledger"],
  goals: SyncPayload["goals"],
  openingDone: boolean,
): SyncPayload {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    ledger,
    goals,
    openingDone,
  };
}

export function mergeSyncPayload(
  local: SyncPayload,
  remote: SyncPayload | null,
): { payload: SyncPayload; appliedRemote: boolean } {
  if (!remote || isEmptyPayload(remote)) {
    return { payload: local, appliedRemote: false };
  }

  if (isEmptyPayload(local)) {
    return { payload: remote, appliedRemote: true };
  }

  const localTime = Date.parse(local.updatedAt);
  const remoteTime = Date.parse(remote.updatedAt);

  if (remoteTime > localTime) {
    return { payload: remote, appliedRemote: true };
  }

  if (localTime > remoteTime) {
    return { payload: local, appliedRemote: false };
  }

  return { payload: mergeByEntryId(local, remote), appliedRemote: true };
}

function mergeByEntryId(a: SyncPayload, b: SyncPayload): SyncPayload {
  const entryMap = new Map<string, SyncPayload["ledger"][number]>();
  for (const entry of [...a.ledger, ...b.ledger]) {
    const existing = entryMap.get(entry.id);
    if (!existing || Date.parse(entry.date) >= Date.parse(existing.date)) {
      entryMap.set(entry.id, entry);
    }
  }

  const goalMap = new Map<string, SyncPayload["goals"][number]>();
  for (const goal of [...a.goals, ...b.goals]) {
    goalMap.set(goal.id, goal);
  }

  const ledger = [...entryMap.values()].sort(
    (left, right) => Date.parse(right.date) - Date.parse(left.date),
  );

  return {
    version: 1,
    updatedAt: new Date(Math.max(Date.parse(a.updatedAt), Date.parse(b.updatedAt))).toISOString(),
    ledger,
    goals: [...goalMap.values()],
    openingDone: a.openingDone || b.openingDone,
  };
}
