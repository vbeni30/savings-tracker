import type { SavingsGoal } from "@/types/ai";

const STORAGE_KEY = "savings-tracker-goals";

export function loadGoals(): SavingsGoal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavingsGoal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGoals(goals: SavingsGoal[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

export function createGoal(
  label: string,
  target: number,
  currency: SavingsGoal["currency"],
): SavingsGoal {
  return {
    id: crypto.randomUUID(),
    label,
    target,
    currency,
    createdAt: new Date().toISOString(),
  };
}
