import { z } from "zod";
import type { InputJsonValue } from "@prisma/client/runtime/client";

import { AutomationJobStatus, ClientStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { sendTransactionalEmail } from "@/lib/email/resend";
import {
  automationIntervalValues,
  organizationAutomationTriggers,
  type OrganizationAutomationInterval,
  type OrganizationAutomationTriggerId,
  type SerializedOrganizationAutomation
} from "@/lib/organizations/automation-triggers";

const triggerIds = organizationAutomationTriggers.map((trigger) => trigger.id) as [
  OrganizationAutomationTriggerId,
  ...OrganizationAutomationTriggerId[]
];
const retryDelayMs = 15 * 60 * 1_000;
const maxAutomationJobAttempts = 3;

export const updateOrganizationAutomationSchema = z.object({
  automations: z.array(
    z.object({
      id: z.enum(triggerIds),
      enabled: z.boolean(),
      subject: z.string().trim().min(1).max(160),
      template: z.string().trim().min(1).max(5000),
      delay: z.coerce.number().int().min(0).max(365),
      interval: z.enum(automationIntervalValues)
    })
  )
});

export const processAutomationJobsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  enqueueScheduled: z.boolean().default(true)
});

interface AutomationRecord {
  trigger: string;
  emailEnabled: boolean;
  subject: string;
  body: string;
  delayAmount: number;
  delayInterval: string;
}

