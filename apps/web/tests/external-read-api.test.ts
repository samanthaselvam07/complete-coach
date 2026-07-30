import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckInStatus, ClientStatus, ExternalApiKeyStatus, FormSubmissionStatus } from "@/app/generated/prisma/enums";
import { GET as getExternalClients } from "@/app/api/v1/external/clients/route";
import { GET as getExternalClientMetrics } from "@/app/api/v1/external/clients/[externalClientId]/metrics/route";
import { GET as getExternalMetrics } from "@/app/api/v1/external/metrics/route";
import { GET as getExternalSubmissions } from "@/app/api/v1/external/form-submissions/route";
import { GET as getExternalCheckIns } from "@/app/api/v1/external/check-ins/route";
import {
  canIncludePii,
  clearExternalRateLimitBuckets,
  handleExternalApiError,
  requireExternalApiActor
} from "@/lib/external/auth";
import {
  buildExternalCursorWhere,
  buildExternalPage,
  createExternalPageCursor,
  parseExternalPageCursor,
  serializeExternalCheckIn,
  serializeExternalClient,
  serializeExternalMetric,
  serializeExternalSubmission,
  splitExternalClientIds,
  toExternalCheckInStatus,
  toExternalClientStatus,
  toExternalSubmissionStatus
} from "@/lib/external/records";

