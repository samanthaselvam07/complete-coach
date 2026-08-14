"use client";

import Link from "next/link";
import { Archive, Check, ChevronDown, Eye, Filter, Mail, MoreHorizontal, PauseCircle, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { Route } from "next";

import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";
import type { ClientSummary, ClientStatus } from "@/lib/clients/client-models";
import { confirmDestructiveAction } from "@/lib/ui/confirm-destructive-action";
import { cn } from "@/lib/utils";
import {
  ClientFormDialog,
  type ClientFormOption,
  clientSummaryToForm,
  createClientMutationBody,
  emptyClientForm,
  type ClientFormState,
  upsertClient
} from "./client-form-dialog";
import {
  assignSelectedClientForms,
  assignSelectedClientPlans,
  type ClientProfileResponse,
  fetchAssignedClientFormIds,
  fetchAssignedClientPlanIds,
  fetchCoachAssignmentOptions,
  fetchClientFormsByType,
  fetchClientFormOptions,
  getProfileCheckInDays,
  scheduleAssignedPackagePaymentChange,
  toDateInputValue,
  updateClientProfile
} from "./client-form-actions";

const statusOptions: Array<{ value: ClientStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "new", label: "New" },
  { value: "deactivated", label: "Deactivated" }
];
const checkInDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export function ClientsPage() {
  const { data: session } = useSession();
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
  const [loadingClients, setLoadingClients] = useState(true);
  const [openActionClientId, setOpenActionClientId] = useState<string | null>(null);
  const [pauseClient, setPauseClient] = useState<ClientSummary | null>(null);
  const [pauseStartDate, setPauseStartDate] = useState(getTodayDateInputValue);
  const [pauseResumeDate, setPauseResumeDate] = useState("");
  const [pauseSaving, setPauseSaving] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [packageOptions, setPackageOptions] = useState<ClientFormOption[]>([]);
  const [coachOptions, setCoachOptions] = useState<ClientFormOption[]>([]);
  const [initialQuestionnaireOptions, setInitialQuestionnaireOptions] = useState<ClientFormOption[]>([]);
  const [dailyHabitFormOptions, setDailyHabitFormOptions] = useState<ClientFormOption[]>([]);
  const [checkInFormOptions, setCheckInFormOptions] = useState<ClientFormOption[]>([]);
  const [trainingPlanOptions, setTrainingPlanOptions] = useState<ClientFormOption[]>([]);
  const [nutritionPlanOptions, setNutritionPlanOptions] = useState<ClientFormOption[]>([]);
  const [supplementationPlanOptions, setSupplementationPlanOptions] = useState<ClientFormOption[]>([]);
  const canViewAssignedCoach = session?.activeOrganization?.role === "owner" || session?.activeOrganization?.role === "admin";

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
      } finally {
        if (active) {
          setLoadingClients(false);
        }
      }
    }

    void loadClients();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadClientFormOptions() {
      const [
        packages,
        publishedFormGroups,
        trainingPlans,
        nutritionPlans,
        supplementationPlans,
        coaches
      ] = await Promise.all([
        fetchClientFormOptions("/api/v1/packages?status=active&limit=100"),
        fetchClientFormsByType(),
        fetchClientFormOptions("/api/v1/training-program-templates?limit=100"),
        fetchClientFormOptions("/api/v1/meal-plan-templates?limit=100"),
        fetchClientFormOptions("/api/v1/supplement-plan-templates?limit=100"),
        canViewAssignedCoach ? fetchCoachAssignmentOptions() : Promise.resolve([])
      ]);

      if (!active) {
        return;
      }

      setPackageOptions(packages);
      setCoachOptions(coaches);
      setInitialQuestionnaireOptions(publishedFormGroups.initialQuestionnaireOptions);
      setDailyHabitFormOptions(publishedFormGroups.dailyHabitFormOptions);
      setCheckInFormOptions(publishedFormGroups.checkInFormOptions);
      setTrainingPlanOptions(trainingPlans);
      setNutritionPlanOptions(nutritionPlans);
      setSupplementationPlanOptions(supplementationPlans);
    }

    void loadClientFormOptions();

    return () => {
      active = false;
    };
  }, [canViewAssignedCoach]);

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

  const openEditClient = (client: ClientSummary) => {
    setEditingClient(client);
    setClientForm(clientSummaryToForm(client));
    setClientFormError(null);
    setClientFormOpen(true);
    void loadClientProfile(client.id);
  };

  const closeClientForm = () => {
    setClientFormOpen(false);
    setEditingClient(null);
    setClientForm(emptyClientForm);
    setClientFormError(null);
  };

  const saveClient = async () => {
    if (!editingClient) {
      return;
    }

    setSavingClient(true);
    setClientFormError(null);

    try {
      const response = await fetch(`/api/v1/clients/${editingClient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createClientMutationBody(clientForm, editingClient.status, true, true, canViewAssignedCoach))
        }
      );

      if (!response.ok) {
        throw new Error("Client could not be saved.");
      }

      await updateClientProfile(editingClient.id, clientForm);
      await assignSelectedClientForms(editingClient.id, clientForm);
      await assignSelectedClientPlans(editingClient.id, clientForm);
      await scheduleAssignedPackagePaymentChange(clientForm);

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

  const loadClientProfile = async (clientId: string) => {
    try {
      const [response, assignedPlanIds, assignedFormIds] = await Promise.all([
        fetch(`/api/v1/clients/${clientId}/profile`),
        fetchAssignedClientPlanIds(clientId),
        fetchAssignedClientFormIds(clientId)
      ]);

      setClientForm((currentForm) => ({
        ...currentForm,
        initialQuestionnaire: assignedFormIds.initialQuestionnaire,
        dailyHabitForm: assignedFormIds.dailyHabitForm,
        checkInForm: assignedFormIds.checkInForm,
        trainingPlanIds: assignedPlanIds.trainingPlanIds,
        nutritionPlanIds: assignedPlanIds.nutritionPlanIds,
        supplementationPlanIds: assignedPlanIds.supplementationPlanIds
      }));

      if (response.ok) {
        const payload = (await response.json()) as { data?: ClientProfileResponse | null };
        const profile = payload.data;
        const dateOfBirth = toDateInputValue(profile?.dateOfBirth);
        const profileCheckInDays = getProfileCheckInDays(profile);

        setClientForm((currentForm) => ({
          ...currentForm,
          dateOfBirth: dateOfBirth || currentForm.dateOfBirth,
          weightMeasurement: profile?.weightMeasurement ?? currentForm.weightMeasurement,
          checkInFrequency: profile?.checkInFrequency ?? currentForm.checkInFrequency,
          checkInDays: profileCheckInDays.length > 0 ? profileCheckInDays : currentForm.checkInDays,
          checkInDay: profileCheckInDays[0] ?? currentForm.checkInDay,
          defaultExerciseMetricUnit: profile?.defaultExerciseMetricUnit ?? currentForm.defaultExerciseMetricUnit
        }));
      }
    } catch {
      // Profile details are optional for roster editing.
    }
  };

  const archiveClient = async (client: ClientSummary) => {
    if (
      !confirmDestructiveAction({
        action: "archive",
        itemName: client.name,
        itemType: "client"
      })
    ) {
      return;
    }

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

  const deleteClient = async (client: ClientSummary) => {
    if (
      !confirmDestructiveAction({
        action: "delete",
        itemName: client.name,
        itemType: "client"
      })
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/clients/${client.id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Delete failed.");
      }

      setClients((currentClients) => currentClients.filter((currentClient) => currentClient.id !== client.id));
    } catch {
      setClientFormError("Client could not be deleted. Try again.");
    }
  };

  const openPauseMembership = (client: ClientSummary) => {
    setPauseClient(client);
    setPauseStartDate(getTodayDateInputValue());
    setPauseResumeDate("");
    setPauseError(null);
    setOpenActionClientId(null);
  };

  const pauseMembership = async () => {
    if (!pauseClient) {
      return;
    }

    setPauseSaving(true);
    setPauseError(null);

    try {
      const response = await fetch(`/api/v1/clients/${pauseClient.id}/membership-pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pauseStartDate,
          pauseResumeDate
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: { clientStatus?: ClientStatus }; error?: { message?: string } }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Membership could not be paused.");
      }

      if (payload?.data?.clientStatus) {
        setClients((currentClients) =>
          currentClients.map((client) =>
            client.id === pauseClient.id ? { ...client, status: payload.data?.clientStatus ?? client.status } : client
          )
        );
      }

      setActionMessage(`Membership pause scheduled for ${pauseClient.name}.`);
      setPauseClient(null);
    } catch (error) {
      setPauseError(error instanceof Error ? error.message : "Membership could not be paused.");
    } finally {
      setPauseSaving(false);
    }
  };

  const resendRegistrationEmail = async (client: ClientSummary) => {
    setOpenActionClientId(null);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/v1/clients/${client.id}/registration-email`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Registration email could not be sent.");
      }

      setActionMessage(`Registration email sent to ${client.name}.`);
    } catch (error) {
      setClientFormError(error instanceof Error ? error.message : "Registration email could not be sent.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      {loadingClients ? (
        <CompleteCoachLoadingScreen
          title="Preparing client roster"
          label="Preparing client roster."
        />
      ) : null}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Client Roster</h1>
          <p className="text-gray-600">Manage and monitor your client performance</p>
        </div>
        <Link
          href={"/clients/new" as Route}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add client
        </Link>
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
              aria-label="Import clients CSV"
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              <Upload className="size-4" aria-hidden="true" />
              Import CSV
            </button>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white" aria-label="Client roster table">
        <div className="grid grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 text-sm font-medium text-gray-700">
          <div className={cn("col-span-4 md:col-span-3", canViewAssignedCoach ? "xl:col-span-2" : "xl:col-span-3")}>Client</div>
          <div className="col-span-3 hidden md:block xl:col-span-2">Package</div>
          {canViewAssignedCoach ? <div className="col-span-2 hidden xl:block">Coach</div> : null}
          <div className="col-span-3 md:col-span-2">Compliance</div>
          <div className="col-span-2 hidden lg:block xl:col-span-1">Check-in Day</div>
          <div className="col-span-1 hidden xl:block">Latest Check-in</div>
          <div className="col-span-3 md:col-span-2 xl:col-span-1">Actions</div>
          <div className="col-span-2 md:col-span-2 xl:col-span-1">Status</div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              data-testid="client-row"
              className="grid grid-cols-12 items-center gap-4 px-6 py-4 transition-colors hover:bg-gray-50"
            >
              <div className={cn("col-span-4 flex items-center gap-3 md:col-span-3", canViewAssignedCoach ? "xl:col-span-2" : "xl:col-span-3")}>
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

              <div className="col-span-3 hidden text-sm text-gray-900 md:block xl:col-span-2">{client.packageName}</div>

              {canViewAssignedCoach ? (
                <div className="col-span-2 hidden truncate text-sm text-gray-700 xl:block">
                  {client.assignedCoachName || "Unassigned"}
                </div>
              ) : null}

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

              <div className="col-span-2 hidden text-sm text-gray-700 lg:block xl:col-span-1">{client.checkInDay}</div>
              <div className="col-span-1 hidden truncate text-sm text-gray-700 xl:block">{client.latestCheckIn}</div>

              <div className="relative col-span-3 flex items-center gap-2 md:col-span-2 xl:col-span-1">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={openActionClientId === client.id}
                  aria-label={`Open actions for ${client.name}`}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                  onClick={() => setOpenActionClientId((currentClientId) => (currentClientId === client.id ? null : client.id))}
                >
                  <MoreHorizontal className="size-5 text-gray-600" aria-hidden="true" />
                </button>
                {openActionClientId === client.id ? (
                  <ClientActionsMenu
                    client={client}
                    onEdit={() => {
                      setOpenActionClientId(null);
                      openEditClient(client);
                    }}
                    onArchive={() => {
                      setOpenActionClientId(null);
                      void archiveClient(client);
                    }}
                    onDelete={() => {
                      setOpenActionClientId(null);
                      void deleteClient(client);
                    }}
                    onPause={() => openPauseMembership(client)}
                    onResendRegistration={() => void resendRegistrationEmail(client)}
                  />
                ) : null}
              </div>

              <div className="col-span-2 flex md:col-span-2 xl:col-span-1">
                <StatusBadge status={client.status} />
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

      {actionMessage ? (
        <p role="status" className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          {actionMessage}
        </p>
      ) : null}

      {clientFormOpen ? (
        <ClientFormDialog
          editingClient={editingClient}
          form={clientForm}
          error={clientFormError}
          saving={savingClient}
          packageOptions={packageOptions}
          coachOptions={canViewAssignedCoach ? coachOptions : []}
          initialQuestionnaireOptions={initialQuestionnaireOptions}
          dailyHabitFormOptions={dailyHabitFormOptions}
          checkInFormOptions={checkInFormOptions}
          trainingPlanOptions={trainingPlanOptions}
          nutritionPlanOptions={nutritionPlanOptions}
          supplementationPlanOptions={supplementationPlanOptions}
          onChange={(field, value) => setClientForm((currentForm) => ({ ...currentForm, [field]: value }))}
          onClose={closeClientForm}
          onSubmit={() => void saveClient()}
        />
      ) : null}

      {pauseClient ? (
        <PauseMembershipDialog
          client={pauseClient}
          pauseStartDate={pauseStartDate}
          pauseResumeDate={pauseResumeDate}
          error={pauseError}
          saving={pauseSaving}
          onStartDateChange={setPauseStartDate}
          onResumeDateChange={setPauseResumeDate}
          onClose={() => setPauseClient(null)}
          onSubmit={() => void pauseMembership()}
        />
      ) : null}
    </div>
  );
}

function ClientActionsMenu({
  client,
  onEdit,
  onArchive,
  onDelete,
  onPause,
  onResendRegistration
}: {
  client: ClientSummary;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onPause: () => void;
  onResendRegistration: () => void;
}) {
  return (
    <div
      role="menu"
      aria-label={`${client.name} actions`}
      className="absolute right-16 z-30 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
    >
      <ActionMenuLink href={`/clients/${client.id}` as Route} label="View profile" icon={Eye} />
      <ActionMenuButton label="Edit profile" icon={Pencil} onClick={onEdit} />
      <ActionMenuButton label="Pause membership" icon={PauseCircle} onClick={onPause} />
      <ActionMenuButton label="Resend registration email" icon={Mail} onClick={onResendRegistration} />
      <ActionMenuButton label="Archive client" icon={Archive} onClick={onArchive} />
      <ActionMenuButton label="Delete client" icon={Trash2} tone="danger" onClick={onDelete} />
    </div>
  );
}

function ActionMenuLink({ href, label, icon: Icon }: { href: Route; label: string; icon: LucideIcon }) {
  return (
    <Link
      role="menuitem"
      href={href}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
    >
      <Icon className="size-4 text-gray-500" aria-hidden="true" />
      {label}
    </Link>
  );
}

function ActionMenuButton({
  label,
  icon: Icon,
  tone = "default",
  onClick
}: {
  label: string;
  icon: LucideIcon;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-gray-50",
        tone === "danger" ? "text-red-700" : "text-gray-700"
      )}
      onClick={onClick}
    >
      <Icon className={cn("size-4", tone === "danger" ? "text-red-600" : "text-gray-500")} aria-hidden="true" />
      {label}
    </button>
  );
}

function PauseMembershipDialog({
  client,
  pauseStartDate,
  pauseResumeDate,
  error,
  saving,
  onStartDateChange,
  onResumeDateChange,
  onClose,
  onSubmit
}: {
  client: ClientSummary;
  pauseStartDate: string;
  pauseResumeDate: string;
  error: string | null;
  saving: boolean;
  onStartDateChange: (value: string) => void;
  onResumeDateChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4">
      <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" aria-label={`Pause membership for ${client.name}`}>
        <h2 className="text-xl font-bold text-gray-950">Pause membership</h2>
        <p className="mt-2 text-sm text-gray-600">
          Select when billing should pause and when the client should regain access.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="pause-start-date" className="text-sm font-semibold text-gray-700">
              Pause from
            </label>
            <input
              id="pause-start-date"
              type="date"
              value={pauseStartDate}
              min={getTodayDateInputValue()}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => onStartDateChange(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="pause-resume-date" className="text-sm font-semibold text-gray-700">
              Resume on
            </label>
            <input
              id="pause-resume-date"
              type="date"
              value={pauseResumeDate}
              min={pauseStartDate || getTodayDateInputValue()}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(event) => onResumeDateChange(event.target.value)}
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !pauseStartDate || !pauseResumeDate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            onClick={onSubmit}
          >
            {saving ? "Saving..." : "Pause membership"}
          </button>
        </div>
      </section>
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

function StatusBadge({ status }: { status: ClientStatus }) {
  const statusStyles: Record<ClientStatus, string> = {
    active: "border-green-200 bg-green-50 text-green-700",
    archived: "border-slate-200 bg-slate-100 text-slate-700",
    new: "border-blue-200 bg-blue-50 text-blue-700",
    deactivated: "border-orange-200 bg-orange-50 text-orange-700"
  };

  return (
    <span
      aria-label={`Client status ${formatClientStatus(status)}`}
      className={cn(
        "inline-flex min-w-24 justify-center rounded-full border px-3 py-1 text-xs font-semibold",
        statusStyles[status]
      )}
    >
      {formatClientStatus(status)}
    </span>
  );
}

function formatClientStatus(status: ClientStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
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

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}
