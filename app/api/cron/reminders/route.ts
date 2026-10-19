import { NextResponse } from "next/server";
import { planCronReminders } from "@/lib/cron-reminders";
import { getDefaultReminderEmail, sendDayBeforeReminder, sendWeeklyDigest } from "@/lib/email";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = getDefaultReminderEmail();
  const plan = planCronReminders();
  const sent: string[] = [];
  const errors: string[] = [];

  if (plan.sendWeeklyDigest) {
    const result = await sendWeeklyDigest(email);
    if (result.ok) sent.push("weekly");
    else errors.push(result.error ?? "weekly failed");
  }

  if (plan.sendDayBefore) {
    const result = await sendDayBeforeReminder(plan.tomorrowPaydays, email);
    if (result.ok) sent.push("day-before");
    else errors.push(result.error ?? "day-before failed");
  }

  if (errors.length > 0 && sent.length === 0) {
    return NextResponse.json({ ok: false, errors }, { status: 503 });
  }

  return NextResponse.json({ ok: true, sent, errors, email });
}
