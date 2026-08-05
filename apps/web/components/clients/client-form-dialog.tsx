"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";

import type { ClientSummary } from "@/lib/clients/client-models";

export interface ClientFormState {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  packageId: string;
  packageName: string;
  checkInDay: string;
  needsPayment: boolean;
  paymentMode: "offline" | "payment-link";
  planStartDate: string;
  weightMeasurement: string;
  initialQuestionnaire: string;
  dailyHabitForm: string;
  checkInForm: string;
  checkInFrequency: string;
  checkInDays: string[];
  defaultExerciseMetricUnit: string;
  trainingPlanIds: string[];
  nutritionPlanIds: string[];
  supplementationPlanIds: string[];
  scheduledPaymentPrice: string;
  scheduledPaymentCurrency: string;
  scheduledPaymentStartsAt: string;
}

export interface ClientFormOption {
  value: string;
  label: string;
  currency?: string | null;
}

export const emptyClientForm: ClientFormState = {
  firstName: "",
  lastName: "",
  email: "",
  dateOfBirth: "",
  phone: "",
  packageId: "",
  packageName: "",
  checkInDay: "",
  needsPayment: false,
  paymentMode: "offline",
  planStartDate: new Date().toISOString().slice(0, 10),
  weightMeasurement: "",
  initialQuestionnaire: "",
  dailyHabitForm: "",
  checkInForm: "",
  checkInFrequency: "",
  checkInDays: [],
  defaultExerciseMetricUnit: "",
  trainingPlanIds: [],
  nutritionPlanIds: [],
  supplementationPlanIds: [],
  scheduledPaymentPrice: "",
  scheduledPaymentCurrency: "usd",
  scheduledPaymentStartsAt: ""
};

export function clientSummaryToForm(client: ClientSummary): ClientFormState {
  const [firstName, ...lastNameParts] = client.name.split(" ");

  return {
    firstName: firstName ?? "",
    lastName: lastNameParts.join(" "),
    email: client.email ?? "",
    dateOfBirth: "",
    phone: client.phone ?? "",
    packageId: client.packageId ?? "",
    packageName: client.packageName === "Unassigned" ? "" : client.packageName,
    checkInDay: client.checkInDay === "Unscheduled" ? "" : client.checkInDay,
    needsPayment: false,
    paymentMode: "offline",
    planStartDate: new Date().toISOString().slice(0, 10),
    weightMeasurement: "",
    initialQuestionnaire: "",
    dailyHabitForm: "",
    checkInForm: "",
    checkInFrequency: "",
    checkInDays: client.checkInDay === "Unscheduled" ? [] : [client.checkInDay],
    defaultExerciseMetricUnit: "",
    trainingPlanIds: [],
    nutritionPlanIds: [],
    supplementationPlanIds: [],
    scheduledPaymentPrice: "",
    scheduledPaymentCurrency: "usd",
    scheduledPaymentStartsAt: ""
  };
}

export function createClientMutationBody(form: ClientFormState, status = "new", includeOnboarding = false, preserveEmptyValues = false) {
  const body = {
    firstName: form.firstName,
    lastName: form.lastName,
    email: getMutationValue(form.email, preserveEmptyValues),
    phone: getMutationValue(form.phone, preserveEmptyValues),
    packageId: getMutationValue(form.packageId, preserveEmptyValues),
    packageName: getMutationValue(form.packageName, preserveEmptyValues),
    checkInDay: getMutationValue(form.checkInDay, preserveEmptyValues),
    status,
    startDate: getMutationValue(form.planStartDate, preserveEmptyValues) ?? new Date().toISOString().slice(0, 10)
  };

  if (!includeOnboarding) {
    return body;
  }

  return {
    ...body,
    onboarding: {
      dateOfBirth: form.dateOfBirth || undefined,
      needsPayment: form.needsPayment,
      paymentMode: form.needsPayment ? "payment-link" : "offline",
      weightMeasurement: form.weightMeasurement || undefined,
      initialQuestionnaire: form.initialQuestionnaire || undefined,
      dailyHabitForm: form.dailyHabitForm || undefined,
      checkInForm: form.checkInForm || undefined,
      checkInFrequency: form.checkInFrequency || undefined,
      checkInDays: form.checkInDays.length > 0 ? form.checkInDays : undefined,
      defaultExerciseMetricUnit: form.defaultExerciseMetricUnit || undefined
    }
  };
}

function getMutationValue(value: string, preserveEmptyValues: boolean) {
  if (value) {
    return value;
  }

  return preserveEmptyValues ? null : undefined;
}

