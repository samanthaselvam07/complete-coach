import { timingSafeEqual } from "node:crypto";

import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  enqueueScheduledAutomationJobs,
  processAutomationJobsSchema,
  processDueAutomationJobs
} from "@/lib/organizations/automation-records";

interface AutomationJobActor {
  organizationId?: string;
  userId?: string;
  system: boolean;
}

export async function GET(request: Request) {
  return processAutomationJobRequest(request);
}

export async function POST(request: Request) {
  return processAutomationJobRequest(request);
}

async function processAutomationJobRequest(request: Request) {
  try {
    const actor = await getAutomationJobActor(request);

    if (!actor) {
      return errorResponse("unauthorized", "Authentication is required.", 401);
    }

    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const input = processAutomationJobsSchema.parse(body);
    const organizationId = actor.system ? undefined : actor.organizationId;
    const scheduled = input.enqueueScheduled
      ? await enqueueScheduledAutomationJobs({ organizationId })
      : { checked: 0, queued: 0, skipped: 0 };
    const processed = await processDueAutomationJobs({ organizationId, limit: input.limit });

    return dataResponse({
      mode: actor.system ? "system" : "organization",
      scheduled,
      processed
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function getAutomationJobActor(request: Request): Promise<AutomationJobActor | null> {
  if (isValidCronRequest(request)) {
    return { system: true };
  }

  const actor = requireActiveActor(await auth(), "team:manage");

  return {
    system: false,
    organizationId: actor.organizationId,
    userId: actor.userId
  };
}

function isValidCronRequest(request: Request) {
  const configuredSecret = process.env.AUTOMATION_JOBS_SECRET ?? process.env.CRON_SECRET;

  if (!configuredSecret) {
    return false;
  }

  const providedSecret = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!providedSecret) {
    return false;
  }

  const configured = Buffer.from(configuredSecret);
  const provided = Buffer.from(providedSecret);

  return configured.length === provided.length && timingSafeEqual(configured, provided);
}
