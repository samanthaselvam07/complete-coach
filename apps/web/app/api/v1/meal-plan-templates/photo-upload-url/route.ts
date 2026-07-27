import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  buildRecipePhotoObjectKey,
  createRecipePhotoObjectUrl,
  getRecipePhotoMaxBytes,
  recipePhotoUploadSchema
} from "@/lib/nutrition/recipe-photo-uploads";
import { createR2PresignedPutUrl, getR2Config } from "@/lib/storage/r2";

const uploadUrlTtlSeconds = 300;

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "nutrition:write");
    const input = recipePhotoUploadSchema.parse(await request.json());
    const r2Config = getR2Config();

    if (!r2Config) {
      return errorResponse("storage_unconfigured", "Object storage is not configured.", 503);
    }

    const objectKey = buildRecipePhotoObjectKey(actor.organizationId, input);
    const uploadUrl = createR2PresignedPutUrl(r2Config, {
      objectKey,
      contentType: input.contentType,
      expiresInSeconds: uploadUrlTtlSeconds
    });
    const expiresAt = new Date(Date.now() + uploadUrlTtlSeconds * 1000).toISOString();

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "recipe_photo.upload_url_created",
        targetType: "recipe_photo",
        targetId: objectKey,
        metadata: {
          contentType: input.contentType,
          byteSize: input.byteSize,
          checksumSha256: input.checksumSha256 ?? null
        }
      }
    });

    return dataResponse({
      objectKey,
      photoUrl: createRecipePhotoObjectUrl(objectKey),
      uploadUrl,
      expiresAt,
      method: "PUT",
      requiredHeaders: {
        "Content-Type": input.contentType
      },
      maxBytes: getRecipePhotoMaxBytes()
    });
  } catch (error) {
    if (error instanceof Error && error.message === "R2 storage is partially configured.") {
      return errorResponse("storage_misconfigured", "Object storage is misconfigured.", 503);
    }

    return handleApiError(error);
  }
}
