import { beforeEach, describe, expect, it, vi } from "vitest";

import { MembershipRole, MembershipStatus } from "@/app/generated/prisma/enums";
import { GET as listTeamMembers } from "@/app/api/v1/team-members/route";
import { POST as createInvitation } from "@/app/api/v1/team-members/invitations/route";
import { POST as acceptInvitation } from "@/app/api/v1/team-invitations/accept/route";
import {
  DELETE as removeTeamMember,
  PATCH as updateTeamMember
} from "@/app/api/v1/team-members/[membershipId]/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  randomBytes: vi.fn(),
  sendTransactionalEmail: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    organization: {
      findUnique: vi.fn()
    },
    organizationMembership: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
    teamInvitation: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
    client: {
      groupBy: vi.fn()
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn()
  }
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomBytes: mocks.randomBytes };
});
vi.mock("@/lib/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: mocks.sendTransactionalEmail
}));

const ownerSession = {
  user: { id: "user_1", email: "owner@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner"
  }
};

const coachSession = {
  ...ownerSession,
  activeOrganization: {
    ...ownerSession.activeOrganization,
    role: "coach"
  }
};

const now = new Date("2026-06-06T00:00:00.000Z");
const membershipRecord = {
  id: "membership_2",
  organizationId: "org_1",
  userId: "user_2",
  role: MembershipRole.COACH,
  status: MembershipStatus.ACTIVE,
  invitedByUserId: "user_1",
  joinedAt: now,
  createdAt: now,
  updatedAt: now,
  user: {
    id: "user_2",
    name: "Alex Coach",
    email: "alex@example.com",
    image: null
  }
};

