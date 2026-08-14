import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PATCH } from "@/app/api/v1/coach-profile/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hash: vi.fn(),
  prisma: {
    $queryRaw: vi.fn(),
    auditLog: { create: vi.fn() },
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("bcryptjs", () => ({
  hash: mocks.hash
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

const ownerSession = {
  user: { id: "user_1", email: "coach@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "mcp-coaching",
    name: "MCP Coaching",
    role: "owner"
  }
};

const userRecord = {
  id: "user_1",
  name: "Marcus Coach",
  email: "coach@example.com",
  image: "marcus.jpg"
};

const profileRow = {
  professional_title: "Head Performance Coach",
  phone: "+61 400 123 456",
  photo_file_name: "marcus.jpg",
  bio: "Evidence-led coaching bio.",
  philosophy: "Measure what matters.",
  specialities_json: ["Strength", "Nutrition"],
  credentials_json: [
    {
      id: "credential_1",
      title: "CSCS",
      institution: "NSCA",
      completedAt: "2024-01-02",
      credentialId: "CSCS-1",
      fileName: "certificate.pdf"
    }
  ],
  client_capacity_limit: 52
};

function patchRequest(body: unknown) {
  return new Request("http://test.local/api/v1/coach-profile", {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

describe("coach profile API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.prisma.auditLog.create.mockResolvedValue({});
    mocks.prisma.user.findUnique.mockResolvedValue(userRecord);
    mocks.prisma.user.update.mockResolvedValue(userRecord);
    mocks.prisma.$queryRaw.mockResolvedValue([profileRow]);
  });

  it("returns the signed-in coach profile for the active organization", async () => {
    const response = await GET();
    const payload = (await response.json()) as { data: unknown };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({
      name: "Marcus Coach",
      email: "coach@example.com",
      professionalTitle: "Head Performance Coach",
      phone: "+61 400 123 456",
      photoFileName: "marcus.jpg",
      bio: "Evidence-led coaching bio.",
      philosophy: "Measure what matters.",
      specialities: ["Strength", "Nutrition"],
      credentials: profileRow.credentials_json,
      clientCapacityLimit: 52
    });
    expect(mocks.prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("saves account and coach profile fields without returning the password", async () => {
    const response = await PATCH(
      patchRequest({
        name: "Marcus Chen",
        email: "marcus@example.com",
        professionalTitle: "Founder Coach",
        phone: "+61 411 222 333",
        photoFileName: "new-photo.jpg",
        bio: "Updated bio",
        philosophy: "Updated philosophy",
        clientCapacityLimit: 64,
        specialities: ["Hypertrophy"],
        credentials: [
          {
            id: "credential_2",
            title: "PN1",
            institution: "Precision Nutrition",
            completedAt: "2025-02-03",
            credentialId: "PN-1",
            fileName: "pn.pdf"
          }
        ],
        password: "new-password"
      })
    );
    const payloadText = await response.text();

    expect(response.status).toBe(200);
    expect(payloadText).not.toContain("new-password");
    expect(payloadText).not.toContain("hashed-password");
    expect(mocks.hash).toHaveBeenCalledWith("new-password", 12);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: expect.objectContaining({
        name: "Marcus Chen",
        email: "marcus@example.com",
        image: "new-photo.jpg",
        passwordHash: "hashed-password",
        authProvider: "credentials"
      })
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        actorUserId: "user_1",
        action: "coach.profile_updated",
        metadata: { updatedPassword: true }
      })
    });
    expect(JSON.stringify(mocks.prisma.$queryRaw.mock.calls[1]?.[0])).toContain("64");
  });

  it("preserves existing coach profile fields when the account settings page saves only account fields", async () => {
    await PATCH(
      patchRequest({
        name: "Marcus Chen",
        email: "marcus@example.com",
        professionalTitle: "Head Performance Coach",
        phone: "+61 411 222 333"
      })
    );

    const upsertSql = JSON.stringify(mocks.prisma.$queryRaw.mock.calls[1]?.[0]);

    expect(upsertSql).toContain("Evidence-led coaching bio.");
    expect(upsertSql).toContain("Measure what matters.");
    expect(upsertSql).toContain("Strength");
    expect(upsertSql).toContain("certificate.pdf");
    expect(upsertSql).toContain("52");
  });

  it("rejects duplicate email updates without saving profile details", async () => {
    mocks.prisma.user.update.mockRejectedValueOnce({ code: "P2002" });

    const response = await PATCH(patchRequest({ email: "taken@example.com" }));
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("email_already_exists");
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
