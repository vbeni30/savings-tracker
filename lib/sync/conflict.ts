import { isEmptyPayload } from "@/lib/sync/merge";
import type { SyncPayload } from "@/types/sync";

export function needsSyncConflictChoice(local: SyncPayload, remote: SyncPayload): boolean {
  if (isEmptyPayload(local) || isEmptyPayload(remote)) return false;

  const localIds = new Set(local.ledger.map((entry) => entry.id));
  const remoteIds = new Set(remote.ledger.map((entry) => entry.id));

  let localOnly = 0;
  let remoteOnly = 0;
  for (const id of localIds) {
    if (!remoteIds.has(id)) localOnly += 1;
  }
  for (const id of remoteIds) {
    if (!localIds.has(id)) remoteOnly += 1;
  }

  return localOnly > 0 && remoteOnly > 0;
}
