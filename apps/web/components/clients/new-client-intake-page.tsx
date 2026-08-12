"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  createClientMutationBody,
  emptyClientForm,
  type ClientFormState
} from "@/components/clients/client-form-dialog";
import {
  assignSelectedClientForms,
  fetchClientFormOptionsFromUrls
} from "@/components/clients/client-form-actions";

interface IntakeInitialForm {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface LookupRecord {
  id: string;
  name: string;
}

const clientCreateFallbackError = "Client could not be created. Check the details and try again.";

export function NewClientIntakePage({ initialForm }: { initialForm?: IntakeInitialForm }) {
  const router = useRouter();
  const [form, setForm] = useState<ClientFormState>({ ...emptyClientForm, ...initialForm });
  const [packageOptions, setPackageOptions] = useState<SelectOption[]>([]);
  const [initialQuestionnaireOptions, setInitialQuestionnaireOptions] = useState<SelectOption[]>([]);
  const [dailyHabitFormOptions, setDailyHabitFormOptions] = useState<SelectOption[]>([]);
  const [checkInFormOptions, setCheckInFormOptions] = useState<SelectOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLookups() {
      const [packages, intakeForms, habitForms, checkInForms] = await Promise.all([
        fetchLookupOptions("/api/v1/packages?status=active&limit=100"),
        fetchClientFormOptionsFromUrls([
          "/api/v1/forms?type=intake&limit=100",
          "/api/v1/forms?type=application&limit=100",
          "/api/v1/forms?type=contact&limit=100",
          "/api/v1/forms?type=terms-and-conditions&limit=100"
        ]),
        fetchLookupOptions("/api/v1/forms?type=habit-tracker&limit=100"),
        fetchLookupOptions("/api/v1/forms?type=check-in&limit=100")
      ]);

      if (!active) {
        return;
      }

      setPackageOptions(packages);
      setInitialQuestionnaireOptions(intakeForms);
      setDailyHabitFormOptions(habitForms);
      setCheckInFormOptions(checkInForms);
    }

    void loadLookups();

    return () => {
      active = false;
    };
  }, []);

  const packageNameById = useMemo(
    () => new Map(packageOptions.map((option) => [option.value, option.label])),
    [packageOptions]
  );

  function updateField<TField extends keyof ClientFormState>(field: TField, value: ClientFormState[TField]) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function updatePackage(packageId: string) {
    setForm((currentForm) => ({
      ...currentForm,
      packageId,
      packageName: packageNameById.get(packageId) ?? ""
    }));
  }

  function updatePaymentMode(needsPayment: boolean) {
    setForm((currentForm) => ({
      ...currentForm,
      needsPayment,
      paymentMode: needsPayment ? "payment-link" : "offline"
    }));
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
        throw new Error(await readClientCreateError(response));
      }

      const payload = (await response.json()) as { data?: { id?: string } };
      const clientId = payload.data?.id;

      if (clientId) {
        await assignSelectedClientForms(clientId, form);
      }

      router.push("/clients");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : clientCreateFallbackError);
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
            value={form.packageId}
            options={packageOptions}
            onChange={updatePackage}
          />
        </div>

        <div className="mt-6 grid gap-5">
          <SegmentedBooleanField
            label="Does this client need to pay?"
            value={form.needsPayment}
            yesLabel="Yes, this client needs to pay"
            noLabel="No, set up offline payment"
            onChange={updatePaymentMode}
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
              options={[
                { value: "kg", label: "kg" },
                { value: "lbs", label: "lbs" }
              ]}
              onChange={(value) => updateField("weightMeasurement", value)}
            />
            <ClientSelectField
              label="Initial Q/A"
              value={form.initialQuestionnaire}
              options={initialQuestionnaireOptions}
              onChange={(value) => updateField("initialQuestionnaire", value)}
            />
            <ClientSelectField
              label="Daily habit form"
              value={form.dailyHabitForm}
              options={dailyHabitFormOptions}
              onChange={(value) => updateField("dailyHabitForm", value)}
            />
            <ClientSelectField
              label="Check in form"
              value={form.checkInForm}
              options={checkInFormOptions}
              onChange={(value) => updateField("checkInForm", value)}
            />
            <ClientSelectField
              label="Check-in Frequency"
              value={form.checkInFrequency}
              options={[
                { value: "Weekly", label: "Weekly" },
                { value: "Fortnightly", label: "Fortnightly" },
                { value: "Monthly", label: "Monthly" }
              ]}
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

          <ClientSelectField
            label="Set default exercise metric measurement unit"
            value={form.defaultExerciseMetricUnit}
            options={[
              { value: "kg", label: "kg" },
              { value: "lbs", label: "lbs" }
            ]}
            onChange={(value) => updateField("defaultExerciseMetricUnit", value)}
          />
        </div>

        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

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

async function fetchLookupOptions(url: string): Promise<SelectOption[]> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { data?: LookupRecord[] };

    return (payload.data ?? []).map((record) => ({
      value: record.id,
      label: record.name
    }));
  } catch {
    return [];
  }
}

async function readClientCreateError(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };

    return payload.error?.message ?? clientCreateFallbackError;
  } catch {
    return clientCreateFallbackError;
  }
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
  options: SelectOption[];
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
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
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
          className={`px-4 py-2 text-sm font-bold ${!value ? "bg-orange-500 text-white" : "text-slate-700"}`}
          onClick={() => onChange(false)}
        >
          No
        </button>
      </div>
    </div>
  );
}
