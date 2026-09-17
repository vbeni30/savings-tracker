import { canAfford, entryLabel } from "@/lib/ledger";
import { formatAmount, formatDate, formatWhenLabel } from "@/lib/format";
import { PAYDAY_RULES } from "@/lib/rules";
import { getNextPayday, daysUntil } from "@/lib/payday";
import { sourceRowsFromBalances, upcomingSchedule } from "@/lib/stats";
import { buildContextBlock } from "@/lib/ai/context";
import { parseWhatIfFromText, runWhatIf } from "@/lib/ai/scenarios";
import { createGoal } from "@/lib/goals";
import type { AiAction, AiChatRequest, AiChatResponse, AiContextPayload } from "@/types/ai";
import type { Currency, Pool } from "@/types";

function parseLogRuleId(text: string): string | null {
  const lower = text.toLowerCase();
  if (/(land and sea|\blsd\b)/.test(lower)) return "lsd";
  if (/mmcy/.test(lower)) return "mmcy";
  if (/sentrama/.test(lower) && /30/.test(lower)) return "sen30";
  if (/sentrama/.test(lower) && /15/.test(lower)) return "sen15";
  if (/sentrama/.test(lower)) return "sen15";
  return null;
}

function parseExpenseIntent(text: string): {
  amount: number;
  currency: Currency;
  pool: Pool;
  note?: string;
} | null {
  const lower = text.toLowerCase();
  if (!/(spent|spend|paid|expense|bought|cost)/.test(lower)) return null;

  const amountMatch = lower.match(/(\d[\d,]*)\s*(etb|birr|usd|\$)?/);
  if (!amountMatch) return null;

  const amount = Number(amountMatch[1].replace(/,/g, ""));
  if (Number.isNaN(amount) || amount <= 0) return null;

  const currency: Currency = /usd|\$|dollar/.test(lower) ? "USD" : "ETB";
  const pool: Pool =
    /(from savings|saved pool|touch savings|from saved)/.test(lower) ? "saved" : "spendable";

  let note: string | undefined;
  if (/grocer|food|market/.test(lower)) note = "Groceries";
  else if (/transport|taxi|fuel/.test(lower)) note = "Transport";
  else if (/rent/.test(lower)) note = "Rent";

  return { amount, currency, pool, note };
}

function parseGoalIntent(text: string): { label: string; target: number; currency: "ETB" | "USD" } | null {
  const lower = text.toLowerCase();
  if (!/(goal|target|save toward|aim for)/.test(lower)) return null;

  const currency = /usd|\$|dollar/.test(lower) ? "USD" : "ETB";
  const amountMatch = lower.match(/(\d[\d,]*)\s*(etb|birr|usd|\$)?/);
  if (!amountMatch) return null;

  const target = Number(amountMatch[1].replace(/,/g, ""));
  if (Number.isNaN(target) || target <= 0) return null;

  let label = "Savings goal";
  if (/emergency/.test(lower)) label = "Emergency fund";
  else if (/rent/.test(lower)) label = "Rent fund";
  else if (/travel|trip/.test(lower)) label = "Travel fund";

  return { label, target, currency };
}

function estimateGoalMonths(
  context: AiContextPayload,
  currency: "ETB" | "USD",
  target: number,
  saved: number,
): number | null {
  const remaining = Math.max(target - saved, 0);
  const monthly = currency === "ETB" ? context.projection.etb : context.projection.usd;
  if (monthly <= 0) return null;
  return Math.ceil(remaining / monthly);
}

export function generateLocalSummary(context: AiContextPayload): string {
  const next = getNextPayday(PAYDAY_RULES);
  const days = daysUntil(next.date);
  const { balances } = context;
  const entryCount = context.entries.length;

  const lines = [
    `Saved: ${balances.saved.etb.toLocaleString("en-US")} ETB and $${balances.saved.usd.toLocaleString("en-US")} USD. Spendable: ${balances.spendable.etb.toLocaleString("en-US")} ETB and $${balances.spendable.usd.toLocaleString("en-US")} USD (${entryCount} ledger ${entryCount === 1 ? "entry" : "entries"}).`,
    `At your current pace, you're on track to save about ${Math.round(context.projection.etb).toLocaleString("en-US")} ETB and $${Math.round(context.projection.usd).toLocaleString("en-US")} USD per month (${Math.round(context.overallSaveRate)}% save rate).`,
    `Next up: ${next.rule.who} ${formatWhenLabel(days, next.date)} — set aside ${formatAmount(next.rule.save, next.rule.currency)} first, keep ${formatAmount(next.rule.keep, next.rule.currency)} for costs.`,
  ];

  if (context.entries.length === 0) {
    lines.push('Nothing logged yet. Try "MMCY paid today" or set your opening balances.');
  } else {
    const last = context.entries[0];
    lines.push(`Last activity: ${entryLabel(last)} on ${formatDate(new Date(last.date))}.`);
  }

  if (context.goals.length > 0) {
    const goalLine = context.goals
      .map((goal) => {
        const saved = goal.currency === "ETB" ? balances.saved.etb : balances.saved.usd;
        const pct = Math.min(100, Math.round((saved / goal.target) * 100));
        const months = estimateGoalMonths(context, goal.currency, goal.target, saved);
        return `${goal.label}: ${pct}% complete${months ? ` (~${months} mo to go)` : ""}`;
      })
      .join("; ");
    lines.push(`Goals: ${goalLine}.`);
  }

  return lines.join("\n\n");
}

