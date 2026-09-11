import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken, credentialsMatch } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";

    if (!credentialsMatch(username, password)) {
      return NextResponse.json({ ok: false, error: "Invalid username or password." }, { status: 401 });
    }

    const token = await createSessionToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Login failed." }, { status: 500 });
  }
}
