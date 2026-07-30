import type { ActiveClientSession } from "@/types/next-auth";
import { prisma } from "@/lib/db/prisma";

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

  return client ? createActiveClientSession(client) : undefined;
}
