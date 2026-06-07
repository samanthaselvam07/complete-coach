"use client";

import Link from "next/link";
import { CreditCard, ShieldCheck, UsersRound } from "lucide-react";
import { useState } from "react";

import { ALL_CAPABILITIES, getCapabilitiesForRole, type Capability, type MembershipRole } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type OrganizationSettingsTab = "billing" | "team" | "permissions";

const tabs: Array<{
  id: OrganizationSettingsTab;
  label: string;
  description: string;
}> = [
  {
    id: "billing",
    label: "Subscription & Billing",
    description: "Operating system plan, billing owner, invoices, and renewals."
  },
  {
    id: "team",
    label: "Team Management",
    description: "Invite coaches, manage seats, and review access status."
  },
  {
    id: "permissions",
    label: "Role Permissions",
    description: "Review the capabilities granted to each organisation role."
  }
];

const permissionRows: Capability[] = [
  "clients:read",
  "clients:write",
  "submissions:review",
  "training:assign",
  "nutrition:assign",
  "payments:read",
  "payments:manage",
  "team:manage",
  "audit:read"
];

const visibleRoles: MembershipRole[] = ["owner", "admin", "coach", "assistant"];

export function OrganizationSettingsPage() {
  const [activeTab, setActiveTab] = useState<OrganizationSettingsTab>("billing");
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <main className="min-h-screen space-y-8 bg-gray-50 p-6 lg:p-8">
      <header>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Administration</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Organisation Settings</h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600">
          Manage the Complete Coach operating system subscription, team access, and role permissions for your workspace.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Organisation settings sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={cn(
                "rounded-xl px-4 py-3 text-sm font-bold transition-colors",
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-950">{activeTabConfig.label}</h2>
          <p className="mt-1 text-sm text-slate-500">{activeTabConfig.description}</p>
        </div>

        {activeTab === "billing" ? <SubscriptionBillingPanel /> : null}
        {activeTab === "team" ? <TeamManagementPanel /> : null}
        {activeTab === "permissions" ? <RolePermissionsPanel /> : null}
      </section>
    </main>
  );
}

function SubscriptionBillingPanel() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <article className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Current plan</p>
            <h3 className="text-2xl font-black text-slate-950">Complete Coach Operating System</h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              This is your organisation subscription for using Complete Coach. Coaching packages, client subscriptions,
              and program pricing are managed separately in the package ecosystem.
            </p>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Active</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <BillingMetric label="Monthly platform fee" value="$299" detail="Billed monthly" />
          <BillingMetric label="Team seats" value="18" detail="14 active coaches" />
          <BillingMetric label="Next renewal" value="Jul 07, 2026" detail="Card ending 4242" />
        </div>
      </article>

      <aside className="rounded-2xl border border-slate-200 p-6">
        <CreditCard className="mb-4 h-6 w-6 text-indigo-600" aria-hidden="true" />
        <h3 className="text-lg font-black text-slate-950">Billing actions</h3>
        <p className="mt-2 text-sm text-slate-500">
          A secure Stripe customer portal endpoint is required before payment methods or invoices can be managed here.
        </p>
        <button
          type="button"
          disabled
          className="mt-5 w-full rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-500"
        >
          Billing portal coming soon
        </button>
        <Link
          href="/packages"
          className="mt-3 block rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Manage coaching packages
        </Link>
      </aside>
    </div>
  );
}

function BillingMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function TeamManagementPanel() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <article className="rounded-2xl border border-slate-200 p-5">
        <UsersRound className="mb-4 h-6 w-6 text-indigo-600" aria-hidden="true" />
        <p className="text-sm font-bold text-slate-500">Active team members</p>
        <p className="mt-2 text-3xl font-black text-slate-950">18</p>
        <p className="mt-1 text-sm text-slate-500">Owners, admins, coaches, and assistants.</p>
      </article>
      <article className="rounded-2xl border border-slate-200 p-5">
        <ShieldCheck className="mb-4 h-6 w-6 text-indigo-600" aria-hidden="true" />
        <p className="text-sm font-bold text-slate-500">Seats requiring review</p>
        <p className="mt-2 text-3xl font-black text-slate-950">4</p>
        <p className="mt-1 text-sm text-slate-500">Review leave, suspended, or pending access.</p>
      </article>
      <article className="rounded-2xl border border-slate-200 p-5">
        <p className="text-lg font-black text-slate-950">Open the roster</p>
        <p className="mt-2 text-sm text-slate-500">
          Use the full team management page to invite members, update roles, and remove access.
        </p>
        <Link
          href="/team-management"
          className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
        >
          Open team management
        </Link>
      </article>
    </div>
  );
}

function RolePermissionsPanel() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[720px] text-left text-sm" aria-label="Role permissions matrix">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Capability</th>
            {visibleRoles.map((role) => (
              <th key={role} className="px-4 py-3 capitalize">{role}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {permissionRows.map((capability) => (
            <tr key={capability}>
              <td className="px-4 py-3 font-mono text-xs text-slate-700">{capability}</td>
              {visibleRoles.map((role) => {
                const enabled = getCapabilitiesForRole(role).includes(capability);

                return (
                  <td key={`${role}-${capability}`} className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-1 text-xs font-bold", enabled ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-400")}>
                      {enabled ? "Allowed" : "Blocked"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        Matrix excerpt from {ALL_CAPABILITIES.length} tracked application capabilities.
      </p>
    </div>
  );
}
