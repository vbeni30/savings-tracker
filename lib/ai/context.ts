import { formatAmount, formatDate, formatWhenLabel } from "@/lib/format";
import { PAYDAY_RULES } from "@/lib/rules";
import { upcomingSchedule } from "@/lib/stats";
import type { AiContextPayload } from "@/types/ai";

export function buildContextBlock(context: AiContextPayload): string {
  const schedule = upcomingSchedule();
  const recent = context.entries.slice(0, 8).map((entry) => {
    return `- ${entry.who}: +${formatAmount(entry.save, entry.currency)} on ${formatDate(new Date(entry.date))}`;
  });

  const rules = PAYDAY_RULES.map((rule) => {
    const freq = rule.freqDays
      ? `every ${rule.freqDays} days`
      : rule.freqMonthly === "end"
        ? "end of month"
        : `${rule.freqMonthly}th monthly`;
    return `- id=${rule.id} | ${rule.who} | ${freq} | receive ${formatAmount(rule.received, rule.currency)} | save ${formatAmount(rule.save, rule.currency)} | keep ${formatAmount(rule.keep, rule.currency)}`;
  });

  const goals = context.goals.length
    ? context.goals
        .map((g) => `- ${g.label}: ${formatAmount(g.target, g.currency)} target`)
        .join("\n")
    : "- none set";

  const scheduleLines = schedule
    .map(({ rule, date, days }) => `- ${rule.who}: ${formatWhenLabel(days, date)} (${formatDate(date)})`)
    .join("\n");

  return [
    "CURRENT TOTALS",
    `- ETB saved: ${context.totals.etb.toLocaleString("en-US")}`,
    `- USD saved: $${context.totals.usd.toLocaleString("en-US")}`,
    `- Monthly projection: ~${context.projection.etb.toLocaleString("en-US")} ETB / ~$${context.projection.usd.toLocaleString("en-US")} USD`,
    `- Overall save rate: ${Math.round(context.overallSaveRate)}%`,
    "",
    "PAYDAY RULES",
    ...rules,
    "",
    "UPCOMING SCHEDULE",
    scheduleLines,
    "",
    "GOALS",
    goals,
    "",
    "RECENT HISTORY (newest first)",
    recent.length ? recent.join("\n") : "- none logged yet",
  ].join("\n");
}
