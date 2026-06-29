import { beforeEach, describe, expect, it, vi } from "vitest";

import { MembershipRole, MembershipStatus } from "@/app/generated/prisma/enums";
import { POST as createCoachAccount } from "@/app/api/auth/sign-up/route";

const mocks = vi.hoisted(() => ({
  hash: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    organization: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    organizationMembership: {
      create: vi.fn()
    },
    client: { create: vi.fn() },
    lead: { create: vi.fn() },
    task: { create: vi.fn() },
    trainingProgramTemplate: { create: vi.fn() },
    mealPlanTemplate: { create: vi.fn() },
    supplementPlanTemplate: { create: vi.fn() },
    form: { create: vi.fn() },
    message: { create: vi.fn() },
    coachingPackage: { create: vi.fn() },
    socialPost: { create: vi.fn() },
    auditLog: { create: vi.fn() }
  }
}));

vi.mock("bcryptjs", () => ({
  hash: mocks.hash
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

const transactionModels = {
  user: mocks.prisma.user,
  organization: mocks.prisma.organization,
  organizationMembership: mocks.prisma.organizationMembership,
  client: mocks.prisma.client,
  lead: mocks.prisma.lead,
  task: mocks.prisma.task,
  trainingProgramTemplate: mocks.prisma.trainingProgramTemplate,
  mealPlanTemplate: mocks.prisma.mealPlanTemplate,
  supplementPlanTemplate: mocks.prisma.supplementPlanTemplate,
  form: mocks.prisma.form,
  message: mocks.prisma.message,
  coachingPackage: mocks.prisma.coachingPackage,
  socialPost: mocks.prisma.socialPost,
  auditLog: mocks.prisma.auditLog
};

function signUpRequest(body: unknown) {
  return new Request("http://test.local/api/auth/sign-up", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

describe("POST /api/auth/sign-up", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(transactionModels));
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    mocks.prisma.organization.findUnique.mockResolvedValue(null);
    mocks.prisma.user.create.mockResolvedValue({
      id: "user_new",
      name: "Marcus Coach",
      email: "marcus@example.com"
    });
    mocks.prisma.organization.create.mockResolvedValue({
      id: "org_new",
      name: "MCP Coaching",
      slug: "mcp-coaching",
      timezone: "Australia/Melbourne"
    });
    mocks.prisma.organizationMembership.create.mockResolvedValue({
      id: "membership_new",
      organizationId: "org_new",
      userId: "user_new",
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE
    });
  });

  it("creates only the clean-slate organization bootstrap records", async () => {
    const response = await createCoachAccount(
      signUpRequest({
        name: "Marcus Coach",
        email: "Marcus@Example.com",
        password: "correct-password",
        organizationName: "MCP Coaching",
        timezone: "Australia/Melbourne"
      })
    );
    const payload = (await response.json()) as {
      data: {
        user: { id: string; email: string; name: string };
        organization: { id: string; slug: string; name: string };
      };
    };

    expect(response.status).toBe(201);
    expect(payload.data).toEqual({
      user: {
        id: "user_new",
        email: "marcus@example.com",
        name: "Marcus Coach"
      },
      organization: {
        id: "org_new",
        slug: "mcp-coaching",
        name: "MCP Coaching"
      }
    });
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "marcus@example.com" },
      select: { id: true }
    });
    expect(mocks.hash).toHaveBeenCalledWith("correct-password", 12);
    expect(mocks.prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: "Marcus Coach",
        email: "marcus@example.com",
        passwordHash: "hashed-password",
        authProvider: "credentials"
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    expect(mocks.prisma.organization.create).toHaveBeenCalledWith({
      data: {
        name: "MCP Coaching",
        slug: "mcp-coaching",
        timezone: "Australia/Melbourne"
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    });
    expect(mocks.prisma.organizationMembership.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org_new",
        userId: "user_new",
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
        joinedAt: expect.any(Date)
      }
    });
    expect(mocks.prisma.client.create).not.toHaveBeenCalled();
    expect(mocks.prisma.lead.create).not.toHaveBeenCalled();
    expect(mocks.prisma.task.create).not.toHaveBeenCalled();
    expect(mocks.prisma.trainingProgramTemplate.create).not.toHaveBeenCalled();
    expect(mocks.prisma.mealPlanTemplate.create).not.toHaveBeenCalled();
    expect(mocks.prisma.supplementPlanTemplate.create).not.toHaveBeenCalled();
    expect(mocks.prisma.form.create).not.toHaveBeenCalled();
    expect(mocks.prisma.message.create).not.toHaveBeenCalled();
    expect(mocks.prisma.coachingPackage.create).not.toHaveBeenCalled();
    expect(mocks.prisma.socialPost.create).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects existing emails without creating a new organization", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "existing_user" });

    const response = await createCoachAccount(
      signUpRequest({
        name: "Marcus Coach",
        email: "marcus@example.com",
        password: "correct-password",
        organizationName: "MCP Coaching"
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("email_already_registered");
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
    expect(mocks.prisma.organization.create).not.toHaveBeenCalled();
    expect(mocks.prisma.organizationMembership.create).not.toHaveBeenCalled();
  });

  it("uses a deterministic slug suffix when the first organization slug is already taken", async () => {
    mocks.prisma.organization.findUnique.mockResolvedValueOnce({ id: "existing_org" }).mockResolvedValueOnce(null);

    const response = await createCoachAccount(
      signUpRequest({
        name: "Marcus Coach",
        email: "marcus@example.com",
        password: "correct-password",
        organizationName: "MCP Coaching"
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.prisma.organization.findUnique).toHaveBeenNthCalledWith(1, {
      where: { slug: "mcp-coaching" },
      select: { id: true }
    });
    expect(mocks.prisma.organization.findUnique).toHaveBeenNthCalledWith(2, {
      where: { slug: "mcp-coaching-2" },
      select: { id: true }
    });
    expect(mocks.prisma.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "mcp-coaching-2" })
      })
    );
  });

  it("validates required sign-up fields before hashing or writing records", async () => {
    const response = await createCoachAccount(
      signUpRequest({
        name: "",
        email: "not-an-email",
        password: "short",
        organizationName: ""
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
