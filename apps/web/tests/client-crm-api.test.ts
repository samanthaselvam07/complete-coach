import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ClientAccountActivityType,
  ClientActivityLogDomain,
  ClientActivityLogStatus,
  ClientStatus,
  LeadStage,
  LeadStatus
} from "@/app/generated/prisma/enums";
import { GET as getClients, POST as postClient } from "@/app/api/v1/clients/route";
import { DELETE as deleteClient, GET as getClient, PATCH as patchClient } from "@/app/api/v1/clients/[clientId]/route";
import { POST as archiveClient } from "@/app/api/v1/clients/[clientId]/archive/route";
import { GET as getClientActivityLogs, POST as postClientActivityLog } from "@/app/api/v1/clients/[clientId]/logs/route";
import { GET as getClientAccountActivity, POST as postClientAccountActivity } from "@/app/api/v1/clients/[clientId]/activity/route";
import {
  DELETE as deleteClientCalendarEvent,
  GET as getClientCalendarEvents,
  PATCH as patchClientCalendarEvent,
  POST as postClientCalendarEvent
} from "@/app/api/v1/clients/[clientId]/calendar-events/route";
import { GET as getClientGoals, POST as postClientGoal } from "@/app/api/v1/clients/[clientId]/goals/route";
import { GET as getClientNotes, POST as postClientNote } from "@/app/api/v1/clients/[clientId]/notes/route";
import {
  DELETE as deleteClientRoadmapPhase,
  GET as getClientRoadmap,
  POST as postClientRoadmap
} from "@/app/api/v1/clients/[clientId]/roadmap/route";
import {
  GET as getClientProfile,
  PATCH as patchClientProfile
} from "@/app/api/v1/clients/[clientId]/profile/route";
import { GET as getCrmStages, PUT as putCrmStages } from "@/app/api/v1/crm/stages/route";
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
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    organization: {
      findUnique: vi.fn()
    },
    organizationMembership: {
      findFirst: vi.fn()
    },
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn()
    },
    lead: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    clientProfile: {
      upsert: vi.fn(),
      deleteMany: vi.fn()
    },
    clientNote: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    clientActivityLog: {
      findMany: vi.fn(),
      upsert: vi.fn()
    },
    clientAccountActivityLog: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    clientGoal: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn()
    },
    clientRoadmapPhase: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    },
    clientRoadmapItem: {
      create: vi.fn()
    },
    clientCalendarEvent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    leadActivity: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    crmStage: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn()
    },
    $transaction: vi.fn(),
    auditLog: {
      create: vi.fn()
    }
  },
  sendTransactionalEmail: vi.fn(),
  createClientSubscriptionCheckout: vi.fn()
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

