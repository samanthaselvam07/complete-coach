"use client";

import { Bell, Eye, Globe2, LockKeyhole, Monitor, Shield, Smartphone } from "lucide-react";

import { CalendarConnectionsPanel } from "./calendar-connections-panel";

export function SettingsPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <h1 className="mb-8 text-3xl font-black tracking-tight text-slate-950">Account Profile</h1>

      <section className="mb-6 max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-[80px_1fr]">
          <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-200 to-slate-500" aria-hidden="true">
            <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
              <Shield className="h-4 w-4" />
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ProfileInput label="Full Name" value="Marcus Chen" />
            <ProfileInput label="Professional Title" value="Head Performance Coach" />
            <ProfileInput label="Email Address" value="marcus.coach@kineticcurator.com" />
            <ProfileInput label="Phone Number" value="+1(055) 234-8890" />
          </div>
        </div>
      </section>

      <div className="mb-6 grid max-w-5xl gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-slate-950">
            <Shield className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Security & Access
          </h2>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Password</p>
          <div className="mb-6 flex gap-3">
            <div className="flex flex-1 items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <span className="tracking-widest">................</span>
              <Eye className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>
            <button type="button" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold">Update</button>
          </div>
          <ToggleRow label="Two-Factor Authentication" detail="Add an extra layer of security" enabled />
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Active Sessions</p>
            <SessionRow icon={Monitor} title="MacBook Pro - Austin, TX" detail="Current session" />
            <SessionRow icon={Smartphone} title="iPhone 15 Pro - Austin, TX" detail="Last seen 2h ago" />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-slate-950">
            <Bell className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Notifications
          </h2>
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Client Activity</p>
          <ToggleRow label="New Check-In Uploaded" enabled />
          <ToggleRow label="Messages from Clients" enabled />
          <p className="mb-4 mt-8 text-xs font-bold uppercase tracking-widest text-slate-500">System Updates</p>
          <ToggleRow label="Platform Maintenance" enabled />
          <ToggleRow label="Subscription Renewals" enabled={false} />
        </section>
      </div>

      <section className="max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-slate-950">
          <Monitor className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          Platform Customization
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Focus Mode</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="rounded-2xl border-2 border-indigo-600 bg-indigo-50 p-5 text-sm font-bold text-slate-700">
                Light Mode
              </button>
              <button type="button" className="rounded-2xl border border-slate-200 p-5 text-sm font-bold text-slate-700">
                Dark Mode
              </button>
            </div>
          </div>
          <label className="grid gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4" aria-hidden="true" /> Language Settings</span>
            <select className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium normal-case tracking-normal text-slate-700">
              <option>English (United States)</option>
            </select>
            <span className="text-xs font-medium normal-case tracking-normal text-slate-400">
              System language will affect navigation, recognition and other system text.
            </span>
          </label>
        </div>
      </section>

      <div className="mt-6 max-w-5xl">
        <CalendarConnectionsPanel
          scope="coach"
          redirectTo="/settings"
          title="Coach Calendar Connections"
          description="Connect your own Apple, Google, and Outlook calendars for personal coaching calls and reminders."
        />
      </div>

      <div className="mt-6 flex max-w-5xl justify-end gap-3">
        <button type="button" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold">
          Discard Changes
        </button>
        <button type="button" className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white">
          Save Preferences
        </button>
      </div>
    </main>
  );
}

function ProfileInput({ label, value }: { label: string; value: string }) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid gap-2 text-xs font-bold uppercase tracking-widest text-slate-500" htmlFor={id}>
      {label}
      <input
        id={id}
        value={value}
        readOnly
        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium normal-case tracking-normal text-slate-950"
      />
    </label>
  );
}

function ToggleRow({ label, detail, enabled }: { label: string; detail?: string; enabled: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-slate-700">{label}</p>
        {detail ? <p className="text-xs text-slate-400">{detail}</p> : null}
      </div>
      <span className={`h-6 w-11 rounded-full p-1 ${enabled ? "bg-indigo-600" : "bg-slate-200"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white ${enabled ? "translate-x-5" : ""}`} />
      </span>
    </div>
  );
}

function SessionRow({ icon: Icon, title, detail }: { icon: typeof Monitor; title: string; detail: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <LockKeyhole className="h-4 w-4 text-slate-400" aria-hidden="true" />
      <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
      <div>
        <p className="font-medium text-slate-700">{title}</p>
        <p className={detail === "Current session" ? "text-xs text-green-600" : "text-xs text-slate-400"}>{detail}</p>
      </div>
    </div>
  );
}
