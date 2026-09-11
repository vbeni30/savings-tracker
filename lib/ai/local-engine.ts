import { formatAmount, formatDate, formatWhenLabel } from "@/lib/format";
import { PAYDAY_RULES } from "@/lib/rules";
import { getNextPayday } from "@/lib/payday";
import { daysUntil } from "@/lib/payday";
import { savingsBySource, upcomingSchedule } from "@/lib/stats";
import { buildContextBlock } from "@/lib/ai/context";
import { parseWhatIfFromText, runWhatIf } from "@/lib/ai/scenarios";
import { createGoal } from "@/lib/goals";
import type { AiAction, AiChatRequest, AiChatResponse, AiContextPayload } from "@/types/ai";

function parseLogRuleId(text: string): string | null {
  const lower = text.toLowerCase();
  if (/(land and sea|\blsd\b)/.test(lower)) return "lsd";
  if (/mmcy/.test(lower)) return "mmcy";
  if (/sentrama/.test(lower) && /30/.test(lower)) return "sen30";
  if (/sentrama/.test(lower) && /15/.test(lower)) return "sen15";
  if (/sentrama/.test(lower)) return "sen15";
  return null;
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

function estimateGoalMonths(context: AiContextPayload, currency: "ETB" | "USD", target: number, saved: number): number | null {
  const remaining = Math.max(target - saved, 0);
  const monthly = currency === "ETB" ? context.projection.etb : context.projection.usd;
  if (monthly <= 0) return null;
  return Math.ceil(remaining / monthly);
}

export function generateLocalSummary(context: AiContextPayload): string {
  const next = getNextPayday(PAYDAY_RULES);
  const days = daysUntil(next.date);
  const entryCount = context.entries.length;

  const lines = [
    `You have saved ${context.totals.etb.toLocaleString("en-US")} ETB and $${context.totals.usd.toLocaleString("en-US")} USD across ${entryCount} logged ${entryCount === 1 ? "entry" : "entries"}.`,
    `At your current pace, you're on track for about ${Math.round(context.projection.etb).toLocaleString("en-US")} ETB and $${Math.round(context.projection.usd).toLocaleString("en-US")} USD per month (${Math.round(context.overallSaveRate)}% save rate).`,
    `Next up: ${next.rule.who} ${formatWhenLabel(days, next.date)} — set aside ${formatAmount(next.rule.save, next.rule.currency)} first.`,
  ];

  if (context.entries.length === 0) {
    lines.push("No paydays logged yet. Try saying “MMCY paid today” in chat to log one quickly.");
  } else {
    const last = context.entries[0];
    lines.push(`Last logged: ${last.who} on ${formatDate(new Date(last.date))}.`);
  }

  if (context.goals.length > 0) {
    const goalLine = context.goals
      .map((goal) => {
        const saved = goal.currency === "ETB" ? context.totals.etb : context.totals.usd;
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
  const etbRows = savingsBySource(context.entries, "ETB");
  const next = getNextPayday(PAYDAY_RULES);

  for (const row of etbRows) {
    const rate = Math.round((row.rule.save / row.rule.received) * 100);
    if (rate < 60) {
      suggestions.push(
        `${row.rule.who} saves ${rate}% — bumping save by 1,000 ETB would add ~${row.rule.freqDays ? "2,000" : "1,000"} ETB/month.`,
      );
    }
  }

  if (context.entries.length === 0) {
    suggestions.push("Start by logging your next payday — click a card or tell the coach who paid.");
  }

  const lastBySource = new Map<string, string>();
  for (const entry of context.entries) {
    if (!lastBySource.has(entry.who)) lastBySource.set(entry.who, entry.date);
  }

  for (const rule of PAYDAY_RULES) {
    const last = lastBySource.get(rule.who);
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
  const lines = schedule.map(({ rule, date, days }) => {
    return `${rule.who} ${formatWhenLabel(days, date)} — save ${formatAmount(rule.save, rule.currency)} of ${formatAmount(rule.received, rule.currency)}.`;
  });

  return [
    "Payday heads-up:",
    ...lines,
    "",
    `Current totals: ${context.totals.etb.toLocaleString("en-US")} ETB · $${context.totals.usd.toLocaleString("en-US")} USD saved.`,
    "Save first. Spend what's left.",
  ].join("\n");
}

export function runLocalChat(request: AiChatRequest): AiChatResponse {
  const lastUser = [...request.messages].reverse().find((message) => message.role === "user");
  const text = lastUser?.content ?? "";
  const lower = text.toLowerCase();
  const actions: AiAction[] = [];

  if (request.intent === "summary") {
    return { message: generateLocalSummary(request.context), actions, source: "local" };
  }

  if (request.intent === "suggestions") {
    return { message: generateLocalSuggestions(request.context), actions, source: "local" };
  }

  if (request.intent === "reminder") {
    return { message: generateLocalReminder(request.context), actions, source: "local" };
  }

  const logRuleId = parseLogRuleId(text);
  if (logRuleId && /(log|logged|paid|payday|received|came in|got paid)/.test(lower)) {
    const rule = PAYDAY_RULES.find((item) => item.id === logRuleId)!;
    actions.push({ type: "log_payday", ruleId: rule.id, who: rule.who });
    return {
      message: `Got it — I'll log ${rule.who} and add ${formatAmount(rule.save, rule.currency)} to your savings.`,
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

  if (/can i spend|afford/.test(lower)) {
    const amountMatch = lower.match(/(\d[\d,]*)\s*(etb|birr|usd|\$)?/);
    if (amountMatch) {
      const amount = Number(amountMatch[1].replace(/,/g, ""));
      const isUsd = /usd|\$|dollar/.test(lower);
      const keepPool = PAYDAY_RULES.reduce((sum, rule) => {
        const occ = rule.freqDays ? 30 / rule.freqDays : 1;
        if (isUsd && rule.currency === "USD") return sum + rule.keep * occ;
        if (!isUsd && rule.currency === "ETB") return sum + rule.keep * occ;
        return sum;
      }, 0);

      const ok = amount <= keepPool * 0.25;
      return {
        message: ok
          ? `Roughly yes — ${amount.toLocaleString("en-US")} ${isUsd ? "USD" : "ETB"} looks manageable if you keep following your save-first split. Your monthly keep pool is about ${Math.round(keepPool).toLocaleString("en-US")} ${isUsd ? "USD" : "ETB"}.`
          : `That's tight — ${amount.toLocaleString("en-US")} ${isUsd ? "USD" : "ETB"} is a big chunk of your monthly keep money (~${Math.round(keepPool).toLocaleString("en-US")} ${isUsd ? "USD" : "ETB"}). Consider waiting until after the next payday.`,
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

  if (/how much|total|saved/.test(lower)) {
    return {
      message: `You've saved ${request.context.totals.etb.toLocaleString("en-US")} ETB and $${request.context.totals.usd.toLocaleString("en-US")} USD. Monthly projection: ~${Math.round(request.context.projection.etb).toLocaleString("en-US")} ETB / ~$${Math.round(request.context.projection.usd).toLocaleString("en-US")} USD.`,
      actions,
      source: "local",
    };
  }

  return {
    message: [
      "I can help with:",
      "• “MMCY paid today” — log a payday",
      "• “What if I save 80% from Land and Sea?” — what-if scenarios",
      "• “Can I spend 5,000 ETB this week?” — spending checks",
      "• “Set a 50,000 ETB emergency fund goal” — goals",
      "• Ask for a summary, suggestions, or reminder anytime",
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
