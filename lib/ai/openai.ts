import { randomUUID } from "crypto";
import { buildContextBlock } from "@/lib/ai/context";
import { PAYDAY_RULES } from "@/lib/rules";
import type { AiAction, AiChatRequest, AiChatResponse } from "@/types/ai";

const SYSTEM_PROMPT = `You are the Savings Tracker AI coach. You help users save first and spend what's left.

Rules:
- Use ONLY the user data snapshot provided — never invent balances or dates.
- Be concise, practical, and friendly. Use short paragraphs or bullets.
- When the user wants to log a payday, call log_payday with the correct rule id.
- When the user sets a savings goal, call set_goal.
- For what-if questions, call run_what_if then explain results clearly.
- Amounts: ETB for birr, USD for dollars.
- Available rule ids: lsd, mmcy, sen15, sen30.

Payday aliases:
- Land and Sea Dev -> lsd
- MMCY -> mmcy
- Sentrama 15th -> sen15
- Sentrama 30th -> sen30`;

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "log_payday",
      description: "Log that a payday was received and savings recorded",
      parameters: {
        type: "object",
        properties: {
          ruleId: { type: "string", enum: ["lsd", "mmcy", "sen15", "sen30"] },
        },
        required: ["ruleId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_goal",
      description: "Create a savings goal for the user",
      parameters: {
        type: "object",
        properties: {
          label: { type: "string" },
          target: { type: "number" },
          currency: { type: "string", enum: ["ETB", "USD"] },
        },
        required: ["label", "target", "currency"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_what_if",
      description: "Calculate savings impact if a source save amount changes",
      parameters: {
        type: "object",
        properties: {
          ruleId: { type: "string", enum: ["lsd", "mmcy", "sen15", "sen30"] },
          newSaveAmount: { type: "number" },
        },
        required: ["ruleId", "newSaveAmount"],
      },
    },
  },
];

type OpenAiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
};

export async function runOpenAiChat(request: AiChatRequest): Promise<AiChatResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const intentNote =
    request.intent === "summary"
      ? "Write a warm monthly-style savings summary in plain English."
      : request.intent === "suggestions"
        ? "Give 3-4 numbered, specific savings suggestions based on the data."
        : request.intent === "reminder"
          ? "Write a short, motivating payday reminder for the next 1-2 paydays."
          : "";

  const systemContent = [SYSTEM_PROMPT, intentNote, buildContextBlock(request.context)]
    .filter(Boolean)
    .join("\n\n");

  const messages: OpenAiMessage[] = [
    { role: "system", content: systemContent },
    ...request.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const actions: AiAction[] = [];
  let assistantText = "";

  for (let step = 0; step < 3; step += 1) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        tools: request.intent === "chat" ? TOOLS : undefined,
        tool_choice: request.intent === "chat" ? "auto" : undefined,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI error: ${errorText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: OpenAiMessage; finish_reason: string }>;
    };

    const choice = data.choices[0]?.message;
    if (!choice) break;

    if (choice.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: choice.content,
        tool_calls: choice.tool_calls,
      });

      for (const call of choice.tool_calls) {
        const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
        let toolResult = "";

        if (call.function.name === "log_payday") {
          const ruleId = String(args.ruleId);
          const rule = PAYDAY_RULES.find((item) => item.id === ruleId);
          if (rule) {
            actions.push({ type: "log_payday", ruleId, who: rule.who });
            toolResult = `Logged ${rule.who} successfully.`;
          } else {
            toolResult = "Unknown rule id.";
          }
        }

        if (call.function.name === "set_goal") {
          const goal = {
            id: randomUUID(),
            label: String(args.label),
            target: Number(args.target),
            currency: args.currency as "ETB" | "USD",
            createdAt: new Date().toISOString(),
          };
          actions.push({ type: "set_goal", goal });
          toolResult = `Goal "${goal.label}" set for ${goal.target} ${goal.currency}.`;
        }

        if (call.function.name === "run_what_if") {
          const { runWhatIf } = await import("@/lib/ai/scenarios");
          const result = runWhatIf(String(args.ruleId), Number(args.newSaveAmount));
          toolResult = result ? JSON.stringify(result) : "Could not run scenario.";
        }

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: toolResult,
        });
      }

      continue;
    }

    assistantText = choice.content?.trim() ?? "";
    break;
  }

  return {
    message: assistantText || "I'm here to help with your savings.",
    actions,
    source: "openai",
  };
}