export function generateLocalSuggestions(context: AiContextPayload): string {
  const suggestions: string[] = [];
  const etbRows = sourceRowsFromBalances(context.balances, "ETB");
  const next = getNextPayday(PAYDAY_RULES);
  const { balances } = context;

  if (balances.spendable.etb < 3000 && balances.saved.etb > 10000) {
    suggestions.push(
      `Spendable ETB is low (${balances.spendable.etb.toLocaleString("en-US")}) — avoid dipping into savings unless necessary.`,
    );
  }

  for (const row of etbRows) {
    const rate = row.received > 0 ? Math.round((row.saved / row.received) * 100) : Math.round((row.rule.save / row.rule.received) * 100);
    if (rate < 60 && row.saved > 0) {
      suggestions.push(
        `${row.rule.who} saves ${rate}% of logged income — your plan targets ${Math.round((row.rule.save / row.rule.received) * 100)}%.`,
      );
    }
  }

  if (context.entries.length === 0) {
    suggestions.push("Start by logging your next payday or set opening balances for money you already have.");
  }

  const lastPaydayBySource = new Map<string, string>();
  for (const entry of context.entries) {
    if (entry.type === "payday" && entry.sourceId && !lastPaydayBySource.has(entry.sourceId)) {
      lastPaydayBySource.set(entry.sourceId, entry.date);
    }
  }

  for (const rule of PAYDAY_RULES) {
    const last = lastPaydayBySource.get(rule.id);
    if (!last) {
      suggestions.push(`You haven't logged ${rule.who} yet — worth tracking when it lands.`);
      continue;
    }
    const daysSince = Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000);
    if (daysSince > 35) {
      suggestions.push(`Last ${rule.who} log was ${daysSince} days ago — check if a payday was missed.`);
    }
  }

  suggestions.push(
    `Before ${next.rule.who} lands, move ${formatAmount(next.rule.save, next.rule.currency)} to savings first.`,
  );

  return suggestions.slice(0, 4).map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export function generateLocalReminder(context: AiContextPayload): string {
  const schedule = upcomingSchedule().slice(0, 2);
  const { balances } = context;
  const lines = schedule.map(({ rule, date, days }) => {
    return `${rule.who} ${formatWhenLabel(days, date)} — save ${formatAmount(rule.save, rule.currency)}, keep ${formatAmount(rule.keep, rule.currency)}.`;
  });

  return [
    "Payday heads-up:",
    ...lines,
    "",
    `Balances: ${balances.saved.etb.toLocaleString("en-US")} ETB saved · ${balances.spendable.etb.toLocaleString("en-US")} ETB spendable · $${balances.saved.usd.toLocaleString("en-US")} USD saved.`,
    "Save first. Spend what's left.",
  ].join("\n");
}