interface ClientAutomationRecipient {
  id?: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface SendClientAutomationEmailInput {
  organizationId: string;
  trigger: OrganizationAutomationTriggerId;
  client: ClientAutomationRecipient;
  metadata?: Record<string, unknown>;
}

interface EnqueueClientAutomationJobInput {
  organizationId: string;
  trigger: OrganizationAutomationTriggerId;
  clientId: string;
  source?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  scheduledFor?: Date;
  now?: Date;
}

interface AutomationJobRecord {
  id: string;
  organizationId: string;
  clientId: string;
  trigger: string;
  status: AutomationJobStatus;
  scheduledFor: Date | string;
  idempotencyKey: string;
  source: string | null;
  sourceId: string | null;
  metadata: unknown;
  attempts: number;
  client: ClientAutomationRecipient;
}

export function serializeOrganizationAutomations(records: AutomationRecord[]): SerializedOrganizationAutomation[] {
  const settingsByTrigger = new Map(records.map((record) => [record.trigger, record]));

  return organizationAutomationTriggers.map((trigger) => {
    const settings = settingsByTrigger.get(trigger.id);

    return {
      id: trigger.id,
      name: trigger.name,
      enabled: settings?.emailEnabled ?? trigger.enabled,
      subject: settings?.subject || trigger.subject,
      template: settings?.body || trigger.template,
      delay: settings?.delayAmount ?? trigger.delay,
      interval: isAutomationInterval(settings?.delayInterval) ? settings.delayInterval : trigger.interval
    };
  });
}

export function renderAutomationText(value: string, client: ClientAutomationRecipient) {
  return value
    .replaceAll("[FIRST_NAME]", client.firstName)
    .replaceAll("[LAST_NAME]", client.lastName)
    .replaceAll("[FULL_NAME]", `${client.firstName} ${client.lastName}`.trim());
}

export async function sendClientAutomationEmail(input: SendClientAutomationEmailInput) {
  if (!input.client.email) {
    return { status: "skipped", reason: "client_email_missing" } as const;
  }

  const settings = await prisma.organizationAutomation.findUnique({
    where: {
      organizationId_trigger: {
        organizationId: input.organizationId,
        trigger: input.trigger
      }
    }
  });
  const automation = serializeOrganizationAutomations(settings ? [settings] : []).find(
    (item) => item.id === input.trigger
  );

  if (!automation || !automation.enabled) {
    return { status: "skipped", reason: "automation_disabled" } as const;
  }

  return sendTransactionalEmail({
    organizationId: input.organizationId,
    toEmail: input.client.email,
    subject: renderAutomationText(automation.subject, input.client),
    text: renderAutomationText(automation.template, input.client),
    metadata: {
      type: "organization_automation",
      trigger: input.trigger,
      clientId: input.client.id,
      ...input.metadata
    }
  });
}

export async function enqueueClientAutomationJob(input: EnqueueClientAutomationJobInput) {
  const now = input.now ?? new Date();
  const automation = await getOrganizationAutomation(input.organizationId, input.trigger);

  if (!automation.enabled) {
    return { status: "skipped", reason: "automation_disabled" } as const;
  }

  const scheduledFor = input.scheduledFor ?? addAutomationDelay(now, automation);
  const idempotencyKey =
    input.idempotencyKey ??
    [input.trigger, input.source ?? "client", input.sourceId ?? input.clientId].join(":");

  const job = await prisma.automationJob.upsert({
    where: {
      organizationId_idempotencyKey: {
        organizationId: input.organizationId,
        idempotencyKey
      }
    },
    create: {
      organizationId: input.organizationId,
      clientId: input.clientId,
      trigger: input.trigger,
      scheduledFor,
      idempotencyKey,
      source: input.source,
      sourceId: input.sourceId,
      metadata: input.metadata as InputJsonValue | undefined
    },
    update: {}
  });

  return { status: "queued", job } as const;
}

export async function enqueueScheduledAutomationJobs(input: { organizationId?: string; now?: Date } = {}) {
  const now = input.now ?? new Date();
  const clients = await prisma.client.findMany({
    where: {
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      deletedAt: null,
      email: { not: null },
      status: { in: [ClientStatus.ACTIVE, ClientStatus.NEW] }
    },
    include: {
      organization: {
        select: { timezone: true }
      },
      profile: {
        select: { dateOfBirth: true }
      }
    }
  });
  let queued = 0;
  let skipped = 0;

  for (const client of clients) {
    const timeZone = client.timezone || client.organization.timezone || "UTC";
    const localToday = getLocalDateParts(now, timeZone);

    if (client.checkInDay && normalizeWeekday(client.checkInDay) === localToday.weekday) {
      const result = await enqueueClientAutomationJob({
        organizationId: client.organizationId,
        trigger: "client-check-in-reminder",
        clientId: client.id,
        source: "scheduled_check_in_reminder",
        sourceId: localToday.date,
        idempotencyKey: `client-check-in-reminder:${client.id}:${localToday.date}`,
        scheduledFor: now,
        now
      });
      queued += result.status === "queued" ? 1 : 0;
      skipped += result.status === "skipped" ? 1 : 0;
    }

    if (await shouldQueueMissedCheckIn(client, now, localToday)) {
      const dueDate = subtractPlainDate(localToday, await getAutomationDelayDays(client.organizationId, "client-misses-check-in"));
      const result = await enqueueClientAutomationJob({
        organizationId: client.organizationId,
        trigger: "client-misses-check-in",
        clientId: client.id,
        source: "scheduled_missed_check_in",
        sourceId: dueDate.date,
        idempotencyKey: `client-misses-check-in:${client.id}:${dueDate.date}`,
        scheduledFor: now,
        now
      });
      queued += result.status === "queued" ? 1 : 0;
      skipped += result.status === "skipped" ? 1 : 0;
    }

    if (client.profile?.dateOfBirth && isBirthdayToday(client.profile.dateOfBirth, localToday)) {
      const result = await enqueueClientAutomationJob({
        organizationId: client.organizationId,
        trigger: "client-birthday",
        clientId: client.id,
        source: "scheduled_client_birthday",
        sourceId: localToday.date,
        idempotencyKey: `client-birthday:${client.id}:${localToday.year}`,
        scheduledFor: now,
        now
      });
      queued += result.status === "queued" ? 1 : 0;
      skipped += result.status === "skipped" ? 1 : 0;
    }
  }

  return { checked: clients.length, queued, skipped };
}

export async function processDueAutomationJobs(input: { organizationId?: string; limit?: number; now?: Date } = {}) {
  const now = input.now ?? new Date();
  const dueJobs = await prisma.automationJob.findMany({
    where: {
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      status: AutomationJobStatus.QUEUED,
      scheduledFor: { lte: now }
    },
    include: { client: true },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
    take: input.limit ?? 50
  });
  const summary = {
    processed: dueJobs.length,
    sent: 0,
    skipped: 0,
    retried: 0,
    failed: 0
  };

  for (const job of dueJobs as AutomationJobRecord[]) {
    const attempts = job.attempts + 1;

    await prisma.automationJob.update({
      where: { id: job.id, organizationId: job.organizationId },
      data: {
        status: AutomationJobStatus.PROCESSING,
        attempts,
        lockedAt: now,
        lastError: null
      }
    });

    try {
      const delivery = await sendClientAutomationEmail({
        organizationId: job.organizationId,
        trigger: job.trigger as OrganizationAutomationTriggerId,
        client: job.client,
        metadata: {
          automationJobId: job.id,
          source: job.source,
          sourceId: job.sourceId,
          ...(isRecord(job.metadata) ? job.metadata : {})
        }
      });

      if ("reason" in delivery) {
        summary.skipped += 1;
        await markAutomationJobSkipped(job.id, job.organizationId, delivery.reason, now);
        continue;
      }

      if (delivery.status === "failed") {
        await retryOrFailAutomationJob(job.id, job.organizationId, attempts, delivery.errorMessage ?? "Email failed.", now);
        summary[attempts < maxAutomationJobAttempts ? "retried" : "failed"] += 1;
        continue;
      }

      summary.sent += 1;
      await prisma.automationJob.update({
        where: { id: job.id, organizationId: job.organizationId },
        data: {
          status: AutomationJobStatus.SENT,
          emailDeliveryId: delivery.id,
          processedAt: now,
          lockedAt: null
        }
      });
    } catch (error) {
      await retryOrFailAutomationJob(
        job.id,
        job.organizationId,
        attempts,
        error instanceof Error ? error.message : "Automation job failed.",
        now
      );
      summary[attempts < maxAutomationJobAttempts ? "retried" : "failed"] += 1;
    }
  }

  return summary;
}

export function getOrganizationAutomationUpsertData(
  organizationId: string,
  userId: string,
  input: z.infer<typeof updateOrganizationAutomationSchema>["automations"][number]
) {
  return {
    where: {
      organizationId_trigger: {
        organizationId,
        trigger: input.id
      }
    },
    create: {
      organizationId,
      trigger: input.id,
      emailEnabled: input.enabled,
      subject: input.subject,
      body: input.template,
      delayAmount: input.delay,
      delayInterval: input.interval,
      createdByUserId: userId
    },
    update: {
      emailEnabled: input.enabled,
      subject: input.subject,
      body: input.template,
      delayAmount: input.delay,
      delayInterval: input.interval
    }
  };
}

function isAutomationInterval(value: string | undefined): value is OrganizationAutomationInterval {
  return automationIntervalValues.includes(value as OrganizationAutomationInterval);
}

async function getOrganizationAutomation(organizationId: string, trigger: OrganizationAutomationTriggerId) {
  const settings = await prisma.organizationAutomation.findUnique({
    where: {
      organizationId_trigger: {
        organizationId,
        trigger
      }
    }
  });

  return serializeOrganizationAutomations(settings ? [settings] : []).find((item) => item.id === trigger)!;
}

function addAutomationDelay(now: Date, automation: SerializedOrganizationAutomation) {
  return new Date(now.getTime() + getDelayMs(automation.delay, automation.interval));
}

function getDelayMs(amount: number, interval: OrganizationAutomationInterval) {
  const multipliers: Record<OrganizationAutomationInterval, number> = {
    Minutes: 60 * 1_000,
    Hours: 60 * 60 * 1_000,
    Days: 24 * 60 * 60 * 1_000,
    Weeks: 7 * 24 * 60 * 60 * 1_000
  };

  return amount * multipliers[interval];
}

async function getAutomationDelayDays(organizationId: string, trigger: OrganizationAutomationTriggerId) {
  const automation = await getOrganizationAutomation(organizationId, trigger);

  if (automation.interval === "Weeks") {
    return automation.delay * 7;
  }

  if (automation.interval === "Days") {
    return automation.delay;
  }

  return automation.delay > 0 ? 1 : 0;
}

async function shouldQueueMissedCheckIn(
  client: {
    organizationId: string;
    checkInDay: string | null;
    latestCheckInAt: Date | string | null;
  },
  now: Date,
  localToday: LocalDateParts
) {
  if (!client.checkInDay) {
    return false;
  }

  const dueDate = subtractPlainDate(localToday, await getAutomationDelayDays(client.organizationId, "client-misses-check-in"));

  if (normalizeWeekday(client.checkInDay) !== dueDate.weekday) {
    return false;
  }

  if (!client.latestCheckInAt) {
    return true;
  }

  return getLocalDateParts(new Date(client.latestCheckInAt), localToday.timeZone).date < dueDate.date;
}

interface LocalDateParts {
  timeZone: string;
  date: string;
  year: string;
  month: string;
  day: string;
  weekday: string;
}

function getLocalDateParts(date: Date, timeZone: string): LocalDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const year = parts.year ?? "1970";
  const month = parts.month ?? "01";
  const day = parts.day ?? "01";

