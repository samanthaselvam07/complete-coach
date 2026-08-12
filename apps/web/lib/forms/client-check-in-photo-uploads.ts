import { randomUUID } from "node:crypto";
import { z } from "zod";

const checkInPhotoMaxBytes = 10 * 1024 * 1024;
const allowedCheckInPhotoContentTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif"
} as const;
const checkInPhotoContentTypeAliases: Record<string, keyof typeof allowedCheckInPhotoContentTypes> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg"
};

export const checkInPhotoObjectUrlPrefix = "r2://";

export const checkInPhotoUploadSchema = z
  .object({
    filename: z.string().trim().min(1).max(255),
    contentType: z.string().trim().min(1).max(120),
    byteSize: z.number().int().min(1),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional()
  })
  .superRefine((input, context) => {
    const extension = getExtension(input.filename);
    const expectedExtension = allowedCheckInPhotoContentTypes[input.contentType as keyof typeof allowedCheckInPhotoContentTypes];

    if (!(input.contentType in allowedCheckInPhotoContentTypes)) {
      context.addIssue({
        code: "custom",
        path: ["contentType"],
        message: "Unsupported check-in photo content type."
      });
    }

    if (input.byteSize > checkInPhotoMaxBytes) {
      context.addIssue({
        code: "custom",
        path: ["byteSize"],
        message: "Check-in photo exceeds the maximum allowed size."
      });
    }

    if (extension && extension !== expectedExtension) {
      context.addIssue({
        code: "custom",
        path: ["filename"],
        message: "File extension does not match the check-in photo content type."
      });
    }
  });

export type CheckInPhotoUploadInput = z.infer<typeof checkInPhotoUploadSchema>;

export function buildCheckInPhotoObjectKey(organizationId: string, clientId: string, input: CheckInPhotoUploadInput) {
  const extension = allowedCheckInPhotoContentTypes[input.contentType as keyof typeof allowedCheckInPhotoContentTypes];

  return `organizations/${organizationId}/clients/${clientId}/check-ins/photos/${randomUUID()}.${extension}`;
}

export function resolveCheckInPhotoContentType(filename: string, contentType: string | null | undefined) {
  const inferredContentType = inferCheckInPhotoContentTypeFromFilename(filename);
  const normalizedContentType = normalizeCheckInPhotoContentType(contentType);

  if (inferredContentType) {
    return inferredContentType;
  }

  if (normalizedContentType && normalizedContentType !== "application/octet-stream") {
    return normalizedContentType;
  }

  return normalizedContentType;
}

export function getCheckInPhotoMaxBytes() {
  return checkInPhotoMaxBytes;
}

export function createCheckInPhotoObjectUrl(objectKey: string) {
  return `${checkInPhotoObjectUrlPrefix}${objectKey}`;
}

export function getCheckInPhotoObjectKeyFromUrl(photoUrl: string) {
  if (!photoUrl.startsWith(checkInPhotoObjectUrlPrefix)) {
    return null;
  }

  return photoUrl.slice(checkInPhotoObjectUrlPrefix.length);
}

export function validateCheckInPhotoObjectKey(organizationId: string, clientId: string, objectKey: string) {
  const escapedOrganizationId = escapeRegExp(organizationId);
  const escapedClientId = escapeRegExp(clientId);
  const allowedExtensions = Object.values(allowedCheckInPhotoContentTypes).join("|");
  const pattern = new RegExp(
    `^organizations/${escapedOrganizationId}/clients/${escapedClientId}/check-ins/photos/[0-9a-fA-F-]{36}\\.(${allowedExtensions})$`
  );

  if (!pattern.test(objectKey)) {
    throw new Error("Invalid check-in photo object key for active client.");
  }
}

function getExtension(filename: string) {
  const extension = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];

  if (extension === "jpeg" || extension === "jfif") {
    return "jpg";
  }

  return extension;
}

function normalizeCheckInPhotoContentType(contentType: string | null | undefined): string {
  const normalized = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";

  return checkInPhotoContentTypeAliases[normalized] ?? normalized;
}

function inferCheckInPhotoContentTypeFromFilename(filename: string) {
  const extension = getExtension(filename);

  if (extension === "jpg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "heic") {
    return "image/heic";
  }

  if (extension === "heif") {
    return "image/heif";
  }

  return null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
