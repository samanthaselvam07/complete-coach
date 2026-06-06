import { Edit3, MoreVertical, Plus, TrendingUp } from "lucide-react";
import { activeSupplementProtocols } from "@/fixtures/supplementation";

export function SupplementationPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <header className="mb-9 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-950">Supplementation Hub</h1>
          <p className="text-base text-slate-600">Manage client protocols and track compliance</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Assign Plan
        </button>
      </header>

      <section aria-label="Supplementation summary" className="mb-8 grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-7 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Protocol Compliance</h2>
            <TrendingUp className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          </div>
          <p className="text-4xl font-black tracking-tight text-slate-950">94.2%</p>
          <p className="mt-1 text-sm text-slate-600">37/39 clients adhering</p>
          <p className="mt-3 text-xs font-bold text-green-600">+2.3% from last month (average protocol compliance)</p>
        </article>

        <MetricGradientCard
          label="Active Plans"
          value="5"
          unit="Clients"
          detail="Across 25% of total base"
          className="from-indigo-600 to-violet-700"
        />
        <MetricGradientCard
          label="Library"
          value="12"
          unit="Protocols"
          detail="Pending review across clients"
          className="from-purple-600 to-fuchsia-700"
        />
      </section>

      <section className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div role="tablist" aria-label="Supplementation sections" className="flex border-b border-slate-200">
          <button
            type="button"
            role="tab"
            aria-selected="true"
            className="border-b-2 border-indigo-600 px-0 py-3 pr-8 text-sm font-bold text-indigo-600"
          >
            Active Protocols
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="false"
            className="px-0 py-3 text-sm font-bold text-slate-600"
          >
            Protocol Library
          </button>
        </div>
        <a href="/supplementation/plans" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
          View Detailed Reports
        </a>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Active supplement protocols">
        <div className="grid grid-cols-12 gap-4 border-b border-slate-200 bg-gray-50 px-6 py-5 text-xs font-bold uppercase tracking-widest text-slate-500">
          <div className="col-span-3">Client</div>
          <div className="col-span-3">Primary Protocol</div>
          <div className="col-span-3">Daily Stack</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Compliance</div>
          <div className="col-span-1">Actions</div>
        </div>

        <div className="divide-y divide-slate-100">
          {activeSupplementProtocols.map((protocol) => (
            <article key={protocol.id} className="grid grid-cols-12 items-center gap-4 px-6 py-6 text-sm text-slate-700">
              <div className="col-span-3 font-bold text-slate-950">{protocol.clientName}</div>
              <div className="col-span-3">{protocol.protocol}</div>
              <div className="col-span-3">{protocol.supplements.join(", ")}</div>
              <div className="col-span-1">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    protocol.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {protocol.status}
                </span>
              </div>
              <div className="col-span-1 flex items-center gap-3">
                <div className="h-2 w-24 rounded-full bg-slate-200">
                  <div
                    className={`h-2 rounded-full ${protocol.compliance >= 80 ? "bg-green-600" : "bg-orange-600"}`}
                    style={{ width: `${protocol.compliance}%` }}
                  />
                </div>
                <span className="font-medium">{protocol.compliance}%</span>
              </div>
              <div className="col-span-1 flex items-center gap-3 text-indigo-600">
                <button type="button" aria-label={`Edit ${protocol.clientName} protocol`}>
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" aria-label={`More actions for ${protocol.clientName} protocol`}>
                  <MoreVertical className="h-4 w-4 text-slate-500" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function MetricGradientCard({
  label,
  value,
  unit,
  detail,
  className
}: {
  label: string;
  value: string;
  unit: string;
  detail: string;
  className: string;
}) {
  return (
    <article className={`rounded-2xl bg-gradient-to-br p-6 text-white shadow-sm ${className}`}>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/80">{label}</h2>
      <p className="text-4xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-semibold text-white/90">{unit}</p>
      <p className="mt-5 text-xs font-medium text-white/85">{detail}</p>
    </article>
  );
}
