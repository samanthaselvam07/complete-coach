import { LibraryScope } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { createR2PresignedGetUrl, getR2Config } from "@/lib/storage/r2";

interface ExerciseMediaUrlRouteContext {
  params: Promise<{ exerciseId: string }>;
}

const playbackUrlTtlSeconds = 600;

export async function GET(_request: Request, context: ExerciseMediaUrlRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "training:read");
    const { exerciseId } = await context.params;
    const exercise = await prisma.exerciseLibraryItem.findFirst({
      where: {
        id: exerciseId,
        deletedAt: null,
        OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: actor.organizationId }]
      },
      select: {
        id: true,
        videoObjectKey: true,
        videoUrl: true
      }
    });

    if (!exercise) {
      return errorResponse("not_found", "Exercise not found.", 404);
    }

    if (exercise.videoUrl) {
      return dataResponse({
        mediaType: "video",
        source: "external",
        url: exercise.videoUrl,
        expiresAt: null
      });
    }

    if (!exercise.videoObjectKey) {
      return errorResponse("not_found", "Exercise video not found.", 404);
    }

    const r2Config = getR2Config();

    if (!r2Config) {
      return errorResponse("storage_unconfigured", "Object storage is not configured.", 503);
    }

    const expiresAt = new Date(Date.now() + playbackUrlTtlSeconds * 1000).toISOString();

    return dataResponse({
      mediaType: "video",
      source: "uploaded",
      url: createR2PresignedGetUrl(r2Config, {
        objectKey: exercise.videoObjectKey,
        expiresInSeconds: playbackUrlTtlSeconds
      }),
      expiresAt
    });
  } catch (error) {
    if (error instanceof Error && error.message === "R2 storage is partially configured.") {
      return errorResponse("storage_misconfigured", "Object storage is misconfigured.", 503);
    }

    return handleApiError(error);
  }
}
