import { PAYDAY_RULES } from "@/lib/rules";
import { monthlyProjection } from "@/lib/stats";
import type { WhatIfResult } from "@/types/ai";

const DAYS_IN_MONTH = 30;

export function runWhatIf(ruleId: string, newSaveAmount: number): WhatIfResult | null {
  const rule = PAYDAY_RULES.find((item) => item.id === ruleId);
  if (!rule || newSaveAmount < 0 || newSaveAmount > rule.received) return null;

  const base = monthlyProjection();
  const occurrences = rule.freqDays ? DAYS_IN_MONTH / rule.freqDays : 1;
  const oldMonthly = rule.save * occurrences;
  const newMonthly = newSaveAmount * occurrences;
  const delta = newMonthly - oldMonthly;

  const monthlyEtb = base.etb + (rule.currency === "ETB" ? delta : 0);
  const monthlyUsd = base.usd + (rule.currency === "USD" ? delta : 0);

  return {
    description: `If ${rule.who} save amount changes from ${rule.save.toLocaleString("en-US")} to ${newSaveAmount.toLocaleString("en-US")} ${rule.currency}`,
    monthlyEtb,
    monthlyUsd,
    monthlyEtbDelta: rule.currency === "ETB" ? delta : 0,
    monthlyUsdDelta: rule.currency === "USD" ? delta : 0,
    sixMonthEtb: monthlyEtb * 6,
    sixMonthUsd: monthlyUsd * 6,
  };
}

export function parseWhatIfFromText(text: string): { ruleId: string; newSave: number } | null {
  const lower = text.toLowerCase();
  let ruleId: string | null = null;

  if (lower.includes("land and sea") || lower.includes("lsd")) ruleId = "lsd";
  else if (lower.includes("mmcy")) ruleId = "mmcy";
  else if (lower.includes("sentrama") && lower.includes("15")) ruleId = "sen15";
  else if (lower.includes("sentrama") && lower.includes("30")) ruleId = "sen30";
  else if (lower.includes("sentrama")) ruleId = "sen15";

  const percentMatch = lower.match(/(\d{1,3})\s*%/);
  const amountMatch = lower.match(/(\d[\d,]*)\s*(etb|birr|usd|\$)?/i);

  const rule = ruleId ? PAYDAY_RULES.find((item) => item.id === ruleId) : null;
  if (!rule) return null;

  if (percentMatch) {
    const pct = Number(percentMatch[1]);
    if (pct >= 0 && pct <= 100) {
      return { ruleId: rule.id, newSave: Math.round((rule.received * pct) / 100) };
    }
  }

  if (amountMatch) {
    const value = Number(amountMatch[1].replace(/,/g, ""));
    if (!Number.isNaN(value) && value > 0) {
      return { ruleId: rule.id, newSave: value };
    }
  }

  return null;
}
