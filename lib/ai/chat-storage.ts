import type { AiChatMessage } from "@/types/ai";

const STORAGE_KEY = "savings-tracker-ai-chat";
const MAX_STORED = 80;

export const AI_WELCOME_MESSAGE: AiChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Tell me what happened in plain English — I'll log paydays, deduct expenses, check if you can afford something, adjust balances, set goals, or undo the last entry. Add OPENAI_API_KEY on the server for the smartest replies.",
};

export function loadAiChatMessages(): AiChatMessage[] {
  if (typeof sessionStorage === "undefined") return [AI_WELCOME_MESSAGE];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [AI_WELCOME_MESSAGE];
    const parsed = JSON.parse(raw) as AiChatMessage[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [AI_WELCOME_MESSAGE];
    return parsed.slice(-MAX_STORED);
  } catch {
    return [AI_WELCOME_MESSAGE];
  }
}

export function saveAiChatMessages(messages: AiChatMessage[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
  } catch {
    // quota or private mode
  }
}
