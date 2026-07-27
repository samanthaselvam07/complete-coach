"use client";

import { Bell, Camera, Eye, EyeOff, Shield } from "lucide-react";
import { useState } from "react";

export function SettingsPage() {
  const [fullName, setFullName] = useState("Marcus Chen");
  const [professionalTitle, setProfessionalTitle] = useState("Head Performance Coach");
  const [email, setEmail] = useState("marcus.coach@kineticcurator.com");
  const [phone, setPhone] = useState("+1 (055) 234-8890");
  const [photoFileName, setPhotoFileName] = useState("");
  const [password, setPassword] = useState("CurrentPassword123");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <h1 className="mb-8 text-3xl font-black tracking-tight text-slate-950">Account Profile</h1>

      <section className="mb-6 max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-[8rem_1fr]">
          <div>
            <div className="relative h-28 w-28 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-200 to-slate-500" aria-label="Profile photo preview">
              <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-white">MC</span>
            </div>
            <label className="mt-3 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">
              <Camera className="h-4 w-4" aria-hidden="true" />
              Upload photo
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => setPhotoFileName(event.target.files?.[0]?.name ?? "")}
              />
            </label>
            {photoFileName ? <p className="mt-2 truncate text-xs font-semibold text-slate-500">{photoFileName}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ProfileInput label="Full Name" value={fullName} onChange={setFullName} />
            <ProfileInput label="Professional Title" value={professionalTitle} onChange={setProfessionalTitle} />
            <ProfileInput label="Email Address" type="email" value={email} onChange={setEmail} />
            <ProfileInput label="Phone Number" type="tel" value={phone} onChange={setPhone} />
          </div>
        </div>
      </section>

      <div className="mb-6 grid max-w-5xl gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-slate-950">
            <Shield className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            Security & Access
          </h2>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
            Password
            <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium normal-case tracking-normal text-slate-950 outline-none"
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </span>
          </label>
          <button type="button" className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">
            Update password
          </button>
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

function ProfileInput({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "email" | "tel" | "text";
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid gap-2 text-xs font-bold uppercase tracking-widest text-slate-500" htmlFor={id}>
      {label}
      <input
        id={id}
        type={type}
        value={value}
        className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        onChange={(event) => onChange(event.target.value)}
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