vi.mock("@/lib/payments/client-subscription-checkout", () => ({
  createClientSubscriptionCheckout: mocks.createClientSubscriptionCheckout
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

const orgScopedLeadWhere = {
  id: "org_2_lead",
  organizationId: "org_1",
  deletedAt: null
};

describe("client and CRM API tenancy", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.prisma.client.findMany.mockReset();
    mocks.prisma.client.count.mockReset();
    mocks.prisma.client.create.mockReset();
    mocks.prisma.client.findFirst.mockReset();
    mocks.prisma.client.update.mockReset();
    mocks.prisma.organization.findUnique.mockReset();
    mocks.prisma.organizationMembership.findFirst.mockReset();
    mocks.prisma.verificationToken.deleteMany.mockReset();
    mocks.prisma.verificationToken.create.mockReset();
    mocks.prisma.lead.findMany.mockReset();
    mocks.prisma.lead.create.mockReset();
    mocks.prisma.lead.findFirst.mockReset();
    mocks.prisma.lead.update.mockReset();
    mocks.prisma.clientProfile.upsert.mockReset();
    mocks.prisma.clientProfile.deleteMany.mockReset();
    mocks.prisma.clientNote.findMany.mockReset();
    mocks.prisma.clientNote.create.mockReset();
    mocks.prisma.clientActivityLog.findMany.mockReset();
    mocks.prisma.clientActivityLog.upsert.mockReset();
    mocks.prisma.clientAccountActivityLog.findMany.mockReset();
    mocks.prisma.clientAccountActivityLog.create.mockReset();
    mocks.prisma.clientGoal.findMany.mockReset();
    mocks.prisma.clientGoal.create.mockReset();
    mocks.prisma.clientGoal.updateMany.mockReset();
    mocks.prisma.clientRoadmapPhase.findMany.mockReset();
    mocks.prisma.clientRoadmapPhase.findFirst.mockReset();
    mocks.prisma.clientRoadmapPhase.create.mockReset();
    mocks.prisma.clientRoadmapPhase.delete.mockReset();
    mocks.prisma.clientRoadmapItem.create.mockReset();
    mocks.prisma.clientCalendarEvent.findMany.mockReset();
    mocks.prisma.clientCalendarEvent.findFirst.mockReset();
    mocks.prisma.clientCalendarEvent.create.mockReset();
    mocks.prisma.clientCalendarEvent.update.mockReset();
    mocks.prisma.clientCalendarEvent.delete.mockReset();
    mocks.prisma.leadActivity.findMany.mockReset();
    mocks.prisma.leadActivity.create.mockReset();
    mocks.prisma.crmStage.findMany.mockReset();
    mocks.prisma.crmStage.findFirst.mockReset();
    mocks.prisma.crmStage.deleteMany.mockReset();
    mocks.prisma.crmStage.upsert.mockReset();
    mocks.prisma.$transaction.mockReset();
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
    mocks.prisma.auditLog.create.mockReset();
    mocks.sendTransactionalEmail.mockReset();
    mocks.sendTransactionalEmail.mockResolvedValue({ status: "sent" });
    mocks.createClientSubscriptionCheckout.mockReset();
    mocks.createClientSubscriptionCheckout.mockResolvedValue({
      subscription: { id: "sub_1" },
      serializedSubscription: { id: "sub_1", status: "incomplete" },
      checkoutUrl: "https://checkout.stripe.com/c/session_1"
    });
    mocks.prisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    mocks.prisma.verificationToken.create.mockResolvedValue({
      identifier: "client-onboarding:client_1",
      token: "hashed-token",
      expires: new Date("2026-08-01T00:00:00.000Z")
    });
  });

  it("creates clients in the active organization and writes an audit log", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.organization.findUnique.mockResolvedValue({ platformPlan: "core" });
    mocks.prisma.client.count.mockResolvedValue(12);
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
    mocks.prisma.clientProfile.upsert.mockResolvedValue({});
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await postClient(
      new Request("http://test.local/api/v1/clients", {
        method: "POST",
        body: JSON.stringify({
          firstName: "Emma",
          lastName: "Thompson",
          email: "EMMA@example.com",
          organizationId: "org_2",
          status: "new",
          packageId: "package_1",
          onboarding: {
            dateOfBirth: "1992-06-14",
            needsPayment: true,
            paymentMode: "payment-link",
            weightMeasurement: "kg",
            initialQuestionnaire: "form_intake",
            dailyHabitForm: "form_habits",
            checkInForm: "form_checkin",
            checkInFrequency: "Weekly",
            checkInDays: ["Tuesday"],
            defaultExerciseMetricUnit: "kg"
          }
        })
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.prisma.$transaction).toHaveBeenCalledOnce();
    expect(mocks.prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          email: "emma@example.com",
          packageId: "package_1"
        })
      })
    );
    expect(mocks.prisma.client.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        deletedAt: null
      }
    });
    expect(mocks.prisma.clientProfile.upsert).toHaveBeenCalledWith({
      where: { clientId: "client_1" },
      create: expect.objectContaining({
        organizationId: "org_1",
        clientId: "client_1",
        dateOfBirth: new Date("1992-06-14T00:00:00.000Z")
      }),
      update: {
        dateOfBirth: new Date("1992-06-14T00:00:00.000Z")
      }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "client.created",
          organizationId: "org_1",
          metadata: expect.objectContaining({
            onboarding: expect.objectContaining({
              needsPayment: true,
              paymentMode: "payment-link",
              checkInDays: ["Tuesday"]
            })
          })
        })
      })
    );
    expect(mocks.createClientSubscriptionCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        actorUserId: "user_1",
        clientId: "client_1",
        packageId: "package_1",
        successUrl: expect.stringContaining("/client-onboarding/")
      })
    );
    expect(mocks.sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        toEmail: "emma@example.com",
        metadata: expect.objectContaining({
          requiresPayment: true
        })
      })
    );
  });

  it("keeps client creation successful when optional onboarding profile metadata cannot be saved", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.organization.findUnique.mockResolvedValue({ platformPlan: "core" });
    mocks.prisma.client.count.mockResolvedValue(12);
    mocks.prisma.client.create.mockResolvedValue({
      id: "client_profile_skip",
      firstName: "Profile",
      lastName: "Skipped",
      email: "profile-skipped@example.com",
      status: ClientStatus.NEW,
      packageName: null,
      checkInDay: null,
      startDate: null,
      latestCheckInAt: null,
      compliance: 0
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});
    mocks.prisma.clientProfile.upsert.mockRejectedValue(new Error("Profile table unavailable."));

    const response = await postClient(
      new Request("http://test.local/api/v1/clients", {
        method: "POST",
        body: JSON.stringify({
          firstName: "Profile",
          lastName: "Skipped",
          email: "profile-skipped@example.com",
          status: "new",
          onboarding: {
            dateOfBirth: "1990-01-01"
          }
        })
      })
    );
    const payload = (await response.json()) as { data: { id: string } };

    expect(response.status).toBe(201);
    expect(payload.data.id).toBe("client_profile_skip");
    expect(mocks.prisma.client.create).toHaveBeenCalled();
    expect(mocks.prisma.clientProfile.upsert).toHaveBeenCalled();
  });

  it("returns a clear conflict when a client email already exists", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.organization.findUnique.mockResolvedValue({ platformPlan: "core" });
    mocks.prisma.client.count.mockResolvedValue(12);
    mocks.prisma.client.create.mockRejectedValue({
      code: "P2002",
      meta: { target: ["organization_id", "email"] }
    });

    const response = await postClient(
      new Request("http://test.local/api/v1/clients", {
        method: "POST",
        body: JSON.stringify({
          firstName: "Duplicate",
          lastName: "Email",
          email: "duplicate@example.com",
          status: "new"
        })
      })
    );
    const payload = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(409);
    expect(payload.error).toEqual({
      code: "client_email_exists",
      message: "A client with this email already exists."
    });
  });

  it("returns a clear conflict when Prisma reports the client email constraint by name", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.organization.findUnique.mockResolvedValue({ platformPlan: "core" });
    mocks.prisma.client.count.mockResolvedValue(12);
    mocks.prisma.client.create.mockRejectedValue({
      code: "P2002",
      meta: { target: "clients_organization_id_email_active_key" }
    });

    const response = await postClient(
      new Request("http://test.local/api/v1/clients", {
        method: "POST",
        body: JSON.stringify({
          firstName: "Duplicate",
          lastName: "Constraint",
          email: "duplicate@example.com",
          status: "new"
        })
      })
    );
    const payload = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(409);
    expect(payload.error).toEqual({
      code: "client_email_exists",
      message: "A client with this email already exists."
    });
  });

  it("blocks client creation when the organization has reached its platform client limit", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.organization.findUnique.mockResolvedValue({ platformPlan: "core" });
    mocks.prisma.client.count.mockResolvedValue(40);

    const response = await postClient(
      new Request("http://test.local/api/v1/clients", {
        method: "POST",
        body: JSON.stringify({
          firstName: "Limit",
          lastName: "Reached",
          email: "limit@example.com",
          status: "new"
        })
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("platform_client_limit_reached");
    expect(mocks.prisma.client.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        deletedAt: null
      }
    });
    expect(mocks.prisma.client.create).not.toHaveBeenCalled();
  });

  it("allows client creation while platform billing is in setup warning state", async () => {
    mocks.auth.mockResolvedValue({
      ...ownerSession,
      activeOrganization: {
        ...ownerSession.activeOrganization,
        platformAccess: {
          state: "warning",
          canUsePlatform: true,
          reason: "subscription_required",
          message: "Choose a Complete Coach plan to keep platform access active."
        }
      }
    });
    mocks.prisma.organization.findUnique.mockResolvedValue({ platformPlan: "core" });
    mocks.prisma.client.count.mockResolvedValue(12);
    mocks.prisma.client.create.mockResolvedValue({
      id: "client_setup_1",
      firstName: "Setup",
      lastName: "Allowed",
      email: null,
      status: ClientStatus.NEW,
      packageName: null,
      checkInDay: null,
      startDate: null,
      latestCheckInAt: null,
      compliance: 0
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await postClient(
      new Request("http://test.local/api/v1/clients", {
        method: "POST",
        body: JSON.stringify({
          firstName: "Setup",
          lastName: "Allowed",
          status: "new"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          firstName: "Setup",
          lastName: "Allowed"
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
        compliance: 96,
        primaryCoach: {
          name: "Sam Coach",
          email: "sam@example.com"
        }
      }
    ]);

    const response = await getClients(
      new Request("http://test.local/api/v1/clients?status=active&search=marcus")
    );
    const payload = (await response.json()) as { data: Array<{ name: string; assignedCoachName?: string | null }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]?.name).toBe("Marcus Rodriguez");
    expect(payload.data[0]?.assignedCoachName).toBe("Sam Coach");
    expect(mocks.prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { status: ClientStatus.ACTIVE },
                expect.objectContaining({ status: ClientStatus.NEW })
              ])
            })
          ])
        }),
        include: {
          primaryCoach: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })
    );
  });

  it("limits team members to clients assigned to them", async () => {
    mocks.auth.mockResolvedValue({
      ...ownerSession,
      activeOrganization: {
        ...ownerSession.activeOrganization,
        role: "coach"
      }
    });
    mocks.prisma.client.findMany.mockResolvedValue([]);

    const response = await getClients(new Request("http://test.local/api/v1/clients"));

    expect(response.status).toBe(200);
    expect(mocks.prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          primaryCoachUserId: "user_1"
        })
      })
    );
  });

  it("lists searchable client notes for an organization-scoped client", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientNote.findMany.mockResolvedValue([
      {
        id: "note_1",
        clientId: "client_1",
        noteDate: new Date("2026-07-22T00:00:00.000Z"),
        body: "Discussed sleep and training load.",
        createdAt: new Date("2026-07-22T05:00:00.000Z"),
        author: {
          name: "Sam Coach",
          email: "sam@example.com"
        }
      }
    ]);

    const response = await getClientNotes(
      new Request("http://test.local/api/v1/clients/client_1/notes?search=sleep&date=2026-07-22"),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );
    const payload = (await response.json()) as { data: Array<{ body: string; authorName: string; noteDate: string }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]).toMatchObject({
      body: "Discussed sleep and training load.",
      authorName: "Sam Coach",
      noteDate: "2026-07-22"
    });
    expect(mocks.prisma.clientNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          body: {
            contains: "sleep",
            mode: "insensitive"
          },
          noteDate: new Date("2026-07-22T00:00:00.000Z")
        }),
        take: 50
      })
    );
  });

  it("creates client notes only for assigned team-member clients", async () => {
    mocks.auth.mockResolvedValue({
      ...ownerSession,
      activeOrganization: {
        ...ownerSession.activeOrganization,
        role: "coach"
      }
    });
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientNote.create.mockResolvedValue({
      id: "note_2",
      clientId: "client_1",
      noteDate: new Date("2026-07-22T00:00:00.000Z"),
      body: "Set a new walking target.",
      createdAt: new Date("2026-07-22T05:00:00.000Z"),
      author: {
        name: "Sam Coach",
        email: "sam@example.com"
      }
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await postClientNote(
      new Request("http://test.local/api/v1/clients/client_1/notes", {
        method: "POST",
        body: JSON.stringify({
          noteDate: "2026-07-22",
          body: "Set a new walking target."
        })
      }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );

    expect(response.status).toBe(201);
    expect(mocks.prisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "client_1",
          organizationId: "org_1",
          primaryCoachUserId: "user_1"
        })
      })
    );
    expect(mocks.prisma.clientNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          authorUserId: "user_1",
          body: "Set a new walking target.",
          noteDate: new Date("2026-07-22T00:00:00.000Z")
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "client.note_created",
          targetId: "client_1"
        })
      })
    );
  });

  it("lists client activity logs with a seven day compliance summary", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientActivityLog.findMany.mockResolvedValue([
      {
        id: "log_1",
        domain: ClientActivityLogDomain.TRAINING,
        logDate: new Date("2026-07-24T00:00:00.000Z"),
        status: ClientActivityLogStatus.COMPLETED,
        notes: null,
        createdAt: new Date("2026-07-24T01:00:00.000Z"),
        updatedAt: new Date("2026-07-24T01:00:00.000Z")
      },
      {
        id: "log_2",
        domain: ClientActivityLogDomain.NUTRITION,
        logDate: new Date("2026-07-24T00:00:00.000Z"),
        status: ClientActivityLogStatus.MISSED,
        notes: "Missed meal log.",
        createdAt: new Date("2026-07-24T01:00:00.000Z"),
        updatedAt: new Date("2026-07-24T01:00:00.000Z")
      }
    ]);

    const response = await getClientActivityLogs(
      new Request("http://test.local/api/v1/clients/client_1/logs?dateFrom=2026-07-24&dateTo=2026-07-30"),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );
    const payload = (await response.json()) as { data: { logs: Array<{ domain: string }>; summary: { complianceScore: number; possibleLogs: number } } };

    expect(response.status).toBe(200);
    expect(payload.data.summary).toMatchObject({
      complianceScore: 5,
      possibleLogs: 21
    });
    expect(payload.data.logs).toHaveLength(2);
    expect(mocks.prisma.clientActivityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          clientId: "client_1",
          logDate: {
            gte: new Date("2026-07-24T00:00:00.000Z"),
            lte: new Date("2026-07-30T00:00:00.000Z")
          }
        },
        orderBy: [{ logDate: "asc" }, { domain: "asc" }]
      })
    );
  });

  it("upserts a client activity log and refreshes the stored client compliance score", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientActivityLog.upsert.mockResolvedValue({
      id: "log_1",
      domain: ClientActivityLogDomain.TRAINING,
      logDate: new Date("2026-07-30T00:00:00.000Z"),
      status: ClientActivityLogStatus.COMPLETED,
      notes: "Completed session.",
      createdAt: new Date("2026-07-30T01:00:00.000Z"),
      updatedAt: new Date("2026-07-30T01:00:00.000Z")
    });
    mocks.prisma.clientActivityLog.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => ({
        id: `log_${index}`,
        domain: [ClientActivityLogDomain.TRAINING, ClientActivityLogDomain.NUTRITION, ClientActivityLogDomain.SUPPLEMENTATION][index % 3],
        logDate: new Date(`2026-07-${String(24 + Math.floor(index / 3)).padStart(2, "0")}T00:00:00.000Z`),
        status: ClientActivityLogStatus.COMPLETED,
        notes: null,
        createdAt: new Date("2026-07-30T01:00:00.000Z"),
        updatedAt: new Date("2026-07-30T01:00:00.000Z")
      }))
    );
    mocks.prisma.client.update.mockResolvedValue({ id: "client_1", compliance: 100 });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await postClientActivityLog(
      new Request("http://test.local/api/v1/clients/client_1/logs", {
        method: "POST",
        body: JSON.stringify({
          domain: "training",
          logDate: "2026-07-30",
          status: "completed",
          notes: "Completed session."
        })
      }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );
    const payload = (await response.json()) as { data: { summary: { complianceScore: number } } };

    expect(response.status).toBe(200);
    expect(payload.data.summary.complianceScore).toBe(100);
    expect(mocks.prisma.clientActivityLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_clientId_domain_logDate: {
            organizationId: "org_1",
            clientId: "client_1",
            domain: ClientActivityLogDomain.TRAINING,
            logDate: new Date("2026-07-30T00:00:00.000Z")
          }
        },
        create: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          domain: ClientActivityLogDomain.TRAINING,
          status: ClientActivityLogStatus.COMPLETED
        }),
        update: expect.objectContaining({
          status: ClientActivityLogStatus.COMPLETED,
          notes: "Completed session."
        })
      })
    );
    expect(mocks.prisma.client.update).toHaveBeenCalledWith({
      where: { id: "client_1", organizationId: "org_1" },
      data: { compliance: 100 }
    });
  });

  it("does not expose activity logs for clients outside the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue(null);

    const response = await getClientActivityLogs(
      new Request("http://test.local/api/v1/clients/client_2/logs?days=7"),
      { params: Promise.resolve({ clientId: "client_2" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.clientActivityLog.findMany).not.toHaveBeenCalled();
  });

  it("creates client goals linked to a roadmap phase and logs account activity", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientRoadmapPhase.findFirst.mockResolvedValue({ id: "phase_1" });
    mocks.prisma.clientGoal.create.mockResolvedValue({
      id: "goal_1",
      clientId: "client_1",
      title: "Stage photos",
      targetDate: new Date("2026-08-14T00:00:00.000Z"),
      notes: "Final check before shoot.",
      roadmapPhaseId: "phase_1",
      roadmapPhase: { id: "phase_1", name: "Cutting Phase" },
      createdAt: new Date("2026-07-30T00:00:00.000Z")
    });
    mocks.prisma.clientAccountActivityLog.create.mockResolvedValue({});
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await postClientGoal(
      new Request("http://test.local/api/v1/clients/client_1/goals", {
        method: "POST",
        body: JSON.stringify({
          title: "Stage photos",
          targetDate: "2026-08-14",
          notes: "Final check before shoot.",
          roadmapPhaseId: "phase_1"
        })
      }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );
    const payload = (await response.json()) as { data: { title: string; roadmapPhaseName: string } };

    expect(response.status).toBe(201);
    expect(payload.data).toMatchObject({ title: "Stage photos", roadmapPhaseName: "Cutting Phase" });
    expect(mocks.prisma.clientRoadmapPhase.findFirst).toHaveBeenCalledWith({
      where: {
        id: "phase_1",
        organizationId: "org_1",
        clientId: "client_1"
      },
      select: { id: true }
    });
    expect(mocks.prisma.clientGoal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          roadmapPhaseId: "phase_1",
          title: "Stage photos",
          targetDate: new Date("2026-08-14T00:00:00.000Z")
        })
      })
    );
    expect(mocks.prisma.clientAccountActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: ClientAccountActivityType.CLIENT_GOAL_CREATED,
          title: "Goal added: Stage photos"
        })
      })
    );
  });

  it("lists client goals as countdowns", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientGoal.findMany.mockResolvedValue([
      {
        id: "goal_1",
        clientId: "client_1",
        title: "Stage photos",
        targetDate: new Date("2026-08-14T00:00:00.000Z"),
        notes: "",
        roadmapPhaseId: "phase_1",
        roadmapPhase: { id: "phase_1", name: "Cutting Phase" },
        createdAt: new Date("2026-07-30T00:00:00.000Z")
      }
    ]);

    const response = await getClientGoals(
      new Request("http://test.local/api/v1/clients/client_1/goals?limit=10"),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );
    const payload = (await response.json()) as { data: Array<{ title: string; targetDate: string; roadmapPhaseName: string }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]).toMatchObject({
      title: "Stage photos",
      targetDate: "2026-08-14",
      roadmapPhaseName: "Cutting Phase"
    });
    expect(mocks.prisma.clientGoal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          clientId: "client_1"
        },
        take: 10
      })
    );
  });

  it("lists and creates client account activity events", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientAccountActivityLog.findMany.mockResolvedValue([
      {
        id: "activity_1",
        clientId: "client_1",
        type: ClientAccountActivityType.NUTRITION_PLAN_UPDATED,
        title: "Nutrition plan updated",
        occurredAt: new Date("2026-07-30T01:00:00.000Z"),
        metadata: { templateId: "meal_1" },
        actor: { name: "Sam Coach", email: "sam@example.com" }
      }
    ]);
    mocks.prisma.clientAccountActivityLog.create.mockResolvedValue({
      id: "activity_2",
      clientId: "client_1",
      type: ClientAccountActivityType.TRAINING_PLAN_UPDATED,
      title: "Training plan updated",
      occurredAt: new Date("2026-07-30T02:00:00.000Z"),
      metadata: { templateId: "training_1" },
      actor: { name: "Sam Coach", email: "sam@example.com" }
    });

    const listResponse = await getClientAccountActivity(
      new Request("http://test.local/api/v1/clients/client_1/activity?limit=5"),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );
    const createResponse = await postClientAccountActivity(
      new Request("http://test.local/api/v1/clients/client_1/activity", {
        method: "POST",
        body: JSON.stringify({
          type: "training-plan-updated",
          title: "Training plan updated",
          metadata: { templateId: "training_1" }
        })
      }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );

    expect(listResponse.status).toBe(200);
    expect(createResponse.status).toBe(201);
    expect(mocks.prisma.clientAccountActivityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          clientId: "client_1"
        },
        take: 5
      })
    );
    expect(mocks.prisma.clientAccountActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: ClientAccountActivityType.TRAINING_PLAN_UPDATED,
          title: "Training plan updated"
        })
      })
    );
  });

  it("lists persisted roadmap phases and phase items for an organization-scoped client", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientRoadmapPhase.findMany.mockResolvedValue([
      {
        id: "phase_1",
        clientId: "client_1",
        name: "Hypertrophy II",
        startDate: yesterday,
        endDate: tomorrow,
        status: "planned",
        items: [
          {
            id: "item_1",
            phaseId: "phase_1",
            clientId: "client_1",
            title: "Strength testing week",
            type: "milestone",
            eventDate: new Date("2026-08-01T00:00:00.000Z"),
            notes: "Test major lifts."
          }
        ]
      }
    ]);

    const response = await getClientRoadmap(
      new Request("http://test.local/api/v1/clients/client_1/roadmap"),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );
    const payload = (await response.json()) as { data: Array<{ name: string; items: Array<{ title: string; type: string }> }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]).toMatchObject({
      name: "Hypertrophy II",
      status: "active",
      items: [expect.objectContaining({ title: "Strength testing week", type: "milestone" })]
    });
    expect(mocks.prisma.clientRoadmapPhase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          clientId: "client_1"
        },
        include: {
          items: {
            orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }]
          }
        }
      })
    );
  });

  it("creates persisted roadmap phases and phase-linked items for the client", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientRoadmapPhase.create.mockResolvedValue({
      id: "phase_2",
      clientId: "client_1",
      name: "Performance Build",
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
      status: "planned",
      items: []
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const phaseResponse = await postClientRoadmap(
      new Request("http://test.local/api/v1/clients/client_1/roadmap", {
        method: "POST",
        body: JSON.stringify({
          kind: "phase",
          name: "Performance Build",
          startDate: "2026-10-01",
          endDate: "2026-12-31"
        })
      }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );

    expect(phaseResponse.status).toBe(201);
    expect(mocks.prisma.clientRoadmapPhase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          name: "Performance Build",
          startDate: new Date("2026-10-01T00:00:00.000Z")
        })
      })
    );

    mocks.prisma.clientRoadmapPhase.findFirst.mockResolvedValue({ id: "phase_2", clientId: "client_1" });
    mocks.prisma.clientRoadmapItem.create.mockResolvedValue({
      id: "item_2",
      phaseId: "phase_2",
      clientId: "client_1",
      title: "Coach task",
      type: "task",
      eventDate: new Date("2026-10-10T00:00:00.000Z"),
      notes: "Update testing targets."
    });

    const itemResponse = await postClientRoadmap(
      new Request("http://test.local/api/v1/clients/client_1/roadmap", {
        method: "POST",
        body: JSON.stringify({
          kind: "item",
          phaseId: "phase_2",
          title: "Coach task",
          type: "task",
          date: "2026-10-10",
          notes: "Update testing targets."
        })
      }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );

    expect(itemResponse.status).toBe(201);
    expect(mocks.prisma.clientRoadmapPhase.findFirst).toHaveBeenCalledWith({
      where: {
        id: "phase_2",
        organizationId: "org_1",
        clientId: "client_1"
      }
    });
    expect(mocks.prisma.clientRoadmapItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        clientId: "client_1",
        phaseId: "phase_2",
        title: "Coach task",
        type: "task"
      })
    });
  });

  it("deletes scoped roadmap phases and unlinks associated goals", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientRoadmapPhase.findFirst.mockResolvedValue({
      id: "phase_delete",
      clientId: "client_1",
      name: "Old Build Phase",
      _count: {
        items: 2,
        goals: 1
      }
    });
    mocks.prisma.clientGoal.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.clientRoadmapPhase.delete.mockResolvedValue({ id: "phase_delete" });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await deleteClientRoadmapPhase(
      new Request("http://test.local/api/v1/clients/client_1/roadmap?phaseId=phase_delete", { method: "DELETE" }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );
    const payload = (await response.json()) as { data: { id: string; deleted: boolean } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ id: "phase_delete", deleted: true });
    expect(mocks.prisma.clientRoadmapPhase.findFirst).toHaveBeenCalledWith({
      where: {
        id: "phase_delete",
        organizationId: "org_1",
        clientId: "client_1"
      },
      include: {
        _count: {
          select: {
            items: true,
            goals: true
          }
        }
      }
    });
    expect(mocks.prisma.clientGoal.updateMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        clientId: "client_1",
        roadmapPhaseId: "phase_delete"
      },
      data: { roadmapPhaseId: null }
    });
    expect(mocks.prisma.clientRoadmapPhase.delete).toHaveBeenCalledWith({
      where: {
        id: "phase_delete",
        organizationId: "org_1"
      }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "client.roadmap_phase_deleted",
          targetId: "client_1",
          metadata: expect.objectContaining({
            phaseId: "phase_delete",
            itemCount: 2,
            unlinkedGoalCount: 1
          })
        })
      })
    );
  });

  it("lists persisted calendar events for an organization-scoped client", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientCalendarEvent.findMany.mockResolvedValue([
      {
        id: "calendar_event_1",
        clientId: "client_1",
        title: "Strength: Day 1",
        type: "strength",
        startDate: new Date("2026-08-05T00:00:00.000Z"),
        endDate: new Date("2026-08-05T00:00:00.000Z"),
        allDay: true,
        eventTime: null,
        recurring: false,
        recurrenceCount: null,
        recurrenceEndsOn: null,
        recurrenceDays: [],
        goal: "Hypertrophy II",
        notes: "Keep reps controlled.",
        meetingUrl: null,
        roadmapPhaseId: "phase_active",
        scheduledTrainingProgramId: "training_assignment_1",
        scheduledTrainingProgramName: "Strength Foundation",
        scheduledTrainingDayName: "Day 1",
        createdAt: new Date("2026-08-05T01:00:00.000Z"),
        updatedAt: new Date("2026-08-05T01:00:00.000Z")
      }
    ]);

    const response = await getClientCalendarEvents(
      new Request("http://test.local/api/v1/clients/client_1/calendar-events"),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );
    const payload = (await response.json()) as { data: Array<{ title: string; scheduledTrainingDayName: string }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]).toMatchObject({
      title: "Strength: Day 1",
      scheduledTrainingDayName: "Day 1"
    });
    expect(mocks.prisma.clientCalendarEvent.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        clientId: "client_1"
      },
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }]
    });
  });

  it("creates and updates persisted client calendar events", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientRoadmapPhase.findFirst.mockResolvedValue({ id: "phase_active" });
    mocks.prisma.clientCalendarEvent.create.mockResolvedValue({
      id: "calendar_event_2",
      clientId: "client_1",
      title: "Strength: Day 2",
      type: "strength",
      startDate: new Date("2026-08-06T00:00:00.000Z"),
      endDate: new Date("2026-08-06T00:00:00.000Z"),
      allDay: true,
      eventTime: null,
      recurring: false,
      recurrenceCount: null,
      recurrenceEndsOn: null,
      recurrenceDays: [],
      goal: "Hypertrophy II",
      notes: "Bench focus.",
      meetingUrl: null,
      roadmapPhaseId: "phase_active",
      scheduledTrainingProgramId: "training_assignment_1",
      scheduledTrainingProgramName: "Strength Foundation",
      scheduledTrainingDayName: "Day 2",
      createdAt: new Date("2026-08-05T01:00:00.000Z"),
      updatedAt: new Date("2026-08-05T01:00:00.000Z")
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const createResponse = await postClientCalendarEvent(
      new Request("http://test.local/api/v1/clients/client_1/calendar-events", {
        method: "POST",
        body: JSON.stringify({
          title: "Strength: Day 2",
          type: "strength",
          startDate: "2026-08-06",
          endDate: "2026-08-06",
          allDay: true,
          recurring: false,
          recurrenceDays: [],
          goal: "Hypertrophy II",
          notes: "Bench focus.",
          roadmapPhaseId: "phase_active",
          scheduledTrainingProgramId: "training_assignment_1",
          scheduledTrainingProgramName: "Strength Foundation",
          scheduledTrainingDayName: "Day 2"
        })
      }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );

    expect(createResponse.status).toBe(201);
    expect(mocks.prisma.clientRoadmapPhase.findFirst).toHaveBeenCalledWith({
      where: {
        id: "phase_active",
        organizationId: "org_1",
        clientId: "client_1"
      },
      select: { id: true }
    });
    expect(mocks.prisma.clientCalendarEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        clientId: "client_1",
        title: "Strength: Day 2",
        roadmapPhaseId: "phase_active",
        scheduledTrainingDayName: "Day 2"
      })
    });

    mocks.prisma.clientCalendarEvent.findFirst.mockResolvedValue({
      id: "calendar_event_2",
      clientId: "client_1"
    });
    mocks.prisma.clientCalendarEvent.update.mockResolvedValue({
      id: "calendar_event_2",
      clientId: "client_1",
      title: "Strength: Day 1",
      type: "strength",
      startDate: new Date("2026-08-07T00:00:00.000Z"),
      endDate: new Date("2026-08-07T00:00:00.000Z"),
      allDay: true,
      eventTime: null,
      recurring: false,
      recurrenceCount: null,
      recurrenceEndsOn: null,
      recurrenceDays: [],
      goal: "Hypertrophy II",
      notes: "Updated day.",
      meetingUrl: null,
      roadmapPhaseId: "phase_active",
      scheduledTrainingProgramId: "training_assignment_1",
      scheduledTrainingProgramName: "Strength Foundation",
      scheduledTrainingDayName: "Day 1",
      createdAt: new Date("2026-08-05T01:00:00.000Z"),
      updatedAt: new Date("2026-08-05T02:00:00.000Z")
    });

    const updateResponse = await patchClientCalendarEvent(
      new Request("http://test.local/api/v1/clients/client_1/calendar-events?eventId=calendar_event_2", {
        method: "PATCH",
        body: JSON.stringify({
          title: "Strength: Day 1",
          type: "strength",
          startDate: "2026-08-07",
          endDate: "2026-08-07",
          allDay: true,
          recurring: false,
          recurrenceDays: [],
          goal: "Hypertrophy II",
          notes: "Updated day.",
          roadmapPhaseId: "phase_active",
          scheduledTrainingProgramId: "training_assignment_1",
          scheduledTrainingProgramName: "Strength Foundation",
          scheduledTrainingDayName: "Day 1"
        })
      }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );

    expect(updateResponse.status).toBe(200);
    expect(mocks.prisma.clientCalendarEvent.update).toHaveBeenCalledWith({
      where: {
        id: "calendar_event_2",
        organizationId: "org_1"
      },
      data: expect.objectContaining({
        title: "Strength: Day 1",
        scheduledTrainingDayName: "Day 1"
      })
    });
  });

  it("deletes persisted client calendar events after scoping the client and event", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientCalendarEvent.findFirst.mockResolvedValue({
      id: "calendar_event_delete",
      clientId: "client_1",
      title: "Technique review",
      type: "strength",
      startDate: new Date("2026-08-05T00:00:00.000Z")
    });
    mocks.prisma.clientCalendarEvent.delete.mockResolvedValue({ id: "calendar_event_delete" });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await deleteClientCalendarEvent(
      new Request("http://test.local/api/v1/clients/client_1/calendar-events?eventId=calendar_event_delete", { method: "DELETE" }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );
    const payload = (await response.json()) as { data: { id: string; deleted: boolean } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ id: "calendar_event_delete", deleted: true });
    expect(mocks.prisma.clientCalendarEvent.findFirst).toHaveBeenCalledWith({
      where: {
        id: "calendar_event_delete",
        organizationId: "org_1",
        clientId: "client_1"
      }
    });
    expect(mocks.prisma.clientCalendarEvent.delete).toHaveBeenCalledWith({
      where: {
        id: "calendar_event_delete",
        organizationId: "org_1"
      }
    });
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
      packageId: "package_premium",
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
          packageId: "package_premium",
          packageName: "Premium Package",
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
          packageId: "package_premium",
          packageName: "Premium Package",
          status: ClientStatus.ACTIVE,
          startDate: new Date("2026-05-14T00:00:00.000Z")
        })
      })
    );
  });

  it("updates a client's assigned coach after validating active organization membership", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.organizationMembership.findFirst.mockResolvedValue({ id: "membership_coach_2" });
    mocks.prisma.client.update.mockResolvedValue({
      id: "client_1",
      firstName: "Updated",
      lastName: "Client",
      email: "updated@example.com",
      status: ClientStatus.ACTIVE,
      packageId: null,
      packageName: null,
      primaryCoachUserId: "coach_2",
      checkInDay: null,
      startDate: null,
      latestCheckInAt: null,
      compliance: 0
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await patchClient(
      new Request("http://test.local/api/v1/clients/client_1", {
        method: "PATCH",
        body: JSON.stringify({ primaryCoachUserId: "coach_2" })
      }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );
    const payload = (await response.json()) as { data: { primaryCoachUserId: string | null } };

    expect(response.status).toBe(200);
    expect(payload.data.primaryCoachUserId).toBe("coach_2");
    expect(mocks.prisma.organizationMembership.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: "org_1",
        userId: "coach_2"
      }),
      select: { id: true }
    });
    expect(mocks.prisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          primaryCoachUserId: "coach_2"
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
      phone: null,
      status: ClientStatus.ACTIVE,
      packageId: null,
      packageName: "Premium Package",
      checkInDay: "Monday",
      startDate: null,
      latestCheckInAt: null,
      compliance: 80
    });

    const response = await getClient(new Request("http://test.local/api/v1/clients/client_1"), {
      params: Promise.resolve({ clientId: "client_1" })
    });
    const payload = (await response.json()) as { data: { name: string; email: string | null; phone: string | null; packageId: string | null } };

    expect(response.status).toBe(200);
    expect(payload.data.name).toBe("Scoped Client");
    expect(payload.data.email).toBe("scoped@example.com");
    expect(payload.data.phone).toBeNull();
    expect(payload.data.packageId).toBeNull();
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

  it("persists cleared optional client profile fields when they are sent in an update", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.client.update.mockResolvedValue({
      id: "client_1",
      firstName: "Scoped",
      lastName: "Client",
      email: null,
      phone: null,
      status: ClientStatus.ACTIVE,
      packageId: null,
      packageName: null,
      checkInDay: null,
      startDate: null,
      latestCheckInAt: null,
      compliance: 80
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await patchClient(
      new Request("http://test.local/api/v1/clients/client_1", {
        method: "PATCH",
        body: JSON.stringify({
          email: null,
          phone: null,
          packageId: null,
          packageName: null,
          checkInDay: null,
          startDate: null
        })
      }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: null,
          phone: null,
          packageId: null,
          packageName: null,
          checkInDay: null,
          startDate: null
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

  it("deletes scoped clients and their profile records", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({
      id: "client_delete",
      organizationId: "org_1"
    });
    mocks.prisma.clientProfile.deleteMany.mockResolvedValue({ count: 1 });
    mocks.prisma.client.update.mockResolvedValue({
      id: "client_delete",
      firstName: "Delete",
      lastName: "Client",
      email: null,
      status: ClientStatus.ARCHIVED,
      packageName: null,
      checkInDay: null,
      startDate: null,
      latestCheckInAt: null,
      compliance: 0,
      deletedAt: new Date("2026-07-30T00:00:00.000Z")
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await deleteClient(
      new Request("http://test.local/api/v1/clients/client_delete", { method: "DELETE" }),
      { params: Promise.resolve({ clientId: "client_delete" }) }
    );
    const payload = (await response.json()) as { data: { id: string; deleted: boolean } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ id: "client_delete", deleted: true });
    expect(mocks.prisma.$transaction).toHaveBeenCalledOnce();
    expect(mocks.prisma.clientProfile.deleteMany).toHaveBeenCalledWith({
      where: {
        clientId: "client_delete",
        organizationId: "org_1"
      }
    });
    expect(mocks.prisma.client.update).toHaveBeenCalledWith({
      where: { id: "client_delete", organizationId: "org_1" },
      data: expect.objectContaining({
        status: ClientStatus.ARCHIVED,
        deletedAt: expect.any(Date)
      })
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "client.deleted",
          targetId: "client_delete"
        })
      })
    );
  });

  it("does not delete clients outside the active organization scope", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue(null);

    const response = await deleteClient(
      new Request("http://test.local/api/v1/clients/org_2_client", { method: "DELETE" }),
      { params: Promise.resolve({ clientId: "org_2_client" }) }
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("not_found");
    expect(mocks.prisma.clientProfile.deleteMany).not.toHaveBeenCalled();
    expect(mocks.prisma.client.update).not.toHaveBeenCalled();
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

  it("updates persisted client water and step targets", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.clientProfile.upsert.mockResolvedValue({
      id: "profile_1",
      clientId: "client_1",
      waterTargetLitres: 3.5,
      stepTarget: 12000
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await patchClientProfile(
      new Request("http://test.local/api/v1/clients/client_1/profile", {
        method: "PATCH",
        body: JSON.stringify({
          waterTargetLitres: 3.5,
          stepTarget: 12000
        })
      }),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.clientProfile.upsert).toHaveBeenCalledWith({
      where: { clientId: "client_1" },
      update: expect.objectContaining({
        waterTargetLitres: 3.5,
        stepTarget: 12000
      }),
      create: expect.objectContaining({
        organizationId: "org_1",
        clientId: "client_1",
        waterTargetLitres: 3.5,
        stepTarget: 12000
      })
    });
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

  it("returns default CRM stages when an organization has not customized the pipeline", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.crmStage.findMany.mockResolvedValue([]);

    const response = await getCrmStages();
    const payload = (await response.json()) as { data: Array<{ id: string; title: string; color: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "initial-contact", title: "Initial Contact", color: "gray" }),
        expect.objectContaining({ id: "closed-won", title: "Closed - Won", color: "green" })
      ])
    );
    expect(mocks.prisma.crmStage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1" }
      })
    );
  });

  it("saves CRM stage additions, deletions, labels, and colors to the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    const savedStages = [
      {
        slug: "new-applications",
        title: "New Applications",
        color: "orange",
        position: 0,
        defaultStage: null
      }
    ];
    mocks.prisma.crmStage.deleteMany.mockResolvedValue({ count: 0 });
    mocks.prisma.crmStage.upsert.mockResolvedValue(savedStages[0]);
    mocks.prisma.crmStage.findMany.mockResolvedValue(savedStages);
    mocks.prisma.$transaction.mockImplementation(async (operations) => Promise.all(operations));
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await putCrmStages(
      new Request("http://test.local/api/v1/crm/stages", {
        method: "PUT",
        body: JSON.stringify({
          stages: [{ id: "new-applications", title: "New Applications", color: "orange", position: 0 }]
        })
      })
    );
    const payload = (await response.json()) as { data: Array<{ id: string; color: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([expect.objectContaining({ id: "new-applications", color: "orange" })]);
    expect(mocks.prisma.crmStage.deleteMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        slug: { notIn: ["new-applications"] }
      }
    });
    expect(mocks.prisma.crmStage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          organizationId: "org_1",
          slug: "new-applications",
          color: "orange"
        })
      })
    );
    expect(mocks.prisma.$transaction).toHaveBeenCalledWith([
      expect.any(Promise),
      expect.any(Promise)
    ]);
    expect(mocks.prisma.crmStage.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1" },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }]
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "crm.stages.updated",
          organizationId: "org_1"
        })
      })
    );
  });

  it("creates manual leads against custom CRM stages owned by the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.crmStage.findFirst.mockResolvedValue({ slug: "nurture" });
    mocks.prisma.lead.create.mockResolvedValue({
      id: "lead_custom_stage",
      name: "Nurture Lead",
      email: "nurture@example.com",
      phone: "+1 555",
      source: "Manual",
      status: LeadStatus.WARM,
      stage: LeadStage.INITIAL_CONTACT,
      crmStageSlug: "nurture",
      location: "Melbourne, AU",
      notes: "Manual lead",
      lastContactAt: null,
      daysInStage: 0
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await postLead(
      new Request("http://test.local/api/v1/leads", {
        method: "POST",
        body: JSON.stringify({
          name: "Nurture Lead",
          email: "nurture@example.com",
          status: "warm",
          stage: "nurture"
        })
      })
    );
    const payload = (await response.json()) as { data: { stage: string } };

    expect(response.status).toBe(201);
    expect(payload.data.stage).toBe("nurture");
    expect(mocks.prisma.crmStage.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        slug: "nurture"
      },
      select: { slug: true }
    });
    expect(mocks.prisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          crmStageSlug: "nurture"
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
      expect.objectContaining({ where: orgScopedLeadWhere })
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
      expect.objectContaining({ where: orgScopedLeadWhere })
    );
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.prisma.lead.update).not.toHaveBeenCalled();
    expect(mocks.prisma.leadActivity.create).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
