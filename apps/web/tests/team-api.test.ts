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
    organizationMembership: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
    teamInvitation: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
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
  });

  it("lists organization-scoped members and pending invitations", async () => {
    mocks.prisma.organizationMembership.findMany.mockResolvedValue([membershipRecord]);
    mocks.prisma.teamInvitation.findMany.mockResolvedValue([]);

    const response = await listTeamMembers();
    const payload = (await response.json()) as { data: { members: unknown[]; invitations: unknown[] } };

    expect(response.status).toBe(200);
    expect(payload.data.members).toHaveLength(1);
    expect(mocks.prisma.organizationMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org_1" } })
    );
    expect(mocks.prisma.teamInvitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_1" })
      })
    );
  });

  it("creates a secure pending invitation and audit event", async () => {
    mocks.prisma.teamInvitation.findFirst.mockResolvedValue(null);
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
        tokenHash: expect.not.stringContaining(payload.data.token)
      })
    });
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

  it("accepts an invitation only for the authenticated matching email", async () => {
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
      where: { id: "membership_2" },
      data: { role: MembershipRole.ADMIN },
      include: { user: true }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "membership.role_changed" })
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
      where: { id: "membership_2" },
      data: { status: MembershipStatus.REMOVED }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "membership.removed" })
      })
    );
  });
});
