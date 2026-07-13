"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { UploadCloud } from "lucide-react";

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

  function updateField<TField extends keyof ClientFormState>(field: TField, value: ClientFormState[TField]) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function toggleCheckInDay(day: string) {
    setForm((currentForm) => {
      const hasDay = currentForm.checkInDays.includes(day);
      const checkInDays = hasDay
        ? currentForm.checkInDays.filter((currentDay) => currentDay !== day)
        : [...currentForm.checkInDays, day];

      return {
        ...currentForm,
        checkInDays,
        checkInDay: checkInDays[0] ?? ""
      };
    });
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
        body: JSON.stringify(createClientMutationBody(form, "new", true))
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

      <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
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
          <ClientIntakeField
            label="Date of birth"
            type="date"
            value={form.dateOfBirth}
            onChange={(value) => updateField("dateOfBirth", value)}
          />
          <ClientIntakeField label="Phone" value={form.phone} onChange={(value) => updateField("phone", value)} />
          <ClientSelectField
            label="Payment plan/package"
            value={form.packageName}
            options={["Men's Physique Mentorship 2024", "Elite Physique", "Standard Package", "Premium Package"]}
            onChange={(value) => updateField("packageName", value)}
          />
        </div>

        <div className="mt-6 grid gap-5">
          <SegmentedBooleanField
            label="Does this client need to pay?"
            value={form.needsPayment}
            yesLabel="Yes, this client needs to pay"
            noLabel="No, this client does not need to pay"
            onChange={(value) => updateField("needsPayment", value)}
          />

          <ClientIntakeField
            label="Plan start date"
            type="date"
            value={form.planStartDate}
            onChange={(value) => updateField("planStartDate", value)}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <ClientSelectField
              label="Weight Measurement"
              value={form.weightMeasurement}
              options={["None", "Body weight", "Body measurements", "Body weight and measurements"]}
              onChange={(value) => updateField("weightMeasurement", value)}
            />
            <ClientSelectField
              label="Initial Q/A"
              value={form.initialQuestionnaire}
              options={["Start-Up Questionnaire", "Lifestyle Questionnaire", "Nutrition Questionnaire", "None"]}
              onChange={(value) => updateField("initialQuestionnaire", value)}
            />
            <ClientSelectField
              label="Daily habit form"
              value={form.dailyHabitForm}
              options={["None", "Daily Habits", "Training Day Habits", "Nutrition Habits"]}
              onChange={(value) => updateField("dailyHabitForm", value)}
            />
            <ClientSelectField
              label="Check in form"
              value={form.checkInForm}
              options={["Weekly Check-In", "Fortnightly Check-In", "Monthly Review", "None"]}
              onChange={(value) => updateField("checkInForm", value)}
            />
            <ClientSelectField
              label="Check-in Frequency"
              value={form.checkInFrequency}
              options={["Weekly", "Fortnightly", "Monthly"]}
              onChange={(value) => updateField("checkInFrequency", value)}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-slate-700">Check in day(s)</p>
            <div className="flex flex-wrap gap-2">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                const isSelected = form.checkInDays.includes(day);

                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={isSelected}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                    }`}
                    onClick={() => toggleCheckInDay(day)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="new-client-welcome-pack">
              Upload a welcome pack.
            </label>
            <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/30 p-8 text-center">
              <UploadCloud className="mx-auto mb-3 size-8 text-indigo-200" aria-hidden="true" />
              <label className="cursor-pointer text-sm font-bold text-indigo-600" htmlFor="new-client-welcome-pack">
                Drop your files here or click to upload.
              </label>
              <p className="mt-1 text-xs text-slate-400">Only .pdf files can be uploaded</p>
              <input
                id="new-client-welcome-pack"
                className="sr-only"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => updateField("welcomePackFileName", event.target.files?.[0]?.name ?? "")}
              />
              {form.welcomePackFileName ? (
                <p className="mt-3 text-xs font-bold text-slate-600">{form.welcomePackFileName}</p>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              If you have a welcome PDF upload here for your new client
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SegmentedBooleanField
              label="Do you want this client to add a goal/competition?"
              value={form.allowGoalsCompetitions}
              yesLabel="Allow goals or competitions"
              noLabel="Do not allow goals or competitions"
              onChange={(value) => updateField("allowGoalsCompetitions", value)}
            />
            <SegmentedBooleanField
              label="Do you want your client to access all your exercise library videos?"
              value={form.allowExerciseLibraryAccess}
              yesLabel="Allow full exercise video library access"
              noLabel="Do not allow full exercise video library access"
              onChange={(value) => updateField("allowExerciseLibraryAccess", value)}
            />
            <SegmentedBooleanField
              label="Can this client pay with apple pay"
              value={form.allowApplePay}
              yesLabel="Allow Apple Pay"
              noLabel="Do not allow Apple Pay"
              onChange={(value) => updateField("allowApplePay", value)}
            />
          </div>

          <ClientSelectField
            label="Set default exercise metric measurement unit"
            value={form.defaultExerciseMetricUnit}
            options={["None", "Kilograms", "Pounds"]}
            onChange={(value) => updateField("defaultExerciseMetricUnit", value)}
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

function ClientSelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const id = `new-client-${label.toLowerCase().replaceAll(" ", "-").replaceAll("/", "")}`;

  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-slate-700" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function SegmentedBooleanField({
  label,
  value,
  yesLabel,
  noLabel,
  onChange
}: {
  label: string;
  value: boolean;
  yesLabel: string;
  noLabel: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-slate-700">{label}</p>
      <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <button
          type="button"
          aria-label={yesLabel}
          aria-pressed={value}
          className={`px-4 py-2 text-sm font-bold ${value ? "bg-indigo-600 text-white" : "text-slate-700"}`}
          onClick={() => onChange(true)}
        >
          Yes
        </button>
        <button
          type="button"
          aria-label={noLabel}
          aria-pressed={!value}
          className={`px-4 py-2 text-sm font-bold ${!value ? "bg-white text-slate-700" : "text-slate-700"}`}
          onClick={() => onChange(false)}
        >
          No
        </button>
      </div>
    </div>
  );
}
