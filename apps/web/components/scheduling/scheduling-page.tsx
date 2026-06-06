import { Bell, Calendar, Copy, Mail } from "lucide-react";

export function SchedulingPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <header className="mb-9">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-600">Administration</p>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-950">Scheduling & Events</h1>
        <p className="text-base text-slate-600">Coordinate your elite coaching calendar.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.5fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-slate-950">
            <Calendar className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Schedule Coaching Call
          </h2>

          <div className="mb-6 grid gap-4 md:grid-cols-2">
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

          <section className="mb-6 rounded-2xl bg-gray-50 p-4">
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

          <div className="mb-6">
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

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">Upcoming Events</h2>
              <a href="/schedule" className="text-sm font-bold text-indigo-600">View Calendar</a>
            </div>
            <EventBadge day="4" month="Oct" title="Physique Assessment" detail="10:30 AM (EST) - Sky Paradise HQ, Miami" />
            <EventBadge day="26" month="Oct" title="Supplementation Workshop" detail="02:00 PM (EST) - Google Meet" />
            <button type="button" className="mt-4 w-full rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-bold text-slate-500">
              + Quick Create Event
            </button>
          </section>

          <section className="rounded-2xl bg-slate-950 p-6 text-white">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Weekly Coach Mindset</p>
            <blockquote className="text-sm font-semibold italic">
              Elite coaching is not just about the numbers, it is about the consistency of communication.
            </blockquote>
            <p className="mt-8 text-xs font-bold uppercase tracking-wide text-slate-400">10 active sessions today</p>
          </section>
        </aside>
      </div>
    </main>
  );
}

function EventBadge({ day, month, title, detail }: { day: string; month: string; title: string; detail: string }) {
  return (
    <article className="mb-4 flex gap-3">
      <div className="flex h-20 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-600 text-white">
        <span className="text-xs font-bold uppercase">{month}</span>
        <span className="text-2xl font-black">{day}</span>
      </div>
      <div>
        <h3 className="font-bold text-slate-950">{title}</h3>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
    </article>
  );
}
