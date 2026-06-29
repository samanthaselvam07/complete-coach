import { LibraryScope } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { getFoodUpdateData, serializeFood, updateFoodSchema } from "@/lib/nutrition/nutrition-records";

interface FoodRouteContext {
  params: Promise<{ foodId: string }>;
}

export async function GET(_request: Request, context: FoodRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "nutrition:read");
    const { foodId } = await context.params;
    const food = await prisma.foodLibraryItem.findFirst({
      where: {
        id: foodId,
        deletedAt: null,
        OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: actor.organizationId }]
      }
    });

    if (!food) {
      return errorResponse("not_found", "Food not found.", 404);
    }

    return dataResponse(serializeFood(food));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: FoodRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "nutrition:write");
    const { foodId } = await context.params;
    const input = updateFoodSchema.parse(await request.json());
    const existingFood = await prisma.foodLibraryItem.findFirst({
      where: {
        id: foodId,
        organizationId: actor.organizationId,
        scope: LibraryScope.PRIVATE,
        deletedAt: null
      }
    });

    if (!existingFood) {
      return errorResponse("not_found", "Editable private food not found.", 404);
    }

    const food = await prisma.foodLibraryItem.update({
      where: { id: foodId, organizationId: actor.organizationId },
      data: getFoodUpdateData(input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "food.updated",
        targetType: "food",
        targetId: food.id
      }
    });

    return dataResponse(serializeFood(food));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: FoodRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "nutrition:write");
    const { foodId } = await context.params;
    const existingFood = await prisma.foodLibraryItem.findFirst({
      where: {
        id: foodId,
        organizationId: actor.organizationId,
        scope: LibraryScope.PRIVATE,
        deletedAt: null
      }
    });

    if (!existingFood) {
      return errorResponse("not_found", "Deletable private food not found.", 404);
    }

    await prisma.foodLibraryItem.update({
      where: { id: foodId, organizationId: actor.organizationId },
      data: { deletedAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "food.deleted",
        targetType: "food",
        targetId: foodId
      }
    });

    return dataResponse({ id: foodId, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
