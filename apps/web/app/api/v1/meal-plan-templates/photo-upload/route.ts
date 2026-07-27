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
    const filename = getRecipePhotoFilename(request.headers.get("x-filename"));
    const contentType = request.headers.get("content-type") ?? "";
    const fileBytes = new Uint8Array(await request.arrayBuffer());

    if (fileBytes.byteLength === 0) {
      return errorResponse("missing_recipe_photo", "Recipe photo file is required.", 422);
    }

    const input = recipePhotoUploadSchema.parse({
      filename,
      contentType,
      byteSize: fileBytes.byteLength
    });
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
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": input.contentType
      },
      body: fileBytes
    });

    if (!uploadResponse.ok) {
      return errorResponse("recipe_photo_upload_failed", "Recipe photo upload failed.", 502);
    }

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "recipe_photo.uploaded",
        targetType: "recipe_photo",
        targetId: objectKey,
        metadata: {
          contentType: input.contentType,
          byteSize: input.byteSize
        }
      }
    });

    return dataResponse({
      objectKey,
      photoUrl: createRecipePhotoObjectUrl(objectKey),
      maxBytes: getRecipePhotoMaxBytes()
    });
  } catch (error) {
    if (error instanceof Error && error.message === "R2 storage is partially configured.") {
      return errorResponse("storage_misconfigured", "Object storage is misconfigured.", 503);
    }

    return handleApiError(error);
  }
}

function getRecipePhotoFilename(value: string | null) {
  if (!value) {
    return "recipe-photo";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
