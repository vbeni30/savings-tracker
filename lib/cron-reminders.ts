import { upcomingSchedule } from "@/lib/stats";

export type CronReminderPlan = {
  sendDayBefore: boolean;
  sendWeeklyDigest: boolean;
  tomorrowPaydays: ReturnType<typeof upcomingSchedule>;
};

export function planCronReminders(now = new Date()): CronReminderPlan {
  const schedule = upcomingSchedule(now);
  const tomorrowPaydays = schedule.filter((item) => item.days === 1);
  const sendDayBefore = tomorrowPaydays.length > 0;
  const sendWeeklyDigest = now.getUTCDay() === 1;

  return {
    sendDayBefore,
    sendWeeklyDigest,
    tomorrowPaydays,
  };
}
