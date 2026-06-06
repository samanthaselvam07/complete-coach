import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as listAuditLogs } from "@/app/api/v1/audit-logs/route";
import {
  buildAuditCursor,
  buildAuditCursorWhere,
  parseAuditCursor,
  serializeAuditLog
} from "@/lib/audit/audit-records";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    auditLog: { findMany: vi.fn() }
  }
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mocks.prisma }));

const ownerSession = {
  user: { id: "user_1" },
  activeOrganization: {
    id: "org_1",
    slug: "demo",
    name: "Demo",
    role: "owner"
  }
};

describe("audit log API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(ownerSession);
  });

  it("lists organization-scoped events with cursor metadata", async () => {
    const now = new Date("2026-06-06T00:00:00.000Z");
    mocks.prisma.auditLog.findMany.mockResolvedValue([
      {
        id: "audit_1",
        action: "membership.invited",
        targetType: "team_invitation",
        targetId: "invitation_1",
        metadata: { role: "coach" },
        ipAddress: null,
        createdAt: now,
        actor: { id: "user_1", name: "Owner Coach" }
      },
      {
        id: "audit_0",
        action: "client.created",
        targetType: "client",
        targetId: "client_1",
        metadata: null,
        ipAddress: null,
        createdAt: now,
        actor: null
      }
    ]);

    const response = await listAuditLogs(
      new Request("http://test.local/api/v1/audit-logs?limit=1")
    );
    const payload = (await response.json()) as { data: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([
      expect.objectContaining({
        id: "audit_1",
        action: "membership.invited",
        actor: { id: "user_1", name: "Owner Coach" }
      })
    ]);
    expect(response.headers.get("x-has-more")).toBe("true");
    expect(response.headers.get("x-next-cursor")).toBeTruthy();
  });

  it("filters events by target type and target id", async () => {
    mocks.prisma.auditLog.findMany.mockResolvedValue([]);

    const response = await listAuditLogs(
      new Request("http://test.local/api/v1/audit-logs?targetType=client&targetId=client_1&limit=7")
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          targetType: "client",
          targetId: "client_1"
        }),
        take: 8
      })
    );
  });

  it("blocks roles without audit access", async () => {
    mocks.auth.mockResolvedValue({
      ...ownerSession,
      activeOrganization: { ...ownerSession.activeOrganization, role: "coach" }
    });

    const response = await listAuditLogs(
      new Request("http://test.local/api/v1/audit-logs")
    );

    expect(response.status).toBe(403);
    expect(mocks.prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("removes sensitive metadata keys", () => {
    expect(
      serializeAuditLog({
        id: "audit_1",
        action: "test",
        targetType: null,
        targetId: null,
        metadata: {
          role: "coach",
          token: "secret",
          messageBody: "private"
        },
        ipAddress: null,
        createdAt: "2026-06-06T00:00:00.000Z",
        actor: null
      }).metadata
    ).toEqual({ role: "coach" });
    expect(
      serializeAuditLog({
        id: "audit_2",
        action: "test",
        targetType: null,
        targetId: null,
        metadata: { filters: { status: "active" } },
        ipAddress: null,
        createdAt: "2026-06-06T00:00:00.000Z",
        actor: null
      }).metadata
    ).toEqual({ filters: "[structured]" });
  });

  it("round-trips stable cursors and rejects malformed cursors", () => {
    const cursor = buildAuditCursor("2026-06-06T00:00:00.000Z", "audit_1");

    expect(parseAuditCursor(cursor)).toEqual({
      createdAt: new Date("2026-06-06T00:00:00.000Z"),
      id: "audit_1"
    });
    expect(buildAuditCursorWhere(cursor)).toEqual({
      OR: [
        { createdAt: { lt: new Date("2026-06-06T00:00:00.000Z") } },
        {
          createdAt: new Date("2026-06-06T00:00:00.000Z"),
          id: { lt: "audit_1" }
        }
      ]
    });
    expect(parseAuditCursor("not-base64-json")).toBeNull();
    expect(parseAuditCursor(Buffer.from("{}").toString("base64url"))).toBeNull();
    expect(buildAuditCursorWhere(undefined)).toEqual({});
  });
});
