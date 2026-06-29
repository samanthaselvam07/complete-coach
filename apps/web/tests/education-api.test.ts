import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EducationResourceAssignmentStatus,
  EducationResourceType,
  EducationResourceVisibility
} from "@/app/generated/prisma/enums";
import {
  GET as getEducationResources,
  POST as createEducationResource
} from "@/app/api/v1/education-resources/route";
import { POST as createEducationResourceUploadUrl } from "@/app/api/v1/education-resources/upload-url/route";
import {
  GET as getEducationResource,
  PATCH as updateEducationResource
} from "@/app/api/v1/education-resources/[resourceId]/route";
import { POST as assignEducationResource } from "@/app/api/v1/education-resources/[resourceId]/assignments/route";
import {
  createEducationResourceSchema,
  serializeEducationAssignment,
  updateEducationResourceSchema
} from "@/lib/education/education-records";
import {
  buildEducationResourceObjectKey,
  educationResourceUploadSchema,
  validateEducationResourceObjectKey
} from "@/lib/education/education-resource-uploads";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    educationResource: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    educationResourceAssignment: {
      create: vi.fn()
    },
    client: {
      findFirst: vi.fn()
    }
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

const ownerSession = {
  user: { id: "user_1", email: "coach@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner"
  }
};

const assistantSession = {
  ...ownerSession,
  activeOrganization: {
    ...ownerSession.activeOrganization,
    role: "assistant"
  }
};

const educationResource = {
  id: "resource_1",
  organizationId: "org_1",
  title: "Recovery Basics",
  description: "Sleep and recovery education.",
  category: "Recovery",
  resourceType: EducationResourceType.ARTICLE,
  objectId: null,
  externalUrl: "https://example.test/recovery",
  tags: ["sleep"],
  visibility: EducationResourceVisibility.PRIVATE,
  createdByUserId: "user_1",
  createdAt: new Date("2026-06-02T00:00:00.000Z"),
  updatedAt: new Date("2026-06-02T00:00:00.000Z")
};

const educationAssignment = {
  id: "education_assignment_1",
  organizationId: "org_1",
  resourceId: "resource_1",
  clientId: "client_1",
  assignedByUserId: "user_1",
  status: EducationResourceAssignmentStatus.ASSIGNED,
  assignedAt: new Date("2026-06-02T00:00:00.000Z"),
  completedAt: null,
  createdAt: new Date("2026-06-02T00:00:00.000Z"),
  updatedAt: new Date("2026-06-02T00:00:00.000Z"),
  client: {
    firstName: "Api",
    lastName: "Client"
  }
};

