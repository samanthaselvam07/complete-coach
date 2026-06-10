"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  createClientMutationBody,
  emptyClientForm,
  type ClientFormState
} from "@/components/clients/client-form-dialog";
import { SavedToast } from "@/components/ui/saved-toast";

export function NewClientIntakePage() {
  const [form, setForm] = useState<ClientFormState>(emptyClientForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);

  function updateField(field: keyof ClientFormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreatedClientId(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Enter the client's first and last name.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createClientMutationBody(form))
      });

      if (!response.ok) {
        throw new Error("Unable to create client");
      }

      const payload = (await response.json()) as { id?: string; data?: { id?: string } };
      const nextClientId = payload.data?.id ?? payload.id;

      if (!nextClientId) {
        throw new Error("Client response did not include an id");
      }

      setCreatedClientId(nextClientId);
      setForm(emptyClientForm);
    } catch {
      setError("Client could not be created. Check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-8 p-6 lg:p-8">
      <header className="max-w-3xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">Client onboarding</p>
        <h1 className="mb-2 text-3xl font-black text-slate-950">New Client Intake</h1>
        <p className="text-sm text-slate-600">
          Capture the minimum details needed to add a client to the roster and continue setup from their profile.
        </p>
      </header>

      <form className="max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <ClientIntakeField
            label="First name"
            value={form.firstName}
            required
            onChange={(value) => updateField("firstName", value)}
          />
          <ClientIntakeField
            label="Last name"
            value={form.lastName}
            required
            onChange={(value) => updateField("lastName", value)}
          />
          <ClientIntakeField
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => updateField("email", value)}
          />
          <ClientIntakeField label="Phone" value={form.phone} onChange={(value) => updateField("phone", value)} />
          <ClientIntakeField
            label="Package"
            value={form.packageName}
            onChange={(value) => updateField("packageName", value)}
          />
          <ClientIntakeField
            label="Check-in day"
            value={form.checkInDay}
            onChange={(value) => updateField("checkInDay", value)}
          />
        </div>

        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        {createdClientId ? (
          <>
            <SavedToast message="Client created." />
            <Link className="mt-1 inline-flex text-indigo-700 underline" href={`/clients/${createdClientId}`}>
              Open client profile
            </Link>
          </>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            disabled={saving}
          >
            Create client
          </button>
          <Link className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700" href="/clients">
            Back to roster
          </Link>
        </div>
      </form>
    </main>
  );
}

function ClientIntakeField({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  const id = `new-client-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
