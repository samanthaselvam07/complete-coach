"use client";

import { Copy, DollarSign, Edit, ExternalLink, Package, Search, Star, Trash2, TrendingUp, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BillingInterval = "monthly" | "one-time";

interface ApiPackage {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  billingInterval: BillingInterval;
  stripeProductId: string | null;
  stripePriceId: string | null;
  status: "active" | "archived";
  features: string[];
  color: string | null;
  activeSubscriptions: number;
  projectedMonthlyRevenue: number;
}

interface PackageFormState {
  name: string;
  description: string;
  price: string;
  billingInterval: BillingInterval;
  features: string;
  color: string;
}

interface AssignableClient {
  id: string;
  name: string;
  packageName: string;
  status: string;
}

const defaultFormState: PackageFormState = {
  name: "",
  description: "",
  price: "",
  billingInterval: "monthly",
  features: "",
  color: "indigo"
};

const colorClasses = {
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  yellow: "border-yellow-200 bg-yellow-50 text-yellow-700",
  gray: "border-slate-200 bg-slate-50 text-slate-700",
  purple: "border-purple-200 bg-purple-50 text-purple-700"
};

export function PackagesPage() {
  const [packages, setPackages] = useState<ApiPackage[]>([]);
  const [source, setSource] = useState<"api" | "unavailable">("unavailable");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [formState, setFormState] = useState<PackageFormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [assigningPackage, setAssigningPackage] = useState<ApiPackage | null>(null);
  const [clients, setClients] = useState<AssignableClient[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadPackages() {
      const loadedPackages = await fetchPackages();

      if (!isActive) {
        return;
      }

      if (loadedPackages) {
        setSource("api");
        setPackages(loadedPackages);
      } else {
        setSource("unavailable");
        setPackages([]);
      }
    }

    void loadPackages();

    return () => {
      isActive = false;
    };
  }, []);

  const stats = useMemo(() => buildPackageStats(packages), [packages]);
  const editingPackage = editingPackageId ? packages.find((coachingPackage) => coachingPackage.id === editingPackageId) : null;
  const filteredClients = useMemo(() => {
    const normalizedSearch = clientSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return clients;
    }

    return clients.filter((client) => client.name.toLowerCase().includes(normalizedSearch));
  }, [clientSearch, clients]);

  function openCreateForm() {
    setEditingPackageId(null);
    setFormState(defaultFormState);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(coachingPackage: ApiPackage) {
    setEditingPackageId(coachingPackage.id);
    setFormState(packageToFormState(coachingPackage));
    setFormError(null);
    setFormOpen(true);
  }

  function openDuplicateForm(coachingPackage: ApiPackage) {
    setEditingPackageId(null);
    setFormState({
      ...packageToFormState(coachingPackage),
      name: `${coachingPackage.name} Copy`
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSavePackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = formStateToPayload(formState);

    if (!payload) {
      setFormError("Enter a package name and a valid price.");
      return;
    }

    if (source !== "api") {
      setFormError("Package could not be saved because the package API is unavailable.");
      return;
    }

    try {
      const response = await fetch(editingPackageId ? `/api/v1/packages/${editingPackageId}` : "/api/v1/packages", {
        method: editingPackageId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Package persistence API unavailable.");
      }

      const responsePayload = (await response.json()) as { data: ApiPackage };
      setPackages((currentPackages) =>
        editingPackageId
          ? currentPackages.map((coachingPackage) =>
              coachingPackage.id === responsePayload.data.id ? responsePayload.data : coachingPackage
            )
          : [...currentPackages, responsePayload.data]
      );
      setFormOpen(false);
    } catch {
      setFormError("Package could not be saved. Try again.");
    }
  }

  async function handleArchivePackage(coachingPackage: ApiPackage) {
    if (source !== "api") {
      setFormError("Package could not be archived because the package API is unavailable.");
      return;
    }

    try {
      const response = await fetch(`/api/v1/packages/${coachingPackage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" })
      });

      if (!response.ok) {
        throw new Error("Package archive API unavailable.");
      }

      setPackages((currentPackages) => currentPackages.filter((currentPackage) => currentPackage.id !== coachingPackage.id));
    } catch {
      setFormError("Package could not be archived. Try again.");
    }
  }

  async function handleStripeSync(coachingPackage: ApiPackage) {
    if (source !== "api") {
      return;
    }

    try {
      const response = await fetch(`/api/v1/packages/${coachingPackage.id}/stripe-sync`, { method: "POST" });

      if (!response.ok) {
        throw new Error("Stripe sync API unavailable.");
      }

      const responsePayload = (await response.json()) as { data: ApiPackage };
      setPackages((currentPackages) =>
        currentPackages.map((currentPackage) =>
          currentPackage.id === responsePayload.data.id ? responsePayload.data : currentPackage
        )
      );
    } catch {
      setFormError("Stripe sync could not be started. Check Connect setup and try again.");
    }
  }

  async function openAssignForm(coachingPackage: ApiPackage) {
    setAssigningPackage(coachingPackage);
    setClientSearch("");
    setSelectedClientId(null);
    setAssignmentError(null);
    setCheckoutUrl(null);
    setIsLoadingClients(true);

    try {
      const response = await fetch("/api/v1/clients?status=active&limit=100");

      if (!response.ok) {
        throw new Error("Client API unavailable.");
      }

      const payload = (await response.json()) as { data?: AssignableClient[] };
      setClients(payload.data ?? []);
    } catch {
      setClients([]);
      setAssignmentError("Client roster could not be loaded. Try again.");
    } finally {
      setIsLoadingClients(false);
    }
  }

  async function handleCreateCheckoutLink() {
    if (!assigningPackage || !selectedClientId) {
      setAssignmentError("Select a client before creating a payment link.");
      return;
    }

    setIsCreatingCheckout(true);
    setAssignmentError(null);

    try {
      const origin = window.location.origin;
      const response = await fetch("/api/v1/client-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          packageId: assigningPackage.id,
          successUrl: `${origin}/packages?payment=success`,
          cancelUrl: `${origin}/packages?payment=cancelled`
        })
      });
      const payload = (await response.json()) as {
        data?: { checkoutUrl: string };
        error?: { message: string };
      };

      if (!response.ok || !payload.data?.checkoutUrl) {
        throw new Error(payload.error?.message ?? "Could not create payment link.");
      }

      setCheckoutUrl(payload.data.checkoutUrl);
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : "Could not create payment link.");
    } finally {
      setIsCreatingCheckout(false);
    }
  }

  return (
    <main className="min-h-screen space-y-8 bg-gray-50 p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-950">Package Ecosystem</h1>
          <p className="text-base text-slate-600">Design and deploy premium coaching protocols for your roster.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
          onClick={openCreateForm}
        >
          <Package className="h-4 w-4" aria-hidden="true" />
          Create New Package
        </button>
      </header>

      <section aria-label="Package revenue summary" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
                <span>{stat.label}</span>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-3xl font-black">{stat.value}</div>
            </article>
          );
        })}
      </section>

      <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
        <div className="relative min-h-72 bg-gradient-to-br from-slate-300 via-slate-200 to-slate-500">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgba(255,255,255,0.5),transparent_25%),linear-gradient(120deg,rgba(15,23,42,0.05),rgba(15,23,42,0.65))]" />
          <div className="absolute bottom-7 left-7 text-white">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-200">Elite Prep - 38 enrolled</p>
            <h2 className="text-3xl font-black">Elite Hypertrophy</h2>
          </div>
        </div>
        <div className="p-7">
          <p className="mb-6 text-sm leading-6 text-slate-700">
            Our flagship 16-week muscle-building protocol featuring daily check-ins and advanced biomarker analysis.
          </p>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <span className="text-4xl font-black">$499<span className="text-base font-medium text-slate-500">/mo</span></span>
            <span className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">16 Weeks</span>
            <span className="text-sm text-slate-600">+35 clients enrolled</span>
          </div>
          <div className="mb-4 rounded-2xl border border-slate-200 bg-gray-50 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Contest Prep</p>
            <div className="mt-2 grid gap-1 text-sm font-bold text-slate-800">
              <span>Price $1,200</span>
              <span>Term 24 Weeks</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white"
              onClick={() => {
                const firstMonthlySyncedPackage = packages.find(
                  (coachingPackage) =>
                    coachingPackage.billingInterval === "monthly" &&
                    Boolean(coachingPackage.stripeProductId && coachingPackage.stripePriceId)
                );

                if (firstMonthlySyncedPackage) {
                  void openAssignForm(firstMonthlySyncedPackage);
                } else {
                  setFormError("Sync a monthly package to Stripe before assigning a payment link.");
                }
              }}
            >
              Assign to Client
            </button>
            <button type="button" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
              Edit Details
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">Active Inventory</h2>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Sort by Newest First</p>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {packages.map((coachingPackage) => (
            <PackageCard
              key={coachingPackage.id}
              coachingPackage={coachingPackage}
              onArchive={handleArchivePackage}
              onDuplicate={openDuplicateForm}
              onEdit={openEditForm}
              onAssign={openAssignForm}
              onStripeSync={handleStripeSync}
            />
          ))}
        </div>
      </section>

      <PackageDialog
        error={formError}
        formState={formState}
        mode={editingPackageId ? "edit" : "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSavePackage}
        onUpdateForm={setFormState}
      />
      <PackageAssignmentDialog
        checkoutUrl={checkoutUrl}
        clients={filteredClients}
        error={assignmentError}
        isCreatingCheckout={isCreatingCheckout}
        isLoadingClients={isLoadingClients}
        open={Boolean(assigningPackage)}
        selectedClientId={selectedClientId}
        targetPackage={assigningPackage}
        search={clientSearch}
        onCreateCheckoutLink={handleCreateCheckoutLink}
        onOpenChange={(open) => {
          if (!open) {
            setAssigningPackage(null);
            setCheckoutUrl(null);
            setAssignmentError(null);
          }
        }}
        onSearchChange={setClientSearch}
        onSelectClient={setSelectedClientId}
      />
    </main>
  );
}

function PackageCard({
  coachingPackage,
  onArchive,
  onAssign,
  onDuplicate,
  onEdit,
  onStripeSync
}: {
  coachingPackage: ApiPackage;
  onArchive: (coachingPackage: ApiPackage) => void;
  onAssign: (coachingPackage: ApiPackage) => void;
  onDuplicate: (coachingPackage: ApiPackage) => void;
  onEdit: (coachingPackage: ApiPackage) => void;
  onStripeSync: (coachingPackage: ApiPackage) => void;
}) {
  const colorClass = colorClasses[(coachingPackage.color ?? "gray") as keyof typeof colorClasses] ?? colorClasses.gray;
  const isStripeSynced = Boolean(coachingPackage.stripeProductId && coachingPackage.stripePriceId);
  const canAssignPaymentLink = isStripeSynced && coachingPackage.billingInterval === "monthly";

  return (
    <article className={cn("rounded-2xl border-2 p-6 shadow-sm", colorClass)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black">{coachingPackage.name}</h3>
            <span className="rounded-full border border-current/20 px-2 py-1 text-xs font-bold">
              {isStripeSynced ? "Synced" : "Needs sync"}
            </span>
          </div>
          <p className="text-sm opacity-80">{coachingPackage.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={`Edit ${coachingPackage.name}`}
            className="rounded-lg p-2 transition hover:bg-white/50"
            onClick={() => onEdit(coachingPackage)}
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Duplicate ${coachingPackage.name}`}
            className="rounded-lg p-2 transition hover:bg-white/50"
            onClick={() => onDuplicate(coachingPackage)}
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Archive ${coachingPackage.name}`}
            className="rounded-lg p-2 transition hover:bg-white/50"
            onClick={() => onArchive(coachingPackage)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mb-4 text-4xl font-black">
        {formatCents(coachingPackage.priceAmount)}
        <span className="text-lg font-normal opacity-70">
          /{coachingPackage.billingInterval === "monthly" ? "mo" : "once"}
        </span>
      </div>
      <div className="mb-4">
        <h4 className="mb-2 text-xs font-black uppercase tracking-wide opacity-70">Features</h4>
        <ul className="space-y-1.5">
          {coachingPackage.features.map((feature) => (
            <li key={feature} className="flex gap-2 text-sm">
              <Star className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-current/20 pt-4">
        <div>
          <div className="text-xs opacity-70">Active Clients</div>
          <div className="text-2xl font-black">{coachingPackage.activeSubscriptions}</div>
        </div>
        <div>
          <div className="text-xs opacity-70">Revenue</div>
          <div className="text-2xl font-black">{formatCents(coachingPackage.projectedMonthlyRevenue)}</div>
        </div>
      </div>
      {!isStripeSynced ? (
        <button
          type="button"
          className="mt-5 rounded-lg border border-current/30 px-3 py-2 text-sm font-bold transition hover:bg-white/50"
          onClick={() => onStripeSync(coachingPackage)}
        >
          Sync Stripe
        </button>
      ) : null}
      <button
        type="button"
        disabled={!canAssignPaymentLink}
        className="mt-3 w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
        onClick={() => onAssign(coachingPackage)}
      >
        {canAssignPaymentLink ? "Assign to Client" : "Sync monthly package to assign"}
      </button>
    </article>
  );
}

function PackageAssignmentDialog({
  checkoutUrl,
  clients,
  error,
  isCreatingCheckout,
  isLoadingClients,
  open,
  selectedClientId,
  targetPackage,
  search,
  onCreateCheckoutLink,
  onOpenChange,
  onSearchChange,
  onSelectClient
}: {
  checkoutUrl: string | null;
  clients: AssignableClient[];
  error: string | null;
  isCreatingCheckout: boolean;
  isLoadingClients: boolean;
  open: boolean;
  selectedClientId: string | null;
  targetPackage: ApiPackage | null;
  search: string;
  onCreateCheckoutLink: () => void;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelectClient: (clientId: string) => void;
}) {
  const selectedClient = clients.find((client) => client.id === selectedClientId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Package Payment</DialogTitle>
          <DialogDescription>
            Create a Stripe Checkout link for {targetPackage?.name ?? "this package"} and attach the subscription to a client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Selected package</p>
            <p className="mt-1 text-lg font-black text-slate-950">{targetPackage?.name}</p>
            <p className="mt-1 text-sm text-slate-600">
              {targetPackage ? `${formatCents(targetPackage.priceAmount)} / month` : "No package selected"}
            </p>
          </div>

          <label className="block text-sm font-bold text-slate-700">
            Search client roster
            <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                value={search}
                placeholder="Search active clients..."
                className="w-full bg-transparent text-sm outline-none"
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </span>
          </label>

          <div className="max-h-56 space-y-2 overflow-auto rounded-xl border border-slate-200 p-2">
            {isLoadingClients ? <p className="p-3 text-sm text-slate-500">Loading clients...</p> : null}
            {!isLoadingClients && clients.length === 0 ? (
              <p className="p-3 text-sm text-slate-500">No active clients found.</p>
            ) : null}
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition",
                  selectedClientId === client.id ? "bg-indigo-600 text-white" : "hover:bg-slate-50"
                )}
                onClick={() => onSelectClient(client.id)}
              >
                <span>
                  <span className="block text-sm font-bold">{client.name}</span>
                  <span className={cn("text-xs", selectedClientId === client.id ? "text-indigo-100" : "text-slate-500")}>
                    {client.packageName}
                  </span>
                </span>
                <span className="text-xs font-bold uppercase">{client.status}</span>
              </button>
            ))}
          </div>

          {selectedClient ? (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              Payment link will be created for <span className="font-bold text-slate-950">{selectedClient.name}</span>.
            </p>
          ) : null}

          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

          {checkoutUrl ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-green-800">Payment link created.</p>
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white"
              >
                Open Checkout
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
          <button
            type="button"
            disabled={!selectedClientId || isCreatingCheckout}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
            onClick={onCreateCheckoutLink}
          >
            {isCreatingCheckout ? "Creating link..." : "Create payment link"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PackageDialog({
  error,
  formState,
  mode,
  open,
  onOpenChange,
  onSave,
  onUpdateForm
}: {
  error: string | null;
  formState: PackageFormState;
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateForm: (formState: PackageFormState) => void;
}) {
  const title = mode === "create" ? "Create Package" : "Edit Package";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Package details are saved to the active organization.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSave}>
          <label className="block text-sm font-bold text-slate-700">
            Package Name
            <Input
              value={formState.name}
              className="mt-1"
              onChange={(event) => onUpdateForm({ ...formState, name: event.target.value })}
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Description
            <textarea
              value={formState.description}
              className="mt-1 min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => onUpdateForm({ ...formState, description: event.target.value })}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">
              Price
              <Input
                type="number"
                min="0"
                step="1"
                value={formState.price}
                className="mt-1"
                onChange={(event) => onUpdateForm({ ...formState, price: event.target.value })}
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Billing
              <select
                value={formState.billingInterval}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                onChange={(event) =>
                  onUpdateForm({ ...formState, billingInterval: event.target.value as BillingInterval })
                }
              >
                <option value="monthly">Monthly</option>
                <option value="one-time">One-time</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-bold text-slate-700">
            Features
            <textarea
              value={formState.features}
              className="mt-1 min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => onUpdateForm({ ...formState, features: event.target.value })}
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Color
            <select
              value={formState.color}
              className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              onChange={(event) => onUpdateForm({ ...formState, color: event.target.value })}
            >
              <option value="indigo">Indigo</option>
              <option value="yellow">Yellow</option>
              <option value="gray">Gray</option>
              <option value="purple">Purple</option>
            </select>
          </label>
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
          <DialogFooter>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
              Save Package
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

async function fetchPackages() {
  try {
    const response = await fetch("/api/v1/packages?status=active&limit=100");

    if (!response.ok) {
      throw new Error("Packages API unavailable.");
    }

    const payload = (await response.json()) as { data: ApiPackage[] };
    return payload.data;
  } catch {
    return null;
  }
}

function buildPackageStats(packages: ApiPackage[]) {
  const totalRevenue = packages.reduce((sum, coachingPackage) => sum + coachingPackage.projectedMonthlyRevenue, 0);
  const totalClients = packages.reduce((sum, coachingPackage) => sum + coachingPackage.activeSubscriptions, 0);
  const topPackage = packages.reduce<ApiPackage | null>(
    (currentTop, coachingPackage) =>
      !currentTop || coachingPackage.projectedMonthlyRevenue > currentTop.projectedMonthlyRevenue
        ? coachingPackage
        : currentTop,
    null
  );

  return [
    { label: "Active Subscriptions", value: totalClients, icon: Package },
    { label: "Portfolio Value", value: formatCents(totalRevenue), icon: DollarSign },
    { label: "Top Performer", value: topPackage?.name ?? "No packages", icon: Users },
    { label: "Retention Rate", value: "94%", icon: TrendingUp }
  ];
}

function packageToFormState(coachingPackage: ApiPackage): PackageFormState {
  return {
    name: coachingPackage.name,
    description: coachingPackage.description ?? "",
    price: String(coachingPackage.priceAmount / 100),
    billingInterval: coachingPackage.billingInterval,
    features: coachingPackage.features.join("\n"),
    color: coachingPackage.color ?? "indigo"
  };
}

function formStateToPayload(formState: PackageFormState) {
  const price = Number(formState.price);
  const name = formState.name.trim();

  if (!name || !Number.isFinite(price) || price < 0) {
    return null;
  }

  return {
    name,
    description: formState.description.trim() || undefined,
    priceAmount: Math.round(price * 100),
    currency: "usd",
    billingInterval: formState.billingInterval,
    features: formState.features
      .split("\n")
      .map((feature) => feature.trim())
      .filter(Boolean),
    color: formState.color || undefined
  };
}

function formatCents(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2
  }).format(amount / 100);
}
