import { randomUUID } from "node:crypto";
import { z } from "zod";

const accountPhotoMaxBytes = 10 * 1024 * 1024;
const allowedAccountPhotoContentTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif"
} as const;

export const accountPhotoObjectUrlPrefix = "r2://";

export const accountPhotoUploadSchema = z
  .object({
    filename: z.string().trim().min(1).max(180),
    contentType: z.string().trim().min(1).max(120),
    byteSize: z.number().int().min(1),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional()
  })
  .superRefine((input, context) => {
    const extension = getExtension(input.filename);
    const expectedExtension = allowedAccountPhotoContentTypes[input.contentType as keyof typeof allowedAccountPhotoContentTypes];

    if (!(input.contentType in allowedAccountPhotoContentTypes)) {
      context.addIssue({
        code: "custom",
        path: ["contentType"],
        message: "Unsupported account photo content type."
      });
    }

    if (input.byteSize > accountPhotoMaxBytes) {
      context.addIssue({
        code: "custom",
        path: ["byteSize"],
        message: "Account photo exceeds the maximum allowed size."
      });
    }

    if (!extension || extension !== expectedExtension) {
      context.addIssue({
        code: "custom",
        path: ["filename"],
        message: "File extension does not match the account photo content type."
      });
    }
  });

export type AccountPhotoUploadInput = z.infer<typeof accountPhotoUploadSchema>;

export function buildAccountPhotoObjectKey(organizationId: string, userId: string, input: AccountPhotoUploadInput) {
  const extension = allowedAccountPhotoContentTypes[input.contentType as keyof typeof allowedAccountPhotoContentTypes];

  return `organizations/${organizationId}/users/${userId}/account/photos/${randomUUID()}.${extension}`;
}

export function getAccountPhotoMaxBytes() {
  return accountPhotoMaxBytes;
}

export function createAccountPhotoObjectUrl(objectKey: string) {
  return `${accountPhotoObjectUrlPrefix}${objectKey}`;
}

export function getAccountPhotoObjectKeyFromUrl(photoUrl: string) {
  if (!photoUrl.startsWith(accountPhotoObjectUrlPrefix)) {
    return null;
  }

  return photoUrl.slice(accountPhotoObjectUrlPrefix.length);
}

export function validateAccountPhotoObjectKey(organizationId: string, userId: string, objectKey: string) {
  const escapedOrganizationId = escapeRegExp(organizationId);
  const escapedUserId = escapeRegExp(userId);
  const allowedExtensions = Object.values(allowedAccountPhotoContentTypes).join("|");
  const pattern = new RegExp(
    `^organizations/${escapedOrganizationId}/users/${escapedUserId}/account/photos/[0-9a-fA-F-]{36}\\.(${allowedExtensions})$`
  );

  if (!pattern.test(objectKey)) {
    throw new Error("Invalid account photo object key for active user.");
  }
}

function getExtension(filename: string) {
  const extension = filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];

  if (extension === "jpeg") {
    return "jpg";
  }

  return extension;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
