"use client";

import { useEffect, useState } from "react";
import { loadAiChatMessages, saveAiChatMessages } from "@/lib/ai/chat-storage";
import type { AiAction, AiChatMessage } from "@/types/ai";

export function useAiCoachChat() {
  const [messages, setMessages] = useState<AiChatMessage[]>(() => loadAiChatMessages());
  const [pendingActions, setPendingActions] = useState<AiAction[] | null>(null);

  useEffect(() => {
    saveAiChatMessages(messages);
  }, [messages]);

  return {
    messages,
    setMessages,
    pendingActions,
    setPendingActions,
  };
}
