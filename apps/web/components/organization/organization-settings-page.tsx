"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  CreditCard,
  Globe2,
  Link2,
  RefreshCw,
  ShieldCheck,
  Share2,
  UsersRound,
  WalletCards
} from "lucide-react";
import { useEffect, useState } from "react";

import { AuditLogPage } from "@/components/audit/audit-log-page";
import { ALL_CAPABILITIES, getCapabilitiesForRole, type Capability, type MembershipRole } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type OrganizationSettingsTab = "billing" | "integrations" | "email" | "team" | "permissions" | "audit";

interface SenderDomainDnsRecord {
  record: string;
  name: string;
  type: string;
  value: string;
  ttl?: string;
  status?: string;
  priority?: number;
}

interface SenderDomain {
  id: string;
  domain: string;
  provider: string;
  status: string;
  fromEmail: string;
  fromLocalPart: string;
  senderName: string;
  dnsRecords: SenderDomainDnsRecord[];
  verifiedAt: string | null;
}

interface SocialConnection {
  id: string;
  provider: "instagram" | "facebook" | "x";
  accountName: string;
  status: string;
}

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
    id: "integrations",
    label: "Integrations",
    description: "Connect Stripe payments and social channels for this organisation."
  },
  {
    id: "email",
    label: "Email DNS",
    description: "Verify sender domains so client emails can come from your organisation address."
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
  },
  {
    id: "audit",
    label: "Audit Log",
    description: "Review sensitive organisation actions and account-level activity events."
  }
];

const visibleRoles: MembershipRole[] = ["owner", "admin", "coach", "assistant"];

const permissionTeamMembers: Array<{
  id: string;
  name: string;
  role: Exclude<MembershipRole, "client">;
}> = [
  { id: "sarah", name: "Sarah Jenkins", role: "admin" },
  { id: "marcus", name: "Marcus Chen", role: "coach" },
  { id: "derek", name: "Derek Vance", role: "coach" },
  { id: "elena", name: "Elena Rodriguez", role: "assistant" }
];

function buildInitialMemberPermissions() {
  return Object.fromEntries(
    permissionTeamMembers.map((member) => [
      member.id,
      Object.fromEntries(
        ALL_CAPABILITIES.map((capability) => [
          capability,
          getCapabilitiesForRole(member.role).includes(capability)
        ])
      ) as Record<Capability, boolean>
    ])
  ) as Record<string, Record<Capability, boolean>>;
}

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
        {activeTab === "integrations" ? <IntegrationsPanel /> : null}
        {activeTab === "email" ? <EmailDnsPanel /> : null}
        {activeTab === "team" ? <TeamManagementPanel /> : null}
        {activeTab === "permissions" ? <RolePermissionsPanel /> : null}
        {activeTab === "audit" ? <AuditLogPage embedded /> : null}
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