const mocks = vi.hoisted(() => ({
  verifyExternalApiKey: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    externalApiKey: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    client: {
      findMany: vi.fn(),
      findFirst: vi.fn()
    },
    clientMeasurement: {
      findMany: vi.fn()
    },
    formSubmission: {
      findMany: vi.fn()
    },
    checkIn: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

vi.mock("@/lib/external/api-keys", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/external/api-keys")>();

  return {
    ...original,
    verifyExternalApiKey: mocks.verifyExternalApiKey
  };
});

const apiSecret = "cc_test_valid_secret_for_external_api_tests";
const apiKeyRecord = {
  id: "api_key_1",
  organizationId: "org_1",
  name: "Analytics",
  keyPrefix: apiSecret.slice(0, 16),
  keyHash: "hashed-secret",
  scopes: ["external:clients:read", "external:metrics:read", "external:submissions:read"],
  status: ExternalApiKeyStatus.ACTIVE,
  allowedIps: null,
  expiresAt: null,
  revokedAt: null,
  lastUsedAt: null,
  createdAt: new Date("2026-05-14T00:00:00.000Z"),
  updatedAt: new Date("2026-05-14T00:00:00.000Z")
};

const clientRecord = {
  id: "client_1",
  organizationId: "org_1",
  externalClientId: "ext_client_1",
  firstName: "Private",
  lastName: "Person",
  email: "client@example.com",
  phone: "+61400000000",
  status: ClientStatus.ACTIVE,
  packageId: null,
  packageName: "Performance",
  primaryCoachUserId: null,
  checkInDay: "Monday",
  timezone: "Australia/Melbourne",
  startDate: new Date("2026-05-01T00:00:00.000Z"),
  latestCheckInAt: new Date("2026-05-14T06:00:00.000Z"),
  compliance: 92,
  profile: {
    waterTargetLitres: "3.50",
    stepTarget: 12000
  },
  archivedAt: null,
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  updatedAt: new Date("2026-05-14T06:00:00.000Z"),
  deletedAt: null
};

const metricRecord = {
  id: "metric_1",
  organizationId: "org_1",
  clientId: "client_1",
  sourceType: "form_submission",
  sourceId: "submission_1",
  measuredAt: new Date("2026-05-14T06:00:00.000Z"),
  metricKey: "body_weight",
  metricValue: 82.5,
  unit: "kg",
  metadata: { fieldId: "body-weight", label: "Body weight" },
  createdAt: new Date("2026-05-14T06:00:00.000Z"),
  client: clientRecord
};

const formDefinition = {
  title: "Weekly Check-In",
  fields: [
    { id: "body-weight", type: "number", label: "Body weight", metricKey: "body_weight", exportPolicy: "metric" },
    { id: "readiness", type: "scale", label: "Readiness", exportPolicy: "metadata" },
    { id: "email", type: "email", label: "Email", exportPolicy: "pii" },
    { id: "notes", type: "long-text", label: "Notes", exportPolicy: "private" }
  ]
};

const submissionRecord = {
  id: "submission_1",
  organizationId: "org_1",
  formId: "form_1",
  formVersionId: "version_1",
  assignmentId: "assignment_1",
  clientId: "client_1",
  submittedByUserId: null,
  answersJson: {
    "body-weight": 82.5,
    readiness: 8,
    email: "client@example.com",
    notes: "Sensitive free text"
  },
  status: FormSubmissionStatus.SUBMITTED,
  submittedAt: new Date("2026-05-14T06:00:00.000Z"),
  reviewedAt: null,
  reviewedByUserId: null,
  createdAt: new Date("2026-05-14T06:00:00.000Z"),
  updatedAt: new Date("2026-05-14T06:00:00.000Z"),
  client: clientRecord,
  form: { id: "form_1", name: "Weekly Check-In", type: "CHECK_IN" },
  formVersion: {
    id: "version_1",
    formId: "form_1",
    versionNumber: 1,
    schemaJson: formDefinition,
    uiJson: null,
    publishedAt: new Date("2026-05-14T00:00:00.000Z"),
    createdAt: new Date("2026-05-14T00:00:00.000Z")
  }
};

const checkInRecord = {
  id: "checkin_1",
  organizationId: "org_1",
  clientId: "client_1",
  formSubmissionId: "submission_1",
  type: "check-in",
  status: CheckInStatus.REVIEWED,
  dueAt: new Date("2026-05-21T00:00:00.000Z"),
  submittedAt: new Date("2026-05-14T06:00:00.000Z"),
  reviewedAt: new Date("2026-05-15T06:00:00.000Z"),
  reviewedByUserId: "user_1",
  summary: "Reviewed summary",
  coachNotes: "Private coach notes",
  createdAt: new Date("2026-05-14T06:00:00.000Z"),
  updatedAt: new Date("2026-05-15T06:00:00.000Z"),
  client: clientRecord,
  formSubmission: submissionRecord
};

function externalRequest(url: string, secret = apiSecret, headers: Record<string, string> = {}) {
  return new Request(url, {
    headers: {
      Authorization: `Bearer ${secret}`,
      "x-forwarded-for": "203.0.113.10",
      ...headers
    }
  });
}

describe("external read APIs", () => {
  beforeEach(() => {
    vi.useRealTimers();
    clearExternalRateLimitBuckets();
    mocks.verifyExternalApiKey.mockReset();
    mocks.verifyExternalApiKey.mockResolvedValue(true);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.auditLog.create.mockResolvedValue({});
    mocks.prisma.externalApiKey.findUnique.mockReset();
    mocks.prisma.externalApiKey.findUnique.mockResolvedValue(apiKeyRecord);
    mocks.prisma.externalApiKey.update.mockReset();
    mocks.prisma.externalApiKey.update.mockResolvedValue(apiKeyRecord);
    mocks.prisma.client.findMany.mockReset();
    mocks.prisma.client.findFirst.mockReset();
    mocks.prisma.clientMeasurement.findMany.mockReset();
    mocks.prisma.formSubmission.findMany.mockReset();
    mocks.prisma.checkIn.findMany.mockReset();
  });

  it("returns de-identified clients by default and audits external use", async () => {
    mocks.prisma.client.findMany.mockResolvedValue([clientRecord]);

    const response = await getExternalClients(externalRequest("http://test.local/api/v1/external/clients?limit=1"));
    const payload = (await response.json()) as { data: Array<Record<string, unknown>>; meta: { hasMore: boolean } };

    expect(response.status).toBe(200);
    expect(payload.meta.hasMore).toBe(false);
    expect(payload.data[0]).toEqual(
      expect.objectContaining({
        externalClientId: "ext_client_1",
        status: "active",
        packageName: "Performance",
        waterTargetLitres: 3.5,
        stepTarget: 12000
      })
    );
    expect(payload.data[0]).not.toHaveProperty("firstName");
    expect(payload.data[0]).not.toHaveProperty("email");
    expect(mocks.prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 2,
        where: expect.objectContaining({ organizationId: "org_1", deletedAt: null })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "external_api.used",
          actorApiKeyId: "api_key_1",
          organizationId: "org_1",
          metadata: expect.objectContaining({ path: "/api/v1/external/clients" })
        })
      })
    );
  });

  it("returns PII only when include_pii=true and the API key has PII scope", async () => {
    mocks.prisma.externalApiKey.findUnique.mockResolvedValue({
      ...apiKeyRecord,
      scopes: [...apiKeyRecord.scopes, "external:client_pii:read"]
    });
    mocks.prisma.client.findMany.mockResolvedValue([clientRecord]);

    const response = await getExternalClients(
      externalRequest("http://test.local/api/v1/external/clients?include_pii=true")
    );
    const payload = (await response.json()) as { data: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(payload.data[0]).toEqual(
      expect.objectContaining({
        firstName: "Private",
        lastName: "Person",
        email: "client@example.com",
        phone: "+61400000000"
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "external_api.pii_accessed"
        })
      })
    );
  });

  it("rejects missing scopes, invalid keys, revoked keys, expired keys, IP mismatches, and rate limits", async () => {
    mocks.prisma.externalApiKey.findUnique
      .mockResolvedValueOnce({ ...apiKeyRecord, scopes: ["external:metrics:read"] })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...apiKeyRecord, status: ExternalApiKeyStatus.REVOKED })
      .mockResolvedValueOnce({ ...apiKeyRecord, expiresAt: new Date("2026-01-01T00:00:00.000Z") })
      .mockResolvedValueOnce({ ...apiKeyRecord, allowedIps: ["198.51.100.1"] });
    mocks.verifyExternalApiKey
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    const missingScope = await getExternalClients(externalRequest("http://test.local/api/v1/external/clients"));
    const invalidKey = await getExternalMetrics(externalRequest("http://test.local/api/v1/external/metrics"));
    const revokedKey = await getExternalMetrics(externalRequest("http://test.local/api/v1/external/metrics"));
    const expiredKey = await getExternalMetrics(externalRequest("http://test.local/api/v1/external/metrics"));
    const ipMismatch = await getExternalMetrics(externalRequest("http://test.local/api/v1/external/metrics"));

    expect(missingScope.status).toBe(403);
    expect(invalidKey.status).toBe(401);
    expect(revokedKey.status).toBe(401);
    expect(expiredKey.status).toBe(401);
    expect(ipMismatch.status).toBe(403);

    for (let index = 0; index < 60; index += 1) {
      mocks.prisma.externalApiKey.findUnique.mockResolvedValue(apiKeyRecord);
      mocks.prisma.clientMeasurement.findMany.mockResolvedValue([]);
      const response = await getExternalMetrics(
        externalRequest("http://test.local/api/v1/external/metrics", apiSecret, {
          "x-forwarded-for": "203.0.113.60"
        })
      );
      expect(response.status).toBe(200);
    }

    const limitedResponse = await getExternalMetrics(
      externalRequest("http://test.local/api/v1/external/metrics", apiSecret, {
        "x-forwarded-for": "203.0.113.60"
      })
    );
    expect(limitedResponse.status).toBe(429);
  });

  it("rejects missing authorization and non-array scopes", async () => {
    mocks.prisma.externalApiKey.findUnique.mockResolvedValue({ ...apiKeyRecord, scopes: "external:metrics:read" });

    const missingAuthResponse = await getExternalMetrics(new Request("http://test.local/api/v1/external/metrics"));
    const invalidScopesResponse = await getExternalMetrics(externalRequest("http://test.local/api/v1/external/metrics"));

    expect(missingAuthResponse.status).toBe(401);
    expect(invalidScopesResponse.status).toBe(403);
  });

  it("supports real-ip fallback, empty allowed IP lists, and rate bucket resets", async () => {
    vi.useFakeTimers();
    mocks.prisma.externalApiKey.findUnique.mockResolvedValue({ ...apiKeyRecord, allowedIps: [] });
    mocks.prisma.externalApiKey.update.mockResolvedValue(apiKeyRecord);

    const request = new Request("http://test.local/api/v1/external/metrics", {
      headers: {
        Authorization: `Bearer ${apiSecret}`,
        "x-real-ip": "203.0.113.77"
      }
    });

    const firstActor = await requireExternalApiActor(request, "external:metrics:read");
    vi.advanceTimersByTime(60_001);
    const secondActor = await requireExternalApiActor(request, "external:metrics:read");

    expect(firstActor.ipAddress).toBe("203.0.113.77");
    expect(secondActor.actor.apiKeyId).toBe("api_key_1");
    vi.useRealTimers();
  });

  it("covers inactive keys, missing IP allowlist context, and PII denial helpers", async () => {
    mocks.prisma.externalApiKey.findUnique
      .mockResolvedValueOnce({ ...apiKeyRecord, status: ExternalApiKeyStatus.EXPIRED, expiresAt: null })
      .mockResolvedValueOnce({ ...apiKeyRecord, allowedIps: ["203.0.113.1"] });

    await expect(requireExternalApiActor(externalRequest("http://test.local/api/v1/external/metrics"), "external:metrics:read"))
      .rejects.toMatchObject({ code: "unauthorized" });
    await expect(
      requireExternalApiActor(
        new Request("http://test.local/api/v1/external/metrics", {
          headers: { Authorization: `Bearer ${apiSecret}` }
        }),
        "external:metrics:read"
      )
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(() => canIncludePii({ apiKeyId: "key", organizationId: "org_1", scopes: new Set() }, true)).toThrow(
      "client PII"
    );
  });

  it("converts external auth errors to responses and rethrows unknown errors", () => {
    expect(() => handleExternalApiError(new Error("not external"))).toThrow("not external");
  });

  it("returns typed metrics for one external client and organization-wide metrics", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue(clientRecord);
    mocks.prisma.clientMeasurement.findMany.mockResolvedValue([metricRecord]);

    const clientMetricsResponse = await getExternalClientMetrics(
      externalRequest(
        "http://test.local/api/v1/external/clients/ext_client_1/metrics?metric_key=body_weight&from=2026-05-01T00:00:00.000Z"
      ),
      { params: Promise.resolve({ externalClientId: "ext_client_1" }) }
    );
    const orgMetricsResponse = await getExternalMetrics(
      externalRequest("http://test.local/api/v1/external/metrics?client_external_ids=ext_client_1")
    );
    const payload = (await clientMetricsResponse.json()) as { data: Array<Record<string, unknown>> };

    expect(clientMetricsResponse.status).toBe(200);
    expect(orgMetricsResponse.status).toBe(200);
    expect(payload.data[0]).toEqual(
      expect.objectContaining({
        externalClientId: "ext_client_1",
        metricKey: "body_weight",
        metricValue: 82.5,
        unit: "kg"
      })
    );
    expect(payload.data[0]).not.toHaveProperty("clientId");
  });

  it("returns not found for missing external client metrics and validates external query params", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue(null);

    const missingResponse = await getExternalClientMetrics(
      externalRequest("http://test.local/api/v1/external/clients/missing/metrics"),
      { params: Promise.resolve({ externalClientId: "missing" }) }
    );
    const invalidSubmissionsResponse = await getExternalSubmissions(
      externalRequest("http://test.local/api/v1/external/form-submissions?limit=invalid")
    );
    const invalidCheckInsResponse = await getExternalCheckIns(
      externalRequest("http://test.local/api/v1/external/check-ins?limit=invalid")
    );

    expect(missingResponse.status).toBe(404);
    expect(invalidSubmissionsResponse.status).toBe(422);
    expect(invalidCheckInsResponse.status).toBe(422);
  });

  it("returns safe form submission answers only", async () => {
    mocks.prisma.formSubmission.findMany.mockResolvedValue([submissionRecord]);

    const response = await getExternalSubmissions(
      externalRequest("http://test.local/api/v1/external/form-submissions?status=submitted")
    );
    const payload = (await response.json()) as { data: Array<{ answers: Record<string, unknown> }> };

    expect(response.status).toBe(200);
    expect(payload.data[0].answers).toEqual({ "body-weight": 82.5, readiness: 8 });
    expect(JSON.stringify(payload)).not.toContain("Sensitive free text");
    expect(JSON.stringify(payload)).not.toContain("client@example.com");
  });

  it("returns typed check-ins without raw coach notes or health notes", async () => {
    mocks.prisma.checkIn.findMany.mockResolvedValue([checkInRecord]);

    const response = await getExternalCheckIns(
      externalRequest("http://test.local/api/v1/external/check-ins?status=reviewed")
    );
    const payload = (await response.json()) as { data: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(payload.data[0]).toEqual(
      expect.objectContaining({
        id: "checkin_1",
        externalClientId: "ext_client_1",
        status: "reviewed"
      })
    );
    expect(payload.data[0]).not.toHaveProperty("coachNotes");
    expect(payload.data[0]).not.toHaveProperty("summary");
  });

  it("creates and applies opaque cursors for external pagination", async () => {
    const cursor = createExternalPageCursor("client_1", new Date("2026-05-14T06:00:00.000Z"));
    mocks.prisma.client.findMany.mockResolvedValue([clientRecord]);

    const response = await getExternalClients(
      externalRequest(`http://test.local/api/v1/external/clients?cursor=${encodeURIComponent(cursor)}&limit=1`)
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { updatedAt: { lt: new Date("2026-05-14T06:00:00.000Z") } },
            { updatedAt: new Date("2026-05-14T06:00:00.000Z"), id: { lt: "client_1" } }
          ]
        })
      })
    );
  });

  it("keeps unknown or invalid form schemas private by default", () => {
    const serialized = serializeExternalSubmission({
      ...submissionRecord,
      formVersion: { ...submissionRecord.formVersion, schemaJson: { invalid: true } }
    });

    expect(serialized.answers).toEqual({});
  });

  it("covers external serializer and pagination fallback branches", () => {
    expect(parseExternalPageCursor(undefined)).toBeNull();
    expect(parseExternalPageCursor("not-json")).toBeNull();
    expect(
      buildExternalCursorWhere(createExternalPageCursor("metric_1", "2026-05-14T06:00:00.000Z"), "measuredAt")
    ).toEqual({
      OR: [
        { measuredAt: { lt: new Date("2026-05-14T06:00:00.000Z") } },
        { measuredAt: new Date("2026-05-14T06:00:00.000Z"), id: { lt: "metric_1" } }
      ]
    });
    expect(
      buildExternalPage(
        [
          { id: "first", updatedAt: "2026-05-14T06:00:00.000Z" },
          { id: "second", updatedAt: "2026-05-13T06:00:00.000Z" }
        ],
        1,
        (record) => record.updatedAt,
        (record) => record.id
      )
    ).toEqual(expect.objectContaining({ data: ["first"], meta: expect.objectContaining({ hasMore: true }) }));
    expect(splitExternalClientIds(undefined)).toEqual([]);
    expect(toExternalClientStatus(undefined)).toBeUndefined();
    expect(toExternalSubmissionStatus(undefined)).toBeUndefined();
    expect(toExternalCheckInStatus(undefined)).toBeUndefined();
    expect(serializeExternalClient({ ...clientRecord, status: "UNKNOWN", startDate: null }, false)).toEqual(
      expect.objectContaining({ status: "UNKNOWN", startDate: null })
    );
    expect(serializeExternalMetric({ ...metricRecord, client: null })).toEqual(
      expect.objectContaining({ externalClientId: null })
    );
    expect(serializeExternalSubmission({ ...submissionRecord, status: "CUSTOM", client: null, form: null })).toEqual(
      expect.objectContaining({ externalClientId: null, formName: null, status: "CUSTOM" })
    );
    expect(
      serializeExternalCheckIn({
        ...checkInRecord,
        status: "CUSTOM",
        client: null,
        dueAt: null,
        submittedAt: null,
        reviewedAt: null
      })
    ).toEqual(expect.objectContaining({ externalClientId: null, status: "CUSTOM", dueAt: null }));
    expect(canIncludePii({ apiKeyId: "key", organizationId: "org_1", scopes: new Set() }, false)).toBe(false);
  });
});
