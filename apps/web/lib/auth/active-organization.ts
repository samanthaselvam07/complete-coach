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
    include: {
      organization: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}
