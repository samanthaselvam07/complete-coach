import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { validateExerciseMediaObjectKeys } from "@/lib/training/exercise-media";
import {
  buildExerciseWhere,
  createExerciseSchema,
  exerciseListQuerySchema,
  getExerciseCreateData,
  serializeExercise
} from "@/lib/training/training-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "training:read");
    const query = exerciseListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const exercises = await prisma.exerciseLibraryItem.findMany({
      where: buildExerciseWhere(actor.organizationId, query),
      orderBy: query.sort === "recent" ? [{ scope: "desc" }, { updatedAt: "desc" }, { name: "asc" }] : [{ scope: "asc" }, { name: "asc" }],
      take: query.limit
    });

    return dataResponse(exercises.map(serializeExercise));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "training:write");
    const input = createExerciseSchema.parse(await request.json());
    const mediaValidationError = getMediaValidationError(actor.organizationId, input);

    if (mediaValidationError) {
      return errorResponse("validation_failed", mediaValidationError, 422);
    }

    const exercise = await prisma.exerciseLibraryItem.create({
      data: getExerciseCreateData(actor.organizationId, actor.userId, input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "exercise.created",
        targetType: "exercise",
        targetId: exercise.id,
        metadata: {
          category: input.category,
          difficulty: input.difficulty
        }
      }
    });

    return dataResponse(serializeExercise(exercise), {
      status: 201,
      headers: { Location: `/api/v1/exercises/${exercise.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function getMediaValidationError(
  organizationId: string,
  input: { videoObjectKey?: string | null; imageObjectKey?: string | null }
) {
  try {
    validateExerciseMediaObjectKeys(organizationId, input);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid exercise media object key.";
  }
}
