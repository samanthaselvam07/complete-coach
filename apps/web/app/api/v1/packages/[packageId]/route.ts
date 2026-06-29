import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { getPackageUpdateData, serializePackage, updatePackageSchema } from "@/lib/payments/package-records";

interface PackageRouteContext {
  params: Promise<{ packageId: string }>;
}

export async function PATCH(request: Request, context: PackageRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "payments:manage");
    const { packageId } = await context.params;
    const input = updatePackageSchema.parse(await request.json());
    const existingPackage = await prisma.coachingPackage.findFirst({
      where: {
        id: packageId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!existingPackage) {
      return errorResponse("not_found", "Package not found.", 404);
    }

    const coachingPackage = await prisma.coachingPackage.update({
      where: { id: packageId, organizationId: actor.organizationId },
      data: getPackageUpdateData(input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "package.updated",
        targetType: "package",
        targetId: coachingPackage.id
      }
    });

    return dataResponse(serializePackage(coachingPackage));
  } catch (error) {
    return handleApiError(error);
  }
}
