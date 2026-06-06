import { describe, expect, it } from "vitest";

import {
  SocialConnectionStatus,
  SocialPostStatus,
  SocialProvider,
  SocialTargetStatus
} from "@/app/generated/prisma/enums";
import {
  decryptSocialToken,
  encryptSocialToken,
  getSocialProviderByPrisma,
  getSocialProviderDefinition,
  normalizeSocialProviderError,
  sanitizeSocialProviderResponse,
  validateSocialPostForProvider
} from "@/lib/social/social-providers";
import {
  createSocialPostSchema,
  serializeSocialConnection,
  serializeSocialPost,
  toSocialPostStatus,
  toSocialProvider,
  toSocialProviderApi
} from "@/lib/social/social-records";

describe("social provider domain", () => {
  it("keeps OAuth client secrets environment-only while exposing authorization metadata", () => {
    const provider = getSocialProviderDefinition("x");

    expect(provider.id).toBe("x");
    expect(provider.authorizationUrl).toContain("https://");
    expect(provider.requiredScopes).toContain("tweet.write");
    expect(provider).not.toHaveProperty("clientSecret");
    expect(getSocialProviderByPrisma(SocialProvider.META_FACEBOOK)?.id).toBe("facebook");
  });

  it("encrypts stored social tokens and decrypts them with the configured secret", () => {
    const encrypted = encryptSocialToken("xoxp-sensitive-token", "a".repeat(32));

    expect(encrypted).not.toContain("xoxp-sensitive-token");
    expect(decryptSocialToken(encrypted, "a".repeat(32))).toBe("xoxp-sensitive-token");
  });

  it("never serializes access or refresh tokens back to API clients", () => {
    const serialized = serializeSocialConnection({
      id: "connection_1",
      organizationId: "org_1",
      provider: "X",
      providerAccountId: "account_1",
      accountName: "Coach X",
      scopes: ["tweet.write"],
      status: "ACTIVE",
      tokenExpiresAt: new Date("2026-06-07T00:00:00.000Z"),
      connectedAt: new Date("2026-06-06T00:00:00.000Z"),
      revokedAt: null,
      lastError: null,
      createdByUserId: "user_1",
      encryptedAccessToken: "encrypted-access",
      encryptedRefreshToken: "encrypted-refresh",
      createdAt: new Date("2026-06-06T00:00:00.000Z"),
      updatedAt: new Date("2026-06-06T00:00:00.000Z")
    });

    expect(serialized).toEqual(
      expect.objectContaining({
        id: "connection_1",
        provider: "x",
        accountName: "Coach X"
      })
    );
    expect(JSON.stringify(serialized)).not.toContain("encrypted-access");
    expect(JSON.stringify(serialized)).not.toContain("encrypted-refresh");
  });

  it("serializes revoked and errored social connection statuses", () => {
    const baseConnection = {
      id: "connection_1",
      provider: SocialProvider.X,
      providerAccountId: "account_1",
      accountName: "Coach X",
      scopes: ["tweet.write"],
      tokenExpiresAt: null,
      connectedAt: new Date("2026-06-06T00:00:00.000Z"),
      revokedAt: null,
      lastError: null
    };

    expect(
      serializeSocialConnection({
        ...baseConnection,
        status: SocialConnectionStatus.REVOKED,
        revokedAt: new Date("2026-06-06T01:00:00.000Z")
      }).status
    ).toBe("revoked");
    expect(
      serializeSocialConnection({
        ...baseConnection,
        status: SocialConnectionStatus.ERROR,
        lastError: "Provider permission denied"
      }).status
    ).toBe("error");
  });

  it("validates scheduled posts and provider-specific media requirements", () => {
    const input = createSocialPostSchema.parse({
      caption: "Client win of the week",
      scheduledFor: "2026-06-08T09:00:00.000Z",
      targetConnectionIds: ["connection_1"],
      media: [
        {
          url: "https://assets.example.com/post.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1_024_000
        }
      ]
    });

    expect(input.caption).toBe("Client win of the week");
    expect(() => validateSocialPostForProvider("instagram", input)).not.toThrow();
    expect(() =>
      validateSocialPostForProvider("instagram", {
        ...input,
        media: []
      })
    ).toThrow(/requires at least one image or video/i);
    expect(() =>
      validateSocialPostForProvider("x", {
        ...input,
        caption: "x".repeat(281)
      })
    ).toThrow(/280 characters/i);
  });

  it("maps every supported social provider and post status to API values", () => {
    expect(toSocialProvider("instagram")).toBe(SocialProvider.META_INSTAGRAM);
    expect(toSocialProvider("facebook")).toBe(SocialProvider.META_FACEBOOK);
    expect(toSocialProvider("x")).toBe(SocialProvider.X);
    expect(toSocialProviderApi(SocialProvider.META_INSTAGRAM)).toBe("instagram");
    expect(toSocialProviderApi(SocialProvider.META_FACEBOOK)).toBe("facebook");
    expect(toSocialProviderApi(SocialProvider.X)).toBe("x");

    expect(toSocialPostStatus("draft")).toBe(SocialPostStatus.DRAFT);
    expect(toSocialPostStatus("queued")).toBe(SocialPostStatus.QUEUED);
    expect(toSocialPostStatus("publishing")).toBe(SocialPostStatus.PUBLISHING);
    expect(toSocialPostStatus("published")).toBe(SocialPostStatus.PUBLISHED);
    expect(toSocialPostStatus("failed")).toBe(SocialPostStatus.FAILED);
    expect(toSocialPostStatus("cancelled")).toBe(SocialPostStatus.CANCELLED);
  });

  it("serializes social post target statuses for client views", () => {
    const post = serializeSocialPost({
      id: "post_1",
      caption: "Client win",
      scheduledFor: null,
      status: SocialPostStatus.QUEUED,
      media: { unexpected: true },
      publishedAt: null,
      cancelledAt: null,
      createdAt: new Date("2026-06-06T00:00:00.000Z"),
      targets: [
        {
          id: "target_1",
          provider: SocialProvider.META_INSTAGRAM,
          status: SocialTargetStatus.PUBLISHING,
          attempts: 1,
          providerPostId: null,
          lastError: null,
          publishedAt: null
        },
        {
          id: "target_2",
          provider: SocialProvider.META_FACEBOOK,
          status: SocialTargetStatus.FAILED,
          attempts: 2,
          providerPostId: null,
          lastError: "Permission denied",
          publishedAt: null
        },
        {
          id: "target_3",
          provider: SocialProvider.X,
          status: SocialTargetStatus.CANCELLED,
          attempts: 0,
          providerPostId: null,
          lastError: null,
          publishedAt: null
        },
        {
          id: "target_4",
          provider: SocialProvider.X,
          status: SocialTargetStatus.RETRYING,
          attempts: 1,
          providerPostId: null,
          lastError: "Rate limited",
          publishedAt: null
        },
        {
          id: "target_5",
          provider: SocialProvider.X,
          status: SocialTargetStatus.PUBLISHED,
          attempts: 1,
          providerPostId: "provider_post_1",
          lastError: null,
          publishedAt: new Date("2026-06-06T01:00:00.000Z")
        }
      ]
    });

    expect(post.media).toEqual([]);
    expect(post.targets.map((target) => target.status)).toEqual([
      "publishing",
      "failed",
      "cancelled",
      "retrying",
      "published"
    ]);
    expect(post.targets.map((target) => target.provider)).toEqual(["instagram", "facebook", "x", "x", "x"]);
  });

  it("redacts provider errors and responses before storing audit/log metadata", () => {
    expect(
      sanitizeSocialProviderResponse({
        id: "post_1",
        access_token: "secret",
        nested: {
          refreshToken: "refresh",
          ok: true
        }
      })
    ).toEqual({
      id: "post_1",
      access_token: "[REDACTED]",
      nested: {
        refreshToken: "[REDACTED]",
        ok: true
      }
    });
    expect(
      sanitizeSocialProviderResponse([{ client_secret: "secret" }, null, "plain"])
    ).toEqual([{ client_secret: "[REDACTED]" }, null, "plain"]);

    expect(
      normalizeSocialProviderError({
        status: 429,
        body: {
          error: {
            message: "Rate limit exceeded",
            access_token: "secret"
          }
        }
      })
    ).toEqual(
      expect.objectContaining({
        code: "provider_rate_limited",
        retryable: true,
        status: 429
      })
    );
    expect(normalizeSocialProviderError({ status: 500, body: {} })).toEqual(
      expect.objectContaining({
        code: "provider_error",
        retryable: true,
        status: 500
      })
    );
    expect(normalizeSocialProviderError({ status: 403, body: {} })).toEqual(
      expect.objectContaining({
        code: "provider_error",
        retryable: false,
        status: 403
      })
    );
    expect(normalizeSocialProviderError("network exploded")).toEqual(
      expect.objectContaining({
        code: "provider_error",
        retryable: true,
        status: 500
      })
    );
  });
});
