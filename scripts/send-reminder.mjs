import { config } from "dotenv";
import nodemailer from "nodemailer";
import { Resend } from "resend";

config({ path: ".env.local" });

const email = process.env.REMINDER_EMAIL ?? "abenidemiss300@gmail.com";

const subject = "Payday reminder — Savings Tracker";
const text = [
  "Payday reminder — Savings Tracker",
  "",
  "Your upcoming paydays are ready to review.",
  "Open the app to see dates and savings targets.",
  "",
  "Save first. Spend what's left.",
].join("\n");

const html = `<p><strong>Payday reminder</strong></p><p>Open Savings Tracker to review your upcoming paydays.</p>`;

async function main() {
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM ?? "Savings Tracker <onboarding@resend.dev>",
      to: email,
      subject,
      html,
      text,
    });
    if (error) throw new Error(error.message);
    console.log(`Sent via Resend to ${email}`);
    return;
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: email,
      subject,
      html,
      text,
    });
    console.log(`Sent via SMTP to ${email}`);
    return;
  }

  console.error("No RESEND_API_KEY or SMTP credentials in .env.local");
  process.exit(1);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