describe("team management APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.randomBytes.mockReturnValue(Buffer.from("a".repeat(32)));
    mocks.sendTransactionalEmail.mockResolvedValue({ status: "sent" });
    mocks.prisma.organization.findUnique.mockReset();
    mocks.prisma.teamInvitation.count.mockReset();
    mocks.prisma.client.groupBy.mockReset();
    mocks.prisma.$queryRaw.mockReset();
    mocks.prisma.$queryRaw.mockResolvedValue([]);
  });

  it("lists organization-scoped members with active client capacity and pending invitations", async () => {
    mocks.prisma.organizationMembership.findMany.mockResolvedValue([
      { ...membershipRecord, id: "membership_owner", userId: "user_owner", role: MembershipRole.OWNER, user: { ...membershipRecord.user, id: "user_owner", email: "owner@example.com" } },
      { ...membershipRecord, id: "membership_admin", userId: "user_admin", role: MembershipRole.ADMIN, user: { ...membershipRecord.user, id: "user_admin", email: "admin@example.com" } },
      membershipRecord,
      { ...membershipRecord, id: "membership_assistant", userId: "user_assistant", role: MembershipRole.ASSISTANT, user: { ...membershipRecord.user, id: "user_assistant", email: "assistant@example.com" } }
    ]);
    mocks.prisma.teamInvitation.findMany.mockResolvedValue([]);
    mocks.prisma.client.groupBy.mockResolvedValue([
      { primaryCoachUserId: "user_owner", _count: { _all: 44 } },
      { primaryCoachUserId: "user_admin", _count: { _all: 40 } },
      { primaryCoachUserId: "user_2", _count: { _all: 18 } },
      { primaryCoachUserId: "user_assistant", _count: { _all: 3 } }
    ]);
    mocks.prisma.$queryRaw.mockResolvedValue([
      { user_id: "user_owner", client_capacity_limit: 60 },
      { user_id: "user_2", client_capacity_limit: 25 }
    ]);

    const response = await listTeamMembers();
    const payload = (await response.json()) as {
      data: {
        members: Array<{
          userId: string;
          activeClientCount: number;
          capacityLimit: number;
          capacityPercent: number;
        }>;
        invitations: unknown[];
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.members).toHaveLength(4);
    expect(payload.data.members[0]).toEqual(
      expect.objectContaining({
        userId: "user_owner",
        activeClientCount: 44,
        capacityLimit: 60,
        capacityPercent: 73
      })
    );
    expect(payload.data.members[1]).toEqual(expect.objectContaining({ userId: "user_admin", capacityLimit: 40, capacityPercent: 100 }));
    expect(payload.data.members[2]).toEqual(expect.objectContaining({ userId: "user_2", capacityLimit: 25, capacityPercent: 72 }));
    expect(payload.data.members[3]).toEqual(expect.objectContaining({ userId: "user_assistant", capacityLimit: 0, capacityPercent: 0 }));
    expect(mocks.prisma.organizationMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org_1" } })
    );
    expect(mocks.prisma.client.groupBy).toHaveBeenCalledWith({
      by: ["primaryCoachUserId"],
      where: {
        organizationId: "org_1",
        status: "ACTIVE",
        deletedAt: null,
        primaryCoachUserId: { not: null }
      },
      _count: { _all: true }
    });
    expect(mocks.prisma.teamInvitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_1" })
      })
    );
  });

  it("creates a secure pending invitation and audit event", async () => {
    mocks.prisma.teamInvitation.findFirst.mockResolvedValue(null);
    mocks.prisma.organization.findUnique.mockResolvedValue({ platformPlan: "scale" });
    mocks.prisma.organizationMembership.count.mockResolvedValue(1);
    mocks.prisma.teamInvitation.count.mockResolvedValue(0);
    mocks.prisma.teamInvitation.create.mockImplementation(({ data }) => ({
      id: "invitation_1",
      ...data,
      status: "PENDING",
      createdAt: now,
      updatedAt: now
    }));

    const response = await createInvitation(
      new Request("http://test.local/api/v1/team-members/invitations", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", role: "assistant" })
      })
    );
    const payload = (await response.json()) as { data: { invitation: { id: string }; token: string } };

    expect(response.status).toBe(201);
    expect(payload.data.invitation.id).toBe("invitation_1");
    expect(payload.data.token).toBeTruthy();
    expect(mocks.prisma.teamInvitation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        email: "new@example.com",
        role: MembershipRole.ASSISTANT,
        invitedByUserId: "user_1",
        tokenHash: expect.not.stringContaining(payload.data.token),
        expiresAt: expect.any(Date)
      })
    });
    const invitationData = mocks.prisma.teamInvitation.create.mock.calls[0][0].data;
    expect(invitationData.expiresAt.getTime()).toBeGreaterThanOrEqual(Date.now() + 7 * 24 * 60 * 60 * 1_000 - 2_000);
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "membership.invited" })
      })
    );
    expect(mocks.sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        toEmail: "new@example.com",
        subject: expect.stringContaining("Complete Coach Demo"),
        text: expect.stringContaining("/team-invitations/accept?token=")
      })
    );
  });

  it("rejects duplicate pending invitations", async () => {
    mocks.prisma.teamInvitation.findFirst.mockResolvedValue({ id: "existing" });

    const response = await createInvitation(
      new Request("http://test.local/api/v1/team-members/invitations", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", role: "coach" })
      })
    );

    expect(response.status).toBe(409);
    expect(mocks.prisma.teamInvitation.create).not.toHaveBeenCalled();
  });

  it("blocks team invitations when active members and pending invites have reached the platform seat limit", async () => {
    mocks.prisma.teamInvitation.findFirst.mockResolvedValue(null);
    mocks.prisma.organization.findUnique.mockResolvedValue({ platformPlan: "core" });
    mocks.prisma.organizationMembership.count.mockResolvedValue(1);
    mocks.prisma.teamInvitation.count.mockResolvedValue(0);

    const response = await createInvitation(
      new Request("http://test.local/api/v1/team-members/invitations", {
        method: "POST",
        body: JSON.stringify({ email: "assistant-limit@example.com", role: "assistant" })
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("platform_coach_seat_limit_reached");
    expect(mocks.prisma.teamInvitation.create).not.toHaveBeenCalled();
  });

  it("accepts an invitation only for the authenticated matching email", async () => {
    mocks.prisma.organization.findUnique.mockResolvedValue({ platformPlan: "scale" });
    mocks.prisma.organizationMembership.count.mockResolvedValue(1);
    mocks.prisma.teamInvitation.findFirst.mockResolvedValue({
      id: "invitation_1",
      organizationId: "org_1",
      email: "owner@example.com",
      role: MembershipRole.COACH,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000)
    });
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        organizationMembership: {
          upsert: vi.fn().mockResolvedValue({
            ...membershipRecord,
            userId: "user_1",
            role: MembershipRole.COACH
          })
        },
        teamInvitation: {
          update: vi.fn().mockResolvedValue({})
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({})
        }
      })
    );

    const response = await acceptInvitation(
      new Request("http://test.local/api/v1/team-invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token: "invitation-token-that-is-long-enough-123" })
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("rejects expired invitations after the seven-day validity window", async () => {
    mocks.prisma.teamInvitation.findFirst.mockResolvedValue({
      id: "invitation_1",
      organizationId: "org_1",
      email: "owner@example.com",
      role: MembershipRole.COACH,
      status: "PENDING",
      expiresAt: new Date(Date.now() - 60_000)
    });

    const response = await acceptInvitation(
      new Request("http://test.local/api/v1/team-invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token: "invitation-token-that-is-long-enough-123" })
      })
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("blocks invitation acceptance when the organization is full", async () => {
    mocks.prisma.organization.findUnique.mockResolvedValue({ platformPlan: "core" });
    mocks.prisma.organizationMembership.count.mockResolvedValue(1);
    mocks.prisma.teamInvitation.findFirst.mockResolvedValue({
      id: "invitation_1",
      organizationId: "org_1",
      email: "owner@example.com",
      role: MembershipRole.COACH,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000)
    });

    const response = await acceptInvitation(
      new Request("http://test.local/api/v1/team-invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token: "invitation-token-that-is-long-enough-123" })
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("platform_coach_seat_limit_reached");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects invitation acceptance for a different authenticated email", async () => {
    mocks.prisma.teamInvitation.findFirst.mockResolvedValue({
      id: "invitation_1",
      organizationId: "org_1",
      email: "different@example.com",
      role: MembershipRole.COACH,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000)
    });

    const response = await acceptInvitation(
      new Request("http://test.local/api/v1/team-invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token: "invitation-token-that-is-long-enough-123" })
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("blocks team management for coaches", async () => {
    mocks.auth.mockResolvedValue(coachSession);

    const response = await createInvitation(
      new Request("http://test.local/api/v1/team-members/invitations", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", role: "coach" })
      })
    );

    expect(response.status).toBe(403);
  });

  it("updates organization-scoped member roles and writes an audit event", async () => {
    mocks.prisma.organizationMembership.findFirst.mockResolvedValue(membershipRecord);
    mocks.prisma.organizationMembership.update.mockResolvedValue({
      ...membershipRecord,
      role: MembershipRole.ADMIN
    });

    const response = await updateTeamMember(
      new Request("http://test.local/api/v1/team-members/membership_2", {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" })
      }),
      { params: Promise.resolve({ membershipId: "membership_2" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.organizationMembership.update).toHaveBeenCalledWith({
      where: { id: "membership_2", organizationId: "org_1" },
      data: { role: MembershipRole.ADMIN },
      include: { user: true }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "membership.role_changed" })
      })
    );
  });

  it("updates member status with a status audit event", async () => {
    mocks.prisma.organizationMembership.findFirst.mockResolvedValue(membershipRecord);
    mocks.prisma.organizationMembership.update.mockResolvedValue({
      ...membershipRecord,
      status: MembershipStatus.SUSPENDED
    });

    const response = await updateTeamMember(
      new Request("http://test.local/api/v1/team-members/membership_2", {
        method: "PATCH",
        body: JSON.stringify({ status: "suspended" })
      }),
      { params: Promise.resolve({ membershipId: "membership_2" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.organizationMembership.update).toHaveBeenCalledWith({
      where: { id: "membership_2", organizationId: "org_1" },
      data: { status: MembershipStatus.SUSPENDED },
      include: { user: true }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "membership.status_changed" })
      })
    );
  });

  it("prevents demoting the last active owner", async () => {
    mocks.prisma.organizationMembership.findFirst.mockResolvedValue({
      ...membershipRecord,
      role: MembershipRole.OWNER
    });
    mocks.prisma.organizationMembership.count.mockResolvedValue(1);

    const response = await updateTeamMember(
      new Request("http://test.local/api/v1/team-members/membership_2", {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" })
      }),
      { params: Promise.resolve({ membershipId: "membership_2" }) }
    );

    expect(response.status).toBe(409);
    expect(mocks.prisma.organizationMembership.update).not.toHaveBeenCalled();
  });

  it("soft-removes a member and audits the action", async () => {
    mocks.prisma.organizationMembership.findFirst.mockResolvedValue(membershipRecord);
    mocks.prisma.organizationMembership.update.mockResolvedValue({
      ...membershipRecord,
      status: MembershipStatus.REMOVED
    });

    const response = await removeTeamMember(
      new Request("http://test.local/api/v1/team-members/membership_2", {
        method: "DELETE"
      }),
      { params: Promise.resolve({ membershipId: "membership_2" }) }
    );

    expect(response.status).toBe(204);
    expect(mocks.prisma.organizationMembership.update).toHaveBeenCalledWith({
      where: { id: "membership_2", organizationId: "org_1" },
      data: { status: MembershipStatus.REMOVED }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "membership.removed" })
      })
    );
  });

  it("removes an owner when another active owner remains", async () => {
    mocks.prisma.organizationMembership.findFirst.mockResolvedValue({
      ...membershipRecord,
      role: MembershipRole.OWNER
    });
    mocks.prisma.organizationMembership.count.mockResolvedValue(2);
    mocks.prisma.organizationMembership.update.mockResolvedValue({
      ...membershipRecord,
      role: MembershipRole.OWNER,
      status: MembershipStatus.REMOVED
    });

    const response = await removeTeamMember(
      new Request("http://test.local/api/v1/team-members/membership_2", {
        method: "DELETE"
      }),
      { params: Promise.resolve({ membershipId: "membership_2" }) }
    );

    expect(response.status).toBe(204);
    expect(mocks.prisma.organizationMembership.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE
      }
    });
    expect(mocks.prisma.organizationMembership.update).toHaveBeenCalledWith({
      where: { id: "membership_2", organizationId: "org_1" },
      data: { status: MembershipStatus.REMOVED }
    });
  });
});