  return {
    timeZone,
    date: `${year}-${month}-${day}`,
    year,
    month,
    day,
    weekday: normalizeWeekday(parts.weekday ?? "")
  };
}

function subtractPlainDate(parts: LocalDateParts, days: number): LocalDateParts {
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) - days));
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  return {
    timeZone: parts.timeZone,
    date: `${year}-${month}-${day}`,
    year,
    month,
    day,
    weekday: weekdays[date.getUTCDay()] ?? ""
  };
}

function normalizeWeekday(value: string) {
  return value.trim().toLowerCase();
}

function isBirthdayToday(dateOfBirth: Date | string, localToday: LocalDateParts) {
  const birthDate = new Date(dateOfBirth);
  const month = String(birthDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(birthDate.getUTCDate()).padStart(2, "0");

  return month === localToday.month && day === localToday.day;
}

async function markAutomationJobSkipped(jobId: string, organizationId: string, reason: string, now: Date) {
  await prisma.automationJob.update({
    where: { id: jobId, organizationId },
    data: {
      status: AutomationJobStatus.SKIPPED,
      processedAt: now,
      lockedAt: null,
      lastError: reason
    }
  });
}

async function retryOrFailAutomationJob(
  jobId: string,
  organizationId: string,
  attempts: number,
  errorMessage: string,
  now: Date
) {
  const retry = attempts < maxAutomationJobAttempts;

  await prisma.automationJob.update({
    where: { id: jobId, organizationId },
    data: {
      status: retry ? AutomationJobStatus.QUEUED : AutomationJobStatus.FAILED,
      scheduledFor: retry ? new Date(now.getTime() + retryDelayMs) : now,
      processedAt: retry ? null : now,
      lockedAt: null,
      lastError: errorMessage
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
