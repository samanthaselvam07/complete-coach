"use client";

import { useState } from "react";
import { Bell, Building2, LockKeyhole } from "lucide-react";

const settingGroups = [
  {
    title: "Organization",
    body: "Business profile, timezone, currency, and default client-facing details.",
    icon: Building2
  },
  {
    title: "Notifications",
    body: "Choose which coaching events should surface as reminders for the team.",
    icon: Bell
  },
  {
    title: "Security",
    body: "Review access expectations, session hygiene, and team permission defaults.",
    icon: LockKeyhole
  }
];

export function SettingsPage() {
  const [timezone, setTimezone] = useState("Australia/Melbourne");

  return (
    <main className="space-y-8 p-6 lg:p-8">
      <header className="max-w-3xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">Workspace controls</p>
        <h1 className="mb-2 text-3xl font-black text-slate-950">Settings</h1>
        <p className="text-sm leading-6 text-slate-600">
          Manage business defaults that shape scheduling, reporting, notifications, and future organization-level
          preferences.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        {settingGroups.map((group) => {
          const Icon = group.icon;

          return (
            <article key={group.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mb-2 text-lg font-black text-slate-950">{group.title}</h2>
              <p className="text-sm leading-6 text-slate-600">{group.body}</p>
            </article>
          );
        })}
      </section>

      <section className="max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-950">Business defaults</h2>
          <p className="text-sm text-slate-600">These controls are UI-ready and can be persisted once settings APIs land.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="business-timezone">
              Business timezone
            </label>
            <select
              id="business-timezone"
              value={timezone}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => setTimezone(event.target.value)}
            >
              <option value="Australia/Melbourne">Australia/Melbourne</option>
              <option value="Australia/Sydney">Australia/Sydney</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="default-currency">
              Default currency
            </label>
            <input
              id="default-currency"
              value="USD"
              readOnly
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
