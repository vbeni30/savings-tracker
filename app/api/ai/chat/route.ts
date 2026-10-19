import { NextResponse } from "next/server";
import { runLocalChat } from "@/lib/ai/local-engine";
import { runOpenAiChat } from "@/lib/ai/openai";
import { getSessionTokenFromCookies, verifySessionToken } from "@/lib/auth";
import { checkRateLimit, rateLimitKeyFromRequest } from "@/lib/rate-limit";
import type { AiChatRequest } from "@/types/ai";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4_000;
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  try {
    const sessionToken = await getSessionTokenFromCookies();
    if (!sessionToken || !(await verifySessionToken(sessionToken))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateKey = rateLimitKeyFromRequest(request, sessionToken);
    const rate = checkRateLimit(`ai-chat:${rateKey}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many AI requests. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
      );
    }

    const body = (await request.json()) as AiChatRequest;

    if (!body.messages?.length || !body.context) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    if (body.messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: "Too many messages." }, { status: 400 });
    }

    for (const message of body.messages) {
      if (message.content.length > MAX_MESSAGE_CHARS) {
        return NextResponse.json({ error: "Message too long." }, { status: 400 });
      }
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
