import { Award, Brain, CheckCircle2, Sparkles } from "lucide-react";

const profileSections = [
  {
    title: "Coaching Identity",
    body: "Positioning, audience fit, specialities, and the language clients should see when they join your coaching ecosystem.",
    icon: Award
  },
  {
    title: "Methodology Profile",
    body: "Your coaching principles, decision rules, and preferred check-in style feed the AI review context used across client reporting.",
    icon: Brain
  },
  {
    title: "Client Experience",
    body: "Set expectations for feedback cadence, accountability tone, training review depth, and nutrition education style.",
    icon: Sparkles
  }
];

export function CoachProfilePage() {
  return (
    <main className="space-y-8 p-6 lg:p-8">
      <header className="overflow-hidden rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-200">Operating profile</p>
        <h1 className="mb-3 text-3xl font-black">Coach Profile</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-200">
          Centralize how the coach shows up in the product: brand voice, methodology, feedback standards, and the
          principles that should guide AI-assisted check-ins.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        {profileSections.map((section) => {
          const Icon = section.icon;

          return (
            <article key={section.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mb-2 text-lg font-black text-slate-950">{section.title}</h2>
              <p className="text-sm leading-6 text-slate-600">{section.body}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-black text-slate-950">Profile Completion</h2>
          <div className="space-y-3">
            {["Public bio drafted", "AI methodology profile active", "Check-in reporting principles reviewed"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </article>

        <aside className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6">
          <h2 className="mb-2 text-lg font-black text-indigo-950">Next best edit</h2>
          <p className="text-sm leading-6 text-indigo-900">
            Review the check-in reporting principles before moving this from a profile shell into persistent
            organization settings.
          </p>
        </aside>
      </section>
    </main>
  );
}
