import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientStatus, LeadStatus, TaskCategory, TaskPriority, TaskStatus } from "@/app/generated/prisma/enums";
import { GET as getGlobalSearch } from "@/app/api/v1/search/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    task: { findMany: vi.fn() },
    client: { findMany: vi.fn() },
    lead: { findMany: vi.fn() }
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

const coachSession = {
  ...ownerSession,
  activeOrganization: {
    ...ownerSession.activeOrganization,
    role: "coach"
  }
};

const now = new Date("2026-08-05T00:00:00.000Z");

describe("global search API", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.task.findMany.mockReset();
    mocks.prisma.client.findMany.mockReset();
    mocks.prisma.lead.findMany.mockReset();
  });

  it("returns grouped task, client, and CRM lead matches for the active organization", async () => {
    mocks.prisma.task.findMany.mockResolvedValue([
      {
        id: "task_1",
        organizationId: "org_1",
        title: "Review Sarah check-in",
        description: "Follow up on nutrition notes",
        category: TaskCategory.CURRENT_CLIENT_CARE,
        priority: TaskPriority.HIGH,
        status: TaskStatus.OPEN,
        dueAt: now,
        assignedUserId: "user_1",
        clientId: "client_1",
        createdByUserId: "user_1",
        completedAt: null,
        createdAt: now,
        updatedAt: now
      }
    ]);
    mocks.prisma.client.findMany.mockResolvedValue([
      {
        id: "client_1",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah@example.com",
        packageName: "Core Coaching"
      }
    ]);
    mocks.prisma.lead.findMany.mockResolvedValue([
      {
        id: "lead_1",
        name: "Sarah Prospect",
        source: "Website",
        status: LeadStatus.WARM
      }
    ]);

    const response = await getGlobalSearch(new Request("http://test.local/api/v1/search?query=sarah"));
    const payload = (await response.json()) as {
      data: { results: Array<{ type: string; title: string; subtitle: string; href: string }> };
    };

    expect(response.status).toBe(200);
    expect(payload.data.results).toEqual([
      expect.objectContaining({ type: "task", title: "Review Sarah check-in", href: "/" }),
      expect.objectContaining({ type: "client", title: "Sarah Johnson", href: "/clients/client_1" }),
      expect.objectContaining({
        type: "lead",
        title: "Sarah Prospect",
        subtitle: "warm lead from Website",
        href: "/clients/crm?search=Sarah%20Prospect"
      })
    ]);
    expect(mocks.prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          status: TaskStatus.OPEN,
          OR: expect.arrayContaining([expect.objectContaining({ title: expect.any(Object) })])
        })
      })
    );
    expect(mocks.prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          deletedAt: null,
          status: { not: ClientStatus.ARCHIVED }
        })
      })
    );
    expect(mocks.prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_1", deletedAt: null })
      })
    );
  });

  it("does not query the database for one-character searches", async () => {
    const response = await getGlobalSearch(new Request("http://test.local/api/v1/search?query=s"));
    const payload = (await response.json()) as { data: { results: unknown[] } };

    expect(response.status).toBe(200);
    expect(payload.data.results).toEqual([]);
    expect(mocks.prisma.task.findMany).not.toHaveBeenCalled();
    expect(mocks.prisma.client.findMany).not.toHaveBeenCalled();
    expect(mocks.prisma.lead.findMany).not.toHaveBeenCalled();
  });

  it("limits non-admin coaches to their assigned clients and leads", async () => {
    mocks.auth.mockResolvedValue(coachSession);
    mocks.prisma.task.findMany.mockResolvedValue([]);
    mocks.prisma.client.findMany.mockResolvedValue([]);
    mocks.prisma.lead.findMany.mockResolvedValue([]);

    await getGlobalSearch(new Request("http://test.local/api/v1/search?query=emma"));

    expect(mocks.prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ primaryCoachUserId: "user_1" })
      })
    );
    expect(mocks.prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assignedUserId: "user_1" })
      })
    );
  });
});
