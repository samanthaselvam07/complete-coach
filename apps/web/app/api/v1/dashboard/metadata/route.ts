import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const actor = requireActiveActor(await auth(), "tasks:read");
    const organization = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: { timezone: true }
    });

    return dataResponse({
      timezone: organization?.timezone ?? "UTC"
    });
  } catch (error) {
    return handleApiError(error);
  }
}
