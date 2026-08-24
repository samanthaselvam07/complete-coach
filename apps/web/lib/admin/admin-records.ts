import {
  ClientStatus,
  ClientSubscriptionStatus,
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  PackageBillingInterval,
  PackageStatus
} from "@/app/generated/prisma/enums";
import { getPlatformPlanById } from "@/lib/platform-billing/plans";

const activeSubscriptionStatuses = new Set<ClientSubscriptionStatus>([
  ClientSubscriptionStatus.ACTIVE,
  ClientSubscriptionStatus.TRIALING
]);

const activePlatformSubscriptionStatuses = new Set(["active", "trialing"]);

export interface AdminOrganizationRecord {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  timezone: string;
  stripeConnectStatus: string | null;
  platformPlan: string | null;
  platformStripeCustomerId: string | null;
  platformStripeSubscriptionId: string | null;
  platformSubscriptionStatus: string | null;
  platformCurrentPeriodStart: Date | string | null;
  platformCurrentPeriodEnd: Date | string | null;
  platformCancelAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  memberships: Array<{
    role: MembershipRole;
    status: MembershipStatus;
    user: {
      name: string | null;
      email: string | null;
    };
  }>;
  clientSubscriptions: Array<{
    id: string;
    clientId: string;
    packageId: string;
    status: ClientSubscriptionStatus;
    currentPeriodStart: Date | string | null;
    currentPeriodEnd: Date | string | null;
    cancelAt: Date | string | null;
    stripeSubscriptionId: string | null;
    client: {
      firstName: string;
      lastName: string;
      email: string | null;
    };
    coachingPackage: {
      name: string;
      priceAmount: number;
      currency: string;
    };
  }>;
  _count: {
    clients: number;
    memberships: number;
    packages: number;
    clientSubscriptions: number;
  };
}

export interface AdminOrganizationDetailRecord extends AdminOrganizationRecord {
  deletedAt: Date | string | null;
  stripeConnectAccountId: string | null;
  clients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    status: ClientStatus;
    packageName: string | null;
    compliance: number;
    timezone: string;
    startDate: Date | string | null;
    latestCheckInAt: Date | string | null;
    createdAt: Date | string;
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
    billingInterval: PackageBillingInterval;
    status: PackageStatus;
    stripeProductId: string | null;
    stripePriceId: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    createdBy: {
      name: string | null;
      email: string | null;
    } | null;
    _count: {
      subscriptions: number;
    };
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    createdAt: Date | string;
    actor: {
      name: string | null;
      email: string | null;
    } | null;
  }>;
}

