"use client";

import Link from "next/link";
import { CalendarDays, CircleDollarSign, Clock3, Edit3, Target } from "lucide-react";

import { getRecentClientActivity, type ClientActivityEvent } from "@/fixtures/client-activity";
import type { ClientProfile } from "@/fixtures/clients";
import { cn } from "@/lib/utils";

export function ClientProfileDashboard({ client }: { client: ClientProfile }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <ProgressAnalyticsCard />
        <CalendarCard />
      </div>
      <aside className="space-y-6">
        <CheckInHistoryCard client={client} />
        <GoalsCountdownsCard />
        <ActivityLogCard clientId={client.id} />
      </aside>
    </div>
  );
}

function ProgressAnalyticsCard() {
  const points = [
    ["Week 1", 90, 84],
    ["Week 2", 90, 84],
    ["Week 3", 89, 84],
    ["Week 4", 89, 83],
    ["Week 5", 89, 83],
    ["Week 6", 89, 83],
    ["Week 7", 88, 83],
    ["Week 8", 88, 83]
  ] as const;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">Progress Analytics</h2>
          <p className="text-sm text-slate-600">Multi-metric tracking over time</p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1 text-sm">
          {["Week", "Month", "Year"].map((range) => (
            <button
              key={range}
              type="button"
              className={cn("rounded-lg px-4 py-2", range === "Month" ? "bg-white shadow-sm" : "text-slate-600")}
            >
              {range}
            </button>
          ))}
          <button type="button" className="ml-3 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white">
            Metrics (2)
          </button>
        </div>
      </div>
      <div className="relative h-72 overflow-hidden rounded-xl bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:103px_60px]">
        <div className="absolute left-10 right-6 top-10 h-px bg-indigo-500" />
        <div className="absolute left-10 right-6 top-28 h-px bg-orange-400" />
        <div className="absolute inset-x-10 bottom-10 flex justify-between text-xs text-slate-400">
          {points.map(([week]) => (
            <span key={week}>{week}</span>
          ))}
        </div>
        <div className="absolute left-3 top-6 space-y-10 text-xs text-slate-400">
          <div>100</div>
          <div>75</div>
          <div>50</div>
          <div>25</div>
          <div>0</div>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-6 text-xs">
        <span className="text-indigo-600">Body Weight (kg)</span>
        <span className="text-orange-500">Waist (cm)</span>
      </div>
    </section>
  );
}

function CalendarCard() {
  const eventDays = new Map([
    [2, ["bg-indigo-500", "bg-green-500"]],
    [4, ["bg-indigo-500"]],
    [6, ["bg-orange-500"]],
    [8, ["bg-indigo-500"]],
    [13, ["bg-orange-500"]],
    [15, ["bg-indigo-500"]],
    [17, ["bg-indigo-500"]],
    [19, ["bg-orange-500"]],
    [21, ["bg-indigo-500", "bg-violet-500"]]
  ]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-950">Calendar</h2>
        <div className="flex items-center gap-3 text-sm">
          <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white">
            + Add Event
          </button>
          <span className="font-medium text-slate-900">April 2026</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase text-slate-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2">
        {Array.from({ length: 30 }, (_, index) => index + 1).map((day) => (
          <div
            key={day}
            className={cn(
              "flex h-24 flex-col items-center justify-center rounded-lg text-sm text-slate-500",
              day === 20 ? "border-2 border-indigo-500 bg-indigo-50 font-bold text-indigo-700" : "bg-slate-50"
            )}
          >
            {day}
            <div className="mt-2 flex gap-1">
              {(eventDays.get(day) ?? []).map((color) => (
                <span key={`${day}-${color}`} className={cn("h-1.5 w-1.5 rounded-full", color)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
        {["Strength", "Cardio", "Rest", "Face-to-face", "Video call", "Phone call", "Phase", "Milestone"].map(
          (item) => (
            <span key={item} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              {item}
            </span>
          )
        )}
      </div>
    </section>
  );
}

function CheckInHistoryCard({ client }: { client: ClientProfile }) {
  const entries = [
    [
      "Oct 14, 2024",
      "Week 24",
      "Strong progress on squat volume. Sleep quality improving with new recovery protocol. Energy levels high throughout training sessions."
    ],
    [
      "Oct 7, 2024",
      "Week 23",
      "Minor fatigue mid-week. Adjusted training volume accordingly. Nutrition compliance at 95%. Recovery metrics stable."
    ],
    [
      "Sep 30, 2024",
      "Week 22",
      "Excellent check-in. All lifts progressing on schedule. Body composition changes visible. Client motivation remains high."
    ]
  ] as const;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Weekly Check-In History</h2>
      <p className="mb-5 text-sm text-slate-600">Recent coach check-ins</p>
      <div className="space-y-5">
        {entries.map(([date, week, body]) => (
          <Link
            key={week}
            href={`/clients/${client.id}/check-ins/${week.toLowerCase().replace(/\s+/g, "-")}`}
            className="block border-b border-slate-100 pb-5 transition hover:text-indigo-700 last:border-0 last:pb-0"
          >
            <div className="mb-2 flex justify-between gap-4 text-sm">
              <span className="font-medium text-slate-600">{date}</span>
              <span className="font-bold text-indigo-600">{week}</span>
            </div>
            <p className="mb-1 text-sm font-semibold text-slate-900">Weight: {client.metrics[0]?.value ?? "88.4"}kg</p>
            <p className="text-sm leading-6 text-slate-700">{body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function GoalsCountdownsCard() {
  const goals = [
    ["70", "Competition Day - Natural Pro Show", "Aug 15, 2026", "bg-red-500"],
    ["34", "Reach 85kg Bodyweight", "Jul 10, 2026", "bg-blue-500"],
    ["25", "Complete 12-Week Program", "Jul 01, 2026", "bg-green-500"]
  ] as const;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
          <Target className="size-5 text-indigo-600" aria-hidden="true" />
          Goals & Countdowns
        </h2>
        <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
          + Add Goal
        </button>
      </div>
      <div className="space-y-3">
        {goals.map(([days, title, date, color]) => (
          <article key={title} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className={cn("rounded-lg px-4 py-3 text-center font-black text-white", color)}>
              <div className="text-2xl">{days}</div>
              <div className="text-xs">days</div>
            </div>
            <div>
              <h3 className="font-bold text-slate-950">{title}</h3>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                <Clock3 className="size-3" aria-hidden="true" />
                {date}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ActivityLogCard({ clientId }: { clientId: string }) {
  const events = getRecentClientActivity(clientId, 7);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
          <CalendarDays className="size-5 text-indigo-600" aria-hidden="true" />
          Account Activity Log
        </h2>
        <button type="button" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
          View All
        </button>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <ActivityEventRow key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}

const activityToneClasses = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-green-200 bg-green-50 text-green-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  red: "border-red-200 bg-red-50 text-red-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700"
};

function ActivityEventRow({ event }: { event: ClientActivityEvent }) {
  const Icon = event.action.startsWith("billing") ? CircleDollarSign : Edit3;

  return (
    <details className={cn("rounded-xl border p-4 text-sm", activityToneClasses[event.tone])}>
      <summary className="flex cursor-pointer list-none gap-3">
        <Icon className="mt-1 size-4 shrink-0" aria-hidden="true" />
        <span>
          <span className="block font-bold">{event.title}</span>
          <span className="block">{event.summary}</span>
          <span className="mt-1 block text-xs">{event.occurredAt}</span>
        </span>
      </summary>
      <p className="mt-3 border-t border-current/15 pt-3 text-xs leading-5">{event.detail}</p>
    </details>
  );
}
