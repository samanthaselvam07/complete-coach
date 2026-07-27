import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  getRecipePhotoObjectKeyFromUrl,
  validateRecipePhotoObjectKey
} from "@/lib/nutrition/recipe-photo-uploads";
import { createR2PresignedGetUrl, getR2Config } from "@/lib/storage/r2";

const photoUrlTtlSeconds = 300;

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "nutrition:read");
    const searchParams = new URL(request.url).searchParams;
    const photoUrl = searchParams.get("photoUrl") ?? "";
    const objectKey = getRecipePhotoObjectKeyFromUrl(photoUrl);

    if (!objectKey) {
      return errorResponse("invalid_recipe_photo", "Recipe photo URL is not an uploaded recipe photo.", 422);
    }

    validateRecipePhotoObjectKey(actor.organizationId, objectKey);

    const r2Config = getR2Config();

    if (!r2Config) {
      return errorResponse("storage_unconfigured", "Object storage is not configured.", 503);
    }

    return dataResponse({
      url: createR2PresignedGetUrl(r2Config, {
        objectKey,
        expiresInSeconds: photoUrlTtlSeconds
      }),
      expiresAt: new Date(Date.now() + photoUrlTtlSeconds * 1000).toISOString()
    });
  } catch (error) {
    if (error instanceof Error && error.message === "R2 storage is partially configured.") {
      return errorResponse("storage_misconfigured", "Object storage is misconfigured.", 503);
    }

    if (error instanceof Error && error.message === "Invalid recipe photo object key for active organization.") {
      return errorResponse("invalid_recipe_photo", error.message, 422);
    }

    return handleApiError(error);
  }
}