describe("education resource persistence APIs", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.educationResource.create.mockReset();
    mocks.prisma.educationResource.findMany.mockReset();
    mocks.prisma.educationResource.findFirst.mockReset();
    mocks.prisma.educationResource.update.mockReset();
    mocks.prisma.educationResourceAssignment.create.mockReset();
    mocks.prisma.client.findFirst.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lists active organization education resources", async () => {
    mocks.prisma.educationResource.findMany.mockResolvedValue([educationResource]);

    const response = await getEducationResources(
      new Request("http://test.local/api/v1/education-resources?category=Recovery")
    );
    const payload = (await response.json()) as { data: Array<{ id: string; resourceType: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([expect.objectContaining({ id: "resource_1", resourceType: "article" })]);
    expect(mocks.prisma.educationResource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          deletedAt: null,
          category: "Recovery"
        })
      })
    );
  });

  it("creates education resources and audits without leaking body content", async () => {
    mocks.prisma.educationResource.create.mockResolvedValue(educationResource);

    const response = await createEducationResource(
      new Request("http://test.local/api/v1/education-resources", {
        method: "POST",
        body: JSON.stringify({
          title: "Recovery Basics",
          description: "Sleep and recovery education.",
          category: "Recovery",
          resourceType: "article",
          externalUrl: "https://example.test/recovery",
          tags: ["sleep"]
        })
      })
    );
    const payload = (await response.json()) as { data: { id: string; externalUrl: string } };

    expect(response.status).toBe(201);
    expect(payload.data).toEqual(expect.objectContaining({ id: "resource_1" }));
    expect(mocks.prisma.educationResource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          createdByUserId: "user_1",
          resourceType: EducationResourceType.ARTICLE
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "education_resource.created",
          metadata: { category: "Recovery", resourceType: "article" }
        })
      })
    );
  });

  it("reads and updates one tenant-scoped resource", async () => {
    mocks.prisma.educationResource.findFirst.mockResolvedValue(educationResource);
    mocks.prisma.educationResource.update.mockResolvedValue({
      ...educationResource,
      title: "Updated Recovery Basics"
    });

    const readResponse = await getEducationResource(new Request("http://test.local/api/v1/education-resources/resource_1"), {
      params: Promise.resolve({ resourceId: "resource_1" })
    });
    const updateResponse = await updateEducationResource(
      new Request("http://test.local/api/v1/education-resources/resource_1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated Recovery Basics" })
      }),
      { params: Promise.resolve({ resourceId: "resource_1" }) }
    );
    const payload = (await updateResponse.json()) as { data: { title: string } };

    expect(readResponse.status).toBe(200);
    expect(updateResponse.status).toBe(200);
    expect(payload.data.title).toBe("Updated Recovery Basics");
    expect(mocks.prisma.educationResource.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "resource_1", organizationId: "org_1" })
      })
    );
  });

  it("does not read or update education resources outside the active organization", async () => {
    mocks.prisma.educationResource.findFirst.mockResolvedValue(null);

    const readResponse = await getEducationResource(
      new Request("http://test.local/api/v1/education-resources/org_2_resource"),
      {
        params: Promise.resolve({ resourceId: "org_2_resource" })
      }
    );
    const updateResponse = await updateEducationResource(
      new Request("http://test.local/api/v1/education-resources/org_2_resource", {
        method: "PATCH",
        body: JSON.stringify({ title: "No access" })
      }),
      { params: Promise.resolve({ resourceId: "org_2_resource" }) }
    );

    expect(readResponse.status).toBe(404);
    expect(updateResponse.status).toBe(404);
    expect(mocks.prisma.educationResource.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "org_2_resource", organizationId: "org_1" })
      })
    );
    expect(mocks.prisma.educationResource.update).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("assigns resources to active organization clients", async () => {
    mocks.prisma.educationResource.findFirst.mockResolvedValue(educationResource);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1" });
    mocks.prisma.educationResourceAssignment.create.mockResolvedValue(educationAssignment);

    const response = await assignEducationResource(
      new Request("http://test.local/api/v1/education-resources/resource_1/assignments", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1" })
      }),
      { params: Promise.resolve({ resourceId: "resource_1" }) }
    );
    const payload = (await response.json()) as { data: { id: string; clientName: string } };

    expect(response.status).toBe(201);
    expect(payload.data).toEqual(expect.objectContaining({ id: "education_assignment_1", clientName: "Api Client" }));
    expect(mocks.prisma.educationResourceAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          organizationId: "org_1",
          resourceId: "resource_1",
          clientId: "client_1",
          assignedByUserId: "user_1"
        },
        include: expect.any(Object)
      })
    );
  });

  it("returns not found when assigning missing resources or clients", async () => {
    mocks.prisma.educationResource.findFirst.mockResolvedValue(null);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1" });

    const missingResourceResponse = await assignEducationResource(
      new Request("http://test.local/api/v1/education-resources/missing/assignments", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1" })
      }),
      { params: Promise.resolve({ resourceId: "missing" }) }
    );

    mocks.prisma.educationResource.findFirst.mockResolvedValue(educationResource);
    mocks.prisma.client.findFirst.mockResolvedValue(null);

    const missingClientResponse = await assignEducationResource(
      new Request("http://test.local/api/v1/education-resources/resource_1/assignments", {
        method: "POST",
        body: JSON.stringify({ clientId: "missing" })
      }),
      { params: Promise.resolve({ resourceId: "resource_1" }) }
    );

    expect(missingResourceResponse.status).toBe(404);
    expect(missingClientResponse.status).toBe(404);
    expect(mocks.prisma.educationResourceAssignment.create).not.toHaveBeenCalled();
  });

  it("rejects education writes for read-only assistants", async () => {
    mocks.auth.mockResolvedValue(assistantSession);

    const response = await createEducationResource(
      new Request("http://test.local/api/v1/education-resources", {
        method: "POST",
        body: JSON.stringify({
          title: "Recovery Basics",
          category: "Recovery",
          resourceType: "link",
          externalUrl: "https://example.test/recovery"
        })
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.prisma.educationResource.create).not.toHaveBeenCalled();
  });

  it("validates file-backed resources require an object id or external URL", async () => {
    const response = await createEducationResource(
      new Request("http://test.local/api/v1/education-resources", {
        method: "POST",
        body: JSON.stringify({
          title: "Recovery PDF",
          category: "Recovery",
          resourceType: "pdf"
        })
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.educationResource.create).not.toHaveBeenCalled();
  });

  it("creates R2-backed education upload URLs and audits safe metadata", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", "account_1");
    vi.stubEnv("R2_ACCESS_KEY_ID", "access_key_1");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret_key_1");
    vi.stubEnv("R2_BUCKET_NAME", "complete-coach-test");

    const response = await createEducationResourceUploadUrl(
      new Request("http://test.local/api/v1/education-resources/upload-url", {
        method: "POST",
        body: JSON.stringify({
          filename: "recovery-basics.pdf",
          contentType: "application/pdf",
          byteSize: 1024,
          checksumSha256: "a".repeat(64)
        })
      })
    );
    const payload = (await response.json()) as {
      data: { objectId: string; uploadUrl: string; method: string; resourceType: string; maxBytes: number };
    };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(
      expect.objectContaining({
        method: "PUT",
        resourceType: "pdf",
        maxBytes: 50 * 1024 * 1024
      })
    );
    expect(payload.data.objectId).toMatch(
      /^organizations\/org_1\/education\/resources\/pdf\/[0-9a-fA-F-]{36}\.pdf$/
    );
    expect(payload.data.uploadUrl).toContain("account_1.r2.cloudflarestorage.com");
    expect(payload.data.uploadUrl).toContain("complete-coach-test");
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "education_resource.upload_url_created",
          targetType: "education_resource_object",
          targetId: payload.data.objectId,
          metadata: {
            contentType: "application/pdf",
            byteSize: 1024,
            checksumSha256: "a".repeat(64),
            resourceType: "pdf"
          }
        })
      })
    );
  });

  it("rejects unsupported education uploads and reports unconfigured storage", async () => {
    const invalidResponse = await createEducationResourceUploadUrl(
      new Request("http://test.local/api/v1/education-resources/upload-url", {
        method: "POST",
        body: JSON.stringify({
          filename: "recovery-basics.txt",
          contentType: "text/plain",
          byteSize: 1024
        })
      })
    );
    const unconfiguredResponse = await createEducationResourceUploadUrl(
      new Request("http://test.local/api/v1/education-resources/upload-url", {
        method: "POST",
        body: JSON.stringify({
          filename: "recovery-basics.mp4",
          contentType: "video/mp4",
          byteSize: 1024
        })
      })
    );

    expect(invalidResponse.status).toBe(422);
    expect(unconfiguredResponse.status).toBe(503);
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("reports misconfigured education upload storage", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", "account_1");

    const response = await createEducationResourceUploadUrl(
      new Request("http://test.local/api/v1/education-resources/upload-url", {
        method: "POST",
        body: JSON.stringify({
          filename: "recovery-basics.pdf",
          contentType: "application/pdf",
          byteSize: 1024
        })
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: "storage_misconfigured" })
      })
    );
  });

  it("covers education helper branches for link validation and nullable assignment fields", () => {
    const objectKey = buildEducationResourceObjectKey("org_1", {
      filename: "recovery-video.mp4",
      contentType: "video/mp4",
      byteSize: 1024
    });

    expect(objectKey).toMatch(/^organizations\/org_1\/education\/resources\/video\/[0-9a-fA-F-]{36}\.mp4$/);
    expect(() => validateEducationResourceObjectKey("org_1", objectKey)).not.toThrow();
    expect(() => validateEducationResourceObjectKey("org_2", objectKey)).toThrow(/Invalid education/);
    expect(() =>
      educationResourceUploadSchema.parse({
        filename: "recovery-video.pdf",
        contentType: "video/mp4",
        byteSize: 1024
      })
    ).toThrow(/extension/);
    expect(() =>
      educationResourceUploadSchema.parse({
        filename: "recovery-video.mp4",
        contentType: "video/mp4",
        byteSize: 501 * 1024 * 1024
      })
    ).toThrow(/maximum/);
    expect(
      educationResourceUploadSchema.parse({
        filename: "recovery-photo.jpeg",
        contentType: "image/jpeg",
        byteSize: 1024
      })
    ).toEqual({
      filename: "recovery-photo.jpeg",
      contentType: "image/jpeg",
      byteSize: 1024
    });
    expect(() =>
      createEducationResourceSchema.parse({
        title: "Missing link",
        category: "Recovery",
        resourceType: "link"
      })
    ).toThrow(/external URL/);
    expect(
      updateEducationResourceSchema.parse({
        resourceType: "pdf",
        objectId: "organizations/org_1/education/resources/recovery.pdf"
      })
    ).toEqual({
      resourceType: "pdf",
      objectId: "organizations/org_1/education/resources/recovery.pdf",
      visibility: "private"
    });
    expect(
      serializeEducationAssignment({
        ...educationAssignment,
        client: undefined,
        completedAt: new Date("2026-06-03T00:00:00.000Z")
      })
    ).toEqual(expect.objectContaining({ clientName: null, completedAt: "2026-06-03T00:00:00.000Z" }));
  });
});
