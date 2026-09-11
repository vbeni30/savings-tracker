import type { SavingsEntry } from "@/types";

const STORAGE_KEY = "savings-tracker-entries";
const LEGACY_STORAGE_KEY = "kieszonkowka-entries";

export function loadEntries(): SavingsEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavingsEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: SavingsEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function exportEntries(entries: SavingsEntry[]): void {
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
}

export function importEntries(file: File): Promise<SavingsEntry[]> {
  return file.text().then((text) => {
    const parsed = JSON.parse(text) as SavingsEntry[];
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid backup file.");
    }
    return parsed;
  });
}
