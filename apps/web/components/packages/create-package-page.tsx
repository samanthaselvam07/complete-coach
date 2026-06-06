"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type BillingInterval = "monthly" | "one-time";

interface PackageFormState {
  name: string;
  description: string;
  price: string;
  billingInterval: BillingInterval;
  features: string;
}

const defaultForm: PackageFormState = {
  name: "",
  description: "",
  price: "",
  billingInterval: "monthly",
  features: ""
};

export function CreatePackagePage() {
  const [form, setForm] = useState<PackageFormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  function updateField(field: keyof PackageFormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreated(false);

    const payload = buildPackagePayload(form);

    if (!payload) {
      setError("Enter a package name and a valid price.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/v1/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Unable to create package");
      }

      setCreated(true);
      setForm(defaultForm);
    } catch {
      setError("Package could not be created. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-8 p-6 lg:p-8">
      <header className="max-w-3xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">Offer builder</p>
        <h1 className="mb-2 text-3xl font-black text-slate-950">Create Package</h1>
        <p className="text-sm text-slate-600">
          Build a coaching package that can be reused across client onboarding, billing, and reporting views.
        </p>
      </header>

      <form className="max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <PackageField
            label="Package name"
            value={form.name}
            required
            onChange={(value) => updateField("name", value)}
          />
          <PackageField
            label="Price"
            value={form.price}
            required
            inputMode="decimal"
            onChange={(value) => updateField("price", value)}
          />
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="package-description">
              Description
            </label>
            <textarea
              id="package-description"
              value={form.description}
              className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => updateField("description", event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="billing-interval">
              Billing interval
            </label>
            <select
              id="billing-interval"
              value={form.billingInterval}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => updateField("billingInterval", event.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="one-time">One-time</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="package-features">
              Features
            </label>
            <textarea
              id="package-features"
              value={form.features}
              placeholder="One feature per line"
              className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => updateField("features", event.target.value)}
            />
          </div>
        </div>

        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        {created ? (
          <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-800">
            <p>Package created.</p>
            <Link className="mt-1 inline-flex text-indigo-700 underline" href="/packages">
              Back to packages
            </Link>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            disabled={saving}
          >
            Create package
          </button>
          <Link className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700" href="/packages">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

function PackageField({
  label,
  value,
  onChange,
  required = false,
  inputMode
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: "decimal";
}) {
  const id = `package-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        required={required}
        inputMode={inputMode}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function buildPackagePayload(form: PackageFormState) {
  const price = Number.parseFloat(form.price);

  if (!form.name.trim() || !Number.isFinite(price) || price < 0) {
    return null;
  }

  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    priceAmount: Math.round(price * 100),
    currency: "usd",
    billingInterval: form.billingInterval,
    features: form.features
      .split(/\n|,/)
      .map((feature) => feature.trim())
      .filter(Boolean),
    color: "indigo"
  };
}
