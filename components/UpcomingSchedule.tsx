"use client";

import { useState } from "react";
import { UpcomingCalendar } from "@/components/UpcomingCalendar";
import { UpcomingTimeline } from "@/components/UpcomingTimeline";
import { upcomingSchedule } from "@/lib/stats";

type ScheduleView = "list" | "calendar";

export function UpcomingSchedule() {
  const [view, setView] = useState<ScheduleView>("list");
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const listItems = upcomingSchedule();

  const goPrevMonth = () => {
    setCursor(({ year, month }) => {
      if (month === 0) return { year: year - 1, month: 11 };
      return { year, month: month - 1 };
    });
  };

  const goNextMonth = () => {
    setCursor(({ year, month }) => {
      if (month === 11) return { year: year + 1, month: 0 };
      return { year, month: month + 1 };
    });
  };

  const goToday = () => {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  };

  return (
    <section className="block">
      <div className="sec-row sec-row-split">
        <h2 className="sec">Upcoming schedule</h2>
        <div className="filter-row period-toggle" role="group" aria-label="Schedule view">
          <button
            type="button"
            className={`filter-btn${view === "list" ? " active" : ""}`}
            onClick={() => setView("list")}
          >
            List
          </button>
          <button
            type="button"
            className={`filter-btn${view === "calendar" ? " active" : ""}`}
            onClick={() => setView("calendar")}
          >
            Calendar
          </button>
        </div>
      </div>
      {view === "list" ? (
        <UpcomingTimeline items={listItems} />
      ) : (
        <UpcomingCalendar
          year={cursor.year}
          month={cursor.month}
          onPrevMonth={goPrevMonth}
          onNextMonth={goNextMonth}
          onToday={goToday}
        />
      )}
    </section>
  );
}
