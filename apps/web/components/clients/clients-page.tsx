"use client";

import Link from "next/link";
import { Archive, Check, ChevronDown, Download, Eye, Filter, Pencil, Plus, Search, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import type { Route } from "next";

import type { ClientSummary, ClientStatus } from "@/lib/clients/client-models";
import { cn } from "@/lib/utils";
import {
  ClientFormDialog,
  clientSummaryToForm,
  createClientMutationBody,
  emptyClientForm,
  type ClientFormState,
  upsertClient
} from "./client-form-dialog";

const statusOptions: Array<{ value: ClientStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "new", label: "New" },
  { value: "deactivated", label: "Deactivated" }
];
const checkInDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [filterStatus, setFilterStatus] = useState<ClientStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortAZ, setSortAZ] = useState(false);
  const [selectedCheckInDays, setSelectedCheckInDays] = useState<string[]>([]);
  const [editingClient, setEditingClient] = useState<ClientSummary | null>(null);
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [clientFormError, setClientFormError] = useState<string | null>(null);
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadClients() {
      try {
        const response = await fetch("/api/v1/clients");

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data?: ClientSummary[] };

        if (active) {
          setClients(payload.data ?? []);
        }
      } catch {
        if (active) {
          setClients([]);
        }
      }
    }

    void loadClients();

    return () => {
      active = false;
    };
  }, []);

  const filteredClients = [...clients.filter((client) => {
      const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || client.status === filterStatus;
      const matchesDay = selectedCheckInDays.length === 0 || selectedCheckInDays.includes(client.checkInDay);

      return matchesSearch && matchesStatus && matchesDay;
    })].sort((a, b) => (sortAZ ? a.name.localeCompare(b.name) : Number(a.id) - Number(b.id)));

  const activeClients = clients.filter((client) => client.status === "active").length;
  const newClientsThisWeek = clients.filter((client) => client.status === "new").length;
  const checkInsDue = clients.filter((client) => client.checkInDay && client.status === "active").length;

  const toggleCheckInDay = (day: string) => {
    setSelectedCheckInDays((currentDays) =>
      currentDays.includes(day) ? currentDays.filter((currentDay) => currentDay !== day) : [...currentDays, day]
    );
  };

  const openCreateClient = () => {
    setEditingClient(null);
    setClientForm(emptyClientForm);
    setClientFormError(null);
    setClientFormOpen(true);
  };

  const openEditClient = (client: ClientSummary) => {
    setEditingClient(client);
    setClientForm(clientSummaryToForm(client));
    setClientFormError(null);
    setClientFormOpen(true);
  };

  const closeClientForm = () => {
    setClientFormOpen(false);
    setEditingClient(null);
    setClientForm(emptyClientForm);
    setClientFormError(null);
  };

  const saveClient = async () => {
    setSavingClient(true);
    setClientFormError(null);

    try {
      const response = await fetch(
        editingClient ? `/api/v1/clients/${editingClient.id}` : "/api/v1/clients",
        {
          method: editingClient ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createClientMutationBody(clientForm, editingClient?.status ?? "new"))
        }
      );

      if (!response.ok) {
        throw new Error("Client could not be saved.");
      }

      const payload = (await response.json()) as { data?: ClientSummary };

      const savedClient = payload.data;

      if (savedClient) {
        setClients((currentClients) => upsertClient(currentClients, savedClient));
      }

      closeClientForm();
    } catch {
      setClientFormError("Client could not be saved. Check the details and try again.");
    } finally {
      setSavingClient(false);
    }
  };

  const archiveClient = async (client: ClientSummary) => {
    try {
      const response = await fetch(`/api/v1/clients/${client.id}/archive`, { method: "POST" });

      if (!response.ok) {
        throw new Error("Archive failed.");
      }

      const payload = (await response.json()) as { data?: ClientSummary };

      const archivedClient = payload.data;

      if (archivedClient) {
        setClients((currentClients) => upsertClient(currentClients, archivedClient));
      }
    } catch {
      setClientFormError("Client could not be archived. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Client Roster</h1>
          <p className="text-gray-600">Manage and monitor your client performance</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          onClick={openCreateClient}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add client
        </button>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <MetricCard label="Total Clients" value={String(clients.length)} detail={`${activeClients} currently active`} tone="text-indigo-600" />
        <MetricCard
          label="New Clients This Week"
          value={String(newClientsThisWeek).padStart(2, "0")}
          detail="Added this calendar week"
          tone="text-green-600"
        />
        <MetricCard
          label="Check-ins Due"
          value={String(checkInsDue).padStart(2, "0")}
          detail="Requiring attention"
          tone="text-orange-600"
        />
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row">
          <div className="relative flex-1">
            <label htmlFor="client-search" className="sr-only">
              Search clients
            </label>
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              id="client-search"
              type="search"
              value={searchQuery}
              placeholder="Search clients..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  filterStatus === option.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
                onClick={() => setFilterStatus(option.value)}
              >
                {option.label}
              </button>
            ))}

            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={filterOpen}
                aria-label="Open client filters"
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                onClick={() => setFilterOpen((open) => !open)}
              >
                <Filter className="size-4" aria-hidden="true" />
                Filter
                <ChevronDown className="size-4" aria-hidden="true" />
              </button>

              {filterOpen ? (
                <div
                  role="menu"
                  aria-label="Client filters"
                  className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
                >
                  <div className="mb-3 border-b border-gray-200 pb-3">
                    <FilterCheckbox label="Sort A-Z" checked={sortAZ} onClick={() => setSortAZ((enabled) => !enabled)} />
                  </div>
                  <div className="px-2 pb-2 text-xs font-semibold uppercase text-gray-500">Check-in Day</div>
                  {checkInDays.map((day) => (
                    <FilterCheckbox
                      key={day}
                      label={day}
                      checked={selectedCheckInDays.includes(day)}
                      onClick={() => toggleCheckInDay(day)}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              aria-label="Export or import clients"
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              <Upload className="size-4" aria-hidden="true" />
              <Download className="size-4" aria-hidden="true" />
              CSV
            </button>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white" aria-label="Client roster table">
        <div className="grid grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 text-sm font-medium text-gray-700">
          <div className="col-span-4 md:col-span-3">Client</div>
          <div className="col-span-3 hidden md:block">Package</div>
          <div className="col-span-3 md:col-span-2">Compliance Score</div>
          <div className="col-span-2 hidden lg:block">Check-in Day</div>
          <div className="col-span-2 hidden xl:block">Latest Check-in</div>
          <div className="col-span-5 md:col-span-2 xl:col-span-1">Actions</div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              data-testid="client-row"
              className="grid grid-cols-12 items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50"
            >
              <div className="col-span-4 flex items-center gap-3 md:col-span-3">
                <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", client.avatarColor)}>
                  {client.initials}
                </div>
                <div>
                  <Link
                    href={`/clients/${client.id}` as Route}
                    className="font-medium text-gray-900 transition-colors hover:text-indigo-700 hover:underline"
                  >
                    {client.name}
                  </Link>
                  <div className="text-xs text-gray-500">{client.startDate}</div>
                </div>
              </div>

              <div className="col-span-3 hidden text-sm text-gray-900 md:block">{client.packageName}</div>

              <div className="col-span-3 md:col-span-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-gray-200">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        client.compliance >= 90 ? "bg-green-500" : client.compliance >= 80 ? "bg-orange-500" : "bg-red-500"
                      )}
                      style={{ width: `${client.compliance}%` }}
                    />
                  </div>
                  <span className="w-10 text-sm font-medium text-gray-700">{client.compliance}%</span>
                </div>
              </div>

              <div className="col-span-2 hidden text-sm text-gray-700 lg:block">{client.checkInDay}</div>
              <div className="col-span-2 hidden text-sm text-gray-700 xl:block">{client.latestCheckIn}</div>

              <div className="col-span-5 flex items-center gap-2 md:col-span-2 xl:col-span-1">
                <Link
                  href={`/clients/${client.id}` as Route}
                  aria-label={`View ${client.name} profile`}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                >
                  <Eye className="size-4 text-gray-600" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  aria-label={`Edit ${client.name}`}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                  onClick={() => openEditClient(client)}
                >
                  <Pencil className="size-4 text-gray-600" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Archive ${client.name}`}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                  onClick={() => void archiveClient(client)}
                >
                  <Archive className="size-4 text-gray-600" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {filteredClients.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white py-12 text-center">
          <p className="text-gray-500">No clients found matching your filters.</p>
        </div>
      ) : null}

      {clientFormOpen ? (
        <ClientFormDialog
          editingClient={editingClient}
          form={clientForm}
          error={clientFormError}
          saving={savingClient}
          onChange={(field, value) => setClientForm((currentForm) => ({ ...currentForm, [field]: value }))}
          onClose={closeClientForm}
          onSubmit={() => void saveClient()}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-2 text-sm text-gray-500">{label}</div>
      <div className={cn("text-4xl font-bold", tone)}>{value}</div>
      <div className="mt-2 text-xs text-gray-500">{detail}</div>
    </section>
  );
}


function FilterCheckbox({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      className="flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors hover:bg-gray-50"
      onClick={onClick}
    >
      <span className="text-sm text-gray-700">{label}</span>
      {checked ? <Check className="size-4 text-indigo-600" aria-hidden="true" /> : null}
    </button>
  );
}
