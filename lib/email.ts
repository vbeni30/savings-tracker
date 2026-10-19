import nodemailer from "nodemailer";
import { Resend } from "resend";
import {
  buildDayBeforeReminderHtml,
  buildDayBeforeReminderText,
  buildDayBeforeSubject,
  buildReminderEmailHtml,
  buildReminderEmailText,
  buildReminderSubject,
  buildWeeklyDigestHtml,
  buildWeeklyDigestText,
  buildWeeklyDigestSubject,
} from "@/lib/reminder-email";
import type { UpcomingItem } from "@/types";

const DEFAULT_REMINDER_EMAIL = "abenidemiss300@gmail.com";

export function getDefaultReminderEmail(): string {
  return process.env.REMINDER_EMAIL ?? DEFAULT_REMINDER_EMAIL;
}

type SendResult = {
  ok: boolean;
  provider?: "resend" | "smtp";
  error?: string;
};

export async function sendPaydayReminder(to = getDefaultReminderEmail()): Promise<SendResult> {
  const subject = buildReminderSubject();
  const html = buildReminderEmailHtml();
  const text = buildReminderEmailText();

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";
    const { error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) return { ok: false, error: error.message };
    return { ok: true, provider: "resend" };
  }

  const smtpHost = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? smtpUser,
      to,
      subject,
      html,
      text,
    });

    return { ok: true, provider: "smtp" };
  }

  return {
    ok: false,
    error:
      "Email is not configured. Add RESEND_API_KEY or SMTP_USER and SMTP_PASS to .env.local",
  };
}

async function sendEmailMessage(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, provider: "resend" };
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? "587"),
      secure: Number(process.env.SMTP_PORT ?? "587") === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? smtpUser,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true, provider: "smtp" };
  }

  return {
    ok: false,
    error:
      "Email is not configured. Add RESEND_API_KEY or SMTP_USER and SMTP_PASS to .env.local",
  };
}

export async function sendDayBeforeReminder(
  items: UpcomingItem[],
  to = getDefaultReminderEmail(),
): Promise<SendResult> {
  if (items.length === 0) return { ok: true };
  return sendEmailMessage({
    to,
    subject: buildDayBeforeSubject(items),
    html: buildDayBeforeReminderHtml(items),
    text: buildDayBeforeReminderText(items),
  });
}

export async function sendWeeklyDigest(to = getDefaultReminderEmail()): Promise<SendResult> {
  return sendEmailMessage({
    to,
    subject: buildWeeklyDigestSubject(),
    html: buildWeeklyDigestHtml(),
    text: buildWeeklyDigestText(),
  });
}
