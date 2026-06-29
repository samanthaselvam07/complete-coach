import { beforeEach, describe, expect, it, vi } from "vitest";

import { MembershipStatus, OrganizationStatus } from "@/app/generated/prisma/enums";
import { findActiveOrganizationMembershipForUser } from "@/lib/auth/active-organization";

const mocks = vi.hoisted(() => ({
  prisma: {
    organizationMembership: {
      findFirst: vi.fn()
    }
  }
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

describe("active organization membership lookup", () => {
  beforeEach(() => {
    mocks.prisma.organizationMembership.findFirst.mockReset();
  });

  it("only selects active memberships for active, non-deleted organizations", async () => {
    mocks.prisma.organizationMembership.findFirst.mockResolvedValue(null);

    await findActiveOrganizationMembershipForUser("user_1");

    expect(mocks.prisma.organizationMembership.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
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
  });
});
