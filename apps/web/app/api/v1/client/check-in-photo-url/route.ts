import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import {
  getCheckInPhotoObjectKeyFromUrl,
  validateCheckInPhotoObjectKey
} from "@/lib/forms/client-check-in-photo-uploads";
import { createR2PresignedGetUrl, getR2Config } from "@/lib/storage/r2";

const photoUrlTtlSeconds = 300;

export async function GET(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const searchParams = new URL(request.url).searchParams;
    const photoUrl = searchParams.get("photoUrl") ?? "";
    const objectKey = getCheckInPhotoObjectKeyFromUrl(photoUrl);

    if (!objectKey) {
      return errorResponse("invalid_check_in_photo", "Check-in photo URL is not an uploaded check-in photo.", 422);
    }

    validateCheckInPhotoObjectKey(actor.organizationId, actor.clientId, objectKey);

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

    if (error instanceof Error && error.message === "Invalid check-in photo object key for active client.") {
      return errorResponse("invalid_check_in_photo", error.message, 422);
    }

    return handleApiError(error);
  }
}
