import { NextResponse } from "next/server";
import { runLocalChat } from "@/lib/ai/local-engine";
import { runOpenAiChat } from "@/lib/ai/openai";
import type { AiChatRequest } from "@/types/ai";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AiChatRequest;

    if (!body.messages?.length || !body.context) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);

    const result = hasOpenAi
      ? await runOpenAiChat(body).catch(() => runLocalChat(body))
      : runLocalChat(body);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
