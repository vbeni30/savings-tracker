import type { Balances, Currency, LedgerEntry, Pool, Totals } from "@/types";

export type SavingsGoal = {
  id: string;
  label: string;
  target: number;
  currency: Currency;
  createdAt: string;
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type AiAction =
  | { type: "log_payday"; ruleId: string; who: string }
  | { type: "set_goal"; goal: SavingsGoal }
  | {
      type: "log_expense";
      amount: number;
      currency: Currency;
      pool: Pool;
      note?: string;
    };

export type AiContextPayload = {
  balances: Balances;
  entries: LedgerEntry[];
  goals: SavingsGoal[];
  projection: Totals;
  overallSaveRate: number;
};

export type AiChatRequest = {
  messages: Pick<AiChatMessage, "role" | "content">[];
  context: AiContextPayload;
  intent?: "chat" | "summary" | "reminder" | "suggestions";
};

export type AiChatResponse = {
  message: string;
  actions: AiAction[];
  source: "openai" | "local";
};

export type WhatIfResult = {
  description: string;
  monthlyEtb: number;
  monthlyUsd: number;
  monthlyEtbDelta: number;
  monthlyUsdDelta: number;
  sixMonthEtb: number;
  sixMonthUsd: number;
};
