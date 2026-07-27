import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  buildSupplementWhere,
  createSupplementSchema,
  getSupplementCreateData,
  serializeSupplement,
  supplementListQuerySchema
} from "@/lib/supplementation/supplement-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "supplements:read");
    const query = supplementListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const supplements = await prisma.supplementLibraryItem.findMany({
      where: buildSupplementWhere(actor.organizationId, query),
      include: {
        coachDetails: {
          where: { organizationId: actor.organizationId },
          select: { affiliateLink: true },
          take: 1
        }
      },
      orderBy: [{ scope: "asc" }, { name: "asc" }],
      take: query.limit
    });

    return dataResponse(supplements.map(serializeSupplement));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "supplements:write");
    const input = createSupplementSchema.parse(await request.json());
    const supplement = await prisma.supplementLibraryItem.create({
      data: getSupplementCreateData(actor.organizationId, actor.userId, input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "supplement.created",
        targetType: "supplement",
        targetId: supplement.id,
        metadata: {
          category: input.category
        }
      }
    });

    return dataResponse(serializeSupplement(supplement), {
      status: 201,
      headers: { Location: `/api/v1/supplements/${supplement.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
