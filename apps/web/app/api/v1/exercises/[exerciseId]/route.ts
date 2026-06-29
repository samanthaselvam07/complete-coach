import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { validateExerciseMediaObjectKeys } from "@/lib/training/exercise-media";
import {
  getExerciseUpdateData,
  serializeExercise,
  updateExerciseSchema
} from "@/lib/training/training-records";
import { LibraryScope } from "@/app/generated/prisma/enums";

interface ExerciseRouteContext {
  params: Promise<{ exerciseId: string }>;
}

export async function GET(_request: Request, context: ExerciseRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "training:read");
    const { exerciseId } = await context.params;
    const exercise = await prisma.exerciseLibraryItem.findFirst({
      where: {
        id: exerciseId,
        deletedAt: null,
        OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: actor.organizationId }]
      }
    });

    if (!exercise) {
      return errorResponse("not_found", "Exercise not found.", 404);
    }

    return dataResponse(serializeExercise(exercise));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: ExerciseRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "training:write");
    const { exerciseId } = await context.params;
    const input = updateExerciseSchema.parse(await request.json());
    const mediaValidationError = getMediaValidationError(actor.organizationId, input);

    if (mediaValidationError) {
      return errorResponse("validation_failed", mediaValidationError, 422);
    }

    const existingExercise = await prisma.exerciseLibraryItem.findFirst({
      where: {
        id: exerciseId,
        organizationId: actor.organizationId,
        scope: LibraryScope.PRIVATE,
        deletedAt: null
      }
    });

    if (!existingExercise) {
      return errorResponse("not_found", "Editable private exercise not found.", 404);
    }

    const exercise = await prisma.exerciseLibraryItem.update({
      where: { id: exerciseId, organizationId: actor.organizationId },
      data: getExerciseUpdateData(input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "exercise.updated",
        targetType: "exercise",
        targetId: exercise.id
      }
    });

    return dataResponse(serializeExercise(exercise));
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
