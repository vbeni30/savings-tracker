import { entryDisplayAmount, entryIsCredit, entryLabel } from "@/lib/ledger";
import { formatAmount, formatDate, formatWhenLabel } from "@/lib/format";
import { PAYDAY_RULES } from "@/lib/rules";
import { upcomingSchedule } from "@/lib/stats";
import type { AiContextPayload } from "@/types/ai";

function formatHistoryLine(entry: AiContextPayload["entries"][number]): string {
  const sign = entryIsCredit(entry) ? "+" : "−";
  const amount = entryDisplayAmount(entry);
  const pool = entry.type === "expense" || entry.type === "opening_balance" || entry.type === "adjustment"
    ? ` (${entry.pool})`
    : "";
  return `- ${entryLabel(entry)}: ${sign}${formatAmount(amount, entry.currency)}${pool} on ${formatDate(new Date(entry.date))}`;
}

export function buildContextBlock(context: AiContextPayload): string {
  const { balances } = context;
  const schedule = upcomingSchedule();
  const recent = context.entries.slice(0, 10).map(formatHistoryLine);

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

  const sourceLines = balances.bySource.length
    ? balances.bySource
        .map(
          (source) =>
            `- ${source.who}: received ${formatAmount(source.received, source.currency)} | saved ${formatAmount(source.saved, source.currency)}`,
        )
        .join("\n")
    : "- none logged yet";

  return [
    "CURRENT BALANCES",
    `- ETB saved: ${balances.saved.etb.toLocaleString("en-US")}`,
    `- ETB spendable: ${balances.spendable.etb.toLocaleString("en-US")}`,
    `- USD saved: $${balances.saved.usd.toLocaleString("en-US")}`,
    `- USD spendable: $${balances.spendable.usd.toLocaleString("en-US")}`,
    `- Total income logged: ${balances.received.etb.toLocaleString("en-US")} ETB / $${balances.received.usd.toLocaleString("en-US")} USD`,
    `- Monthly save projection: ~${context.projection.etb.toLocaleString("en-US")} ETB / ~$${context.projection.usd.toLocaleString("en-US")} USD`,
    `- Overall save rate (plan): ${Math.round(context.overallSaveRate)}%`,
    "",
    "PER-SOURCE (logged paydays)",
    sourceLines,
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
    "RECENT LEDGER (newest first)",
    recent.length ? recent.join("\n") : "- none logged yet",
  ].join("\n");
}
