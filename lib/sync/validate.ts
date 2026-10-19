import type { LedgerEntry } from "@/types";
import type { SavingsGoal } from "@/types/ai";
import type { SyncPayload } from "@/types/sync";

const MAX_LEDGER_ENTRIES = 10_000;
const MAX_GOALS = 200;
const MAX_STRING = 500;
const MAX_NOTE = 2_000;
const MAX_AMOUNT = 1_000_000_000;

const LEDGER_TYPES = new Set<LedgerEntry["type"]>([
  "payday",
  "expense",
  "opening_balance",
  "adjustment",
]);

function isNonEmptyString(value: unknown, maxLen: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLen;
}

function parseLedgerEntry(raw: unknown): LedgerEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<LedgerEntry>;
  if (!isNonEmptyString(e.id, 80)) return null;
  if (!e.type || !LEDGER_TYPES.has(e.type)) return null;
  if (!isNonEmptyString(e.who, MAX_STRING)) return null;
  if (e.currency !== "ETB" && e.currency !== "USD") return null;
  if (typeof e.amount !== "number" || !Number.isFinite(e.amount) || Math.abs(e.amount) > MAX_AMOUNT) {
    return null;
  }
  if (e.pool !== "saved" && e.pool !== "spendable") return null;
  if (!isNonEmptyString(e.date, 40)) return null;
  if (e.note !== undefined && typeof e.note === "string" && e.note.length > MAX_NOTE) return null;
  return e as LedgerEntry;
}

function parseGoal(raw: unknown): SavingsGoal | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<SavingsGoal>;
  if (!isNonEmptyString(g.id, 80)) return null;
  if (!isNonEmptyString(g.label, MAX_STRING)) return null;
  if (typeof g.target !== "number" || !Number.isFinite(g.target) || g.target <= 0 || g.target > MAX_AMOUNT) {
    return null;
  }
  if (g.currency !== "ETB" && g.currency !== "USD") return null;
  if (!isNonEmptyString(g.createdAt, 40)) return null;
  return g as SavingsGoal;
}

export function validateSyncPayload(body: unknown): SyncPayload | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Partial<SyncPayload>;
  if (record.version !== 1) return null;
  if (typeof record.updatedAt !== "string" || Number.isNaN(Date.parse(record.updatedAt))) return null;
  if (typeof record.openingDone !== "boolean") return null;
  if (!Array.isArray(record.ledger) || !Array.isArray(record.goals)) return null;
  if (record.ledger.length > MAX_LEDGER_ENTRIES || record.goals.length > MAX_GOALS) return null;

  const ledger: LedgerEntry[] = [];
  for (const item of record.ledger) {
    const parsed = parseLedgerEntry(item);
    if (!parsed) return null;
    ledger.push(parsed);
  }

  const goals: SavingsGoal[] = [];
  for (const item of record.goals) {
    const parsed = parseGoal(item);
    if (!parsed) return null;
    goals.push(parsed);
  }

  return {
    version: 1,
    updatedAt: record.updatedAt,
    ledger,
    goals,
    openingDone: record.openingDone,
  };
}

/** Validate a JSON backup export (ledger array only). */
export function validateLedgerBackup(raw: unknown): LedgerEntry[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length > MAX_LEDGER_ENTRIES) return null;

  const ledger: LedgerEntry[] = [];
  for (const item of raw) {
    const parsed = parseLedgerEntry(item);
    if (!parsed) return null;
    ledger.push(parsed);
  }

  return ledger;
}