export function runLocalChat(request: AiChatRequest): AiChatResponse {
  const lastUser = [...request.messages].reverse().find((message) => message.role === "user");
  const text = lastUser?.content ?? "";
  const lower = text.toLowerCase();
  const actions: AiAction[] = [];
  const { balances } = request.context;

  if (request.intent === "summary") {
    return { message: generateLocalSummary(request.context), actions, source: "local" };
  }

  if (request.intent === "suggestions") {
    return { message: generateLocalSuggestions(request.context), actions, source: "local" };
  }

  if (request.intent === "reminder") {
    return { message: generateLocalReminder(request.context), actions, source: "local" };
  }

  const expenseIntent = parseExpenseIntent(text);
  if (expenseIntent && /(log|record|track|spent|spend)/.test(lower)) {
    actions.push({ type: "log_expense", ...expenseIntent });
    return {
      message: `Logged ${formatAmount(expenseIntent.amount, expenseIntent.currency)} from your ${expenseIntent.pool} pool${expenseIntent.note ? ` (${expenseIntent.note})` : ""}.`,
      actions,
      source: "local",
    };
  }

  const logRuleId = parseLogRuleId(text);
  if (logRuleId && /(log|logged|paid|payday|received|came in|got paid)/.test(lower)) {
    const rule = PAYDAY_RULES.find((item) => item.id === logRuleId)!;
    actions.push({ type: "log_payday", ruleId: rule.id, who: rule.who });
    return {
      message: `Got it — I'll log ${rule.who}: ${formatAmount(rule.save, rule.currency)} to savings, ${formatAmount(rule.keep, rule.currency)} to spendable.`,
      actions,
      source: "local",
    };
  }

  const goalIntent = parseGoalIntent(text);
  if (goalIntent) {
    const goal = createGoal(goalIntent.label, goalIntent.target, goalIntent.currency);
    actions.push({ type: "set_goal", goal });
    const months = estimateGoalMonths(request.context, goal.currency, goal.target, 0);
    return {
      message: `Goal set: ${goal.label} — ${formatAmount(goal.target, goal.currency)}.${months ? ` At your current pace, about ${months} months.` : ""}`,
      actions,
      source: "local",
    };
  }

  const whatIf = parseWhatIfFromText(text);
  if (whatIf && /(what if|scenario|instead|raise|increase|save \d)/.test(lower)) {
    const result = runWhatIf(whatIf.ruleId, whatIf.newSave);
    if (result) {
      return {
        message: [
          result.description,
          `New monthly pace: ~${Math.round(result.monthlyEtb).toLocaleString("en-US")} ETB / ~$${Math.round(result.monthlyUsd).toLocaleString("en-US")} USD.`,
          `Change: ${result.monthlyEtbDelta >= 0 ? "+" : ""}${Math.round(result.monthlyEtbDelta).toLocaleString("en-US")} ETB · ${result.monthlyUsdDelta >= 0 ? "+" : ""}$${Math.round(result.monthlyUsdDelta).toLocaleString("en-US")} USD per month.`,
          `In 6 months: ~${Math.round(result.sixMonthEtb).toLocaleString("en-US")} ETB / ~$${Math.round(result.sixMonthUsd).toLocaleString("en-US")} USD saved.`,
        ].join("\n\n"),
        actions,
        source: "local",
      };
    }
  }

  if (/can i spend|afford|have enough/.test(lower)) {
    const amountMatch = lower.match(/(\d[\d,]*)\s*(etb|birr|usd|\$)?/);
    if (amountMatch) {
      const amount = Number(amountMatch[1].replace(/,/g, ""));
      const isUsd = /usd|\$|dollar/.test(lower);
      const currency: Currency = isUsd ? "USD" : "ETB";
      const preferSaved = /(from savings|saved pool|touch savings)/.test(lower);
      const result = canAfford(balances, amount, currency, preferSaved ? "saved" : "spendable");
      return {
        message: result.message,
        actions,
        source: "local",
      };
    }
  }

  if (/next payday|when.*pay|upcoming/.test(lower)) {
    const next = getNextPayday(PAYDAY_RULES);
    const days = daysUntil(next.date);
    return {
      message: `${next.rule.who} is next — ${formatWhenLabel(days, next.date)}. Save ${formatAmount(next.rule.save, next.rule.currency)}, keep ${formatAmount(next.rule.keep, next.rule.currency)}.`,
      actions,
      source: "local",
    };
  }

  if (/how much|total|saved|balance|spendable/.test(lower)) {
    return {
      message: `Saved: ${balances.saved.etb.toLocaleString("en-US")} ETB / $${balances.saved.usd.toLocaleString("en-US")} USD. Spendable: ${balances.spendable.etb.toLocaleString("en-US")} ETB / $${balances.spendable.usd.toLocaleString("en-US")} USD. Monthly save projection: ~${Math.round(request.context.projection.etb).toLocaleString("en-US")} ETB / ~$${Math.round(request.context.projection.usd).toLocaleString("en-US")} USD.`,
      actions,
      source: "local",
    };
  }

  return {
    message: [
      "I can help with:",
      "• “MMCY paid today” — log a payday",
      "• “Log 3,000 ETB groceries from spendable” — log an expense",
      "• “Can I spend 5,000 ETB this week?” — affordability check",
      "• “What if I save 80% from Land and Sea?” — what-if scenarios",
      "• “Set a 50,000 ETB emergency fund goal” — goals",
      "",
      "Add OPENAI_API_KEY to .env.local for richer AI answers.",
      "",
      "Snapshot:",
      buildContextBlock(request.context),
    ].join("\n"),
    actions,
    source: "local",
  };
}