export function serializeAdminOrganization(record: AdminOrganizationRecord) {
  const owner = record.memberships.find((membership) => membership.role === MembershipRole.OWNER)?.user ?? null;
  const activeSubscriptions = record.clientSubscriptions.filter((subscription) =>
    activeSubscriptionStatuses.has(subscription.status)
  );
  const platformBilling = serializeAdminPlatformBilling(record);

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    status: organizationStatusToApi(record.status),
    timezone: record.timezone,
    stripeConnectStatus: record.stripeConnectStatus,
    owner: owner
      ? {
          name: owner.name,
          email: owner.email
        }
      : null,
    counts: {
      clients: record._count.clients,
      teamMembers: record._count.memberships,
      packages: record._count.packages,
      subscriptions: record._count.clientSubscriptions,
      activeSubscriptions: activeSubscriptions.length
    },
    billing: {
      platform: platformBilling,
      monthlyRevenueCents: 0,
      currency: activeSubscriptions[0]?.coachingPackage.currency ?? "usd",
      subscriptions: record.clientSubscriptions.map(serializeAdminSubscription)
    },
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function serializeAdminPlatformBilling(record: {
  platformPlan: string | null;
  platformStripeCustomerId: string | null;
  platformStripeSubscriptionId: string | null;
  platformSubscriptionStatus: string | null;
  platformCurrentPeriodStart: Date | string | null;
  platformCurrentPeriodEnd: Date | string | null;
  platformCancelAt: Date | string | null;
}) {
  const plan = getPlatformPlanById(record.platformPlan);
  const status = record.platformSubscriptionStatus ?? "not_started";

  return {
    planId: plan?.id ?? record.platformPlan,
    planName: plan?.name ?? "No Complete Coach plan",
    status,
    active: activePlatformSubscriptionStatuses.has(status),
    stripeCustomerIdPresent: Boolean(record.platformStripeCustomerId),
    stripeSubscriptionId: record.platformStripeSubscriptionId,
    currentPeriodStart: toNullableIsoString(record.platformCurrentPeriodStart),
    currentPeriodEnd: toNullableIsoString(record.platformCurrentPeriodEnd),
    cancelAt: toNullableIsoString(record.platformCancelAt)
  };
}

export function serializeAdminSubscription(
  subscription: AdminOrganizationRecord["clientSubscriptions"][number]
) {
  return {
    id: subscription.id,
    clientId: subscription.clientId,
    packageId: subscription.packageId,
    status: subscriptionStatusToApi(subscription.status),
    clientName: `${subscription.client.firstName} ${subscription.client.lastName}`,
    clientEmail: subscription.client.email,
    packageName: subscription.coachingPackage.name,
    priceAmount: subscription.coachingPackage.priceAmount,
    currency: subscription.coachingPackage.currency,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    currentPeriodStart: toNullableIsoString(subscription.currentPeriodStart),
    currentPeriodEnd: toNullableIsoString(subscription.currentPeriodEnd),
    cancelAt: toNullableIsoString(subscription.cancelAt)
  };
}

export function buildAdminSummary(organizations: AdminOrganizationRecord[]) {
  const serializedOrganizations = organizations.map(serializeAdminOrganization);
  const activeOrganizations = serializedOrganizations.filter((organization) => organization.status === "active");
  const platformSubscriptions = serializedOrganizations.map((organization) => organization.billing.platform);
  const activeSubscriptions = platformSubscriptions.filter((subscription) => subscription.active);
  const pastDueSubscriptions = platformSubscriptions.filter((subscription) => subscription.status === "past_due");

  return {
    metrics: {
      totalOrganizations: serializedOrganizations.length,
      activeOrganizations: activeOrganizations.length,
      activeSubscriptions: activeSubscriptions.length,
      trialSubscriptions: platformSubscriptions.filter((subscription) => subscription.status === "trialing").length,
      pastDueSubscriptions: pastDueSubscriptions.length,
      canceledSubscriptions: platformSubscriptions.filter((subscription) => subscription.status === "canceled").length,
      monthlyRecurringRevenueCents: 0,
      totalClients: serializedOrganizations.reduce((total, organization) => total + organization.counts.clients, 0)
    },
    organizations: serializedOrganizations
  };
}

export function serializeAdminOrganizationDetail(record: AdminOrganizationDetailRecord) {
  const summary = serializeAdminOrganization(record);

  return {
    ...summary,
    deletedAt: toNullableIsoString(record.deletedAt),
    stripeConnect: {
      status: record.stripeConnectStatus,
      accountIdPresent: Boolean(record.stripeConnectAccountId)
    },
    team: record.memberships.map((membership) => ({
      role: membership.role.toLowerCase(),
      status: membership.status.toLowerCase(),
      name: membership.user.name,
      email: membership.user.email
    })),
    clients: record.clients.map((client) => ({
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      email: client.email,
      phone: client.phone,
      status: client.status.toLowerCase(),
      packageName: client.packageName,
      compliance: client.compliance,
      timezone: client.timezone,
      startDate: toNullableIsoString(client.startDate),
      latestCheckInAt: toNullableIsoString(client.latestCheckInAt),
      createdAt: toIsoString(client.createdAt),
      primaryCoach: client.primaryCoach
        ? {
            name: client.primaryCoach.name,
            email: client.primaryCoach.email
          }
        : null
    })),
    packages: record.packages.map((coachingPackage) => ({
      id: coachingPackage.id,
      name: coachingPackage.name,
      description: coachingPackage.description,
      priceAmount: coachingPackage.priceAmount,
      currency: coachingPackage.currency,
      billingInterval: coachingPackage.billingInterval.toLowerCase(),
      status: coachingPackage.status.toLowerCase(),
      stripeProductIdPresent: Boolean(coachingPackage.stripeProductId),
      stripePriceIdPresent: Boolean(coachingPackage.stripePriceId),
      subscriptions: coachingPackage._count.subscriptions,
      createdAt: toIsoString(coachingPackage.createdAt),
      updatedAt: toIsoString(coachingPackage.updatedAt),
      createdBy: coachingPackage.createdBy
        ? {
            name: coachingPackage.createdBy.name,
            email: coachingPackage.createdBy.email
          }
        : null
    })),
    auditLogs: record.auditLogs.map((auditLog) => ({
      id: auditLog.id,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      createdAt: toIsoString(auditLog.createdAt),
      actor: auditLog.actor
        ? {
            name: auditLog.actor.name,
            email: auditLog.actor.email
          }
        : null
    }))
  };
}

export function organizationStatusToApi(status: OrganizationStatus) {
  return status.toLowerCase() as "active" | "suspended" | "archived";
}

export function subscriptionStatusToApi(status: ClientSubscriptionStatus) {
  return status.toLowerCase().replace(/_/g, "-") as
    | "incomplete"
    | "incomplete-expired"
    | "trialing"
    | "active"
    | "past-due"
    | "canceled"
    | "unpaid"
    | "paused";
}

function toNullableIsoString(value: Date | string | null) {
  return value ? toIsoString(value) : null;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
