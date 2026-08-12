import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  getCheckInPhotoObjectKeyFromUrl,
  validateCheckInPhotoObjectKey
} from "@/lib/forms/client-check-in-photo-uploads";
import { prisma } from "@/lib/db/prisma";
import { createR2PresignedGetUrl, getR2Config } from "@/lib/storage/r2";

const photoUrlTtlSeconds = 300;

interface CheckInPhotoUrlRouteContext {
  params: Promise<{ checkInId: string }>;
}

export async function GET(request: Request, context: CheckInPhotoUrlRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "submissions:read");
    const { checkInId } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const photoUrl = searchParams.get("photoUrl") ?? "";
    const objectKey = getCheckInPhotoObjectKeyFromUrl(photoUrl);

    if (!objectKey) {
      return errorResponse("invalid_check_in_photo", "Check-in photo URL is not an uploaded check-in photo.", 422);
    }

    const checkIn = await prismaCheckInForPhoto(checkInId, actor.organizationId);

    if (!checkIn) {
      return errorResponse("not_found", "Check-in not found.", 404);
    }

    validateCheckInPhotoObjectKey(actor.organizationId, checkIn.clientId, objectKey);

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

async function prismaCheckInForPhoto(checkInId: string, organizationId: string) {
  return prisma.checkIn.findFirst({
    where: {
      id: checkInId,
      organizationId
    },
    select: {
      id: true,
      clientId: true
    }
  });
}
