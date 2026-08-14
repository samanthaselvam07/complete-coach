import type { ActiveOrganizationSession } from "@/types/next-auth";
import { findActiveOrganizationClientForUser, findActiveOrganizationMembershipForUser } from "@/lib/auth/active-organization";
import type { MembershipRole } from "@/lib/auth/permissions";
import { evaluatePlatformBillingAccess } from "@/lib/platform-billing/rules";

interface ActiveOrganizationMembership {
  organizationId: string;
  role: { toString(): string };
  organization: {
    slug: string;
    name: string;
    platformSubscriptionStatus?: string | null;
    founderOnboardingRequired?: boolean;
    founderOnboardingCompletedAt?: Date | null;
  };
}

interface ActiveOrganizationClient {
  organizationId: string;
  organization: ActiveOrganizationMembership["organization"];
}

export function createActiveOrganizationSession(membership: ActiveOrganizationMembership): ActiveOrganizationSession {
  return {
    id: membership.organizationId,
    slug: membership.organization.slug,
    name: membership.organization.name,
    role: membership.role.toString().toLowerCase() as MembershipRole,
    platformAccess: evaluatePlatformBillingAccess(membership.organization.platformSubscriptionStatus),
    founderOnboardingRequired: Boolean(membership.organization.founderOnboardingRequired),
    founderOnboardingCompleted: Boolean(membership.organization.founderOnboardingCompletedAt)
  };
}

export async function resolveActiveOrganizationSessionForUser(userId: string) {
  const membership = await findActiveOrganizationMembershipForUser(userId);

  if (membership) {
    return createActiveOrganizationSession(membership);
  }

  const client = await findActiveOrganizationClientForUser(userId);

  return client ? createClientOrganizationSession(client) : undefined;
}

function createClientOrganizationSession(client: ActiveOrganizationClient): ActiveOrganizationSession {
  return {
    id: client.organizationId,
    slug: client.organization.slug,
    name: client.organization.name,
    role: "client",
    platformAccess: evaluatePlatformBillingAccess(client.organization.platformSubscriptionStatus),
    founderOnboardingRequired: false,
    founderOnboardingCompleted: true
  };
}
