import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  buildCheckInPhotoObjectKey,
  createCheckInPhotoObjectUrl,
  getCheckInPhotoMaxBytes,
  resolveCheckInPhotoContentType,
  checkInPhotoUploadSchema
} from "@/lib/forms/client-check-in-photo-uploads";
import { createR2PresignedPutUrl, getR2Config } from "@/lib/storage/r2";

const uploadUrlTtlSeconds = 300;

export async function POST(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const filename = getCheckInPhotoFilename(request.headers.get("x-filename"));
    const contentType = resolveCheckInPhotoContentType(filename, request.headers.get("content-type"));
    const fileBytes = new Uint8Array(await request.arrayBuffer());

    if (fileBytes.byteLength === 0) {
      return errorResponse("missing_check_in_photo", "Check-in photo file is required.", 422);
    }

    const input = checkInPhotoUploadSchema.parse({
      filename,
      contentType,
      byteSize: fileBytes.byteLength
    });
    const r2Config = getR2Config();

    if (!r2Config) {
      return errorResponse("storage_unconfigured", "Object storage is not configured.", 503);
    }

    const objectKey = buildCheckInPhotoObjectKey(actor.organizationId, actor.clientId, input);
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
      return errorResponse("check_in_photo_upload_failed", "Check-in photo upload failed.", 502);
    }

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.check_in_photo.uploaded",
        targetType: "check_in_photo",
        targetId: objectKey,
        metadata: {
          clientId: actor.clientId,
          contentType: input.contentType,
          byteSize: input.byteSize
        }
      }
    });

    return dataResponse({
      objectKey,
      photoUrl: createCheckInPhotoObjectUrl(objectKey),
      maxBytes: getCheckInPhotoMaxBytes()
    });
  } catch (error) {
    if (error instanceof Error && error.message === "R2 storage is partially configured.") {
      return errorResponse("storage_misconfigured", "Object storage is misconfigured.", 503);
    }

    return handleApiError(error);
  }
}

function getCheckInPhotoFilename(value: string | null) {
  if (!value) {
    return "check-in-photo";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
