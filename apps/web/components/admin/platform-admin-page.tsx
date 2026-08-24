"use client";

import { Building2, CreditCard, Eye, Plus, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

interface AdminSubscription {
  id: string;
  clientId: string;
  packageId: string;
  status: string;
  clientName: string;
  clientEmail: string | null;
  packageName: string;
  priceAmount: number;
  currency: string;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
}

interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
  stripeConnectStatus: string | null;
  owner: {
    name: string | null;
    email: string | null;
  } | null;
  counts: {
    clients: number;
    teamMembers: number;
    packages: number;
    subscriptions: number;
    activeSubscriptions: number;
  };
  billing: {
    platform: {
      planId: string | null;
      planName: string;
      status: string;
      active: boolean;
      stripeCustomerIdPresent: boolean;
      stripeSubscriptionId: string | null;
      currentPeriodStart: string | null;
      currentPeriodEnd: string | null;
      cancelAt: string | null;
    };
    monthlyRevenueCents: number;
    currency: string;
    subscriptions: AdminSubscription[];
  };
  createdAt: string;
  updatedAt: string;
}

interface AdminOverview {
  metrics: {
    totalOrganizations: number;
    activeOrganizations: number;
    activeSubscriptions: number;
    trialSubscriptions: number;
    pastDueSubscriptions: number;
    canceledSubscriptions: number;
    monthlyRecurringRevenueCents: number;
    totalClients: number;
  };
  organizations: AdminOrganization[];
}

interface AdminOrganizationDetail extends AdminOrganization {
  deletedAt: string | null;
  stripeConnect: {
    status: string | null;
    accountIdPresent: boolean;
  };
  team: Array<{
    role: string;
    status: string;
    name: string | null;
    email: string | null;
  }>;
  clients: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    packageName: string | null;
    compliance: number;
    timezone: string;
    startDate: string | null;
    latestCheckInAt: string | null;
    createdAt: string;
    primaryCoach: {
      name: string | null;
      email: string | null;
    } | null;
  }>;
  packages: Array<{
    id: string;
    name: string;
    description: string | null;
    priceAmount: number;
    currency: string;
    billingInterval: string;
    status: string;
    stripeProductIdPresent: boolean;
    stripePriceIdPresent: boolean;
    subscriptions: number;
    createdAt: string;
    updatedAt: string;
    createdBy: {
      name: string | null;
      email: string | null;
    } | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    createdAt: string;
    actor: {
      name: string | null;
      email: string | null;
    } | null;
  }>;
}

interface PlatformPlanOption {
  id: string;
  name: string;
  stripeProductId: string;
  stripePriceId: string;
  coachSeatLimit: number;
  clientLimit: number | null;
}

const emptyOrganizationForm = {
  name: "",
  slug: "",
  ownerName: "",
  ownerEmail: "",
  timezone: "Australia/Melbourne"
};

const availableTimezones = getAvailableTimezones();

