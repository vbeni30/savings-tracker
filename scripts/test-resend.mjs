import { readFileSync } from "fs";
import { Resend } from "resend";

function loadEnvLocal() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx);
      const value = trimmed.slice(idx + 1);
      process.env[key] ??= value;
    }
  } catch {
    /* .env.local optional when env vars are already set */
  }
}

loadEnvLocal();

const apiKey = process.env.RESEND_API_KEY;
const to = process.env.REMINDER_EMAIL ?? "abenidemiss300@gmail.com";
const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";

if (!apiKey) {
  console.error("RESEND_API_KEY missing — add it to .env.local or Vercel env vars.");
  process.exit(1);
}

const resend = new Resend(apiKey);
const { data, error } = await resend.emails.send({
  from,
  to,
  subject: "Savings Tracker — reminder test",
  html: "<p>Your Resend email integration is working. Payday reminders are ready.</p>",
  text: "Your Resend email integration is working. Payday reminders are ready.",
});

if (error) {
  console.error("Resend error:", error);
  process.exit(1);
}

console.log("Test email sent to", to, "— id:", data?.id);
