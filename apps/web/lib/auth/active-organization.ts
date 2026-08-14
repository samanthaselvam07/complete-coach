import { MembershipStatus, OrganizationStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";

export function findActiveOrganizationMembershipForUser(userId: string) {
  return prisma.organizationMembership.findFirst({
    where: {
      userId,
      status: MembershipStatus.ACTIVE,
      organization: {
        status: OrganizationStatus.ACTIVE,
        deletedAt: null
      }
    },
    select: {
      organizationId: true,
      role: true,
      organization: {
        select: {
          slug: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}

export function findActiveOrganizationClientForUser(userId: string) {
  return prisma.client.findFirst({
    where: {
      clientUserId: userId,
      deletedAt: null,
      organization: {
        status: OrganizationStatus.ACTIVE,
        deletedAt: null
      }
    },
    select: {
      organizationId: true,
      organization: {
        select: {
          slug: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}
