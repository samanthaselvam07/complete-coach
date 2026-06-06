import { describe, expect, it } from "vitest";

import { MembershipRole, MembershipStatus } from "@/app/generated/prisma/enums";
import {
  createTeamInvitationSchema,
  getInvitationCreateData,
  getMembershipUpdateData,
  hashInvitationToken,
  serializeTeamInvitation,
  serializeTeamMember,
  updateTeamMemberSchema
} from "@/lib/team/team-records";

const now = new Date("2026-06-06T00:00:00.000Z");

describe("team record helpers", () => {
  it("normalizes invitation email and maps roles", () => {
    const input = createTeamInvitationSchema.parse({
      email: " Coach@Example.com ",
      role: "coach"
    });

    expect(input).toEqual({
      email: "coach@example.com",
      role: "coach"
    });
    expect(
      getInvitationCreateData("org_1", "user_1", input, "token_hash", now)
    ).toEqual({
      organizationId: "org_1",
      email: "coach@example.com",
      role: MembershipRole.COACH,
      tokenHash: "token_hash",
      invitedByUserId: "user_1",
      expiresAt: now
    });
  });

  it("rejects client and owner invitations", () => {
    expect(() =>
      createTeamInvitationSchema.parse({ email: "client@example.com", role: "client" })
    ).toThrow();
    expect(() =>
      createTeamInvitationSchema.parse({ email: "owner@example.com", role: "owner" })
    ).toThrow();
  });

  it("hashes invitation tokens without retaining the raw token", () => {
    expect(hashInvitationToken("raw-secret-token")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashInvitationToken("raw-secret-token")).not.toContain("raw-secret-token");
  });

  it("maps partial membership updates", () => {
    const input = updateTeamMemberSchema.parse({
      role: "admin",
      status: "suspended"
    });

    expect(getMembershipUpdateData(input)).toEqual({
      role: MembershipRole.ADMIN,
      status: MembershipStatus.SUSPENDED
    });
    expect(getMembershipUpdateData(updateTeamMemberSchema.parse({ role: "coach" }))).toEqual({
      role: MembershipRole.COACH
    });
    expect(getMembershipUpdateData(updateTeamMemberSchema.parse({ status: "active" }))).toEqual({
      status: MembershipStatus.ACTIVE
    });
  });

  it("serializes team members and invitations without token hashes", () => {
    expect(
      serializeTeamMember({
        id: "membership_1",
        role: MembershipRole.COACH,
        status: MembershipStatus.ACTIVE,
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
        user: {
          id: "user_2",
          name: "Alex Coach",
          email: "alex@example.com",
          image: null
        }
      })
    ).toEqual(
      expect.objectContaining({
        id: "membership_1",
        role: "coach",
        status: "active",
        email: "alex@example.com"
      })
    );

    const invitation = serializeTeamInvitation({
      id: "invitation_1",
      email: "new@example.com",
      role: MembershipRole.ASSISTANT,
      status: "PENDING",
      expiresAt: now,
      createdAt: now,
      updatedAt: now
    });

    expect(invitation).toEqual(
      expect.objectContaining({
        id: "invitation_1",
        role: "assistant",
        status: "pending"
      })
    );
    expect(invitation).not.toHaveProperty("tokenHash");

    expect(
      serializeTeamMember({
        id: "membership_2",
        role: MembershipRole.ASSISTANT,
        status: MembershipStatus.INVITED,
        joinedAt: null,
        createdAt: "2026-06-06T00:00:00.000Z",
        updatedAt: "2026-06-06T00:00:00.000Z",
        user: {
          id: "user_3",
          name: null,
          email: null,
          image: null
        }
      }).joinedAt
    ).toBeNull();
  });
});
