import type { LedgerEntry } from "@/types";
import type { SavingsGoal } from "@/types/ai";

export type SyncPayload = {
  version: 1;
  updatedAt: string;
  ledger: LedgerEntry[];
  goals: SavingsGoal[];
  openingDone: boolean;
};

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline" | "disabled";

export type SyncApiResponse = {
  enabled: boolean;
  data: SyncPayload | null;
};
