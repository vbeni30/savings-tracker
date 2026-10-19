import { formatAmount, formatDate, formatWhenLabel } from "@/lib/format";
import { upcomingSchedule } from "@/lib/stats";

export function buildReminderEmailHtml(): string {
  const schedule = upcomingSchedule();
  const rows = schedule
    .map(
      ({ rule, date, days }) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-weight:700;">${rule.who}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;">${formatWhenLabel(days, date)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-family:monospace;">${formatAmount(rule.save, rule.currency)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;color:#666;">${formatDate(date)}</td>
        </tr>`,
    )
    .join("");

  const next = schedule[0];

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#ededed;font-family:Arial,sans-serif;color:#111;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:3px solid #111;border-radius:16px;padding:24px;box-shadow:6px 6px 0 #111;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#666;letter-spacing:0.04em;">SAVINGS TRACKER</p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">Payday reminder</h1>
      <p style="margin:0 0 20px;line-height:1.5;">
        Your next payday is <strong>${next.rule.who}</strong> —
        ${formatWhenLabel(next.days, next.date)}.
        Remember to save <strong>${formatAmount(next.rule.save, next.rule.currency)}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr>
            <th align="left" style="padding:0 0 8px;font-size:11px;color:#666;">SOURCE</th>
            <th align="left" style="padding:0 0 8px;font-size:11px;color:#666;">WHEN</th>
            <th align="left" style="padding:0 0 8px;font-size:11px;color:#666;">SAVE</th>
            <th align="left" style="padding:0 0 8px;font-size:11px;color:#666;">DATE</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#666;line-height:1.5;">
        Save first. Spend what&apos;s left.
      </p>
    </div>
  </body>
</html>`;
}

export function buildReminderEmailText(): string {
  const schedule = upcomingSchedule();
  const next = schedule[0];
  const lines = schedule.map(
    ({ rule, date, days }) =>
      `- ${rule.who}: ${formatWhenLabel(days, date)} · save ${formatAmount(rule.save, rule.currency)} (${formatDate(date)})`,
  );

  return [
    "Payday reminder — Savings Tracker",
    "",
    `Next up: ${next.rule.who} — ${formatWhenLabel(next.days, next.date)}`,
    `Save: ${formatAmount(next.rule.save, next.rule.currency)}`,
    "",
    "Upcoming schedule:",
    ...lines,
    "",
    "Save first. Spend what's left.",
  ].join("\n");
}

export function buildReminderSubject(): string {
  const next = upcomingSchedule()[0];
  return `Payday reminder — ${next.rule.who} ${formatWhenLabel(next.days, next.date)}`;
}

export function buildDayBeforeReminderHtml(
  items: ReturnType<typeof upcomingSchedule>,
): string {
  const rows = items
    .map(
      ({ rule, date }) => `
        <li style="margin:0 0 8px;">
          <strong>${rule.who}</strong> — save ${formatAmount(rule.save, rule.currency)} (${formatDate(date)})
        </li>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;padding:24px;">
  <h1 style="font-size:20px;">Payday tomorrow</h1>
  <p>Remember to log your payday and move savings first:</p>
  <ul style="padding-left:20px;">${rows}</ul>
</body></html>`;
}

export function buildDayBeforeReminderText(
  items: ReturnType<typeof upcomingSchedule>,
): string {
  const lines = items.map(
    ({ rule, date }) =>
      `- ${rule.who}: save ${formatAmount(rule.save, rule.currency)} on ${formatDate(date)}`,
  );
  return ["Payday tomorrow — Savings Tracker", "", ...lines, "", "Save first. Spend what's left."].join(
    "\n",
  );
}

export function buildDayBeforeSubject(
  items: ReturnType<typeof upcomingSchedule>,
): string {
  if (items.length === 1) {
    return `Tomorrow: ${items[0].rule.who} payday`;
  }
  return `Tomorrow: ${items.length} paydays`;
}

export function buildWeeklyDigestHtml(): string {
  const schedule = upcomingSchedule().filter((item) => item.days <= 7);
  const rows = schedule
    .map(
      ({ rule, date, days }) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:700;">${rule.who}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${formatWhenLabel(days, date)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-family:monospace;">${formatAmount(rule.save, rule.currency)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;padding:24px;">
  <h1 style="font-size:20px;">Your week of paydays</h1>
  <p>Next 7 days on your Savings Tracker schedule:</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tbody>${rows || "<tr><td>No paydays in the next 7 days.</td></tr>"}</tbody>
  </table>
</body></html>`;
}

export function buildWeeklyDigestText(): string {
  const schedule = upcomingSchedule().filter((item) => item.days <= 7);
  const lines = schedule.map(
    ({ rule, date, days }) =>
      `- ${rule.who}: ${formatWhenLabel(days, date)} · ${formatAmount(rule.save, rule.currency)}`,
  );
  return [
    "Weekly payday digest — Savings Tracker",
    "",
    ...(lines.length ? lines : ["No paydays in the next 7 days."]),
  ].join("\n");
}

export function buildWeeklyDigestSubject(): string {
  return "Weekly payday digest — Savings Tracker";
}
