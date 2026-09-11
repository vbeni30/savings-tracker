"use client";

import { useState } from "react";
import { Icon } from "@/components/Icons";
import { buildReminderEmailText, buildReminderSubject } from "@/lib/reminder-email";

const DEFAULT_EMAIL = "abenidemiss300@gmail.com";

type EmailRemindersProps = {
  onToast: (message: string) => void;
};

export function EmailReminders({ onToast }: EmailRemindersProps) {
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [sending, setSending] = useState(false);

  const openMailClientFallback = () => {
    const subject = encodeURIComponent(buildReminderSubject());
    const body = encodeURIComponent(buildReminderEmailText());
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    onToast("Opened your email app with a pre-filled reminder");
  };

  const sendReminder = async () => {
    setSending(true);
    try {
      const response = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; provider?: string };

      if (data.ok) {
        onToast(`Reminder email sent to ${email}`);
        return;
      }

      if (response.status === 503) {
        openMailClientFallback();
        return;
      }

      onToast(data.error ?? "Could not send reminder email");
    } catch {
      openMailClientFallback();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="email-remind-card">
      <p className="desc">
        Get a payday reminder by email with your full upcoming schedule. If server email isn&apos;t
        configured yet, the button opens your mail app with the reminder pre-filled instead.
      </p>
      <label className="email-field">
        <span>Email address</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </label>
      <button type="button" className="ics-btn email-btn" disabled={sending} onClick={sendReminder}>
        <Icon name="bell" />
        {sending ? "Sending…" : "Send email reminder"}
      </button>
    </div>
  );
}
