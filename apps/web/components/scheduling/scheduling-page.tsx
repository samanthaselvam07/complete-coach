import { CalendarClock, CheckCircle2, Clock, Users } from "lucide-react";

const rhythmCards = [
  {
    title: "Weekly check-in rhythm",
    detail: "Tuesday review window, Wednesday feedback delivery, Friday risk sweep.",
    icon: CalendarClock
  },
  {
    title: "Consultation blocks",
    detail: "Reserve repeatable appointment blocks for onboarding calls, progress reviews, and strategy consults.",
    icon: Users
  },
  {
    title: "Coach focus time",
    detail: "Protect deep work blocks for program updates, report reviews, and education planning.",
    icon: Clock
  }
];

export function SchedulingPage() {
  return (
    <main className="space-y-8 p-6 lg:p-8">
      <header className="max-w-3xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">Calendar operations</p>
        <h1 className="mb-2 text-3xl font-black text-slate-950">Scheduling</h1>
        <p className="text-sm leading-6 text-slate-600">
          Plan the coaching week around check-in cadence, calls, content, and protected review time.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        {rhythmCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mb-2 text-lg font-black text-slate-950">{card.title}</h2>
              <p className="text-sm leading-6 text-slate-600">{card.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">This Week</h2>
            <p className="text-sm text-slate-600">A planning scaffold until scheduling persistence is prioritized.</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">UI ready</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {["Check-in review", "Client calls", "Programming updates"].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
              <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
