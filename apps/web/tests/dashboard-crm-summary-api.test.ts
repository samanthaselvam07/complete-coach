import { beforeEach, describe, expect, it, vi } from "vitest";

import { LeadStage } from "@/app/generated/prisma/enums";
import { GET as getCrmSummary } from "@/app/api/v1/dashboard/crm-summary/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    lead: {
      count: vi.fn(),
      groupBy: vi.fn()
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

const clientSession = {
  user: { id: "client_user", email: "client@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "client"
  }
};

describe("GET /api/v1/dashboard/crm-summary", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.lead.count.mockReset();
    mocks.prisma.lead.groupBy.mockReset();
  });

  it("returns role-gated CRM stage totals and new leads from the last five days", async () => {
    mocks.prisma.lead.groupBy.mockResolvedValue([
      { stage: LeadStage.INITIAL_CONTACT, _count: { _all: 4 } },
      { stage: LeadStage.CONSULTATION, _count: { _all: 3 } },
      { stage: LeadStage.CLOSED_WON, _count: { _all: 2 } }
    ]);
    mocks.prisma.lead.count.mockResolvedValue(5);

    const response = await getCrmSummary();
    const payload = (await response.json()) as {
      data: {
        newLeadsLastFiveDays: number;
        stageBreakdown: Array<{ stage: string; label: string; count: number }>;
        totalLeadsAndCustomers: number;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.newLeadsLastFiveDays).toBe(5);
    expect(payload.data.totalLeadsAndCustomers).toBe(9);
    expect(payload.data.stageBreakdown).toEqual([
      { stage: "initial-contact", label: "Initial Contact", count: 4 },
      { stage: "consultation", label: "Consultation Scheduled", count: 3 },
      { stage: "proposal", label: "Proposal Sent", count: 0 },
      { stage: "negotiation", label: "In Negotiation", count: 0 },
      { stage: "closed-won", label: "Closed - Won", count: 2 }
    ]);
    expect(mocks.prisma.lead.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["stage"],
        where: { organizationId: "org_1", deletedAt: null }
      })
    );
    expect(mocks.prisma.lead.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        deletedAt: null,
        createdAt: { gte: expect.any(Date) }
      }
    });
  });

  it("requires a role with CRM/client read access", async () => {
    mocks.auth.mockResolvedValue(clientSession);

    const response = await getCrmSummary();
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("forbidden");
    expect(mocks.prisma.lead.groupBy).not.toHaveBeenCalled();
  });
});
