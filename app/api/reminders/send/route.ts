import { NextResponse } from "next/server";
import { getDefaultReminderEmail, sendPaydayReminder } from "@/lib/email";

export async function POST() {
  try {
    const email = getDefaultReminderEmail();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email address." }, { status: 400 });
    }

    const result = await sendPaydayReminder(email);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
    }

    return NextResponse.json({ ok: true, provider: result.provider, email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send reminder email.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
