"use client";

import { X } from "lucide-react";

import type { ClientSummary } from "@/lib/clients/client-models";

export interface ClientFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  packageName: string;
  checkInDay: string;
}

export const emptyClientForm: ClientFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  packageName: "",
  checkInDay: ""
};

export function clientSummaryToForm(client: ClientSummary): ClientFormState {
  const [firstName, ...lastNameParts] = client.name.split(" ");

  return {
    firstName: firstName ?? "",
    lastName: lastNameParts.join(" "),
    email: "",
    phone: "",
    packageName: client.packageName === "Unassigned" ? "" : client.packageName,
    checkInDay: client.checkInDay === "Unscheduled" ? "" : client.checkInDay
  };
}

export function createClientMutationBody(form: ClientFormState, status = "new") {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email || undefined,
    phone: form.phone || undefined,
    packageName: form.packageName || undefined,
    checkInDay: form.checkInDay || undefined,
    status,
    startDate: new Date().toISOString().slice(0, 10)
  };
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
  onChange,
  onClose,
  onSubmit
}: {
  editingClient: ClientSummary | null;
  form: ClientFormState;
  error: string | null;
  saving: boolean;
  onChange: (field: keyof ClientFormState, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-form-title"
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
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
            <p className="mt-1 text-sm text-gray-600">Persist roster details to the active coaching organization.</p>
          </div>
          <button type="button" aria-label="Close client form" className="rounded-lg p-2 hover:bg-gray-100" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ClientFormField label="First name" value={form.firstName} onChange={(value) => onChange("firstName", value)} required />
          <ClientFormField label="Last name" value={form.lastName} onChange={(value) => onChange("lastName", value)} required />
          <ClientFormField label="Email" type="email" value={form.email} onChange={(value) => onChange("email", value)} />
          <ClientFormField label="Phone" value={form.phone} onChange={(value) => onChange("phone", value)} />
          <ClientFormField label="Package" value={form.packageName} onChange={(value) => onChange("packageName", value)} />
          <ClientFormField label="Check-in day" value={form.checkInDay} onChange={(value) => onChange("checkInDay", value)} />
        </div>

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
