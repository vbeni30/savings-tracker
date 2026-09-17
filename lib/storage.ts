import { BACKUP_DISMISS_DAYS, BACKUP_REMINDER_DAYS } from "@/lib/constants";
import { migrateLegacyEntries } from "@/lib/ledger";
import type { LedgerEntry, SavingsEntry } from "@/types";

const LEDGER_KEY = "savings-tracker-ledger";
const LEGACY_ENTRIES_KEY = "savings-tracker-entries";
const LEGACY_KIESZONKA_KEY = "kieszonkowka-entries";
export const OPENING_BALANCE_DONE_KEY = "savings-tracker-opening-done";
const LAST_EXPORT_KEY = "savings-tracker-last-export";
const BACKUP_DISMISS_KEY = "savings-tracker-backup-dismiss";
const LOW_SPENDABLE_DISMISS_KEY = "savings-tracker-low-spendable-dismiss";

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

export function loadLedger(): LedgerEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LedgerEntry[];
      return Array.isArray(parsed) ? parsed : [];
    }

    const legacyRaw =
      localStorage.getItem(LEGACY_ENTRIES_KEY) ?? localStorage.getItem(LEGACY_KIESZONKA_KEY);
    if (!legacyRaw) return [];

    const legacy = JSON.parse(legacyRaw) as SavingsEntry[];
    if (!Array.isArray(legacy)) return [];
    return migrateLegacyEntries(legacy);
  } catch {
    return [];
  }
}

export function saveLedger(entries: LedgerEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LEDGER_KEY, JSON.stringify(entries));
}

export function hasOpeningBalanceSetup(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(OPENING_BALANCE_DONE_KEY) === "1";
}

export function markOpeningBalanceSetup(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(OPENING_BALANCE_DONE_KEY, "1");
}

export function markLedgerExported(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
}

export function shouldShowBackupReminder(entryCount: number): boolean {
  if (typeof window === "undefined" || entryCount === 0) return false;

  const dismissed = localStorage.getItem(BACKUP_DISMISS_KEY);
  if (dismissed && daysSince(dismissed) < BACKUP_DISMISS_DAYS) return false;

  const lastExport = localStorage.getItem(LAST_EXPORT_KEY);
  if (!lastExport) return true;

  return daysSince(lastExport) >= BACKUP_REMINDER_DAYS;
}

export function dismissBackupReminder(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BACKUP_DISMISS_KEY, new Date().toISOString());
}

export function dismissLowSpendableAlert(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOW_SPENDABLE_DISMISS_KEY, new Date().toISOString());
}

export function shouldShowLowSpendableAlert(spendableEtb: number, threshold: number): boolean {
  if (typeof window === "undefined") return false;
  if (spendableEtb <= 0 || spendableEtb >= threshold) return false;

  const dismissed = localStorage.getItem(LOW_SPENDABLE_DISMISS_KEY);
  if (dismissed && daysSince(dismissed) < 1) return false;

  return true;
}

export function exportLedger(entries: LedgerEntry[]): void {
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `savings-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  markLedgerExported();
}

export function importLedger(file: File): Promise<LedgerEntry[]> {
  return file.text().then((text) => {
    const parsed = JSON.parse(text) as LedgerEntry[];
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid backup file.");
    }
    return parsed;
  });
}
