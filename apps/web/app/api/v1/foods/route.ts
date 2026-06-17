import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  buildFoodWhere,
  createFoodSchema,
  foodListQuerySchema,
  getFoodCreateData,
  serializeFood
} from "@/lib/nutrition/nutrition-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "nutrition:read");
    const query = foodListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const foods = await prisma.foodLibraryItem.findMany({
      where: buildFoodWhere(actor.organizationId, query),
      orderBy: query.sort === "recent" ? [{ updatedAt: "desc" }, { name: "asc" }] : [{ scope: "asc" }, { name: "asc" }],
      take: query.limit
    });

    return dataResponse(foods.map(serializeFood));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "nutrition:write");
    const input = createFoodSchema.parse(await request.json());
    const food = await prisma.foodLibraryItem.create({
      data: getFoodCreateData(actor.organizationId, actor.userId, input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "food.created",
        targetType: "food",
        targetId: food.id,
        metadata: {
          category: input.category,
          calories: input.calories
        }
      }
    });

    return dataResponse(serializeFood(food), {
      status: 201,
      headers: { Location: `/api/v1/foods/${food.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
