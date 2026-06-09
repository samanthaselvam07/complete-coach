"use client";

import {
  dashboardTaskCategories,
  type DashboardTask,
  type DashboardTaskCategory
} from "@/fixtures/dashboard";
import { cn } from "@/lib/utils";

type ScheduleItemKind = "call" | "event" | "task";

interface WeeklyScheduleItem {
  id: string;
  title: string;
  label: string;
  kind: ScheduleItemKind;
  dueAt: string;
}

interface WeeklyScheduleDay {
  dateKey: string;
  weekday: string;
  dayNumber: number;
  isToday: boolean;
  items: WeeklyScheduleItem[];
}

const itemToneClassNames: Record<ScheduleItemKind, string> = {
  call: "bg-indigo-500",
  event: "bg-orange-500",
  task: "bg-slate-400"
};

export function WeeklyScheduleCalendar({ days }: { days: WeeklyScheduleDay[] }) {
  const scheduledItemCount = days.reduce((total, day) => total + day.items.length, 0);

  return (
    <section aria-label="Weekly schedule calendar" className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">This Week</p>
          <h2 className="text-xl font-bold text-gray-950">Schedule Calendar</h2>
        </div>
        <p className="text-sm text-gray-500">
          {scheduledItemCount} scheduled {scheduledItemCount === 1 ? "item" : "items"}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {days.map((day) => (
          <article
            key={day.dateKey}
            className={cn(
              "min-h-32 rounded-xl border p-3",
              day.isToday ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-gray-50"
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{day.weekday}</p>
                <p className="text-lg font-black text-gray-950">{day.dayNumber}</p>
              </div>
              {day.isToday ? <span className="rounded-full bg-indigo-600 px-2 py-1 text-[10px] font-bold uppercase text-white">Today</span> : null}
            </div>
            <div className="space-y-2">
              {day.items.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-lg bg-white p-2 text-xs shadow-sm">
                  <div className="mb-1 flex items-center gap-1">
                    <span className={cn("size-2 rounded-full", itemToneClassNames[item.kind])} aria-hidden="true" />
                    <span className="font-bold uppercase tracking-wide text-gray-500">{item.label}</span>
                  </div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                </div>
              ))}
              {day.items.length > 3 ? <p className="text-xs font-semibold text-indigo-600">+{day.items.length - 3} more</p> : null}
              {day.items.length === 0 ? <p className="rounded-lg border border-dashed border-gray-200 bg-white p-2 text-xs text-gray-400">No scheduled work</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function getWeeklyScheduleDays(tasks: Record<DashboardTaskCategory, DashboardTask[]>, date: Date, timezone: string) {
  const todayKey = getDashboardDateKey(date, timezone);
  const today = new Date(`${todayKey}T00:00:00.000Z`);

  return Array.from({ length: 3 }, (_, dayOffset) => {
    const dayDate = addUtcDays(today, dayOffset);
    const dateKey = formatUtcDateKey(dayDate);

    return {
      dateKey,
      weekday: formatUtcDayLabel(dayDate),
      dayNumber: dayDate.getUTCDate(),
      isToday: dateKey === todayKey,
      items: getWeeklyScheduleItems(tasks, dateKey, timezone)
    };
  });
}

function getWeeklyScheduleItems(
  tasks: Record<DashboardTaskCategory, DashboardTask[]>,
  dateKey: string,
  timezone: string
): WeeklyScheduleItem[] {
  return Object.entries(tasks)
    .flatMap(([category, categoryTasks]) =>
      categoryTasks
        .filter((task) => !task.completed && task.dueAt && getDashboardDateKey(new Date(task.dueAt), timezone) === dateKey)
        .map((task) => ({
          id: task.id,
          title: task.text,
          label: getScheduleItemLabel(task, category as DashboardTaskCategory),
          kind: getScheduleItemKind(task),
          dueAt: task.dueAt as string
        }))
    )
    .sort((firstItem, secondItem) => getDueTimestamp(firstItem.dueAt) - getDueTimestamp(secondItem.dueAt));
}

function getScheduleItemKind(task: DashboardTask): ScheduleItemKind {
  if (/call|meeting|consult|session/i.test(task.text)) {
    return "call";
  }

  if (/event|workshop|webinar|appointment/i.test(task.text)) {
    return "event";
  }

  return "task";
}

function getScheduleItemLabel(task: DashboardTask, category: DashboardTaskCategory) {
  const kind = getScheduleItemKind(task);

  if (kind === "call") {
    return "Call";
  }

  if (kind === "event") {
    return "Event";
  }

  return dashboardTaskCategories.find((entry) => entry.id === category)?.label ?? "Task";
}

function getDashboardDateKey(date: Date, timezone: string) {
  const parts = getDashboardNumericDateParts(date, timezone);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getDashboardNumericDateParts(date: Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone
    }).formatToParts(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC"
    }).formatToParts(date);
  }
}

function addUtcDays(date: Date, dayOffset: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(date.getUTCDate() + dayOffset);
  return nextDate;
}

function formatUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatUtcDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
}

function getDueTimestamp(dueAt?: string | null) {
  if (!dueAt) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp = new Date(dueAt).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}
