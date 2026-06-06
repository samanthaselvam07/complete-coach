import { z } from "zod";

import {
  SocialConnectionStatus,
  SocialPostStatus,
  SocialProvider,
  SocialTargetStatus
} from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";

export const socialProviderSchema = z.enum(["instagram", "facebook", "x"]);

export const socialMediaSchema = z.object({
  url: z.string().url(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4"]),
  sizeBytes: z.number().int().positive().max(512 * 1024 * 1024)
});

export const createSocialPostSchema = z.object({
  caption: z.string().trim().min(1).max(2_200),
  scheduledFor: z.string().datetime().optional(),
  targetConnectionIds: z.array(z.string().min(1)).min(1),
  media: z.array(socialMediaSchema).default([])
});

export const socialPostListQuerySchema = z.object({
  status: z.enum(["draft", "scheduled", "queued", "publishing", "published", "failed", "cancelled"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const processSocialJobsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10)
});

export type CreateSocialPostInput = z.infer<typeof createSocialPostSchema>;

const providerToApi = {
  [SocialProvider.META_INSTAGRAM]: "instagram",
  [SocialProvider.META_FACEBOOK]: "facebook",
  [SocialProvider.X]: "x"
} as const;

const apiToProvider = {
  instagram: SocialProvider.META_INSTAGRAM,
  facebook: SocialProvider.META_FACEBOOK,
  x: SocialProvider.X
} as const;

const connectionStatusToApi = {
  [SocialConnectionStatus.ACTIVE]: "active",
  [SocialConnectionStatus.REVOKED]: "revoked",
  [SocialConnectionStatus.ERROR]: "error"
} as const;

const postStatusToApi = {
  [SocialPostStatus.DRAFT]: "draft",
  [SocialPostStatus.SCHEDULED]: "scheduled",
  [SocialPostStatus.QUEUED]: "queued",
  [SocialPostStatus.PUBLISHING]: "publishing",
  [SocialPostStatus.PUBLISHED]: "published",
  [SocialPostStatus.FAILED]: "failed",
  [SocialPostStatus.CANCELLED]: "cancelled"
} as const;

const apiToPostStatus = {
  draft: SocialPostStatus.DRAFT,
  scheduled: SocialPostStatus.SCHEDULED,
  queued: SocialPostStatus.QUEUED,
  publishing: SocialPostStatus.PUBLISHING,
  published: SocialPostStatus.PUBLISHED,
  failed: SocialPostStatus.FAILED,
  cancelled: SocialPostStatus.CANCELLED
} as const;

const targetStatusToApi = {
  [SocialTargetStatus.SCHEDULED]: "scheduled",
  [SocialTargetStatus.QUEUED]: "queued",
  [SocialTargetStatus.PUBLISHING]: "publishing",
  [SocialTargetStatus.PUBLISHED]: "published",
  [SocialTargetStatus.RETRYING]: "retrying",
  [SocialTargetStatus.FAILED]: "failed",
  [SocialTargetStatus.CANCELLED]: "cancelled"
} as const;

export function toSocialProvider(value: z.infer<typeof socialProviderSchema>) {
  return apiToProvider[value];
}

export function toSocialProviderApi(provider: SocialProvider) {
  return providerToApi[provider];
}

export function toSocialPostStatus(status: keyof typeof apiToPostStatus) {
  return apiToPostStatus[status];
}

export function serializeSocialConnection(connection: {
  id: string;
  organizationId?: string;
  provider: SocialProvider | keyof typeof providerToApi;
  providerAccountId: string;
  accountName: string;
  scopes: string[];
  status: SocialConnectionStatus | keyof typeof connectionStatusToApi;
  tokenExpiresAt: Date | null;
  connectedAt: Date;
  revokedAt: Date | null;
  lastError: string | null;
  createdByUserId?: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: connection.id,
    provider: providerToApi[connection.provider as SocialProvider],
    providerAccountId: connection.providerAccountId,
    accountName: connection.accountName,
    scopes: connection.scopes,
    status: connectionStatusToApi[connection.status as SocialConnectionStatus],
    tokenExpiresAt: connection.tokenExpiresAt?.toISOString() ?? null,
    connectedAt: connection.connectedAt.toISOString(),
    revokedAt: connection.revokedAt?.toISOString() ?? null,
    lastError: connection.lastError
  };
}

export function serializeSocialPost(post: {
  id: string;
  caption: string;
  scheduledFor: Date | null;
  status: SocialPostStatus;
  media: Prisma.JsonValue;
  publishedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  targets?: Array<{
    id: string;
    provider: SocialProvider;
    status: SocialTargetStatus;
    attempts: number;
    providerPostId: string | null;
    lastError: string | null;
    publishedAt: Date | null;
    connection?: {
      id: string;
      accountName: string;
    };
  }>;
}) {
  return {
    id: post.id,
    caption: post.caption,
    scheduledFor: post.scheduledFor?.toISOString() ?? null,
    status: postStatusToApi[post.status],
    media: Array.isArray(post.media) ? post.media : [],
    publishedAt: post.publishedAt?.toISOString() ?? null,
    cancelledAt: post.cancelledAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    targets: (post.targets ?? []).map((target) => ({
      id: target.id,
      provider: providerToApi[target.provider],
      status: targetStatusToApi[target.status],
      attempts: target.attempts,
      providerPostId: target.providerPostId,
      lastError: target.lastError,
      publishedAt: target.publishedAt?.toISOString() ?? null,
      connectionId: target.connection?.id ?? null,
      accountName: target.connection?.accountName ?? null
    }))
  };
}

export function getSocialPostCreateData(
  organizationId: string,
  createdByUserId: string,
  input: CreateSocialPostInput,
  connections: Array<{ id: string; provider: SocialProvider }>
) {
  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
  const status = scheduledFor ? SocialPostStatus.SCHEDULED : SocialPostStatus.DRAFT;
  const targetStatus = scheduledFor ? SocialTargetStatus.SCHEDULED : SocialTargetStatus.QUEUED;

  return {
    organizationId,
    createdByUserId,
    caption: input.caption,
    media: input.media,
    scheduledFor,
    status,
    targets: {
      create: connections.map((connection) => ({
        organizationId,
        connectionId: connection.id,
        provider: connection.provider,
        status: targetStatus,
        nextAttemptAt: scheduledFor
      }))
    }
  };
}
