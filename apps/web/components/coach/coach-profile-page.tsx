import { Mail, Phone, Plus, Users } from "lucide-react";

const credentials = [
  ["CSCS", "Certified Strength & Conditioning Specialist"],
  ["PN Level 2", "Precision Nutrition Certified Coach"],
  ["ISSN Sport Nutrition", "Sports Nutrition Specialist"],
  ["FMS Level 2", "Functional Movement Screening"]
];

export function CoachProfilePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="relative min-h-64 overflow-hidden bg-slate-950 p-8 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(120deg,rgba(15,23,42,0.05),rgba(15,23,42,0.9))]" />
        <div className="relative flex min-h-48 flex-col justify-end">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-200">Master Level Coach</p>
          <h1 className="text-4xl font-black tracking-tight">Marcus Chen-Patterson</h1>
          <p className="mt-2 text-lg font-semibold">Head Performance Coach | MCP Coaching</p>
        </div>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[0.48fr_1fr] lg:p-8">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-6 border-b border-slate-100 pb-5 text-center">
              <Metric value="140+" label="Clients Coached" />
              <Metric value="94%" label="Goal Achievement" />
            </div>
            <div className="pt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Retention Rate</p>
              <p className="mt-2 text-3xl font-black">98.2%</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-black">+ Contact Information</h2>
            <p className="mb-3 flex items-center gap-3 text-sm text-slate-600">
              <Mail className="h-4 w-4" aria-hidden="true" />
              m.chen@mcpcoaching.com
            </p>
            <p className="flex items-center gap-3 text-sm text-slate-600">
              <Phone className="h-4 w-4" aria-hidden="true" />
              +1 (555) 012-9988
            </p>
          </section>

          <button type="button" className="flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-5 py-4 text-base font-bold text-white shadow-sm">
            <Plus className="h-5 w-5" aria-hidden="true" />
            New Program
          </button>

          <section className="rounded-2xl bg-slate-950 p-6 text-white">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Coaching Philosophy</h2>
            <p className="text-sm font-semibold italic leading-6">
              We do not chase fatigue, we create performance. If it is not measurable, it is not manageable.
            </p>
          </section>
        </aside>

        <section className="space-y-5">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-black">Professional Bio</h2>
            <div className="space-y-3 text-sm leading-7 text-slate-700">
              <p>
                With over 12 years of experience in high-performance sports and specialised metabolic conditioning,
                Marcus has carved a unique space in the coaching world. His philosophy, The Kinetic Curator, focuses
                on meticulous movement selection that maximises output while minimising systemic fatigue.
              </p>
              <p>
                Formerly a strength coach for elite European cycling teams, he transitioned to private coaching to
                bring world-class methodologies to ambitious professionals.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {["AI-First Sport Science", "Metabolic Analytics", "Behavioral Coaching"].map((tag) => (
                <span key={tag} className="rounded-full bg-indigo-50 px-4 py-1 text-xs font-bold uppercase tracking-widest text-indigo-600">
                  {tag}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="mb-4 text-xl font-black">Next Training Session</h2>
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-bold">Team Power Alpha</p>
                    <p className="text-sm text-slate-500">Today, 2:00 PM - 75 min</p>
                    <p className="text-sm font-semibold text-indigo-600">Upper Hypertrophy Block</p>
                  </div>
                </div>
              </div>
              <button type="button" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">
                View Session
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-black">Certifications & Credentials</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {credentials.map(([title, detail]) => (
                <div key={title} className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="font-bold text-indigo-700">{title}</p>
                  <p className="text-sm text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}
