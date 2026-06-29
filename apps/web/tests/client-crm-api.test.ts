import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientStatus, LeadStage, LeadStatus } from "@/app/generated/prisma/enums";
import { GET as getClients, POST as postClient } from "@/app/api/v1/clients/route";
import { GET as getClient, PATCH as patchClient } from "@/app/api/v1/clients/[clientId]/route";
import { POST as archiveClient } from "@/app/api/v1/clients/[clientId]/archive/route";
import {
  GET as getClientProfile,
  PATCH as patchClientProfile
} from "@/app/api/v1/clients/[clientId]/profile/route";
import { GET as getLeads, POST as postLead } from "@/app/api/v1/leads/route";
import { GET as getLead, PATCH as patchLead } from "@/app/api/v1/leads/[leadId]/route";
import {
  GET as getLeadActivities,
  POST as postLeadActivity
} from "@/app/api/v1/leads/[leadId]/activities/route";
import { POST as postLeadStageTransition } from "@/app/api/v1/leads/[leadId]/stage-transitions/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    client: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    lead: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    clientProfile: {
      upsert: vi.fn()
    },
    leadActivity: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    $transaction: vi.fn(),
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

const ownerSession = {
  user: { id: "user_1", email: "coach@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner"
  }
};

describe("client and CRM API tenancy", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.prisma.client.findMany.mockReset();
    mocks.prisma.client.create.mockReset();
    mocks.prisma.client.findFirst.mockReset();
    mocks.prisma.client.update.mockReset();
    mocks.prisma.lead.findMany.mockReset();
    mocks.prisma.lead.create.mockReset();
    mocks.prisma.lead.findFirst.mockReset();
    mocks.prisma.lead.update.mockReset();
    mocks.prisma.clientProfile.upsert.mockReset();
    mocks.prisma.leadActivity.findMany.mockReset();
    mocks.prisma.leadActivity.create.mockReset();
    mocks.prisma.$transaction.mockReset();
    mocks.prisma.auditLog.create.mockReset();
  });

  it("creates clients in the active organization and writes an audit log", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.create.mockResolvedValue({
      id: "client_1",
      firstName: "Emma",
      lastName: "Thompson",
      email: "emma@example.com",
      status: ClientStatus.NEW,
      packageName: "Standard Package",
      checkInDay: "Tuesday",
      startDate: null,
      latestCheckInAt: null,
      compliance: 0
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await postClient(
      new Request("http://test.local/api/v1/clients", {
        method: "POST",
        body: JSON.stringify({
          firstName: "Emma",
          lastName: "Thompson",
          email: "EMMA@example.com",
          organizationId: "org_2",
          status: "new"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          email: "emma@example.com"
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "client.created",
          organizationId: "org_1"
        })
      })
    );
  });

  it("requires authentication for client lists", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await getClients(new Request("http://test.local/api/v1/clients"));

    expect(response.status).toBe(401);
  });

  it("scopes client list queries to the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findMany.mockResolvedValue([
      {
        id: "client_1",
        firstName: "Marcus",
        lastName: "Rodriguez",
        email: "marcus@example.com",
        status: ClientStatus.ACTIVE,
        packageName: "Elite Performance",
        checkInDay: "Monday",
        startDate: new Date("2026-01-15T00:00:00.000Z"),
        latestCheckInAt: new Date("2026-04-14T00:00:00.000Z"),
        compliance: 96
      }
    ]);

    const response = await getClients(
      new Request("http://test.local/api/v1/clients?status=active&search=marcus")
    );
    const payload = (await response.json()) as { data: Array<{ name: string }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]?.name).toBe("Marcus Rodriguez");
    expect(mocks.prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          status: ClientStatus.ACTIVE
        })
      })
    );
  });

  it("updates client status and start date in the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.client.update.mockResolvedValue({
      id: "client_1",
      firstName: "Updated",
      lastName: "Client",
      email: "updated@example.com",
      status: ClientStatus.ACTIVE,
      packageName: "Premium Package",
      checkInDay: "Friday",
      startDate: new Date("2026-05-14T00:00:00.000Z"),
      latestCheckInAt: null,
      compliance: 0
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await patchClient(
      new Request("http://test.local/api/v1/clients/client_1", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: "Updated",
          lastName: "Client",
          status: "active",
          startDate: "2026-05-14"
        })
      }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "client_1",
          organizationId: "org_1"
        })
      })
    );
    expect(mocks.prisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ClientStatus.ACTIVE,
          startDate: new Date("2026-05-14T00:00:00.000Z")
        })
      })
    );
  });

  it("reads one client only from the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({
      id: "client_1",
      firstName: "Scoped",
      lastName: "Client",
      email: "scoped@example.com",
      status: ClientStatus.ACTIVE,
      packageName: "Premium Package",
      checkInDay: "Monday",
      startDate: null,
      latestCheckInAt: null,
      compliance: 80
    });

    const response = await getClient(new Request("http://test.local/api/v1/clients/client_1"), {
      params: Promise.resolve({ clientId: "client_1" })
    });
    const payload = (await response.json()) as { data: { name: string } };

    expect(response.status).toBe(200);
    expect(payload.data.name).toBe("Scoped Client");
    expect(mocks.prisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "client_1",
          organizationId: "org_1",
          deletedAt: null
        })
      })
    );
  });

  it("returns not found for missing scoped clients", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue(null);

    const response = await getClient(new Request("http://test.local/api/v1/clients/missing"), {
      params: Promise.resolve({ clientId: "missing" })
    });
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("not_found");
  });

  it("does not update clients outside the active organization scope", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue(null);

    const response = await patchClient(
      new Request("http://test.local/api/v1/clients/other_org_client", {
        method: "PATCH",
        body: JSON.stringify({ firstName: "Blocked" })
      }),
      { params: Promise.resolve({ clientId: "other_org_client" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.client.update).not.toHaveBeenCalled();
  });

  it("does not archive clients outside the active organization scope", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue(null);

    const response = await archiveClient(
      new Request("http://test.local/api/v1/clients/org_2_client/archive", { method: "POST" }),
      { params: Promise.resolve({ clientId: "org_2_client" }) }
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("not_found");
    expect(mocks.prisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "org_2_client",
          organizationId: "org_1",
          deletedAt: null
        }
      })
    );
    expect(mocks.prisma.client.update).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("does not read or update client profiles outside the active organization scope", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue(null);

    const readResponse = await getClientProfile(
      new Request("http://test.local/api/v1/clients/org_2_client/profile"),
      { params: Promise.resolve({ clientId: "org_2_client" }) }
    );
    const updateResponse = await patchClientProfile(
      new Request("http://test.local/api/v1/clients/org_2_client/profile", {
        method: "PATCH",
        body: JSON.stringify({ bio: "Blocked profile update" })
      }),
      { params: Promise.resolve({ clientId: "org_2_client" }) }
    );

    expect(readResponse.status).toBe(404);
    expect(updateResponse.status).toBe(404);
    expect(mocks.prisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "org_2_client",
          organizationId: "org_1",
          deletedAt: null
        }
      })
    );
    expect(mocks.prisma.clientProfile.upsert).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("scopes lead list queries to the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.lead.findMany.mockResolvedValue([
      {
        id: "lead_1",
        name: "Jessica Martinez",
        email: "jessica@example.com",
        phone: "+1 555",
        source: "Instagram",
        status: LeadStatus.HOT,
        stage: LeadStage.INITIAL_CONTACT,
        location: "Los Angeles, CA",
        notes: "Interested in premium package",
        lastContactAt: null,
        daysInStage: 2
      }
    ]);

    const response = await getLeads(
      new Request("http://test.local/api/v1/leads?stage=initial-contact&status=hot")
    );
    const payload = (await response.json()) as { data: Array<{ stage: string }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]?.stage).toBe("initial-contact");
    expect(mocks.prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          status: LeadStatus.HOT,
          stage: LeadStage.INITIAL_CONTACT
        })
      })
    );
  });

  it("creates leads in the active organization and writes an audit log", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.lead.create.mockResolvedValue({
      id: "lead_1",
      name: "Jessica Martinez",
      email: "jessica@example.com",
      phone: "+1 555",
      source: "Instagram",
      status: LeadStatus.HOT,
      stage: LeadStage.INITIAL_CONTACT,
      location: "Los Angeles, CA",
      notes: "Interested in premium package",
      lastContactAt: null,
      daysInStage: 0
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await postLead(
      new Request("http://test.local/api/v1/leads", {
        method: "POST",
        body: JSON.stringify({
          name: "Jessica Martinez",
          email: "JESSICA@example.com",
          organizationId: "org_2",
          status: "hot",
          stage: "initial-contact"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.prisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          email: "jessica@example.com",
          stage: LeadStage.INITIAL_CONTACT
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "lead.created",
          organizationId: "org_1"
        })
      })
    );
  });

  it("updates lead status and stage in the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.lead.findFirst.mockResolvedValue({ id: "lead_1", organizationId: "org_1" });
    mocks.prisma.lead.update.mockResolvedValue({
      id: "lead_1",
      name: "Updated Lead",
      email: "updated@example.com",
      phone: "+1 555",
      source: "Referral",
      status: LeadStatus.HOT,
      stage: LeadStage.PROPOSAL,
      location: "Melbourne, AU",
      notes: "Updated notes",
      lastContactAt: null,
      daysInStage: 0
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await patchLead(
      new Request("http://test.local/api/v1/leads/lead_1", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Lead",
          status: "hot",
          stage: "proposal"
        })
      }),
      { params: Promise.resolve({ leadId: "lead_1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "lead_1",
          organizationId: "org_1"
        })
      })
    );
    expect(mocks.prisma.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: LeadStatus.HOT,
          stage: LeadStage.PROPOSAL,
          daysInStage: 0
        })
      })
    );
  });

  it("reads one lead only from the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.lead.findFirst.mockResolvedValue({
      id: "lead_1",
      name: "Scoped Lead",
      email: "scoped@example.com",
      phone: "+1 555",
      source: "Website",
      status: LeadStatus.WARM,
      stage: LeadStage.CONSULTATION,
      location: "Melbourne, AU",
      notes: "Scoped read",
      lastContactAt: null,
      daysInStage: 2
    });

    const response = await getLead(new Request("http://test.local/api/v1/leads/lead_1"), {
      params: Promise.resolve({ leadId: "lead_1" })
    });
    const payload = (await response.json()) as { data: { name: string; stage: string } };

    expect(response.status).toBe(200);
    expect(payload.data.name).toBe("Scoped Lead");
    expect(payload.data.stage).toBe("consultation");
    expect(mocks.prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "lead_1",
          organizationId: "org_1",
          deletedAt: null
        })
      })
    );
  });

  it("returns not found for missing scoped leads", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.lead.findFirst.mockResolvedValue(null);

    const response = await getLead(new Request("http://test.local/api/v1/leads/missing"), {
      params: Promise.resolve({ leadId: "missing" })
    });
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("not_found");
  });

  it("does not update leads outside the active organization scope", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.lead.findFirst.mockResolvedValue(null);

    const response = await patchLead(
      new Request("http://test.local/api/v1/leads/other_org_lead", {
        method: "PATCH",
        body: JSON.stringify({ name: "Blocked" })
      }),
      { params: Promise.resolve({ leadId: "other_org_lead" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.lead.update).not.toHaveBeenCalled();
  });

  it("does not read or create activities for leads outside the active organization scope", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.lead.findFirst.mockResolvedValue(null);

    const readResponse = await getLeadActivities(
      new Request("http://test.local/api/v1/leads/org_2_lead/activities"),
      { params: Promise.resolve({ leadId: "org_2_lead" }) }
    );
    const createResponse = await postLeadActivity(
      new Request("http://test.local/api/v1/leads/org_2_lead/activities", {
        method: "POST",
        body: JSON.stringify({ type: "note", body: "Blocked activity" })
      }),
      { params: Promise.resolve({ leadId: "org_2_lead" }) }
    );

    expect(readResponse.status).toBe(404);
    expect(createResponse.status).toBe(404);
    expect(mocks.prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "org_2_lead",
          organizationId: "org_1",
          deletedAt: null
        }
      })
    );
    expect(mocks.prisma.leadActivity.findMany).not.toHaveBeenCalled();
    expect(mocks.prisma.leadActivity.create).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("does not transition lead stages outside the active organization scope", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.lead.findFirst.mockResolvedValue(null);

    const response = await postLeadStageTransition(
      new Request("http://test.local/api/v1/leads/org_2_lead/stage-transitions", {
        method: "POST",
        body: JSON.stringify({ stage: "proposal" })
      }),
      { params: Promise.resolve({ leadId: "org_2_lead" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "org_2_lead",
          organizationId: "org_1",
          deletedAt: null
        }
      })
    );
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.prisma.lead.update).not.toHaveBeenCalled();
    expect(mocks.prisma.leadActivity.create).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