function IntegrationsPanel() {
  const [stripeStatus, setStripeStatus] = useState("Not connected");
  const [stripeOnboardingUrl, setStripeOnboardingUrl] = useState<string | null>(null);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [socialStatusMessage, setSocialStatusMessage] = useState("Loading social channels...");

  useEffect(() => {
    let mounted = true;

    fetch("/api/v1/social/connections")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Social connection API unavailable.");
        }

        return response.json() as Promise<{ data: SocialConnection[] }>;
      })
      .then((payload) => {
        if (mounted) {
          setConnections(payload.data);
          setSocialStatusMessage(payload.data.length > 0 ? "Social channels loaded." : "No social channels connected yet.");
        }
      })
      .catch(() => {
        if (mounted) {
          setSocialStatusMessage("Social channels could not be loaded.");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const connectStripe = async () => {
    setIsConnectingStripe(true);
    setStripeStatus("Creating Stripe onboarding link...");

    try {
      const response = await fetch("/api/v1/stripe/connect/account-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: "/organization-settings",
          refreshUrl: "/organization-settings"
        })
      });
      const payload = (await response.json()) as {
        data?: { status: string; onboardingUrl: string };
        error?: { message: string };
      };

      if (!response.ok || !payload.data?.onboardingUrl) {
        throw new Error(payload.error?.message ?? "Could not create Stripe onboarding link.");
      }

      setStripeStatus(payload.data.status);
      setStripeOnboardingUrl(payload.data.onboardingUrl);
    } catch (error) {
      setStripeStatus(error instanceof Error ? error.message : "Could not create Stripe onboarding link.");
    } finally {
      setIsConnectingStripe(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-slate-200 p-6">
          <WalletCards className="mb-4 h-6 w-6 text-indigo-600" aria-hidden="true" />
          <h3 className="text-xl font-black text-slate-950">Stripe account</h3>
          <p className="mt-2 text-sm text-slate-500">
            Connect the organisation&apos;s Stripe account so packages, subscriptions, payouts, and payment reporting can
            run through the coaching business.
          </p>
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Connection status</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{stripeStatus}</p>
          </div>
          <button
            type="button"
            disabled={isConnectingStripe}
            onClick={connectStripe}
            className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:bg-slate-300"
          >
            {isConnectingStripe ? "Creating link..." : "Connect Stripe account"}
          </button>
          {stripeOnboardingUrl ? (
            <a
              href={stripeOnboardingUrl}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 px-5 py-3 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-50"
            >
              Continue Stripe onboarding
              <Link2 className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
        </article>

        <article className="rounded-2xl border border-slate-200 p-6">
          <Share2 className="mb-4 h-6 w-6 text-indigo-600" aria-hidden="true" />
          <h3 className="text-xl font-black text-slate-950">Social channels</h3>
          <p className="mt-2 text-sm text-slate-500">
            Connect Instagram, Facebook, and X accounts for scheduled content, publishing, and social planner reporting.
          </p>
          <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            {socialStatusMessage}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {socialChannels.map((channel) => (
              <SocialChannelCard
                key={channel.provider}
                channel={channel}
                connection={connections.find((connection) => connection.provider === channel.provider)}
              />
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

const socialChannels: Array<{ provider: SocialConnection["provider"]; label: string; description: string }> = [
  { provider: "instagram", label: "Instagram", description: "Reels, posts, and visual content." },
  { provider: "facebook", label: "Facebook", description: "Pages, community updates, and republishing." },
  { provider: "x", label: "X", description: "Short-form posts and announcements." }
];

function SocialChannelCard({ channel, connection }: { channel: (typeof socialChannels)[number]; connection?: SocialConnection }) {
  const isConnected = connection?.status === "active";

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-950">{channel.label}</p>
          <p className="mt-1 text-xs text-slate-500">{channel.description}</p>
        </div>
        <span className={cn("rounded-full px-2 py-1 text-[10px] font-bold uppercase", isConnected ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
          {isConnected ? "Connected" : "Not connected"}
        </span>
      </div>
      {connection ? (
        <p className="mt-4 text-sm font-bold text-slate-700">{connection.accountName}</p>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No account connected.</p>
      )}
      <a
        href={`/api/v1/social/connections/oauth/start?provider=${channel.provider}&redirectTo=/organization-settings`}
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
      >
        {isConnected ? "Reconnect" : "Connect"} {channel.label}
      </a>
    </div>
  );
}

function EmailDnsPanel() {
  const [domains, setDomains] = useState<SenderDomain[]>([]);
  const [formState, setFormState] = useState({
    domain: "",
    fromLocalPart: "hello",
    senderName: "Complete Coach"
  });
  const [statusMessage, setStatusMessage] = useState("Loading sender domains...");
  const [isSaving, setIsSaving] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch("/api/v1/organizations/current/email-domains")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Sender domain API unavailable.");
        }

        return response.json() as Promise<{ data: SenderDomain[] }>;
      })
      .then((payload) => {
        if (mounted) {
          setDomains(payload.data);
          setStatusMessage(payload.data.length > 0 ? "Sender domains loaded." : "Add a sender domain to get DNS records.");
        }
      })
      .catch(() => {
        if (mounted) {
          setStatusMessage("Sender domains could not be loaded. Check Resend and database configuration.");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const createDomain = async () => {
    setIsSaving(true);
    setStatusMessage("Creating Resend DNS records...");

    try {
      const response = await fetch("/api/v1/organizations/current/email-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState)
      });
      const payload = (await response.json()) as { data?: SenderDomain; error?: { message: string } };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Could not create sender domain.");
      }

      setDomains((currentDomains) => [payload.data as SenderDomain, ...currentDomains]);
      setStatusMessage("DNS records created. Add them with your domain host, then verify.");
      setFormState({ domain: "", fromLocalPart: "hello", senderName: formState.senderName });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not create sender domain.");
    } finally {
      setIsSaving(false);
    }
  };

  const verifyDomain = async (domain: SenderDomain) => {
    setVerifyingId(domain.id);
    setStatusMessage(`Checking DNS records for ${domain.domain}...`);

    try {
      const response = await fetch(`/api/v1/organizations/current/email-domains/${domain.id}/verify`, {
        method: "POST"
      });
      const payload = (await response.json()) as { data?: SenderDomain; error?: { message: string } };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Could not verify sender domain.");
      }

      setDomains((currentDomains) =>
        currentDomains.map((currentDomain) => (currentDomain.id === domain.id ? payload.data as SenderDomain : currentDomain))
      );
      setStatusMessage(payload.data.status === "verified" ? "Sender domain verified." : `Resend status: ${payload.data.status}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not verify sender domain.");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <aside className="rounded-2xl border border-slate-200 p-5">
        <Globe2 className="mb-4 h-6 w-6 text-indigo-600" aria-hidden="true" />
        <h3 className="text-lg font-black text-slate-950">Add sender domain</h3>
        <p className="mt-2 text-sm text-slate-500">
          Use a domain or subdomain your organisation owns. Complete Coach will request Resend DNS records and only use
          this sender once Resend reports it as verified.
        </p>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Domain or subdomain</span>
            <input
              value={formState.domain}
              onChange={(event) => setFormState({ ...formState, domain: event.target.value })}
              placeholder="mail.yourdomain.com"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">From address</span>
            <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-indigo-500">
              <input
                value={formState.fromLocalPart}
                onChange={(event) => setFormState({ ...formState, fromLocalPart: event.target.value })}
                aria-label="Sender email username"
                className="w-28 border-0 px-4 py-3 text-sm outline-none"
              />
              <span className="flex-1 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                @{formState.domain || "mail.yourdomain.com"}
              </span>
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Sender name</span>
            <input
              value={formState.senderName}
              onChange={(event) => setFormState({ ...formState, senderName: event.target.value })}
              placeholder="Your Coaching Team"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <button
            type="button"
            disabled={isSaving}
            onClick={createDomain}
            className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:bg-slate-300"
          >
            {isSaving ? "Creating records..." : "Create DNS records"}
          </button>
        </div>
        <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          {statusMessage}
        </p>
      </aside>

      <section className="space-y-4">
        {domains.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-sm font-bold text-slate-700">No sender domains configured yet.</p>
            <p className="mt-2 text-sm text-slate-500">Add a domain to generate MX, TXT, CNAME, and tracking records.</p>
          </div>
        ) : null}
        {domains.map((domain) => (
          <SenderDomainCard
            key={domain.id}
            domain={domain}
            isVerifying={verifyingId === domain.id}
            onVerify={() => verifyDomain(domain)}
          />
        ))}
      </section>
    </div>
  );
}

function SenderDomainCard({ domain, isVerifying, onVerify }: { domain: SenderDomain; isVerifying: boolean; onVerify: () => void }) {
  const isVerified = domain.status === "verified";

  return (
    <article className="rounded-2xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">{domain.domain}</h3>
          <p className="mt-1 text-sm text-slate-500">Emails will send from {domain.fromEmail} once verified.</p>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold", isVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
          {isVerified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {domain.status.replace(/_/gu, " ")}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] text-left text-xs" aria-label={`DNS records for ${domain.domain}`}>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2">Purpose</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Copy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {domain.dnsRecords.map((record) => (
              <tr key={`${record.record}-${record.type}-${record.name}`}>
                <td className="px-3 py-2 font-bold text-slate-700">{record.record}</td>
                <td className="px-3 py-2 text-slate-600">{record.type}</td>
                <td className="px-3 py-2 font-mono text-slate-700">{record.name}</td>
                <td className="max-w-[260px] truncate px-3 py-2 font-mono text-slate-700">{record.value}</td>
                <td className="px-3 py-2 text-slate-500">{record.priority ?? "-"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    aria-label={`Copy DNS value for ${record.record}`}
                    onClick={() => void navigator.clipboard?.writeText(record.value)}
                    className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        disabled={isVerifying}
        onClick={onVerify}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300"
      >
        <RefreshCw className={cn("h-4 w-4", isVerifying ? "animate-spin" : "")} />
        {isVerifying ? "Checking DNS..." : "Verify DNS records"}
      </button>
    </article>
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
  const [memberPermissions, setMemberPermissions] = useState(buildInitialMemberPermissions);

  const toggleMemberPermission = (memberId: string, capability: Capability) => {
    setMemberPermissions((currentPermissions) => ({
      ...currentPermissions,
      [memberId]: {
        ...currentPermissions[memberId],
        [capability]: !currentPermissions[memberId][capability]
      }
    }));
  };

  return (
    <div className="space-y-6">
      <section className="overflow-x-auto rounded-2xl border border-slate-200">
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
            {ALL_CAPABILITIES.map((capability) => (
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
          Default role matrix covering all {ALL_CAPABILITIES.length} tracked application capabilities.
        </p>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-black text-slate-950">Team member feature permissions</h3>
          <p className="mt-1 text-xs text-slate-500">
            Toggle individual feature access for each team member. Role defaults are used as the starting point.
          </p>
        </div>
        <table className="w-full min-w-[920px] text-left text-sm" aria-label="Team member feature permissions">
          <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-white px-4 py-3">Feature</th>
              {permissionTeamMembers.map((member) => (
                <th key={member.id} className="px-4 py-3">
                  <span className="block text-slate-700">{member.name}</span>
                  <span className="block text-[10px] capitalize text-slate-400">{member.role}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ALL_CAPABILITIES.map((capability) => (
              <tr key={`member-${capability}`}>
                <td className="sticky left-0 z-10 bg-white px-4 py-3 font-mono text-xs text-slate-700">
                  {capability}
                </td>
                {permissionTeamMembers.map((member) => {
                  const enabled = memberPermissions[member.id][capability];

                  return (
                    <td key={`${member.id}-${capability}`} className="px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={`Toggle ${capability} for ${member.name}`}
                        className={cn(
                          "inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                          enabled ? "bg-indigo-600" : "bg-slate-200"
                        )}
                        onClick={() => toggleMemberPermission(member.id, capability)}
                      >
                        <span
                          className={cn(
                            "size-5 rounded-full bg-white shadow-sm transition-transform",
                            enabled ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
