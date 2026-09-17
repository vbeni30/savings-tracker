"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import { formatAmount } from "@/lib/format";
import { PAYDAY_RULES } from "@/lib/rules";
import { monthlyProjection, overallSavingsRate } from "@/lib/stats";
import type { AiAction, AiChatMessage, AiContextPayload, AiChatResponse } from "@/types/ai";
import type { Balances, Currency, LedgerEntry, PaydayRule, Pool } from "@/types";
import type { SavingsGoal } from "@/types/ai";

type TabId = "chat" | "summary" | "goals" | "insights";

type AiCoachPanelProps = {
  open: boolean;
  onClose: () => void;
  entries: LedgerEntry[];
  balances: Balances;
  goals: SavingsGoal[];
  onLogPayday: (rule: PaydayRule) => void;
  onLogExpense: (params: {
    amount: number;
    currency: Currency;
    pool: Pool;
    note?: string;
  }) => void;
  onAddGoal: (label: string, target: number, currency: SavingsGoal["currency"]) => void;
  onAddGoalObject: (goal: SavingsGoal) => void;
  onRemoveGoal: (id: string) => void;
  onToast: (message: string) => void;
};

const QUICK_PROMPTS = [
  "Give me a savings summary",
  "MMCY paid today",
  "Log 3,000 ETB groceries from spendable",
  "Can I spend 5,000 ETB this week?",
];

