import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PATCH } from "@/app/api/v1/coach-profile/route";
import { POST as uploadAccountPhoto } from "@/app/api/v1/coach-profile/photo-upload/route";
import { GET as getAccountPhotoUrl } from "@/app/api/v1/coach-profile/photo-url/route";
import {
  createAccountPhotoObjectUrl,
  validateAccountPhotoObjectKey
} from "@/lib/coach/account-photo-uploads";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hash: vi.fn(),
  fetch: vi.fn(),
  r2: {
    createR2PresignedGetUrl: vi.fn(),
    createR2PresignedPutUrl: vi.fn(),
    getR2Config: vi.fn()
  },
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

vi.mock("@/lib/storage/r2", () => ({
  createR2PresignedGetUrl: mocks.r2.createR2PresignedGetUrl,
  createR2PresignedPutUrl: mocks.r2.createR2PresignedPutUrl,
  getR2Config: mocks.r2.getR2Config
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

const missingCapacityColumnError = {
  code: "P2010",
  meta: {
    code: "42703",
    message: 'column "client_capacity_limit" does not exist'
  }
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
    global.fetch = mocks.fetch;
    mocks.fetch.mockReset();
    mocks.r2.createR2PresignedGetUrl.mockReset();
    mocks.r2.createR2PresignedPutUrl.mockReset();
    mocks.r2.getR2Config.mockReset();
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

  it("loads the profile with the default capacity while the capacity migration is still pending", async () => {
    mocks.prisma.$queryRaw.mockRejectedValueOnce(missingCapacityColumnError).mockResolvedValueOnce([
      {
        professional_title: "Head Performance Coach",
        phone: "+61 400 123 456",
        photo_file_name: "marcus.jpg",
        bio: "Evidence-led coaching bio.",
        philosophy: "Measure what matters.",
        specialities_json: ["Strength", "Nutrition"],
        credentials_json: profileRow.credentials_json
      }
    ]);

    const response = await GET();
    const payload = (await response.json()) as { data: { clientCapacityLimit: number } };

    expect(response.status).toBe(200);
    expect(payload.data.clientCapacityLimit).toBe(40);
    expect(mocks.prisma.$queryRaw).toHaveBeenCalledTimes(2);
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

  it("saves profile fields while the capacity migration is still pending", async () => {
    mocks.prisma.$queryRaw
      .mockResolvedValueOnce([profileRow])
      .mockRejectedValueOnce(missingCapacityColumnError)
      .mockResolvedValueOnce([
        {
          professional_title: "Founder Coach",
          phone: "+61 411 222 333",
          photo_file_name: "new-photo.jpg",
          bio: "Updated bio",
          philosophy: "Updated philosophy",
          specialities_json: ["Hypertrophy"],
          credentials_json: [],
          client_capacity_limit: null
        }
      ]);

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
        credentials: []
      })
    );
    const payload = (await response.json()) as { data: { professionalTitle: string; clientCapacityLimit: number } };

    expect(response.status).toBe(200);
    expect(payload.data.professionalTitle).toBe("Founder Coach");
    expect(payload.data.clientCapacityLimit).toBe(40);
    expect(mocks.prisma.$queryRaw).toHaveBeenCalledTimes(3);
    expect(mocks.prisma.auditLog.create).toHaveBeenCalled();
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

  it("uploads account photos into the active organization and user storage path", async () => {
    mocks.r2.getR2Config.mockReturnValue({
      endpoint: "https://r2.example",
      accessKeyId: "access",
      secretAccessKey: "secret",
      bucketName: "complete-coach"
    });
    mocks.r2.createR2PresignedPutUrl.mockReturnValue("https://r2.example/account-photo-upload");
    mocks.fetch.mockResolvedValue(new Response(null, { status: 200 }));

    const response = await uploadAccountPhoto(
      new Request("http://test.local/api/v1/coach-profile/photo-upload", {
        method: "POST",
        headers: {
          "content-type": "image/png",
          "x-filename": encodeURIComponent("profile.png")
        },
        body: new Blob(["photo-bytes"], { type: "image/png" })
      })
    );
    const payload = (await response.json()) as { data: { objectKey: string; photoUrl: string } };

    expect(response.status).toBe(200);
    expect(payload.data.objectKey).toMatch(/^organizations\/org_1\/users\/user_1\/account\/photos\/[0-9a-fA-F-]{36}\.png$/u);
    expect(payload.data.photoUrl).toBe(createAccountPhotoObjectUrl(payload.data.objectKey));
    expect(mocks.r2.createR2PresignedPutUrl).toHaveBeenCalledWith(
      expect.objectContaining({ bucketName: "complete-coach" }),
      expect.objectContaining({
        objectKey: payload.data.objectKey,
        contentType: "image/png",
        expiresInSeconds: 300
      })
    );
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://r2.example/account-photo-upload",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "image/png" }
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "coach.account_photo_uploaded",
        targetType: "account_photo",
        targetId: payload.data.objectKey
      })
    });
  });

  it("creates signed display URLs only for the active user's account photos", async () => {
    const objectKey = "organizations/org_1/users/user_1/account/photos/11111111-1111-4111-8111-111111111111.png";
    const photoUrl = createAccountPhotoObjectUrl(objectKey);
    mocks.r2.getR2Config.mockReturnValue({
      endpoint: "https://r2.example",
      accessKeyId: "access",
      secretAccessKey: "secret",
      bucketName: "complete-coach"
    });
    mocks.r2.createR2PresignedGetUrl.mockReturnValue("https://r2.example/signed-account-photo.png");

    const response = await getAccountPhotoUrl(
      new Request(`http://test.local/api/v1/coach-profile/photo-url?photoUrl=${encodeURIComponent(photoUrl)}`)
    );
    const payload = (await response.json()) as { data: { url: string } };

    expect(response.status).toBe(200);
    expect(payload.data.url).toBe("https://r2.example/signed-account-photo.png");
    expect(mocks.r2.createR2PresignedGetUrl).toHaveBeenCalledWith(
      expect.objectContaining({ bucketName: "complete-coach" }),
      {
        objectKey,
        expiresInSeconds: 300
      }
    );
    expect(() =>
      validateAccountPhotoObjectKey(
        "org_1",
        "user_1",
        "organizations/org_1/users/other_user/account/photos/11111111-1111-4111-8111-111111111111.png"
      )
    ).toThrow("Invalid account photo object key");
  });
});
