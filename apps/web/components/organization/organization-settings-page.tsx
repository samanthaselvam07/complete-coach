"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  Copy,
  CreditCard,
  Edit3,
  Globe2,
  Link2,
  Mail,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Share2,
  UsersRound,
  WalletCards
} from "lucide-react";
import { useEffect, useState } from "react";

import { AuditLogPage } from "@/components/audit/audit-log-page";
import { SavedToast } from "@/components/ui/saved-toast";
import { ALL_CAPABILITIES, getCapabilitiesForRole, type Capability, type MembershipRole } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type OrganizationSettingsTab = "billing" | "integrations" | "email" | "automations" | "team" | "permissions" | "audit";

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

type TeamRole = "owner" | "admin" | "coach" | "assistant";
type TeamStatus = "invited" | "active" | "suspended" | "removed";

interface TeamMember {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: TeamRole;
  status: TeamStatus;
  activeClientCount?: number;
  capacityLimit?: number;
  capacityPercent?: number;
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
    id: "automations",
    label: "Automations",
    description: "Configure email and push notification workflows for client and coaching events."
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

const fallbackTeamMembers: TeamMember[] = [
  {
    id: "membership_sarah",
    userId: "user_sarah",
    name: "Sarah Jenkins",
    email: "sarah@kineticcurator.com",
    image: null,
    role: "admin",
    status: "active",
    activeClientCount: 28,
    capacityLimit: 40,
    capacityPercent: 70
  },
  {
    id: "membership_marcus",
    userId: "user_marcus",
    name: "Marcus Chen",
    email: "marcus@kineticcurator.com",
    image: null,
    role: "coach",
    status: "active",
    activeClientCount: 34,
    capacityLimit: 40,
    capacityPercent: 85
  },
  {
    id: "membership_elena",
    userId: "user_elena",
    name: "Elena Rodriguez",
    email: "elena@kineticcurator.com",
    image: null,
    role: "assistant",
    status: "suspended",
    activeClientCount: 0,
    capacityLimit: 0,
    capacityPercent: 0
  }
];

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
        {activeTab === "automations" ? <AutomationsPanel /> : null}
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
  const [isOpeningStripeDashboard, setIsOpeningStripeDashboard] = useState(false);
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
    const onboardingWindow = window.open("about:blank", "_blank", "noopener,noreferrer");

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
        error?: { message: string; details?: { message?: string } };
      };

      if (!response.ok || !payload.data?.onboardingUrl) {
        throw new Error(payload.error?.details?.message ?? payload.error?.message ?? "Could not create Stripe onboarding link.");
      }

      setStripeStatus(payload.data.status);
      setStripeOnboardingUrl(payload.data.onboardingUrl);
      if (onboardingWindow) {
        onboardingWindow.location.href = payload.data.onboardingUrl;
      }
    } catch (error) {
      onboardingWindow?.close();
      setStripeStatus(error instanceof Error ? error.message : "Could not create Stripe onboarding link.");
    } finally {
      setIsConnectingStripe(false);
    }
  };

  const openStripeDashboard = async () => {
    setIsOpeningStripeDashboard(true);
    setStripeStatus("Creating Stripe dashboard link...");

    try {
      const response = await fetch("/api/v1/stripe/connect/dashboard-link", {
        method: "POST"
      });
      const payload = (await response.json()) as {
        data?: { status: string; dashboardUrl: string };
        error?: { message: string; details?: { message?: string } };
      };

      if (!response.ok || !payload.data?.dashboardUrl) {
        throw new Error(payload.error?.details?.message ?? payload.error?.message ?? "Could not create Stripe dashboard link.");
      }

      setStripeStatus(payload.data.status);
      window.open(payload.data.dashboardUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setStripeStatus(error instanceof Error ? error.message : "Could not create Stripe dashboard link.");
    } finally {
      setIsOpeningStripeDashboard(false);
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
          <button
            type="button"
            disabled={isOpeningStripeDashboard}
            onClick={openStripeDashboard}
            className="mt-3 w-full rounded-xl border border-indigo-200 px-5 py-3 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:border-slate-200 disabled:text-slate-400"
          >
            {isOpeningStripeDashboard ? "Creating dashboard link..." : "Open Stripe dashboard"}
          </button>
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

type AutomationChannel = "email" | "push";

interface AutomationTrigger {
  id: string;
  name: string;
  enabled: boolean;
  subject: string;
  template: string;
  delay: number;
  interval: "Minutes" | "Hours" | "Days" | "Weeks";
}

const automationTriggers: AutomationTrigger[] = [
  {
    id: "new-client-created",
    name: "New client created",
    enabled: true,
    subject: "Welcome to Complete Coach!",
    template:
      "[FIRST_NAME]!\n\nWelcome to your coaching program. I need 10 minutes of your time to make sure you are clear on the next steps.\n\nThings you will need for success:\n\n- Bodyweight scales\n- Measuring tape\n- Wearable activity tracker\n- Food scale\n- Meal prep containers\n- Gym membership",
    delay: 1,
    interval: "Minutes"
  },
  {
    id: "client-completes-check-in",
    name: "Client completes a check-in",
    enabled: true,
    subject: "Your check-in has been received",
    template: "Thanks [FIRST_NAME], your check-in has been submitted and your coach will review it soon.",
    delay: 1,
    interval: "Minutes"
  },
  {
    id: "nutrition-plan-added",
    name: "Nutrition plan added to your client",
    enabled: true,
    subject: "Your nutrition plan is ready",
    template: "Hi [FIRST_NAME], your nutrition plan has been added to your Complete Coach profile.",
    delay: 5,
    interval: "Minutes"
  },
  {
    id: "initial-qa-completed",
    name: "Client completes initial Q&A form",
    enabled: true,
    subject: "Initial Q&A received",
    template: "Thanks [FIRST_NAME], your initial Q&A form has been attached to your profile.",
    delay: 1,
    interval: "Minutes"
  },
  {
    id: "workout-plan-added",
    name: "Workout plan added to your client",
    enabled: true,
    subject: "Your workout plan is ready",
    template: "Hi [FIRST_NAME], your workout plan is now available in Complete Coach.",
    delay: 5,
    interval: "Minutes"
  },
  {
    id: "supplement-plan-added",
    name: "Supplement plan added to your client",
    enabled: true,
    subject: "Your supplement plan is ready",
    template: "Hi [FIRST_NAME], your supplement plan has been added to your profile.",
    delay: 5,
    interval: "Minutes"
  },
  {
    id: "workout-plan-updated",
    name: "Workout plan updated",
    enabled: true,
    subject: "Your workout plan has been updated",
    template: "Hi [FIRST_NAME], your coach has updated your workout plan.",
    delay: 1,
    interval: "Minutes"
  },
  {
    id: "nutrition-plan-updated",
    name: "Nutrition plan updated",
    enabled: true,
    subject: "Your nutrition plan has been updated",
    template: "Hi [FIRST_NAME], your coach has updated your nutrition plan.",
    delay: 1,
    interval: "Minutes"
  },
  {
    id: "client-misses-check-in",
    name: "Client misses a check-in",
    enabled: true,
    subject: "Your check-in is overdue",
    template: "Hi [FIRST_NAME], your check-in is still waiting. Please submit it when you can.",
    delay: 1,
    interval: "Days"
  },
  {
    id: "client-check-in-reminder",
    name: "Client check-in reminder",
    enabled: true,
    subject: "Check-in reminder",
    template: "Hi [FIRST_NAME], this is a reminder that your check-in is due soon.",
    delay: 1,
    interval: "Days"
  },
  {
    id: "client-birthday",
    name: "Client's birthday",
    enabled: true,
    subject: "Happy birthday from your coaching team",
    template: "Happy birthday [FIRST_NAME]. Have a great day from the Complete Coach team.",
    delay: 0,
    interval: "Minutes"
  },
  {
    id: "supplement-plan-updated",
    name: "Supplement plan updated",
    enabled: true,
    subject: "Your supplement plan has been updated",
    template: "Hi [FIRST_NAME], your coach has updated your supplement plan.",
    delay: 1,
    interval: "Minutes"
  }
];

function AutomationsPanel() {
  const [automations, setAutomations] = useState(automationTriggers);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [channel, setChannel] = useState<AutomationChannel>("email");
  const [saveMessage, setSaveMessage] = useState("");
  const editingAutomation = automations.find((automation) => automation.id === editingId);

  const toggleAutomation = (automationId: string) => {
    setAutomations((currentAutomations) =>
      currentAutomations.map((automation) =>
        automation.id === automationId ? { ...automation, enabled: !automation.enabled } : automation
      )
    );
  };

  if (editingAutomation) {
    return (
      <AutomationEditPanel
        automation={editingAutomation}
        channel={channel}
        saveMessage={saveMessage}
        onBack={() => {
          setEditingId(null);
          setSaveMessage("");
        }}
        onChannelChange={setChannel}
        onSave={() => setSaveMessage("Automation saved.")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Client communication</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">Automation triggers</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Choose a trigger below and create a series of emails or push notifications to be sent when that action
              takes place.
            </p>
          </div>
          <div className="flex gap-2 rounded-2xl bg-white p-2 shadow-sm">
            <span className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white">
              <Mail className="size-4" aria-hidden="true" />
              Email
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
              <Bell className="size-4" aria-hidden="true" />
              Push
            </span>
          </div>
        </div>
      </section>

      <section className="overflow-visible rounded-2xl border border-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm" aria-label="Automation triggers">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {automations.map((automation) => (
              <tr key={automation.id}>
                <td className="px-5 py-4 font-medium text-slate-700">{automation.name}</td>
                <td className="px-5 py-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={automation.enabled}
                    aria-label={`Toggle ${automation.name} automation`}
                    className={cn(
                      "inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                      automation.enabled ? "bg-blue-500" : "bg-slate-200"
                    )}
                    onClick={() => toggleAutomation(automation.id)}
                  >
                    <span
                      className={cn(
                        "size-5 rounded-full bg-white shadow-sm transition-transform",
                        automation.enabled ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </td>
                <td className="overflow-visible px-5 py-4 text-right">
                  <div className="relative inline-flex">
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === automation.id}
                      aria-label={`Actions for ${automation.name}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200"
                      onClick={() => setOpenMenuId(openMenuId === automation.id ? null : automation.id)}
                    >
                      Actions
                      <ChevronDown className="size-4" aria-hidden="true" />
                    </button>
                    {openMenuId === automation.id ? (
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-30 mt-2 w-36 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-xl"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                          onClick={() => {
                            setEditingId(automation.id);
                            setOpenMenuId(null);
                            setChannel("email");
                          }}
                        >
                          <Edit3 className="size-4" aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function AutomationEditPanel({
  automation,
  channel,
  saveMessage,
  onBack,
  onChannelChange,
  onSave
}: {
  automation: AutomationTrigger;
  channel: AutomationChannel;
  saveMessage: string;
  onBack: () => void;
  onChannelChange: (channel: AutomationChannel) => void;
  onSave: () => void;
}) {
  const [subject, setSubject] = useState(automation.subject);
  const [message, setMessage] = useState(automation.template);
  const [delay, setDelay] = useState(String(automation.delay));
  const [interval, setInterval] = useState(automation.interval);

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to automations
      </button>

      <section className="rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Edit automation</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">{automation.name}</h3>
          </div>
          {saveMessage ? <SavedToast message={saveMessage} /> : null}
        </div>

        <div className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-black text-slate-950">Name</span>
            <input
              value={automation.name.toUpperCase()}
              readOnly
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium uppercase text-slate-700"
            />
          </label>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h4 className="text-base font-black text-slate-800">Notifications</h4>
              <p className="mt-1 text-sm text-slate-500">Choose what type of notification you want to send.</p>
            </div>
            <div className="inline-flex rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="Automation notification type">
              {(["email", "push"] as AutomationChannel[]).map((notificationChannel) => (
                <button
                  key={notificationChannel}
                  type="button"
                  role="tab"
                  aria-selected={channel === notificationChannel}
                  className={cn(
                    "rounded-xl px-5 py-3 text-sm font-black capitalize transition-colors",
                    channel === notificationChannel ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"
                  )}
                  onClick={() => onChannelChange(notificationChannel)}
                >
                  {notificationChannel}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-black text-slate-950">{channel === "email" ? "Subject" : "Push title"}</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            />
          </label>

          <div>
            <h4 className="text-xl font-black text-slate-800">
              {channel === "email" ? "Email Messages" : "Push Notification Message"}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Use short-codes to personalize your messages with your contact&apos;s first name{" "}
              <span className="font-black text-slate-700">[FIRST_NAME]</span> and last name{" "}
              <span className="font-black text-slate-700">[LAST_NAME]</span>.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-500">
                {["B", "I", "U", "Link", "List", "Align", "Image", "Merge Tags"].map((tool) => (
                  <span key={tool} className="rounded-lg bg-white px-3 py-2 shadow-sm">
                    {tool}
                  </span>
                ))}
              </div>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={10}
                className="min-h-72 w-full resize-y border-0 bg-white p-5 text-sm leading-7 text-slate-800 outline-none"
                aria-label={`${channel === "email" ? "Email" : "Push"} automation message`}
              />
            </div>
          </div>

          <label className="grid gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
              <Paperclip className="size-4 text-indigo-600" aria-hidden="true" />
              Attached file
            </span>
            <input type="file" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600" />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-950">When do you want to send this message?</span>
              <input
                type="number"
                min="0"
                value={delay}
                onChange={(event) => setDelay(event.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-950">Interval</span>
              <select
                value={interval}
                onChange={(event) => setInterval(event.target.value as AutomationTrigger["interval"])}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              >
                {["Minutes", "Hours", "Days", "Weeks"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-800 transition-colors hover:bg-slate-200"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add New Message
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-800 transition-colors hover:bg-slate-200"
              >
                <Send className="size-4" aria-hidden="true" />
                Send Test
              </button>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white transition-colors hover:bg-indigo-700"
              onClick={onSave}
            >
              <Save className="size-4" aria-hidden="true" />
              Save Automation
            </button>
          </div>
        </div>
      </section>
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
  const [members, setMembers] = useState<TeamMember[]>(fallbackTeamMembers);
  const [source, setSource] = useState<"api" | "fallback">("fallback");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const visibleMembers = members.filter((member) => member.status !== "removed");
  const activeMembers = visibleMembers.filter((member) => member.status === "active");
  const reviewMembers = visibleMembers.filter((member) => member.status !== "active");

  useEffect(() => {
    let active = true;

    async function loadTeamMembers() {
      try {
        const response = await fetch("/api/v1/team-members");

        if (!response.ok) {
          throw new Error("Team API unavailable.");
        }

        const payload = (await response.json()) as {
          data?: { members?: TeamMember[] };
        };
        const apiMembers = payload.data?.members;

        if (!apiMembers?.length) {
          throw new Error("No team members returned.");
        }

        if (active) {
          setMembers(apiMembers);
          setSource("api");
        }
      } catch {
        if (active) {
          setSource("fallback");
        }
      }
    }

    void loadTeamMembers();

    return () => {
      active = false;
    };
  }, []);

  async function updateMember(member: TeamMember, input: Partial<Pick<TeamMember, "role" | "status">>) {
    if (source !== "api") {
      setFeedback("Connect the team API to update member access.");
      return;
    }

    setFeedback(null);

    try {
      const response = await fetch(`/api/v1/team-members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error("Team member could not be updated.");
      }

      const payload = (await response.json()) as { data: TeamMember };
      setMembers((currentMembers) =>
        currentMembers.map((candidate) => (candidate.id === member.id ? payload.data : candidate))
      );
      setEditingMember((currentMember) => (currentMember?.id === member.id ? payload.data : currentMember));
      setFeedback(`${payload.data.name ?? payload.data.email ?? "Team member"} updated.`);
    } catch {
      setFeedback("Team member could not be updated. The last owner cannot be changed.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 p-5">
          <UsersRound className="mb-4 h-6 w-6 text-indigo-600" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-500">Active team members</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{activeMembers.length}</p>
          <p className="mt-1 text-sm text-slate-500">Owners, admins, coaches, and assistants.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 p-5">
          <ShieldCheck className="mb-4 h-6 w-6 text-indigo-600" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-500">Seats requiring review</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{reviewMembers.length}</p>
          <p className="mt-1 text-sm text-slate-500">Review suspended, invited, or restricted access.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 p-5">
          <p className="text-lg font-black text-slate-950">Full roster tools</p>
          <p className="mt-2 text-sm text-slate-500">
            Use the full team management page for invitations and deeper roster reporting.
          </p>
          <Link
            href="/team-management"
            className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
          >
            Open team management
          </Link>
        </article>
      </div>

      {feedback ? (
        <p role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          {feedback}
        </p>
      ) : null}

      {source === "fallback" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Showing sample team access until the team API is available.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950">Team member access</h3>
            <p className="text-sm text-slate-500">
              Activate, deactivate, and edit profiles for everyone with organisation access.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
            {visibleMembers.length} members
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm" aria-label="Organisation team members">
            <thead className="border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Team Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Client Capacity</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleMembers.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-4">
                    <span className="block font-bold text-slate-950">{member.name ?? "Unnamed member"}</span>
                    <span className="text-slate-500">{member.email ?? "No email on file"}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold capitalize text-indigo-700">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {member.capacityLimit ? (
                      <div className="flex items-center gap-3">
                        <span className="text-slate-700">
                          {member.activeClientCount ?? 0}/{member.capacityLimit} clients
                        </span>
                        <span className="h-1.5 w-28 rounded-full bg-slate-100">
                          <span
                            className="block h-1.5 rounded-full bg-indigo-500"
                            style={{ width: `${member.capacityPercent ?? 0}%` }}
                          />
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500">No client capacity</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <TeamStatusPill status={member.status} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={source !== "api" || member.role === "owner"}
                        onClick={() =>
                          void updateMember(member, {
                            status: member.status === "active" ? "suspended" : "active"
                          })
                        }
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {member.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        disabled={source !== "api"}
                        onClick={() => setEditingMember(member)}
                        className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Edit profile
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingMember ? (
        <TeamMemberEditDialog
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={(input) => void updateMember(editingMember, input)}
        />
      ) : null}
    </div>
  );
}

function TeamStatusPill({ status }: { status: TeamStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-bold capitalize",
        status === "active"
          ? "bg-green-100 text-green-700"
          : status === "suspended"
            ? "bg-amber-100 text-amber-700"
            : "bg-slate-100 text-slate-600"
      )}
    >
      {status === "suspended" ? "Deactivated" : status}
    </span>
  );
}

function TeamMemberEditDialog({
  member,
  onClose,
  onSave
}: {
  member: TeamMember;
  onClose: () => void;
  onSave: (input: Partial<Pick<TeamMember, "role" | "status">>) => void;
}) {
  const [role, setRole] = useState<TeamRole>(member.role);
  const [status, setStatus] = useState<TeamStatus>(member.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-member-edit-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Edit team profile</p>
            <h3 id="team-member-edit-title" className="mt-1 text-2xl font-black text-slate-950">
              {member.name ?? member.email ?? "Team member"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{member.email ?? "No email on file"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close team member editor"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Role
            <select
              value={role}
              disabled={member.role === "owner"}
              onChange={(event) => setRole(event.target.value as TeamRole)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
            >
              {member.role === "owner" ? <option value="owner">Owner</option> : null}
              <option value="admin">Admin</option>
              <option value="coach">Coach</option>
              <option value="assistant">Assistant</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Account status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as TeamStatus)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
            >
              <option value="active">Active</option>
              <option value="suspended">Deactivated</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const input = {
                ...(member.role !== "owner" && role !== member.role ? { role } : {}),
                ...(status !== member.status ? { status } : {})
              };

              if (Object.keys(input).length > 0) {
                onSave(input);
              }

              onClose();
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
          >
            Save profile
          </button>
        </div>
      </section>
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
