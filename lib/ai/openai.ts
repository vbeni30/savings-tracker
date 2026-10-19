import { randomUUID } from "crypto";
import { buildContextBlock } from "@/lib/ai/context";
import { PAYDAY_RULES } from "@/lib/rules";
import type { AiAction, AiChatRequest, AiChatResponse } from "@/types/ai";

const SYSTEM_PROMPT = `You are the Savings Tracker AI coach. You help users save first and spend what's left.

Rules:
- Use ONLY the user data snapshot provided — never invent balances or dates.
- Be concise, practical, and friendly. Use short paragraphs or bullets.
- Interpret casual language: "deduct", "spent", "paid", "bought", "minus", "took out" -> log_expense; "got paid", "payday landed", employer names -> log_payday.
- Default expenses to spendable pool and ETB unless the user says USD/dollars or "from savings".
- Parse amounts with commas (e.g. 3,000). Infer a short note from context (groceries, rent, transport).
- When the user wants to log a payday, call log_payday with the correct rule id (one call per payday).
- When the user logs spending, call log_expense. For corrections without a purchase story, use adjust_balance.
- undo_last only when they clearly want to revert the most recent ledger entry.
- remove_goal uses goal id from the GOALS section of the snapshot.
- When the user sets a savings goal, call set_goal.
- For what-if questions, call run_what_if then explain results clearly.
- For affordability, call check_afford then answer in plain language.
- You cannot export files or change app settings — say so if asked.
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
      name: "log_expense",
      description: "Log money spent from saved or spendable pool",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          currency: { type: "string", enum: ["ETB", "USD"] },
          pool: { type: "string", enum: ["saved", "spendable"] },
          note: { type: "string" },
        },
        required: ["amount", "currency", "pool"],
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
      name: "check_afford",
      description: "Check if user can afford an amount from spendable or saved pool",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          currency: { type: "string", enum: ["ETB", "USD"] },
          pool: { type: "string", enum: ["spendable", "saved"] },
        },
        required: ["amount", "currency", "pool"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "adjust_balance",
      description: "Add or subtract from saved/spendable without framing as a purchase expense",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          currency: { type: "string", enum: ["ETB", "USD"] },
          pool: { type: "string", enum: ["saved", "spendable"] },
          direction: { type: "string", enum: ["add", "subtract"] },
          note: { type: "string" },
        },
        required: ["amount", "currency", "pool", "direction"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "undo_last",
      description: "Remove the most recent ledger entry (undo)",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remove_goal",
      description: "Delete a savings goal by id from the snapshot",
      parameters: {
        type: "object",
        properties: {
          goalId: { type: "string" },
        },
        required: ["goalId"],
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

  const useTools = !request.intent || request.intent === "chat";

  for (let step = 0; step < 4; step += 1) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        tools: useTools ? TOOLS : undefined,
        tool_choice: useTools ? "auto" : undefined,
        temperature: 0.35,
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

        if (call.function.name === "log_expense") {
          actions.push({
            type: "log_expense",
            amount: Number(args.amount),
            currency: args.currency as "ETB" | "USD",
            pool: args.pool as "saved" | "spendable",
            note: args.note ? String(args.note) : undefined,
          });
          toolResult = `Logged expense of ${args.amount} ${args.currency} from ${args.pool}.`;
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

        if (call.function.name === "check_afford") {
          const { canAfford } = await import("@/lib/ledger");
          const amount = Number(args.amount);
          const currency = args.currency as "ETB" | "USD";
          const pool = args.pool as "saved" | "spendable";
          const result = canAfford(request.context.balances, amount, currency, pool);
          toolResult = JSON.stringify(result);
        }

        if (call.function.name === "adjust_balance") {
          actions.push({
            type: "adjust_balance",
            amount: Number(args.amount),
            currency: args.currency as "ETB" | "USD",
            pool: args.pool as "saved" | "spendable",
            direction: args.direction as "add" | "subtract",
            note: args.note ? String(args.note) : undefined,
          });
          toolResult = `Adjusted ${args.direction} ${args.amount} ${args.currency} on ${args.pool}.`;
        }

        if (call.function.name === "undo_last") {
          actions.push({ type: "undo_last" });
          toolResult = "Undid the last ledger entry.";
        }

        if (call.function.name === "remove_goal") {
          const goalId = String(args.goalId);
          const goal = request.context.goals.find((item) => item.id === goalId);
          if (goal) {
            actions.push({ type: "remove_goal", goalId, label: goal.label });
            toolResult = `Removed goal "${goal.label}".`;
          } else {
            toolResult = "Goal id not found in snapshot.";
          }
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