export function upsertClient(clients: ClientSummary[], client: ClientSummary) {
  const existingClient = clients.find((currentClient) => currentClient.id === client.id);

  if (!existingClient) {
    return [client, ...clients];
  }

  return clients.map((currentClient) => (currentClient.id === client.id ? client : currentClient));
}

export function ClientFormDialog({
  editingClient,
  form,
  error,
  saving,
  packageOptions = [],
  initialQuestionnaireOptions = [],
  dailyHabitFormOptions = [],
  checkInFormOptions = [],
  trainingPlanOptions = [],
  nutritionPlanOptions = [],
  supplementationPlanOptions = [],
  onChange,
  onClose,
  onSubmit
}: {
  editingClient: ClientSummary | null;
  form: ClientFormState;
  error: string | null;
  saving: boolean;
  packageOptions?: ClientFormOption[];
  initialQuestionnaireOptions?: ClientFormOption[];
  dailyHabitFormOptions?: ClientFormOption[];
  checkInFormOptions?: ClientFormOption[];
  trainingPlanOptions?: ClientFormOption[];
  nutritionPlanOptions?: ClientFormOption[];
  supplementationPlanOptions?: ClientFormOption[];
  onChange: <TField extends keyof ClientFormState>(field: TField, value: ClientFormState[TField]) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-form-title"
        className="max-h-[82vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id="client-form-title" className="text-2xl font-bold text-gray-900">
                {editingClient ? "Edit client" : "Add client"}
              </h2>
            <p className="mt-1 text-sm text-gray-600">Update the client profile and assign plans from one place.</p>
            </div>
          <button type="button" aria-label="Close client form" className="rounded-lg p-2 hover:bg-gray-100" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ClientFormField label="First name" value={form.firstName} onChange={(value) => onChange("firstName", value)} required />
          <ClientFormField label="Last name" value={form.lastName} onChange={(value) => onChange("lastName", value)} required />
          <ClientFormField label="Email" type="email" value={form.email} onChange={(value) => onChange("email", value)} />
          <ClientFormField label="Date of birth" type="date" value={form.dateOfBirth} onChange={(value) => onChange("dateOfBirth", value)} />
          <ClientFormField label="Phone" value={form.phone} onChange={(value) => onChange("phone", value)} />
          <ClientSelectField
            label="Payment plan/package"
            value={form.packageId}
            options={packageOptions}
            onChange={(packageId) => {
              const selectedPackage = packageOptions.find((option) => option.value === packageId);
              onChange("packageId", packageId);
              onChange("packageName", selectedPackage?.label ?? "");
              onChange("scheduledPaymentCurrency", selectedPackage?.currency ?? "usd");
            }}
          />
          <ClientBooleanField
            label="Does this client need to pay?"
            value={form.needsPayment}
            yesLabel="Yes, this client needs to pay"
            noLabel="No, set up offline payment"
            onChange={(value) => {
              onChange("needsPayment", value);
              onChange("paymentMode", value ? "payment-link" : "offline");
            }}
          />
          <ClientFormField label="Plan start date" type="date" value={form.planStartDate} onChange={(value) => onChange("planStartDate", value)} />
          <ClientSelectField
            label="Weight Measurement"
            value={form.weightMeasurement}
            options={[
              { value: "kg", label: "kg" },
              { value: "lbs", label: "lbs" }
            ]}
            onChange={(value) => onChange("weightMeasurement", value)}
          />
          <ClientSelectField label="Initial Q/A" value={form.initialQuestionnaire} options={initialQuestionnaireOptions} onChange={(value) => onChange("initialQuestionnaire", value)} />
          <ClientSelectField label="Daily habit form" value={form.dailyHabitForm} options={dailyHabitFormOptions} onChange={(value) => onChange("dailyHabitForm", value)} />
          <ClientSelectField label="Check in form" value={form.checkInForm} options={checkInFormOptions} onChange={(value) => onChange("checkInForm", value)} />
          <ClientSelectField
            label="Check-in Frequency"
            value={form.checkInFrequency}
            options={[
              { value: "Weekly", label: "Weekly" },
              { value: "Fortnightly", label: "Fortnightly" },
              { value: "Monthly", label: "Monthly" }
            ]}
            onChange={(value) => onChange("checkInFrequency", value)}
          />
          <ClientSelectField
            label="Set default exercise metric measurement unit"
            value={form.defaultExerciseMetricUnit}
            options={[
              { value: "kg", label: "kg" },
              { value: "lbs", label: "lbs" }
            ]}
            onChange={(value) => onChange("defaultExerciseMetricUnit", value)}
          />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-gray-700">Check in day(s)</p>
          <div className="flex flex-wrap gap-2">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
              const selected = form.checkInDays.includes(day);

              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={selected}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${selected ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-200 bg-white text-gray-700"}`}
                  onClick={() => {
                    const checkInDays = selected ? form.checkInDays.filter((currentDay) => currentDay !== day) : [...form.checkInDays, day];
                    onChange("checkInDays", checkInDays);
                    onChange("checkInDay", checkInDays[0] ?? "");
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <section className="mt-6 border-t border-gray-200 pt-5">
          <h3 className="text-base font-semibold text-gray-900">Plans</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <ClientMultiSelectField label="Training plans" value={form.trainingPlanIds} options={trainingPlanOptions} onChange={(value) => onChange("trainingPlanIds", value)} />
            <ClientMultiSelectField label="Nutrition plans" value={form.nutritionPlanIds} options={nutritionPlanOptions} onChange={(value) => onChange("nutritionPlanIds", value)} />
            <ClientMultiSelectField label="Supplementation plans" value={form.supplementationPlanIds} options={supplementationPlanOptions} onChange={(value) => onChange("supplementationPlanIds", value)} />
          </div>
        </section>

        <section className="mt-6 border-t border-gray-200 pt-5">
          <h3 className="text-base font-semibold text-gray-900">Payment Change</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <ClientFormField
              label="Scheduled payment price"
              type="number"
              value={form.scheduledPaymentPrice}
              onChange={(value) => onChange("scheduledPaymentPrice", value)}
            />
            <ClientSelectField
              label="Scheduled payment currency"
              value={form.scheduledPaymentCurrency}
              options={[
                { value: "usd", label: "USD" },
                { value: "aud", label: "AUD" },
                { value: "gbp", label: "GBP" },
                { value: "eur", label: "EUR" },
                { value: "cad", label: "CAD" },
                { value: "nzd", label: "NZD" }
              ]}
              onChange={(value) => onChange("scheduledPaymentCurrency", value)}
            />
            <ClientFormField
              label="Payment change starts on"
              type="date"
              value={form.scheduledPaymentStartsAt}
              onChange={(value) => onChange("scheduledPaymentStartsAt", value)}
            />
          </div>
        </section>

        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving}
          >
            Save client
          </button>
        </div>
      </form>
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
  options: ClientFormOption[];
  onChange: (value: string) => void;
}) {
  const id = `client-${label.toLowerCase().replaceAll(" ", "-").replaceAll("/", "")}`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

function ClientMultiSelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string[];
  options: ClientFormOption[];
  onChange: (value: string[]) => void;
}) {
  const id = `client-${label.toLowerCase().replaceAll(" ", "-")}-search`;
  const [query, setQuery] = useState("");
  const selectedOptions = options.filter((option) => value.includes(option.value));
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return options
      .filter((option) => option.label.toLowerCase().includes(normalizedQuery))
      .slice(0, 6);
  }, [options, query]);

  const toggleOption = (optionValue: string) => {
    onChange(value.includes(optionValue) ? value.filter((currentValue) => currentValue !== optionValue) : [...value, optionValue]);
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={query}
        placeholder={`Search ${label.toLowerCase()}...`}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onChange={(event) => setQuery(event.target.value)}
      />

      {selectedOptions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
              onClick={() => toggleOption(option.value)}
            >
              {option.label}
              <X className="size-3" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      {query.trim() ? (
        <div className="mt-2 rounded-lg border border-gray-200 bg-white p-2">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  className="size-4 rounded border-gray-300 text-indigo-600"
                  onChange={() => toggleOption(option.value)}
                />
                {option.label}
              </label>
            ))
          ) : (
            <p className="px-2 py-1.5 text-sm text-gray-500">No matching plans.</p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-500">Search to add one or more plans.</p>
      )}
    </div>
  );
}

function ClientBooleanField({
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
      <p className="mb-1 text-sm font-medium text-gray-700">{label}</p>
      <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        <button
          type="button"
          aria-label={yesLabel}
          aria-pressed={value}
          className={`px-3 py-2 text-sm font-medium ${value ? "bg-indigo-600 text-white" : "text-gray-700"}`}
          onClick={() => onChange(true)}
        >
          Yes
        </button>
        <button
          type="button"
          aria-label={noLabel}
          aria-pressed={!value}
          className={`px-3 py-2 text-sm font-medium ${!value ? "bg-orange-500 text-white" : "text-gray-700"}`}
          onClick={() => onChange(false)}
        >
          No
        </button>
      </div>
    </div>
  );
}

function ClientFormField({
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
  const id = `client-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
