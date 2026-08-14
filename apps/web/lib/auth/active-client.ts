import type { ActiveClientSession } from "@/types/next-auth";
import { ClientStatus } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isMissingDatabaseColumn } from "@/lib/db/schema-compat";

interface ClientSessionRecord {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  timezone: string;
}

export function createActiveClientSession(client: ClientSessionRecord): ActiveClientSession {
  return {
    id: client.id,
    organizationId: client.organizationId,
    name: `${client.firstName} ${client.lastName}`.trim(),
    email: client.email,
    timezone: client.timezone
  };
}

export async function resolveActiveClientSessionForUser(userId: string, organizationId: string) {
  const client = await prisma.client.findFirst({
    where: {
      organizationId,
      clientUserId: userId,
      status: { not: ClientStatus.DEACTIVATED },
      deletedAt: null
    },
    select: {
      id: true,
      organizationId: true,
      firstName: true,
      lastName: true,
      email: true,
      timezone: true
    }
  });

  if (!client || await hasActiveMembershipPause(organizationId, client.id)) {
    return undefined;
  }

  return createActiveClientSession(client);
}

async function hasActiveMembershipPause(organizationId: string, clientId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ active_pause: number }>>(Prisma.sql`
      SELECT 1 AS "active_pause"
      FROM "client_subscriptions"
      WHERE "organization_id" = ${organizationId}
        AND "client_id" = ${clientId}
        AND "status" = 'paused'::client_subscription_status
        AND "pause_start_at" <= now()
        AND ("pause_resume_at" IS NULL OR "pause_resume_at" > now())
      LIMIT 1
    `);

    return rows.length > 0;
  } catch (error) {
    if (isMissingDatabaseColumn(error, "pause_start_at") || isMissingDatabaseColumn(error, "pause_resume_at")) {
      return false;
    }

    throw error;
  }
}
