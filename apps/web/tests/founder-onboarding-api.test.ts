import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/v1/onboarding/founder/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  sendTransactionalEmail: vi.fn(),
  prisma: {
    organization: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: mocks.sendTransactionalEmail
}));

const ownerSession = {
  user: { id: "user_1", name: "Sammi Szalinski", email: "samantha@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner",
    founderOnboardingRequired: true,
    founderOnboardingCompleted: false
  }
};

const incompleteOrganization = {
  id: "org_1",
  name: "Complete Coach Demo",
  founderOnboardingRequired: true,
  founderOnboardingCompletedAt: null,
  founderOnboardingFocus: null,
  founderOnboardingRosterSize: null,
  founderOnboardingPlatform: null,
  founderOnboardingOtherPlatform: null
};

function completionRequest(body: unknown) {
  return new Request("http://test.local/api/v1/onboarding/founder", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

describe("founder onboarding API", () => {
  beforeEach(() => {
    delete process.env.FOUNDER_ONBOARDING_FROM_EMAIL;
    delete process.env.FOUNDER_ONBOARDING_NOTIFY_EMAIL;
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.sendTransactionalEmail.mockResolvedValue({ id: "email_delivery_1" });
    mocks.prisma.organization.findUniqueOrThrow.mockResolvedValue(incompleteOrganization);
    mocks.prisma.organization.update.mockResolvedValue({
      ...incompleteOrganization,
      founderOnboardingCompletedAt: new Date("2026-08-14T00:00:00.000Z"),
      founderOnboardingFocus: "Fat loss",
      founderOnboardingRosterSize: "6 to 15",
      founderOnboardingPlatform: "Kahunas"
    });
    mocks.prisma.auditLog.create.mockResolvedValue({ id: "audit_1" });
  });

  it("returns the current first-login onboarding state", async () => {
    const response = await GET();
    const payload = (await response.json()) as {
      data: { firstName: string; required: boolean; completed: boolean };
    };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(
      expect.objectContaining({
        firstName: "Sammi",
        required: true,
        completed: false
      })
    );
    expect(mocks.prisma.organization.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "org_1" },
      select: expect.objectContaining({
        founderOnboardingRequired: true,
        founderOnboardingCompletedAt: true
      })
    });
  });

  it("persists completion answers, audits, and sends the personalized completion email once", async () => {
    const response = await POST(
      completionRequest({
        focus: "Fat loss",
        rosterSize: "6 to 15",
        platform: "Kahunas"
      })
    );
    const payload = (await response.json()) as { data: { completed: boolean; firstName: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(expect.objectContaining({ completed: true, firstName: "Sammi" }));
    expect(mocks.prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: expect.objectContaining({
        founderOnboardingRequired: true,
        founderOnboardingFocus: "Fat loss",
        founderOnboardingRosterSize: "6 to 15",
        founderOnboardingPlatform: "Kahunas",
        founderOnboardingOtherPlatform: null,
        founderOnboardingCompletedAt: expect.any(Date)
      }),
      select: expect.any(Object)
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        actorUserId: "user_1",
        action: "founder_onboarding.completed"
      })
    });
    expect(mocks.sendTransactionalEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        toEmail: "samantha@example.com",
        fromEmail: "Sammi Szalinski <info@completecoach.fit>",
        subject: "Your Complete Coach account is ready",
        text: expect.stringContaining("Hi Sammi,")
      })
    );
  });

  it("does not resend email or audit when onboarding is already complete", async () => {
    mocks.prisma.organization.findUniqueOrThrow.mockResolvedValue({
      ...incompleteOrganization,
      founderOnboardingCompletedAt: new Date("2026-08-14T00:00:00.000Z"),
      founderOnboardingFocus: "General fitness",
      founderOnboardingRosterSize: "1 to 5",
      founderOnboardingPlatform: "Trainerize"
    });

    const response = await POST(
      completionRequest({
        focus: "Fat loss",
        rosterSize: "6 to 15",
        platform: "Kahunas"
      })
    );
    const payload = (await response.json()) as { data: { completed: boolean } };

    expect(response.status).toBe(200);
    expect(payload.data.completed).toBe(true);
    expect(mocks.prisma.organization.update).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("requires the other platform name when Other is selected", async () => {
    const response = await POST(
      completionRequest({
        focus: "Fat loss",
        rosterSize: "6 to 15",
        platform: "Other"
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("validation_failed");
    expect(mocks.prisma.organization.update).not.toHaveBeenCalled();
  });
});
