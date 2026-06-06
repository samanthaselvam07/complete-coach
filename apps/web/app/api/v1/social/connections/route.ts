import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { serializeSocialConnection } from "@/lib/social/social-records";

export async function GET(request: Request) {
  try {
    void request;
    const actor = requireActiveActor(await auth(), "social:read");
    const connections = await prisma.socialConnection.findMany({
      where: {
        organizationId: actor.organizationId
      },
      orderBy: [{ status: "asc" }, { provider: "asc" }, { accountName: "asc" }]
    });

    return dataResponse(connections.map(serializeSocialConnection));
  } catch (error) {
    return handleApiError(error);
  }
}