export function AiCoachPanel({
  open,
  onClose,
  entries,
  balances,
  goals,
  onLogPayday,
  onLogExpense,
  onAddGoal,
  onAddGoalObject,
  onRemoveGoal,
  onToast,
}: AiCoachPanelProps) {
  const [tab, setTab] = useState<TabId>("chat");
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi — I'm your savings coach. Log paydays in plain English, run what-if scenarios, set goals, or ask for summaries and tips.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [reminder, setReminder] = useState("");
  const [goalLabel, setGoalLabel] = useState("Emergency fund");
  const [goalTarget, setGoalTarget] = useState("50000");
  const [goalCurrency, setGoalCurrency] = useState<SavingsGoal["currency"]>("ETB");
  const listRef = useRef<HTMLDivElement>(null);

  const context = useMemo<AiContextPayload>(
    () => ({
      balances,
      entries,
      goals,
      projection: monthlyProjection(),
      overallSaveRate: overallSavingsRate(),
    }),
    [balances, entries, goals],
  );

  const applyActions = (actions: AiAction[]) => {
    for (const action of actions) {
      if (action.type === "log_payday") {
        const rule = PAYDAY_RULES.find((item) => item.id === action.ruleId);
        if (rule) onLogPayday(rule);
      }
      if (action.type === "log_expense") {
        onLogExpense({
          amount: action.amount,
          currency: action.currency,
          pool: action.pool,
          note: action.note,
        });
      }
      if (action.type === "set_goal") {
        onAddGoalObject(action.goal);
      }
    }
  };

  const callAi = async (
    intent: TabId | "reminder" | "suggestions" | undefined,
    userMessages: Pick<AiChatMessage, "role" | "content">[],
  ): Promise<AiChatResponse> => {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: userMessages,
        context,
        intent: intent === "chat" || intent === "goals" ? "chat" : intent,
      }),
    });

    if (!response.ok) {
      throw new Error("AI request failed");
    }

    return (await response.json()) as AiChatResponse;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: AiChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const result = await callAi("chat", nextMessages.map(({ role, content }) => ({ role, content })));
      applyActions(result.actions);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: result.message },
      ]);
      if (result.actions.some((action) => action.type === "log_payday")) {
        onToast("Payday logged via AI coach");
      }
      if (result.actions.some((action) => action.type === "log_expense")) {
        onToast("Expense logged via AI coach");
      }
    } catch {
      onToast("Could not reach AI coach");
    } finally {
      setLoading(false);
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  const loadInsight = async (intent: "summary" | "suggestions" | "reminder") => {
    setLoading(true);
    try {
      const result = await callAi(intent, [{ role: "user", content: intent }]);
      if (intent === "summary") setSummary(result.message);
      if (intent === "suggestions") setSuggestions(result.message);
      if (intent === "reminder") setReminder(result.message);
    } catch {
      onToast(`Could not load ${intent}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = () => {
    const target = Number(goalTarget.replace(/,/g, ""));
    if (!goalLabel.trim() || Number.isNaN(target) || target <= 0) return;
    onAddGoal(goalLabel.trim(), target, goalCurrency);
    onToast(`Goal added: ${goalLabel}`);
  };

  const goalProgress = (goal: SavingsGoal) => {
    const saved = goal.currency === "ETB" ? balances.saved.etb : balances.saved.usd;
    return Math.min(100, Math.round((saved / goal.target) * 100));
  };

  if (!open) return null;

  return (
    <div className="ai-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="ai-panel" role="dialog" aria-modal="true" aria-label="AI savings coach">
        <header className="ai-header">
          <div>
            <p className="ai-kicker">AI COACH</p>
            <h2>Savings assistant</h2>
          </div>
          <button type="button" className="ai-close" onClick={onClose} aria-label="Close AI coach">
            ×
          </button>
        </header>

        <div className="ai-tabs">
          {(
            [
              ["chat", "Chat"],
              ["summary", "Summary"],
              ["goals", "Goals"],
              ["insights", "Insights"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`ai-tab${tab === id ? " active" : ""}`}
              onClick={() => {
                setTab(id);
                if (id === "summary" && !summary) void loadInsight("summary");
                if (id === "insights" && !suggestions) void loadInsight("suggestions");
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ai-body">
          {tab === "chat" && (
            <>
              <div className="ai-messages" ref={listRef}>
                {messages.map((message) => (
                  <div key={message.id} className={`ai-msg ${message.role}`}>
                    {message.content}
                  </div>
                ))}
                {loading && <div className="ai-msg assistant ai-typing">Thinking…</div>}
              </div>
              <div className="ai-chips">
                {QUICK_PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" className="ai-chip" onClick={() => sendMessage(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
              <form
                className="ai-input-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(input);
                }}
              >
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder='Try "Sentrama paid" or "Set 50k ETB goal"'
                  disabled={loading}
                />
                <button type="submit" className="ai-send" disabled={loading || !input.trim()}>
                  Send
                </button>
              </form>
            </>
          )}

          {tab === "summary" && (
            <div className="ai-card-block">
              <button type="button" className="ghost-btn" disabled={loading} onClick={() => loadInsight("summary")}>
                Refresh summary
              </button>
              <div className="ai-prose">{summary || "Generating your savings summary…"}</div>
            </div>
          )}

          {tab === "goals" && (
            <div className="ai-card-block">
              <div className="ai-goal-form">
                <input
                  value={goalLabel}
                  onChange={(event) => setGoalLabel(event.target.value)}
                  placeholder="Goal name"
                />
                <div className="ai-goal-row">
                  <input
                    value={goalTarget}
                    onChange={(event) => setGoalTarget(event.target.value)}
                    placeholder="Target amount"
                    inputMode="numeric"
                  />
                  <select
                    value={goalCurrency}
                    onChange={(event) => setGoalCurrency(event.target.value as SavingsGoal["currency"])}
                  >
                    <option value="ETB">ETB</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <button type="button" className="ics-btn" onClick={handleAddGoal}>
                  Add goal
                </button>
              </div>
              {goals.length === 0 ? (
                <div className="empty-note">No goals yet. Add one above or ask chat to set a goal.</div>
              ) : (
                goals.map((goal) => {
                  const pct = goalProgress(goal);
                  const saved = goal.currency === "ETB" ? balances.saved.etb : balances.saved.usd;
                  return (
                    <div key={goal.id} className="ai-goal-item">
                      <div className="ai-goal-top">
                        <strong>{goal.label}</strong>
                        <button type="button" className="delete-btn" onClick={() => onRemoveGoal(goal.id)}>
                          ×
                        </button>
                      </div>
                      <p className="mono ai-goal-amt">
                        {formatAmount(saved, goal.currency)} / {formatAmount(goal.target, goal.currency)}
                      </p>
                      <div className="breakdown-track">
                        <div className="breakdown-fill c2" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="breakdown-share">{pct}% complete</span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "insights" && (
            <div className="ai-card-block">
              <h3 className="ai-subsec">Smart suggestions</h3>
              <button type="button" className="ghost-btn" disabled={loading} onClick={() => loadInsight("suggestions")}>
                Refresh suggestions
              </button>
              <div className="ai-prose">{suggestions || "Loading suggestions…"}</div>

              <h3 className="ai-subsec">Contextual reminder</h3>
              <button type="button" className="ghost-btn" disabled={loading} onClick={() => loadInsight("reminder")}>
                Generate reminder
              </button>
              <div className="ai-prose ai-reminder">{reminder || "Tap generate for a payday heads-up."}</div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

type AiCoachFabProps = {
  onOpen: () => void;
};

export function AiCoachFab({ onOpen }: AiCoachFabProps) {
  return (
    <button type="button" className="ai-fab" onClick={onOpen} aria-label="Open AI savings coach">
      <Icon name="sparkles" />
      <span className="ai-fab-label">AI Coach</span>
    </button>
  );
}
