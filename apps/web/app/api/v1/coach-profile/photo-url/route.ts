import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  getAccountPhotoObjectKeyFromUrl,
  validateAccountPhotoObjectKey
} from "@/lib/coach/account-photo-uploads";
import { createR2PresignedGetUrl, getR2Config } from "@/lib/storage/r2";

const photoUrlTtlSeconds = 300;

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth());
    const searchParams = new URL(request.url).searchParams;
    const photoUrl = searchParams.get("photoUrl") ?? "";
    const objectKey = getAccountPhotoObjectKeyFromUrl(photoUrl);

    if (!objectKey) {
      return errorResponse("invalid_account_photo", "Account photo URL is not an uploaded account photo.", 422);
    }

    validateAccountPhotoObjectKey(actor.organizationId, actor.userId, objectKey);

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

    if (error instanceof Error && error.message === "Invalid account photo object key for active user.") {
      return errorResponse("invalid_account_photo", error.message, 422);
    }

    return handleApiError(error);
  }
}
