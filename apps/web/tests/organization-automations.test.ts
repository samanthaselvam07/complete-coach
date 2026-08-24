import { beforeEach, describe, expect, it, vi } from "vitest";

import { AutomationJobStatus, ClientStatus } from "@/app/generated/prisma/enums";
import {
  enqueueClientAutomationJob,
  enqueueScheduledAutomationJobs,
  processDueAutomationJobs,
  renderAutomationText,
  sendClientAutomationEmail,
  serializeOrganizationAutomations
} from "@/lib/organizations/automation-records";

const mocks = vi.hoisted(() => ({
  prisma: {
    organizationAutomation: {
      findUnique: vi.fn()
    },
    automationJob: {
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn()
    },
    client: {
      findMany: vi.fn()
    }
  },
  sendTransactionalEmail: vi.fn()
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: mocks.sendTransactionalEmail
}));

describe("organization automations", () => {
  beforeEach(() => {
    mocks.prisma.organizationAutomation.findUnique.mockReset();
    mocks.prisma.organizationAutomation.findUnique.mockResolvedValue(null);
    mocks.prisma.automationJob.findMany.mockReset();
    mocks.prisma.automationJob.update.mockReset();
    mocks.prisma.automationJob.upsert.mockReset();
    mocks.prisma.client.findMany.mockReset();
    mocks.sendTransactionalEmail.mockReset();
  });

  it("uses saved subject and message overrides when sending client automation emails", async () => {
    mocks.prisma.organizationAutomation.findUnique.mockResolvedValue({
      trigger: "new-client-created",
      emailEnabled: true,
      subject: "Welcome [FIRST_NAME]",
      body: "Hi [FIRST_NAME] [LAST_NAME], start here.",
      delayAmount: 0,
      delayInterval: "Minutes"
    });
    mocks.sendTransactionalEmail.mockResolvedValue({ status: "sent" });

    await sendClientAutomationEmail({
      organizationId: "org_1",
      trigger: "new-client-created",
      client: {
        id: "client_1",
        firstName: "Emma",
        lastName: "Stone",
        email: "emma@example.com"
      }
    });

    expect(mocks.sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        toEmail: "emma@example.com",
        subject: "Welcome Emma",
        text: "Hi Emma Stone, start here.",
        metadata: expect.objectContaining({
          trigger: "new-client-created",
          clientId: "client_1"
        })
      })
    );
  });

  it("does not send an email when the automation is switched off", async () => {
    mocks.prisma.organizationAutomation.findUnique.mockResolvedValue({
      trigger: "nutrition-plan-added",
      emailEnabled: false,
      subject: "Nutrition ready",
      body: "Plan ready.",
      delayAmount: 0,
      delayInterval: "Minutes"
    });

    const result = await sendClientAutomationEmail({
      organizationId: "org_1",
      trigger: "nutrition-plan-added",
      client: {
        id: "client_1",
        firstName: "Emma",
        lastName: "Stone",
        email: "emma@example.com"
      }
    });

    expect(result).toEqual({ status: "skipped", reason: "automation_disabled" });
    expect(mocks.sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("merges saved records with default automation trigger text", () => {
    const automations = serializeOrganizationAutomations([
      {
        trigger: "workout-plan-added",
        emailEnabled: false,
        subject: "Custom workout subject",
        body: "Custom workout body",
        delayAmount: 2,
        delayInterval: "Hours"
      }
    ]);

    expect(automations.find((automation) => automation.id === "workout-plan-added")).toEqual(
      expect.objectContaining({
        enabled: false,
        subject: "Custom workout subject",
        template: "Custom workout body",
        delay: 2,
        interval: "Hours"
      })
    );
    expect(automations.find((automation) => automation.id === "client-birthday")?.subject).toBe(
      "Happy birthday from your coaching team"
    );
  });

  it("renders client merge tags in automation copy", () => {
    expect(
      renderAutomationText("Hi [FIRST_NAME] [LAST_NAME] ([FULL_NAME])", {
        firstName: "Emma",
        lastName: "Stone",
        email: "emma@example.com"
      })
    ).toBe("Hi Emma Stone (Emma Stone)");
  });

  it("queues client automation jobs using the configured delay", async () => {
    const now = new Date("2026-08-05T00:00:00.000Z");
    mocks.prisma.organizationAutomation.findUnique.mockResolvedValue({
      trigger: "workout-plan-added",
      emailEnabled: true,
      subject: "Workout ready",
      body: "Go train.",
      delayAmount: 2,
      delayInterval: "Hours"
    });
    mocks.prisma.automationJob.upsert.mockResolvedValue({
      id: "job_1",
      scheduledFor: new Date("2026-08-05T02:00:00.000Z")
    });

    const result = await enqueueClientAutomationJob({
      organizationId: "org_1",
      trigger: "workout-plan-added",
      clientId: "client_1",
      source: "training_assignment",
      sourceId: "assignment_1",
      now
    });

    expect(result.status).toBe("queued");
    expect(mocks.prisma.automationJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          trigger: "workout-plan-added",
          clientId: "client_1",
          idempotencyKey: "workout-plan-added:training_assignment:assignment_1",
          scheduledFor: new Date("2026-08-05T02:00:00.000Z")
        })
      })
    );
  });

  it("processes due automation jobs and records the email delivery id", async () => {
    const now = new Date("2026-08-05T00:00:00.000Z");
    mocks.prisma.automationJob.findMany.mockResolvedValue([
      {
        id: "job_1",
        organizationId: "org_1",
        clientId: "client_1",
        trigger: "new-client-created",
        status: AutomationJobStatus.QUEUED,
        scheduledFor: now,
        idempotencyKey: "new-client-created:client_create:client_1",
        source: "client_create",
        sourceId: "client_1",
        metadata: null,
        attempts: 0,
        client: {
          id: "client_1",
          firstName: "Emma",
          lastName: "Stone",
          email: "emma@example.com"
        }
      }
    ]);
    mocks.prisma.automationJob.update.mockResolvedValue({});
    mocks.sendTransactionalEmail.mockResolvedValue({ id: "delivery_1", status: "sent" });

    const result = await processDueAutomationJobs({ organizationId: "org_1", now });

    expect(result).toEqual({ processed: 1, sent: 1, skipped: 0, retried: 0, failed: 0 });
    expect(mocks.prisma.automationJob.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          status: AutomationJobStatus.PROCESSING,
          attempts: 1
        })
      })
    );
    expect(mocks.prisma.automationJob.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          status: AutomationJobStatus.SENT,
          emailDeliveryId: "delivery_1"
        })
      })
    );
  });

  it("creates daily scheduled jobs for check-in reminders and birthdays", async () => {
    const now = new Date("2026-08-05T12:00:00.000Z");
    mocks.prisma.client.findMany.mockResolvedValue([
      {
        id: "client_1",
        organizationId: "org_1",
        firstName: "Emma",
        lastName: "Stone",
        email: "emma@example.com",
        status: ClientStatus.ACTIVE,
        checkInDay: "Wednesday",
        timezone: "UTC",
        latestCheckInAt: null,
        organization: { timezone: "UTC" },
        profile: { dateOfBirth: new Date("1992-08-05T00:00:00.000Z") }
      }
    ]);
    mocks.prisma.automationJob.upsert.mockResolvedValue({ id: "job_1" });

    const result = await enqueueScheduledAutomationJobs({ organizationId: "org_1", now });

    expect(result).toEqual({ checked: 1, queued: 2, skipped: 0 });
    expect(mocks.prisma.automationJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          trigger: "client-check-in-reminder",
          idempotencyKey: "client-check-in-reminder:client_1:2026-08-05"
        })
      })
    );
    expect(mocks.prisma.automationJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          trigger: "client-birthday",
          idempotencyKey: "client-birthday:client_1:2026"
        })
      })
    );
  });
});
