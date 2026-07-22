"use client";

import { Copy, DollarSign, Edit, ExternalLink, Package, Plus, Search, Star, Trash2, TrendingUp, Users } from "lucide-react";
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
import { confirmDestructiveAction } from "@/lib/ui/confirm-destructive-action";
import { cn } from "@/lib/utils";

type BillingInterval = "weekly" | "fortnightly" | "monthly" | "annually" | "custom" | "one-time";
type CustomBillingIntervalUnit = "day" | "week" | "month" | "year";
type MetricsPeriod = "monthly" | "quarterly" | "annually";

const metricsPeriodOptions: Array<{ label: string; value: MetricsPeriod }> = [
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Annually", value: "annually" }
];

interface CustomerPeriodMetrics {
  arpu: number;
  grossMarginPercent: number;
  churnRate: number;
  retentionRate: number;
  newCustomers: number;
  endingCustomers: number;
  lostCustomers: number;
  customersAtStart: number;
  revenue: number;
  customerLtv: number;
}

interface ApiPackage {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  billingInterval: BillingInterval;
  customBillingIntervalCount: number | null;
  customBillingIntervalUnit: CustomBillingIntervalUnit | null;
  termWeeks: number | null;
  scheduledPriceAmount: number | null;
  scheduledPriceCurrency: string | null;
  scheduledPriceStartsAt: string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  status: "active" | "archived";
  features: string[];
  color: string | null;
  activeSubscriptions: number;
  projectedMonthlyRevenue: number;
  customerLtv: number;
  ltvCustomerCount: number;
  customerMetrics?: Record<MetricsPeriod, CustomerPeriodMetrics>;
}

interface PackageFormState {
  name: string;
  description: string;
  price: string;
  currency: string;
  billingInterval: BillingInterval;
  customBillingIntervalCount: string;
  customBillingIntervalUnit: CustomBillingIntervalUnit;
  termWeeks: string;
  scheduledPrice: string;
  scheduledPriceCurrency: string;
  scheduledPriceStartsAt: string;
  features: string[];
}

interface AssignableClient {
  id: string;
  name: string;
  packageName: string;
  status: string;
}

function createDefaultFormState(): PackageFormState {
  return {
    name: "",
    description: "",
    price: "",
    currency: "usd",
    billingInterval: "monthly",
    customBillingIntervalCount: "",
    customBillingIntervalUnit: "month",
    termWeeks: "",
    scheduledPrice: "",
    scheduledPriceCurrency: "usd",
    scheduledPriceStartsAt: "",
    features: [""]
  };
}

