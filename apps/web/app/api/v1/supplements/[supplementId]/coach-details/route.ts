import { LibraryScope } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  getSupplementCoachDetailsUpsertData,
  serializeSupplementCoachDetails,
  supplementCoachDetailsSchema
} from "@/lib/supplementation/supplement-records";

interface SupplementCoachDetailsRouteContext {
  params: Promise<{ supplementId: string }>;
}

export async function GET(_request: Request, context: SupplementCoachDetailsRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "supplements:read");
    const { supplementId } = await context.params;
    const supplement = await findAccessibleSupplement(actor.organizationId, supplementId);

    if (!supplement) {
      return errorResponse("not_found", "Supplement not found.", 404);
    }

    const details = await prisma.supplementCoachDetail.findUnique({
      where: {
        organizationId_supplementId: {
          organizationId: actor.organizationId,
          supplementId
        }
      }
    });

    return dataResponse(serializeSupplementCoachDetails(details));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: SupplementCoachDetailsRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "supplements:write");
    const { supplementId } = await context.params;
    const input = supplementCoachDetailsSchema.parse(await request.json());
    const supplement = await findAccessibleSupplement(actor.organizationId, supplementId);

    if (!supplement) {
      return errorResponse("not_found", "Supplement not found.", 404);
    }

    const details = await prisma.supplementCoachDetail.upsert(
      getSupplementCoachDetailsUpsertData(actor.organizationId, actor.userId, supplementId, input)
    );

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "supplement.coach_details.updated",
        targetType: "supplement",
        targetId: supplementId
      }
    });

    return dataResponse(serializeSupplementCoachDetails(details));
  } catch (error) {
    return handleApiError(error);
  }
}

function findAccessibleSupplement(organizationId: string, supplementId: string) {
  return prisma.supplementLibraryItem.findFirst({
    where: {
      id: supplementId,
      deletedAt: null,
      OR: [{ scope: LibraryScope.GLOBAL }, { organizationId }]
    }
  });
}
