"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";

import { SavedToast } from "@/components/ui/saved-toast";
import { confirmDestructiveAction } from "@/lib/ui/confirm-destructive-action";

type BillingInterval = "weekly" | "fortnightly" | "monthly" | "annually" | "custom";
type CustomBillingIntervalUnit = "day" | "week" | "month" | "year";

interface PackageFormState {
  name: string;
  description: string;
  price: string;
  currency: string;
  billingInterval: BillingInterval;
  customBillingIntervalCount: string;
  customBillingIntervalUnit: CustomBillingIntervalUnit;
  termWeeks: string;
  features: string[];
}

const defaultForm: PackageFormState = {
  name: "",
  description: "",
  price: "",
  currency: "usd",
  billingInterval: "monthly",
  customBillingIntervalCount: "",
  customBillingIntervalUnit: "month",
  termWeeks: "",
  features: [""]
};

export function CreatePackagePage() {
  const [form, setForm] = useState<PackageFormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  function updateField(field: keyof PackageFormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function updateFeature(index: number, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      features: currentForm.features.map((feature, currentIndex) => (currentIndex === index ? value : feature))
    }));
  }

  function addFeature() {
    setForm((currentForm) => ({ ...currentForm, features: [...currentForm.features, ""] }));
  }

  function removeFeature(index: number) {
    if (
      !confirmDestructiveAction({
        action: "remove",
        itemName: form.features[index] || `feature ${index + 1}`,
        itemType: "feature"
      })
    ) {
      return;
    }

    setForm((currentForm) => {
      const features = currentForm.features.filter((_, currentIndex) => currentIndex !== index);

      return { ...currentForm, features: features.length > 0 ? features : [""] };
    });
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
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="package-currency">
              Currency
            </label>
            <select
              id="package-currency"
              value={form.currency}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => updateField("currency", event.target.value)}
            >
              <option value="usd">USD</option>
              <option value="aud">AUD</option>
              <option value="gbp">GBP</option>
              <option value="eur">EUR</option>
              <option value="cad">CAD</option>
              <option value="nzd">NZD</option>
            </select>
          </div>
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
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="annually">Annually</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <PackageField
            label="Package term"
            value={form.termWeeks}
            inputMode="numeric"
            placeholder="Weeks"
            onChange={(value) => updateField("termWeeks", value)}
          />
          {form.billingInterval === "custom" ? (
            <>
              <PackageField
                label="Custom interval count"
                value={form.customBillingIntervalCount}
                inputMode="numeric"
                onChange={(value) => updateField("customBillingIntervalCount", value)}
              />
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor="custom-interval-unit">
                  Custom interval unit
                </label>
                <select
                  id="custom-interval-unit"
                  value={form.customBillingIntervalUnit}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  onChange={(event) => updateField("customBillingIntervalUnit", event.target.value)}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </>
          ) : null}
          <div className="md:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-700">Features</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700"
                onClick={addFeature}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add feature
              </button>
            </div>
            <div className="space-y-2">
              {form.features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    aria-label={`Feature ${index + 1}`}
                    value={feature}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    onChange={(event) => updateFeature(index, event.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={`Remove feature ${index + 1}`}
                    className="rounded-xl border border-slate-200 p-2.5 text-slate-500"
                    onClick={() => removeFeature(index)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        {created ? (
          <>
            <SavedToast message="Package created." />
            <Link className="mt-1 inline-flex text-indigo-700 underline" href="/packages">
              Back to packages
            </Link>
          </>
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
  inputMode,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
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
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function buildPackagePayload(form: PackageFormState) {
  const price = Number.parseFloat(form.price);
  const termWeeks = form.termWeeks ? Number.parseInt(form.termWeeks, 10) : undefined;
  const customBillingIntervalCount = form.customBillingIntervalCount
    ? Number.parseInt(form.customBillingIntervalCount, 10)
    : undefined;

  if (
    !form.name.trim() ||
    !Number.isFinite(price) ||
    price < 0 ||
    (termWeeks !== undefined && (!Number.isFinite(termWeeks) || termWeeks < 1)) ||
    (form.billingInterval === "custom" &&
      (customBillingIntervalCount === undefined ||
        !Number.isFinite(customBillingIntervalCount) ||
        customBillingIntervalCount < 1))
  ) {
    return null;
  }

  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    priceAmount: Math.round(price * 100),
    currency: form.currency,
    billingInterval: form.billingInterval,
    customBillingIntervalCount: form.billingInterval === "custom" ? customBillingIntervalCount : undefined,
    customBillingIntervalUnit: form.billingInterval === "custom" ? form.customBillingIntervalUnit : undefined,
    termWeeks,
    features: form.features
      .map((feature) => feature.trim())
      .filter(Boolean)
  };
}
