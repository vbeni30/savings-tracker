import { PAYDAY_RULES } from "@/lib/rules";
import { formatAmount } from "@/lib/format";
import { nextOccurrence } from "@/lib/payday";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function icsDate(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T090000`;
}

export function buildCalendarFile(): string {
  const now = new Date();
  let ics =
    "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Savings Tracker//EN\r\nCALSCALE:GREGORIAN\r\n";

  const specs = [
    { rule: PAYDAY_RULES[0], rrule: "FREQ=WEEKLY;INTERVAL=2" },
    { rule: PAYDAY_RULES[1], rrule: "FREQ=MONTHLY;BYMONTHDAY=-1" },
    { rule: PAYDAY_RULES[2], rrule: "FREQ=MONTHLY;BYMONTHDAY=15" },
    { rule: PAYDAY_RULES[3], rrule: "FREQ=MONTHLY;BYMONTHDAY=30" },
  ];

  specs.forEach(({ rule, rrule }) => {
    const start = nextOccurrence(rule, now);
    const summary = `${rule.who} payday — save ${formatAmount(rule.save, rule.currency)}`;
    const description = `Save ${formatAmount(rule.save, rule.currency)} of ${formatAmount(rule.received, rule.currency)} from ${rule.who}.`;

    ics += "BEGIN:VEVENT\r\n";
    ics += `UID:payday-${rule.id}-${now.getTime()}@savings-tracker\r\n`;
    ics += `DTSTAMP:${icsDate(now)}\r\n`;
    ics += `DTSTART:${icsDate(start)}\r\n`;
    ics += `RRULE:${rrule}\r\n`;
    ics += `SUMMARY:${summary}\r\n`;
    ics += `DESCRIPTION:${description}${
      rule.id === "sen30"
        ? " Note: in months with fewer than 30 days this occurrence is skipped by the 30th rule."
        : ""
    }\r\n`;
    ics +=
      "BEGIN:VALARM\r\nTRIGGER:-PT0M\r\nACTION:DISPLAY\r\nDESCRIPTION:Payday reminder\r\nEND:VALARM\r\n";
    ics += "END:VEVENT\r\n";
  });

  ics += "END:VCALENDAR\r\n";
  return ics;
}

export function downloadCalendarFile(): void {
  const ics = buildCalendarFile();
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "paydays.ics";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
