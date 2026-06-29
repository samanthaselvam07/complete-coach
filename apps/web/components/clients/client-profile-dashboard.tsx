"use client";

import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, Target } from "lucide-react";

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
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        No persisted progress analytics are available for this client yet.
      </div>
      <div className="mt-4 flex justify-center gap-6 text-xs">
        <span className="text-indigo-600">Body Weight (kg)</span>
        <span className="text-orange-500">Waist (cm)</span>
      </div>
    </section>
  );
}

function CalendarCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-950">Calendar</h2>
        <div className="flex items-center gap-3 text-sm">
          <button type="button" className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white">
            + Add Event
          </button>
          <span className="font-medium text-slate-900">Persisted events</span>
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
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Weekly Check-In History</h2>
      <p className="mb-5 text-sm text-slate-600">Recent coach check-ins</p>
      <Link href={`/clients/${client.id}/check-ins` as Route} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
        View persisted check-ins
      </Link>
    </section>
  );
}

function GoalsCountdownsCard() {
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
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        No persisted goals or countdowns are available for this client yet.
      </p>
    </section>
  );
}

function ActivityLogCard({ clientId: _clientId }: { clientId: string }) {
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
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          No persisted activity events are available for this client yet.
        </p>
      </div>
    </section>
  );
}