export function PackagesPage() {
  const [packages, setPackages] = useState<ApiPackage[]>([]);
  const [source, setSource] = useState<"api" | "unavailable">("unavailable");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [formState, setFormState] = useState<PackageFormState>(createDefaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [assigningPackage, setAssigningPackage] = useState<ApiPackage | null>(null);
  const [clients, setClients] = useState<AssignableClient[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [metricsPeriod, setMetricsPeriod] = useState<MetricsPeriod>("monthly");

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

  const stats = useMemo(() => buildPackageStats(packages, metricsPeriod), [packages, metricsPeriod]);
  const filteredClients = useMemo(() => {
    const normalizedSearch = clientSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return clients;
    }

    return clients.filter((client) => client.name.toLowerCase().includes(normalizedSearch));
  }, [clientSearch, clients]);

  function openCreateForm() {
    setEditingPackageId(null);
    setFormState(createDefaultFormState());
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
      const savedPackage = await syncPackageToStripe(responsePayload.data);
      setPackages((currentPackages) =>
        editingPackageId
          ? currentPackages.map((coachingPackage) =>
              coachingPackage.id === savedPackage.id ? savedPackage : coachingPackage
            )
          : [...currentPackages, savedPackage]
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

    if (
      !confirmDestructiveAction({
        action: "archive",
        itemName: coachingPackage.name,
        itemType: "package"
      })
    ) {
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

  async function handleOpenStripeAccount() {
    try {
      const response = await fetch("/api/v1/stripe/connect/dashboard-link", { method: "POST" });
      const payload = (await response.json()) as {
        data?: { dashboardUrl: string };
        error?: { message?: string; details?: { message?: string } };
      };

      if (!response.ok || !payload.data?.dashboardUrl) {
        throw new Error(payload.error?.details?.message ?? payload.error?.message ?? "Stripe account could not be opened.");
      }

      window.open(payload.data.dashboardUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Stripe account could not be opened.");
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

      <section aria-label="Package revenue summary" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Customer metrics</p>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Metrics period">
            {metricsPeriodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition",
                  metricsPeriod === option.value ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
                )}
                onClick={() => setMetricsPeriod(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
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
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">Active Packages</h2>
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
              onOpenStripeAccount={handleOpenStripeAccount}
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

async function syncPackageToStripe(coachingPackage: ApiPackage, options?: { throwOnError?: boolean }) {
  try {
    const response = await fetch(`/api/v1/packages/${coachingPackage.id}/stripe-sync`, { method: "POST" });

    if (!response.ok) {
      throw new Error("Stripe sync API unavailable.");
    }

    const responsePayload = (await response.json()) as { data?: ApiPackage };

    if (!responsePayload.data) {
      throw new Error("Stripe sync API unavailable.");
    }

    return responsePayload.data;
  } catch (error) {
    if (options?.throwOnError) {
      throw error;
    }

    return coachingPackage;
  }
}

function PackageCard({
  coachingPackage,
  onArchive,
  onAssign,
  onDuplicate,
  onEdit,
  onOpenStripeAccount
}: {
  coachingPackage: ApiPackage;
  onArchive: (coachingPackage: ApiPackage) => void;
  onAssign: (coachingPackage: ApiPackage) => void;
  onDuplicate: (coachingPackage: ApiPackage) => void;
  onEdit: (coachingPackage: ApiPackage) => void;
  onOpenStripeAccount: () => void;
}) {
  const isStripeSynced = Boolean(coachingPackage.stripeProductId && coachingPackage.stripePriceId);
  const canAssignPaymentLink = isStripeSynced && coachingPackage.billingInterval !== "one-time";
  const scheduledPrice =
    coachingPackage.scheduledPriceAmount !== null && coachingPackage.scheduledPriceStartsAt
      ? `${formatCents(coachingPackage.scheduledPriceAmount, coachingPackage.scheduledPriceCurrency ?? coachingPackage.currency)} from ${formatDate(coachingPackage.scheduledPriceStartsAt)}`
      : null;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black">{coachingPackage.name}</h3>
            <span className="rounded-full border border-current/20 px-2 py-1 text-xs font-bold">
              {isStripeSynced ? "Synced" : "Needs sync"}
            </span>
          </div>
          <p className="text-sm opacity-80">{coachingPackage.description}</p>
          <p className="mt-2 text-sm font-bold text-slate-700">
            {formatAssignedClients(coachingPackage.activeSubscriptions)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={`Edit ${coachingPackage.name}`}
            className="rounded-lg p-2 transition hover:bg-slate-100"
            onClick={() => onEdit(coachingPackage)}
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Duplicate ${coachingPackage.name}`}
            className="rounded-lg p-2 transition hover:bg-slate-100"
            onClick={() => onDuplicate(coachingPackage)}
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Archive ${coachingPackage.name}`}
            className="rounded-lg p-2 transition hover:bg-slate-100"
            onClick={() => onArchive(coachingPackage)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mb-4 text-4xl font-black">
        {formatCents(coachingPackage.priceAmount, coachingPackage.currency)}
        <span className="text-lg font-normal opacity-70">
          /{formatBillingInterval(coachingPackage)}
        </span>
      </div>
      <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Term</span>
          <span className="font-bold">{coachingPackage.termWeeks ? `${coachingPackage.termWeeks} weeks` : "Ongoing"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Currency</span>
          <span className="font-bold uppercase">{coachingPackage.currency}</span>
        </div>
        {scheduledPrice ? (
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Scheduled change</span>
            <span className="text-right font-bold">{scheduledPrice}</span>
          </div>
        ) : null}
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
      <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
        <div>
          <div className="text-xs opacity-70">Assigned Clients</div>
          <div className="text-2xl font-black">{coachingPackage.activeSubscriptions}</div>
        </div>
        <div>
          <div className="text-xs opacity-70">Revenue</div>
          <div className="text-2xl font-black">{formatCents(coachingPackage.projectedMonthlyRevenue, coachingPackage.currency)}</div>
        </div>
      </div>
      {isStripeSynced ? (
        <button
          type="button"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          onClick={onOpenStripeAccount}
        >
          Open Stripe account
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
      <button
        type="button"
        disabled={!canAssignPaymentLink}
        className="mt-3 w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
        onClick={() => onAssign(coachingPackage)}
      >
        {canAssignPaymentLink ? "Assign to Client" : "Stripe connection required"}
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
              {targetPackage
                ? `${formatCents(targetPackage.priceAmount, targetPackage.currency)} / ${formatBillingInterval(targetPackage)}`
                : "No package selected"}
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
  const updateFeature = (index: number, value: string) => {
    onUpdateForm({
      ...formState,
      features: formState.features.map((feature, currentIndex) => (currentIndex === index ? value : feature))
    });
  };
  const addFeature = () => {
    onUpdateForm({ ...formState, features: [...formState.features, ""] });
  };
  const removeFeature = (index: number) => {
    if (
      !confirmDestructiveAction({
        action: "remove",
        itemName: formState.features[index] || `feature ${index + 1}`,
        itemType: "feature"
      })
    ) {
      return;
    }

    const nextFeatures = formState.features.filter((_, currentIndex) => currentIndex !== index);
    onUpdateForm({ ...formState, features: nextFeatures.length > 0 ? nextFeatures : [""] });
  };

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
              Currency
              <select
                value={formState.currency}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm uppercase"
                onChange={(event) => {
                  const currency = event.target.value;
                  onUpdateForm({ ...formState, currency, scheduledPriceCurrency: currency });
                }}
              >
                <option value="usd">USD</option>
                <option value="aud">AUD</option>
                <option value="gbp">GBP</option>
                <option value="eur">EUR</option>
                <option value="cad">CAD</option>
                <option value="nzd">NZD</option>
              </select>
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
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="annually">Annually</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Package term
              <Input
                type="number"
                min="1"
                step="1"
                value={formState.termWeeks}
                className="mt-1"
                placeholder="Weeks"
                onChange={(event) => onUpdateForm({ ...formState, termWeeks: event.target.value })}
              />
            </label>
          </div>
          {formState.billingInterval === "custom" ? (
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-700">
                Custom interval count
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={formState.customBillingIntervalCount}
                  className="mt-1"
                  onChange={(event) =>
                    onUpdateForm({ ...formState, customBillingIntervalCount: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Custom interval unit
                <select
                  value={formState.customBillingIntervalUnit}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  onChange={(event) =>
                    onUpdateForm({
                      ...formState,
                      customBillingIntervalUnit: event.target.value as CustomBillingIntervalUnit
                    })
                  }
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </label>
            </div>
          ) : null}
          <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <label className="block text-sm font-bold text-slate-700">
              Scheduled price
              <Input
                type="number"
                min="0"
                step="1"
                value={formState.scheduledPrice}
                className="mt-1"
                onChange={(event) => onUpdateForm({ ...formState, scheduledPrice: event.target.value })}
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Scheduled currency
              <select
                value={formState.scheduledPriceCurrency}
                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm uppercase"
                onChange={(event) => onUpdateForm({ ...formState, scheduledPriceCurrency: event.target.value })}
              >
                <option value="usd">USD</option>
                <option value="aud">AUD</option>
                <option value="gbp">GBP</option>
                <option value="eur">EUR</option>
                <option value="cad">CAD</option>
                <option value="nzd">NZD</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Starts on
              <Input
                type="date"
                value={formState.scheduledPriceStartsAt}
                className="mt-1"
                onChange={(event) => onUpdateForm({ ...formState, scheduledPriceStartsAt: event.target.value })}
              />
            </label>
          </div>
          <div>
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
              {formState.features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    aria-label={`Feature ${index + 1}`}
                    value={feature}
                    onChange={(event) => updateFeature(index, event.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={`Remove feature ${index + 1}`}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                    onClick={() => removeFeature(index)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
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

export function buildPackageStats(packages: ApiPackage[], period: MetricsPeriod = "monthly") {
  const totalClients = packages.reduce((sum, coachingPackage) => sum + coachingPackage.activeSubscriptions, 0);
  const periodMetrics = packages.map((coachingPackage) => getPackageCustomerMetrics(coachingPackage, period));
  const customersAtStart = periodMetrics.reduce((sum, metrics) => sum + metrics.customersAtStart, 0);
  const endingCustomers = periodMetrics.reduce((sum, metrics) => sum + metrics.endingCustomers, 0);
  const newCustomers = periodMetrics.reduce((sum, metrics) => sum + metrics.newCustomers, 0);
  const lostCustomers = periodMetrics.reduce((sum, metrics) => sum + metrics.lostCustomers, 0);
  const revenue = periodMetrics.reduce((sum, metrics) => sum + metrics.revenue, 0);
  const grossMarginRate =
    periodMetrics.length > 0
      ? periodMetrics.reduce((sum, metrics) => sum + metrics.grossMarginPercent, 0) / periodMetrics.length / 100
      : 1;
  const churnRate = customersAtStart > 0 ? lostCustomers / customersAtStart : 0;
  const retentionRate = customersAtStart > 0 ? Math.max((endingCustomers - newCustomers) / customersAtStart, 0) : 0;
  const arpu = customersAtStart > 0 ? Math.round(revenue / customersAtStart) : 0;
  const customerLtv = churnRate > 0 ? Math.round((arpu * grossMarginRate) / churnRate) : 0;
  const topPackage = packages.reduce<ApiPackage | null>(
    (currentTop, coachingPackage) =>
      !currentTop || coachingPackage.projectedMonthlyRevenue > currentTop.projectedMonthlyRevenue
        ? coachingPackage
        : currentTop,
    null
  );

  return [
    { label: "Active Subscriptions", value: totalClients, icon: Package },
    { label: "Top Performer", value: topPackage?.name ?? "No packages", icon: Users },
    { label: "Retention Rate", value: formatPercent(retentionRate), icon: TrendingUp },
    { label: "Churn", value: formatPercent(churnRate), icon: TrendingUp },
    { label: "Customer LTV", value: formatCents(customerLtv), icon: DollarSign }
  ];
}

function getPackageCustomerMetrics(coachingPackage: ApiPackage, period: MetricsPeriod): CustomerPeriodMetrics {
  return (
    coachingPackage.customerMetrics?.[period] ?? {
      arpu: coachingPackage.ltvCustomerCount > 0 ? Math.round(coachingPackage.customerLtv / coachingPackage.ltvCustomerCount) : 0,
      grossMarginPercent: 100,
      churnRate: 0,
      retentionRate: coachingPackage.ltvCustomerCount > 0 ? 1 : 0,
      newCustomers: 0,
      endingCustomers: coachingPackage.ltvCustomerCount,
      lostCustomers: 0,
      customersAtStart: coachingPackage.ltvCustomerCount,
      revenue: coachingPackage.customerLtv * coachingPackage.ltvCustomerCount,
      customerLtv: coachingPackage.customerLtv
    }
  );
}

function formatPercent(value: number) {
  return `${(value * 100).toLocaleString("en-US", {
    maximumFractionDigits: 1
  })}%`;
}

export function packageToFormState(coachingPackage: ApiPackage): PackageFormState {
  return {
    name: coachingPackage.name,
    description: coachingPackage.description ?? "",
    price: String(coachingPackage.priceAmount / 100),
    currency: coachingPackage.currency,
    billingInterval: coachingPackage.billingInterval,
    customBillingIntervalCount: coachingPackage.customBillingIntervalCount
      ? String(coachingPackage.customBillingIntervalCount)
      : "",
    customBillingIntervalUnit: coachingPackage.customBillingIntervalUnit ?? "month",
    termWeeks: coachingPackage.termWeeks ? String(coachingPackage.termWeeks) : "",
    scheduledPrice: coachingPackage.scheduledPriceAmount ? String(coachingPackage.scheduledPriceAmount / 100) : "",
    scheduledPriceCurrency: coachingPackage.scheduledPriceCurrency ?? coachingPackage.currency,
    scheduledPriceStartsAt: coachingPackage.scheduledPriceStartsAt
      ? coachingPackage.scheduledPriceStartsAt.slice(0, 10)
      : "",
    features: coachingPackage.features.length > 0 ? coachingPackage.features : [""]
  };
}

export function formStateToPayload(formState: PackageFormState) {
  const price = Number(formState.price);
  const termWeeks = formState.termWeeks ? Number(formState.termWeeks) : undefined;
  const customBillingIntervalCount = formState.customBillingIntervalCount
    ? Number(formState.customBillingIntervalCount)
    : undefined;
  const scheduledPrice = formState.scheduledPrice ? Number(formState.scheduledPrice) : undefined;
  const name = formState.name.trim();
  const hasScheduledPrice = formState.scheduledPrice.trim() || formState.scheduledPriceStartsAt.trim();

  if (
    !name ||
    !Number.isFinite(price) ||
    price < 0 ||
    (termWeeks !== undefined && (!Number.isFinite(termWeeks) || termWeeks < 1)) ||
    (customBillingIntervalCount !== undefined &&
      (!Number.isFinite(customBillingIntervalCount) || customBillingIntervalCount < 1)) ||
    (formState.billingInterval === "custom" && customBillingIntervalCount === undefined) ||
    (scheduledPrice !== undefined && (!Number.isFinite(scheduledPrice) || scheduledPrice < 0)) ||
    (Boolean(hasScheduledPrice) && (scheduledPrice === undefined || !formState.scheduledPriceStartsAt))
  ) {
    return null;
  }

  return {
    name,
    description: formState.description.trim() || undefined,
    priceAmount: Math.round(price * 100),
    currency: formState.currency,
    billingInterval: formState.billingInterval,
    customBillingIntervalCount:
      formState.billingInterval === "custom" ? Math.round(customBillingIntervalCount ?? 0) : undefined,
    customBillingIntervalUnit:
      formState.billingInterval === "custom" ? formState.customBillingIntervalUnit : undefined,
    termWeeks: termWeeks !== undefined ? Math.round(termWeeks) : undefined,
    scheduledPriceAmount: scheduledPrice !== undefined ? Math.round(scheduledPrice * 100) : undefined,
    scheduledPriceCurrency: scheduledPrice !== undefined ? formState.scheduledPriceCurrency : undefined,
    scheduledPriceStartsAt: formState.scheduledPriceStartsAt
      ? new Date(`${formState.scheduledPriceStartsAt}T00:00:00.000Z`).toISOString()
      : undefined,
    features: formState.features
      .map((feature) => feature.trim())
      .filter(Boolean)
  };
}

export function formatCents(amount: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2
  }).format(amount / 100);
}

function formatBillingInterval(coachingPackage: ApiPackage) {
  if (coachingPackage.billingInterval === "weekly") {
    return "week";
  }

  if (coachingPackage.billingInterval === "fortnightly") {
    return "fortnight";
  }

  if (coachingPackage.billingInterval === "monthly") {
    return "month";
  }

  if (coachingPackage.billingInterval === "annually") {
    return "year";
  }

  if (coachingPackage.billingInterval === "custom") {
    return `${coachingPackage.customBillingIntervalCount ?? 1} ${coachingPackage.customBillingIntervalUnit ?? "month"}${
      (coachingPackage.customBillingIntervalCount ?? 1) === 1 ? "" : "s"
    }`;
  }

  return "once";
}

function formatAssignedClients(count: number) {
  return `${count} ${count === 1 ? "client" : "clients"} assigned`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}
