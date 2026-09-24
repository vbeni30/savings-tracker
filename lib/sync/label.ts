import type { SyncStatus } from "@/types/sync";

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
