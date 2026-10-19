import type { SyncStatus } from "@/types/sync";

const syncedTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function syncStatusDetail(status: SyncStatus, lastSyncedAt: string | null): string | null {
  if (status === "synced" && lastSyncedAt) {
    const when = Date.parse(lastSyncedAt);
    if (!Number.isNaN(when)) {
      return `Last synced ${syncedTime.format(new Date(when))}`;
    }
  }
  if (status === "disabled") {
    return "Set up Vercel Blob to sync across devices";
  }
  return null;
}

export function syncStatusLabel(status: SyncStatus): string {
  switch (status) {
    case "syncing":
      return "Syncing…";
    case "synced":
      return "Synced across devices";
    case "error":
      return "Sync issue — tap to retry";
    case "offline":
      return "Offline — showing local data";
    case "disabled":
      return "Cloud sync not configured";
    default:
      return "";
  }
}
