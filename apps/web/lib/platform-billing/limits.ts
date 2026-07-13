import { ClientStatus, MembershipRole, MembershipStatus, TeamInvitationStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { getDefaultPlatformPlan, getPlatformPlanById, type PlatformPlan } from "@/lib/platform-billing/plans";

export class PlatformLimitError extends Error {
  constructor(
    readonly code: "platform_client_limit_reached" | "platform_coach_seat_limit_reached",
    message: string,
    readonly limit: number
  ) {
    super(message);
    this.name = "PlatformLimitError";
  }
}

const teamSeatRoles: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COACH, MembershipRole.ASSISTANT];

export async function getOrganizationPlatformPlan(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { platformPlan: true }
  });

  return getPlatformPlanById(organization?.platformPlan) ?? getDefaultPlatformPlan();
}

export async function getPlatformUsage(organizationId: string) {
  const [coachSeats, clients] = await Promise.all([
    prisma.organizationMembership.count({
      where: {
        organizationId,
        status: MembershipStatus.ACTIVE,
        role: { in: teamSeatRoles }
      }
    }),
    prisma.client.count({
      where: {
        organizationId,
        deletedAt: null,
        status: { not: ClientStatus.ARCHIVED }
      }
    })
  ]);

  return { coachSeats, clients };
}

export async function assertPlatformClientCapacity(organizationId: string) {
  const plan = await getOrganizationPlatformPlan(organizationId);
  const clientCount = await prisma.client.count({
    where: {
      organizationId,
      deletedAt: null,
      status: { not: ClientStatus.ARCHIVED }
    }
  });

  if (clientCount >= plan.clientLimit) {
    throw new PlatformLimitError(
      "platform_client_limit_reached",
      `This organization has reached the ${plan.name} plan limit of ${plan.clientLimit} clients.`,
      plan.clientLimit
    );
  }
}

export async function assertPlatformCoachSeatCapacity(organizationId: string) {
  const plan = await getOrganizationPlatformPlan(organizationId);
  const [activeSeatCount, pendingInvitationCount] = await Promise.all([
    prisma.organizationMembership.count({
      where: {
        organizationId,
        status: MembershipStatus.ACTIVE,
        role: { in: teamSeatRoles }
      }
    }),
    prisma.teamInvitation.count({
      where: {
        organizationId,
        status: TeamInvitationStatus.PENDING,
        expiresAt: { gt: new Date() }
      }
    })
  ]);
  const coachSeatCount = activeSeatCount + pendingInvitationCount;

  if (coachSeatCount >= plan.coachSeatLimit) {
    throw new PlatformLimitError(
      "platform_coach_seat_limit_reached",
      `This organization has reached the ${plan.name} plan limit of ${plan.coachSeatLimit} coach seats.`,
      plan.coachSeatLimit
    );
  }
}

export async function assertPlatformTeamSeatAvailableForAcceptance(organizationId: string) {
  const plan = await getOrganizationPlatformPlan(organizationId);
  const activeSeatCount = await prisma.organizationMembership.count({
    where: {
      organizationId,
      status: MembershipStatus.ACTIVE,
      role: { in: teamSeatRoles }
    }
  });

  if (activeSeatCount >= plan.coachSeatLimit) {
    throw new PlatformLimitError(
      "platform_coach_seat_limit_reached",
      `This organization has reached the ${plan.name} plan limit of ${plan.coachSeatLimit} team seats.`,
      plan.coachSeatLimit
    );
  }
}

export function serializePlanUsage(plan: PlatformPlan, usage: { coachSeats: number; clients: number }) {
  return {
    plan,
    usage: {
      coachSeats: usage.coachSeats,
      clients: usage.clients,
      coachSeatLimit: plan.coachSeatLimit,
      clientLimit: plan.clientLimit
    }
  };
}