export function PlatformAdminPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [organizationForm, setOrganizationForm] = useState(emptyOrganizationForm);
  const [savingOrganization, setSavingOrganization] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [organizationDetail, setOrganizationDetail] = useState<AdminOrganizationDetail | null>(null);
  const [loadingOrganizationDetail, setLoadingOrganizationDetail] = useState(false);
  const [deletingOrganizationId, setDeletingOrganizationId] = useState<string | null>(null);
  const [selectedPlatformPlanId, setSelectedPlatformPlanId] = useState("");
  const [platformPlanOptions, setPlatformPlanOptions] = useState<PlatformPlanOption[]>([]);
  const [loadingPlatformPlans, setLoadingPlatformPlans] = useState(false);
  const [syncingPlatformSubscription, setSyncingPlatformSubscription] = useState(false);

  const filteredOrganizations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!overview || !query) {
      return overview?.organizations ?? [];
    }

    return overview.organizations.filter((organization) =>
      [organization.name, organization.slug, organization.owner?.email ?? "", organization.owner?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [overview, searchQuery]);

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    if (!selectedOrganizationId) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedOrganizationId]);

  async function loadOverview() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/admin/overview");
      const payload = (await response.json()) as { data?: AdminOverview; error?: { message?: string } };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Admin overview could not be loaded.");
      }

      setOverview(payload.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Admin overview could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function createOrganization() {
    setSavingOrganization(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(organizationForm)
      });
      const payload = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Organization could not be created.");
      }

      setOrganizationForm(emptyOrganizationForm);
      setStatusMessage("Organization created with an invited owner membership.");
      await loadOverview();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Organization could not be created.");
    } finally {
      setSavingOrganization(false);
    }
  }

  async function loadOrganizationDetail(organizationId: string) {
    setSelectedOrganizationId(organizationId);
    setOrganizationDetail(null);
    setLoadingOrganizationDetail(true);
    setPlatformPlanOptions([]);
    setSelectedPlatformPlanId("");
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/organizations/${organizationId}`);
      const payload = (await response.json()) as {
        data?: AdminOrganizationDetail;
        error?: { message?: string };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Organization details could not be loaded.");
      }

      setOrganizationDetail(payload.data);
      setSelectedPlatformPlanId(payload.data.billing.platform.planId ?? "");
      void loadPlatformPlanOptions(organizationId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Organization details could not be loaded.");
    } finally {
      setLoadingOrganizationDetail(false);
    }
  }

  async function loadPlatformPlanOptions(organizationId: string) {
    setLoadingPlatformPlans(true);

    try {
      const response = await fetch(`/api/v1/admin/organizations/${organizationId}/platform-subscription`);
      const payload = (await response.json()) as {
        data?: { plans: PlatformPlanOption[] };
        error?: { message?: string };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Platform packages could not be loaded.");
      }

      setPlatformPlanOptions(payload.data.plans);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Platform packages could not be loaded.");
    } finally {
      setLoadingPlatformPlans(false);
    }
  }

  async function syncPlatformSubscription(organizationId: string) {
    setSyncingPlatformSubscription(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/organizations/${organizationId}/platform-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlatformPlanId })
      });
      const payload = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Platform subscription could not be synced.");
      }

      setStatusMessage("Complete Coach package assigned from active Stripe billing.");
      await loadOverview();
      await loadOrganizationDetail(organizationId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Platform subscription could not be synced.");
    } finally {
      setSyncingPlatformSubscription(false);
    }
  }

  async function deleteOrganization(organizationId: string) {
    const organizationName = organizationDetail?.name ?? "this organization";
    const confirmed = window.confirm(
      `Archive ${organizationName}? This removes it from the active admin list without permanently deleting its records.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingOrganizationId(organizationId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/organizations/${organizationId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Organization could not be archived.");
      }

      setSelectedOrganizationId(null);
      setOrganizationDetail(null);
      setStatusMessage(`${organizationName} has been archived.`);
      await loadOverview();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Organization could not be archived.");
    } finally {
      setDeletingOrganizationId(null);
    }
  }

  const metrics = overview?.metrics;

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Platform Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Complete Coach Admin</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Monitor organizations, billing status, client usage, and owner-created accounts from one internal console.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          onClick={() => void loadOverview()}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {statusMessage ? (
        <p role="status" className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {statusMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Organizations" value={metrics?.totalOrganizations ?? 0} detail={`${metrics?.activeOrganizations ?? 0} active`} />
        <MetricCard label="Active Plans" value={metrics?.activeSubscriptions ?? 0} detail={`${metrics?.trialSubscriptions ?? 0} trials`} />
        <MetricCard label="Billing Alerts" value={metrics?.pastDueSubscriptions ?? 0} detail={`${metrics?.canceledSubscriptions ?? 0} canceled plans`} />
        <MetricCard label="Total Clients" value={metrics?.totalClients ?? 0} detail="Across all organizations" />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Organizations</h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading ? "Loading organizations..." : `${filteredOrganizations.length} organizations shown`}
              </p>
            </div>
            <label className="relative block md:w-80">
              <span className="sr-only">Search organizations</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={searchQuery}
                placeholder="Search org, owner, email..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Organization</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Usage</th>
                  <th className="px-5 py-3">Billing</th>
                  <th className="px-5 py-3">Complete Coach Stripe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrganizations.map((organization) => (
                  <tr key={organization.id} className="align-top">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Building2 className="size-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="font-black text-slate-950">{organization.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{organization.slug}</p>
                          <StatusPill status={organization.status} />
                          <button
                            type="button"
                            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-100"
                            onClick={() => void loadOrganizationDetail(organization.id)}
                          >
                            <Eye className="size-3.5" aria-hidden="true" />
                            View details
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{organization.owner?.name ?? "No owner"}</p>
                      <p className="mt-1 text-xs text-slate-500">{organization.owner?.email ?? "Owner missing"}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <p>{organization.counts.clients} clients</p>
                      <p>{organization.counts.teamMembers} team members</p>
                      <p>{organization.counts.packages} packages</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">{organization.billing.platform.planName}</p>
                      <StatusPill status={organization.billing.platform.status} />
                      <p className="mt-1 text-xs text-slate-500">
                        {organization.billing.platform.currentPeriodEnd
                          ? `Renews ${formatDate(organization.billing.platform.currentPeriodEnd)}`
                          : "No active billing period"}
                      </p>
                    </td>
                    <td className="min-w-[22rem] px-5 py-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Stripe subscription</p>
                        <p className="mt-2 font-mono text-xs font-bold text-slate-700">
                          {organization.billing.platform.stripeSubscriptionId ?? "Not linked"}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Customer {organization.billing.platform.stripeCustomerIdPresent ? "linked" : "not linked"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Plus className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Add Organization</h2>
              <p className="text-xs text-slate-500">Creates an org with an invited owner membership.</p>
            </div>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void createOrganization();
            }}
          >
            <AdminInput label="Organization name" value={organizationForm.name} onChange={(value) => setOrganizationForm((form) => ({ ...form, name: value }))} />
            <AdminInput label="Slug" value={organizationForm.slug} placeholder="coach-business" onChange={(value) => setOrganizationForm((form) => ({ ...form, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} />
            <AdminInput label="Owner name" value={organizationForm.ownerName} onChange={(value) => setOrganizationForm((form) => ({ ...form, ownerName: value }))} />
            <AdminInput label="Owner email" type="email" value={organizationForm.ownerEmail} onChange={(value) => setOrganizationForm((form) => ({ ...form, ownerEmail: value }))} />
            <AdminSelect
              label="Timezone"
              value={organizationForm.timezone}
              options={availableTimezones}
              onChange={(value) => setOrganizationForm((form) => ({ ...form, timezone: value }))}
            />
            <button
              type="submit"
              disabled={savingOrganization}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingOrganization ? "Creating..." : "Create organization"}
            </button>
          </form>
        </section>
      </section>
      <OrganizationDetailModal
        detail={organizationDetail}
        loading={loadingOrganizationDetail}
        open={Boolean(selectedOrganizationId)}
        onClose={() => {
          setSelectedOrganizationId(null);
          setOrganizationDetail(null);
          setPlatformPlanOptions([]);
          setSelectedPlatformPlanId("");
        }}
        onDelete={deleteOrganization}
        deleting={Boolean(organizationDetail && deletingOrganizationId === organizationDetail.id)}
        selectedPlatformPlanId={selectedPlatformPlanId}
        onSelectedPlatformPlanIdChange={setSelectedPlatformPlanId}
        platformPlanOptions={platformPlanOptions}
        loadingPlatformPlans={loadingPlatformPlans}
        onSyncPlatformSubscription={syncPlatformSubscription}
        syncingPlatformSubscription={syncingPlatformSubscription}
      />
    </main>
  );
}

function OrganizationDetailModal({
  detail,
  loading,
  open,
  onClose,
  onDelete,
  deleting,
  selectedPlatformPlanId,
  onSelectedPlatformPlanIdChange,
  platformPlanOptions,
  loadingPlatformPlans,
  onSyncPlatformSubscription,
  syncingPlatformSubscription
}: {
  detail: AdminOrganizationDetail | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onDelete: (organizationId: string) => Promise<void>;
  deleting: boolean;
  selectedPlatformPlanId: string;
  onSelectedPlatformPlanIdChange: (value: string) => void;
  platformPlanOptions: PlatformPlanOption[];
  loadingPlatformPlans: boolean;
  onSyncPlatformSubscription: (organizationId: string) => Promise<void>;
  syncingPlatformSubscription: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="organization-detail-title"
      onClick={onClose}
    >
      <section
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-indigo-600">Organization Detail</p>
            <h2 id="organization-detail-title" className="mt-2 text-xl font-black text-slate-950">
              {detail?.name ?? "Loading organization..."}
            </h2>
            {detail ? <p className="mt-1 text-xs text-slate-500">{detail.slug}</p> : null}
            {detail ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusPill status={detail.status} />
                <StatusPill status={detail.stripeConnect.status ?? "stripe not connected"} />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Close organization details"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading || !detail ? (
            <p className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-600">
              Loading organization details...
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-5">
                <DetailMetricGrid detail={detail} />

                <DetailSection title="Owner">
                  <p className="font-bold text-slate-900">{detail.owner?.name ?? "No owner recorded"}</p>
                  <p className="mt-1 text-xs text-slate-500">{detail.owner?.email ?? "Owner email missing"}</p>
                  <p className="mt-2 text-xs text-slate-500">Timezone: {detail.timezone}</p>
                  <p className="text-xs text-slate-500">Created: {formatDate(detail.createdAt)}</p>
                </DetailSection>

                <DetailSection title="Team">
                  <div className="space-y-2">
                    {detail.team.map((member) => (
                      <CompactRow
                        key={`${member.email}-${member.role}`}
                        title={member.name ?? member.email ?? "Unnamed member"}
                        detail={`${member.role} · ${member.status}`}
                        meta={member.email ?? undefined}
                      />
                    ))}
                  </div>
                </DetailSection>

                <DetailSection title="Recent Clients">
                  <div className="space-y-2">
                    {detail.clients.length > 0 ? (
                      detail.clients.map((client) => (
                        <CompactRow
                          key={client.id}
                          title={client.name}
                          detail={`${client.status} · ${client.packageName ?? "No package"} · ${client.compliance}% compliance`}
                          meta={client.latestCheckInAt ? `Latest check-in ${formatDate(client.latestCheckInAt)}` : client.email ?? undefined}
                        />
                      ))
                    ) : (
                      <EmptyDetailText>No clients recorded.</EmptyDetailText>
                    )}
                  </div>
                </DetailSection>
              </div>

              <div className="space-y-5">
                <PlatformBillingPanel
                  detail={detail}
                  selectedPlatformPlanId={selectedPlatformPlanId}
                  onSelectedPlatformPlanIdChange={onSelectedPlatformPlanIdChange}
                  platformPlanOptions={platformPlanOptions}
                  loadingPlatformPlans={loadingPlatformPlans}
                  onSyncPlatformSubscription={onSyncPlatformSubscription}
                  syncingPlatformSubscription={syncingPlatformSubscription}
                />

                <DetailSection title="Packages">
                  <div className="space-y-2">
                    {detail.packages.length > 0 ? (
                      detail.packages.map((coachingPackage) => (
                        <CompactRow
                          key={coachingPackage.id}
                          title={coachingPackage.name}
                          detail={`${formatMoney(coachingPackage.priceAmount, coachingPackage.currency)} · ${coachingPackage.billingInterval} · ${coachingPackage.status}`}
                          meta={`${coachingPackage.subscriptions} subscriptions · Stripe ${coachingPackage.stripePriceIdPresent ? "synced" : "not synced"}`}
                        />
                      ))
                    ) : (
                      <EmptyDetailText>No packages recorded.</EmptyDetailText>
                    )}
                  </div>
                </DetailSection>

                <DetailSection title="Recent Activity">
                  <div className="space-y-2">
                    {detail.auditLogs.length > 0 ? (
                      detail.auditLogs.map((auditLog) => (
                        <CompactRow
                          key={auditLog.id}
                          title={auditLog.action}
                          detail={auditLog.actor?.email ?? "System action"}
                          meta={formatDate(auditLog.createdAt)}
                        />
                      ))
                    ) : (
                      <EmptyDetailText>No audit activity recorded.</EmptyDetailText>
                    )}
                  </div>
                </DetailSection>
              </div>
            </div>
          )}
        </div>
        {detail ? (
          <div className="flex shrink-0 flex-col gap-3 border-t border-red-100 bg-red-50/60 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-red-800">Danger zone</p>
              <p className="mt-1 text-xs text-red-700">
                Archive this organization to remove it from the active platform admin list.
              </p>
            </div>
            <button
              type="button"
              disabled={deleting}
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void onDelete(detail.id)}
            >
              {deleting ? "Archiving..." : "Delete organization"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DetailMetricGrid({ detail }: { detail: AdminOrganizationDetail }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MiniMetric label="Clients" value={detail.counts.clients} />
      <MiniMetric label="Team" value={detail.counts.teamMembers} />
      <MiniMetric label="Packages" value={detail.counts.packages} />
      <MiniMetric label="Plan" value={detail.billing.platform.planName} />
    </div>
  );
}

function PlatformBillingPanel({
  detail,
  selectedPlatformPlanId,
  onSelectedPlatformPlanIdChange,
  platformPlanOptions,
  loadingPlatformPlans,
  onSyncPlatformSubscription,
  syncingPlatformSubscription
}: {
  detail: AdminOrganizationDetail;
  selectedPlatformPlanId: string;
  onSelectedPlatformPlanIdChange: (value: string) => void;
  platformPlanOptions: PlatformPlanOption[];
  loadingPlatformPlans: boolean;
  onSyncPlatformSubscription: (organizationId: string) => Promise<void>;
  syncingPlatformSubscription: boolean;
}) {
  const platform = detail.billing.platform;
  const selectedPlanExists =
    !selectedPlatformPlanId || platformPlanOptions.some((plan) => plan.id === selectedPlatformPlanId);

  return (
    <DetailSection title="Complete Coach Stripe">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <CreditCard className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-950">{platform.planName}</p>
                <p className="text-xs text-slate-500">Plan ID: {platform.planId ?? "not linked"}</p>
              </div>
            </div>
            <div className="mt-2">
              <StatusPill status={platform.status} />
            </div>
          </div>
          <div className="text-xs text-slate-500 sm:text-right">
            <p>{platform.currentPeriodStart ? `Started ${formatDate(platform.currentPeriodStart)}` : "No current period start"}</p>
            <p>{platform.currentPeriodEnd ? `Renews ${formatDate(platform.currentPeriodEnd)}` : "No current period end"}</p>
            {platform.cancelAt ? <p>Cancels {formatDate(platform.cancelAt)}</p> : null}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Linked Stripe subscription</p>
          <p className="mt-2 font-mono text-xs font-bold text-slate-700">{platform.stripeSubscriptionId ?? "Not linked"}</p>
          <p className="mt-1 text-xs text-slate-500">Customer {platform.stripeCustomerIdPresent ? "linked" : "not linked"}</p>
        </div>

        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSyncPlatformSubscription(detail.id);
          }}
        >
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">
              Complete Coach package
            </span>
            <select
              value={selectedPlatformPlanId}
              disabled={loadingPlatformPlans}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-wait disabled:bg-slate-50"
              onChange={(event) => onSelectedPlatformPlanIdChange(event.target.value)}
            >
              <option value="">
                {loadingPlatformPlans ? "Loading Complete Coach packages..." : "Select a package"}
              </option>
              {platformPlanOptions.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {formatPlatformPlanOptionLabel(plan)}
                </option>
              ))}
            </select>
          </label>
          {!loadingPlatformPlans && platformPlanOptions.length === 0 ? (
            <p className="mt-2 text-xs font-medium text-orange-700">
              No Complete Coach packages are configured.
            </p>
          ) : null}
          {!selectedPlanExists ? (
            <p className="mt-2 text-xs font-medium text-orange-700">
              The current package is no longer available. Select another package before saving.
            </p>
          ) : null}
        <button
          type="submit"
          disabled={
            syncingPlatformSubscription ||
            loadingPlatformPlans ||
            !selectedPlatformPlanId
          }
          className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-black text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {syncingPlatformSubscription ? "Saving..." : "Assign package"}
        </button>
        </form>
      </div>
    </DetailSection>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function CompactRow({ title, detail, meta }: { title: string; detail: string; meta?: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
      {meta ? <p className="mt-0.5 text-[11px] font-medium text-slate-400">{meta}</p> : null}
    </div>
  );
}

function EmptyDetailText({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs font-medium text-slate-500">{children}</p>;
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide",
        status === "active" || status === "trialing"
          ? "bg-emerald-50 text-emerald-700"
          : status === "paused" || status === "past-due"
            ? "bg-orange-50 text-orange-700"
            : status === "canceled" || status === "archived"
              ? "bg-slate-100 text-slate-600"
              : "bg-indigo-50 text-indigo-700"
      )}
    >
      {status}
    </span>
  );
}

function AdminInput({
  label,
  value,
  type = "text",
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AdminSelect({
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
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <select
        required
        value={value}
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0
  }).format(cents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatPlatformPlanOptionLabel(plan: PlatformPlanOption) {
  return `${plan.name} · ${plan.coachSeatLimit} coach seats · ${formatClientLimit(plan.clientLimit)}`;
}

function formatClientLimit(clientLimit: number | null) {
  return clientLimit === null ? "unlimited clients" : `${clientLimit} clients`;
}

function getAvailableTimezones() {
  const fallback = [
    "Australia/Melbourne",
    "Australia/Sydney",
    "Australia/Brisbane",
    "Australia/Adelaide",
    "Australia/Perth",
    "Pacific/Auckland",
    "Europe/London",
    "America/New_York",
    "America/Los_Angeles",
    "UTC"
  ];

  if (typeof Intl.supportedValuesOf !== "function") {
    return fallback;
  }

  const timezones = Intl.supportedValuesOf("timeZone");

  return timezones.includes("Australia/Melbourne") ? timezones : ["Australia/Melbourne", ...timezones];
}
