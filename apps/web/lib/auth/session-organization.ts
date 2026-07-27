import type { ActiveOrganizationSession } from "@/types/next-auth";
import { findActiveOrganizationMembershipForUser } from "@/lib/auth/active-organization";
import type { MembershipRole } from "@/lib/auth/permissions";
import { evaluatePlatformBillingAccess } from "@/lib/platform-billing/rules";

interface ActiveOrganizationMembership {
  organizationId: string;
  role: { toString(): string };
  organization: {
    slug: string;
    name: string;
    platformSubscriptionStatus?: string | null;
  };
}

export function createActiveOrganizationSession(membership: ActiveOrganizationMembership): ActiveOrganizationSession {
  return {
    id: membership.organizationId,
    slug: membership.organization.slug,
    name: membership.organization.name,
    role: membership.role.toString().toLowerCase() as MembershipRole,
    platformAccess: evaluatePlatformBillingAccess(membership.organization.platformSubscriptionStatus)
  };
}

export async function resolveActiveOrganizationSessionForUser(userId: string) {
  const membership = await findActiveOrganizationMembershipForUser(userId);

  return membership ? createActiveOrganizationSession(membership) : undefined;
}
