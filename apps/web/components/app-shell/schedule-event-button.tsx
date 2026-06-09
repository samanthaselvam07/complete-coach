"use client";

import Link from "next/link";
import { Bell, Calendar, Copy, Mail, Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ScheduleEventButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-xl border-indigo-200 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
        onClick={() => setOpen(true)}
      >
        <Calendar className="mr-2 size-4" aria-hidden="true" />
        Schedule Event / Call
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4 sm:p-6"
          data-testid="schedule-event-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-event-title"
            className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-indigo-600">Administration</p>
                <h2 id="schedule-event-title" className="text-2xl font-black tracking-tight text-slate-950">
                  Schedule Event or Coaching Call
                </h2>
                <p className="text-sm text-slate-600">Quick-create the same scheduling flow without leaving the dashboard.</p>
              </div>
              <button type="button" aria-label="Close schedule event" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)}>
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_0.5fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-5 flex items-center gap-3 text-xl font-black text-slate-950">
                  <Calendar className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                  Schedule Coaching Call
                </h3>

                <div className="mb-5 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                    Client Name
                    <select className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-slate-500">
                      <option>Select a client...</option>
                    </select>
                  </label>
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Call Duration</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">
                        30 min
                      </button>
                      <button type="button" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">
                        60 min
                      </button>
                    </div>
                  </div>
                </div>

                <section className="mb-5 rounded-2xl bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-950">Google Meet Integration</p>
                      <p className="text-xs text-slate-500">Auto-generate your workspace link</p>
                    </div>
                    <span className="h-7 w-12 rounded-full bg-indigo-600 p-1">
                      <span className="block h-5 w-5 translate-x-5 rounded-full bg-white" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-indigo-600">
                    meet.google.com/mcp-elite-call
                    <Copy className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  </div>
                </section>

                <div className="mb-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Reminder Settings</p>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-indigo-600 px-4 py-3 text-sm font-bold text-indigo-600">
                      <Bell className="h-4 w-4" aria-hidden="true" />
                      Email Alerts
                    </button>
                    <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      Push Notifications
                    </button>
                  </div>
                </div>

                <p className="mb-4 text-sm font-semibold text-orange-600">Select a client to continue.</p>
                <button type="button" className="w-full rounded-xl bg-slate-100 px-5 py-4 text-sm font-bold text-slate-400">
                  Finalise and Notify Client
                </button>
              </section>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-black">Upcoming Events</h3>
                    <Link href="/schedule" className="text-sm font-bold text-indigo-600">View Calendar</Link>
                  </div>
                  <MiniEventBadge day="4" month="Oct" title="Physique Assessment" detail="10:30 AM (EST)" />
                  <MiniEventBadge day="26" month="Oct" title="Supplementation Workshop" detail="02:00 PM (EST)" />
                  <button type="button" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-bold text-slate-500">
                    <Plus className="size-4" aria-hidden="true" />
                    Quick Create Event
                  </button>
                </section>
              </aside>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function MiniEventBadge({ day, month, title, detail }: { day: string; month: string; title: string; detail: string }) {
  return (
    <article className="mb-4 flex gap-3">
      <div className="flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-600 text-white">
        <span className="text-xs font-bold uppercase">{month}</span>
        <span className="text-xl font-black">{day}</span>
      </div>
      <div>
        <h4 className="font-bold text-slate-950">{title}</h4>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
    </article>
  );
}
