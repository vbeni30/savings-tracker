"use client";

import { useMemo } from "react";
import { Icon } from "@/components/Icons";
import { formatAmount, formatDate } from "@/lib/format";
import { paydaysInMonth } from "@/lib/payday";
import type { UpcomingItem } from "@/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const monthTitle = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

type UpcomingCalendarProps = {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
};

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function UpcomingCalendar({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onToday,
}: UpcomingCalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthItems = useMemo(() => paydaysInMonth(year, month), [year, month]);

  const byDay = useMemo(() => {
    const map = new Map<number, UpcomingItem[]>();
    for (const item of monthItems) {
      const day = item.date.getDate();
      const list = map.get(day) ?? [];
      list.push(item);
      map.set(day, list);
    }
    return map;
  }, [monthItems]);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const label = monthTitle.format(new Date(year, month, 1));
  const viewingCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="schedule-calendar">
      <div className="schedule-cal-nav">
        <button type="button" className="schedule-cal-nav-btn" onClick={onPrevMonth} aria-label="Previous month">
          ‹
        </button>
        <div className="schedule-cal-title-wrap">
          <span className="schedule-cal-title">{label}</span>
          {!viewingCurrentMonth && (
            <button type="button" className="schedule-cal-today" onClick={onToday}>
              Today
            </button>
          )}
        </div>
        <button type="button" className="schedule-cal-nav-btn" onClick={onNextMonth} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="schedule-cal-grid" role="grid" aria-label={`Payday calendar for ${label}`}>
        {WEEKDAYS.map((name) => (
          <div key={name} className="schedule-cal-weekday" role="columnheader">
            {name}
          </div>
        ))}
        {Array.from({ length: cellCount }, (_, index) => {
          const dayNum = index - firstWeekday + 1;
          if (dayNum < 1 || dayNum > daysInMonth) {
            return <div key={`pad-${index}`} className="schedule-cal-cell pad" aria-hidden="true" />;
          }

          const cellDate = new Date(year, month, dayNum);
          const events = byDay.get(dayNum) ?? [];
          const isToday = sameDay(cellDate, today);

          return (
            <div
              key={dayNum}
              className={`schedule-cal-cell${isToday ? " today" : ""}${events.length ? " has-events" : ""}`}
              role="gridcell"
            >
              <span className="schedule-cal-day">{dayNum}</span>
              {events.length > 0 && (
                <div className="schedule-cal-dots" aria-hidden="true">
                  {events.map(({ rule }) => (
                    <span key={rule.id} className={`schedule-cal-dot ${rule.cls}`} title={rule.who} />
                  ))}
                </div>
              )}
              {events.length > 0 && (
                <span className="visually-hidden">
                  {events.map((e) => e.rule.who).join(", ")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {monthItems.length > 0 ? (
        <ul className="schedule-cal-list">
          {monthItems.map(({ rule, date }) => (
            <li key={`${rule.id}-${date.toISOString()}`} className="schedule-cal-list-item">
              <span className={`schedule-cal-list-dot ${rule.cls}`}>
                <Icon name={rule.iconKey} />
              </span>
              <span className="schedule-cal-list-body">
                <span className="schedule-cal-list-who">{rule.who}</span>
                <span className="schedule-cal-list-meta mono">
                  {formatDate(date)} · save {formatAmount(rule.save, rule.currency)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="schedule-cal-empty">No paydays this month.</p>
      )}
    </div>
  );
}
