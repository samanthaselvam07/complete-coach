import { randomUUID } from "node:crypto";
import { z } from "zod";

const recipePhotoMaxBytes = 10 * 1024 * 1024;
const allowedRecipePhotoContentTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif"
} as const;

export const recipePhotoObjectUrlPrefix = "r2://";

export const recipePhotoUploadSchema = z
  .object({
    filename: z.string().trim().min(1).max(180),
    contentType: z.string().trim().min(1).max(120),
    byteSize: z.number().int().min(1),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional()
  })
  .superRefine((input, context) => {
    const extension = getExtension(input.filename);
    const expectedExtension = allowedRecipePhotoContentTypes[input.contentType as keyof typeof allowedRecipePhotoContentTypes];

    if (!(input.contentType in allowedRecipePhotoContentTypes)) {
      context.addIssue({
        code: "custom",
        path: ["contentType"],
        message: "Unsupported recipe photo content type."
      });
    }

    if (input.byteSize > recipePhotoMaxBytes) {
      context.addIssue({
        code: "custom",
        path: ["byteSize"],
        message: "Recipe photo exceeds the maximum allowed size."
      });
    }

    if (!extension || extension !== expectedExtension) {
      context.addIssue({
        code: "custom",
        path: ["filename"],
        message: "File extension does not match the recipe photo content type."
      });
    }
  });

export type RecipePhotoUploadInput = z.infer<typeof recipePhotoUploadSchema>;

export function buildRecipePhotoObjectKey(organizationId: string, input: RecipePhotoUploadInput) {
  const extension = allowedRecipePhotoContentTypes[input.contentType as keyof typeof allowedRecipePhotoContentTypes];

  return `organizations/${organizationId}/nutrition/recipes/photos/${randomUUID()}.${extension}`;
}

export function getRecipePhotoMaxBytes() {
  return recipePhotoMaxBytes;
}

export function createRecipePhotoObjectUrl(objectKey: string) {
  return `${recipePhotoObjectUrlPrefix}${objectKey}`;
}

export function getRecipePhotoObjectKeyFromUrl(photoUrl: string) {
  if (!photoUrl.startsWith(recipePhotoObjectUrlPrefix)) {
    return null;
  }

  return photoUrl.slice(recipePhotoObjectUrlPrefix.length);
}

export function validateRecipePhotoObjectKey(organizationId: string, objectKey: string) {
  const escapedOrganizationId = escapeRegExp(organizationId);
  const allowedExtensions = Object.values(allowedRecipePhotoContentTypes).join("|");
  const pattern = new RegExp(
    `^organizations/${escapedOrganizationId}/nutrition/recipes/photos/[0-9a-fA-F-]{36}\\.(${allowedExtensions})$`
  );

  if (!pattern.test(objectKey)) {
    throw new Error("Invalid recipe photo object key for active organization.");
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
