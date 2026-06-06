import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SocialConnectionStatus,
  SocialPostStatus,
  SocialProvider,
  SocialTargetStatus
} from "@/app/generated/prisma/enums";
import { GET as listConnections } from "@/app/api/v1/social/connections/route";
import { DELETE as revokeConnection } from "@/app/api/v1/social/connections/[connectionId]/route";
import { GET as startOAuth } from "@/app/api/v1/social/connections/oauth/start/route";
import { GET as handleOAuthCallback } from "@/app/api/v1/social/connections/oauth/callback/route";
import { GET as listPosts, POST as createPost } from "@/app/api/v1/social/posts/route";
import { POST as cancelPost } from "@/app/api/v1/social/posts/[postId]/cancel/route";
import { POST as processSocialJobs } from "@/app/api/v1/social/jobs/process/route";
import { POST as ingestAnalytics } from "@/app/api/v1/social/analytics/ingest/route";
import { encryptSocialToken } from "@/lib/social/social-providers";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  exchangeOAuthCode: vi.fn(),
  publishSocialTarget: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    auditLog: { create: vi.fn() },
    socialConnection: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn()
    },
    socialOAuthState: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    socialPost: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
    socialPostTarget: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    socialPostAttempt: {
      create: vi.fn()
    },
    socialAnalyticsSnapshot: {
      create: vi.fn()
    }
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

vi.mock("@/lib/social/social-provider-runtime", () => ({
  exchangeOAuthCode: mocks.exchangeOAuthCode,
  publishSocialTarget: mocks.publishSocialTarget
}));

const ownerSession = {
  user: { id: "user_1", email: "coach@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner"
  }
};

const now = new Date("2026-06-06T00:00:00.000Z");

const connectionRecord = {
  id: "connection_1",
  organizationId: "org_1",
  provider: SocialProvider.X,
  providerAccountId: "x_account_1",
  accountName: "Coach X",
  scopes: ["tweet.write", "offline.access"],
  status: SocialConnectionStatus.ACTIVE,
  encryptedAccessToken: "encrypted_access",
  encryptedRefreshToken: "encrypted_refresh",
  tokenExpiresAt: new Date("2026-06-07T00:00:00.000Z"),
  connectedAt: now,
  revokedAt: null,
  lastError: null,
  createdByUserId: "user_1",
  createdAt: now,
  updatedAt: now
};

const postRecord = {
  id: "post_1",
  organizationId: "org_1",
  caption: "Client win of the week",
  scheduledFor: new Date("2026-06-08T09:00:00.000Z"),
  status: SocialPostStatus.SCHEDULED,
  media: [],
  createdByUserId: "user_1",
  publishedAt: null,
  cancelledAt: null,
  createdAt: now,
  updatedAt: now,
  targets: []
};

const targetRecord = {
  id: "target_1",
  organizationId: "org_1",
  postId: "post_1",
  connectionId: "connection_1",
  provider: SocialProvider.X,
  status: SocialTargetStatus.QUEUED,
  attempts: 0,
  providerPostId: null,
  lastError: null,
  nextAttemptAt: now,
  publishedAt: null,
  createdAt: now,
  updatedAt: now,
  post: postRecord,
  connection: connectionRecord
};

describe("social API", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "a".repeat(32);
    process.env.X_CLIENT_ID = "x-client-id";
    process.env.X_CLIENT_SECRET = "x-client-secret";
    delete process.env.SOCIAL_PROVIDER_MODE;
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.exchangeOAuthCode.mockReset();
    mocks.publishSocialTarget.mockReset();
    for (const model of Object.values(mocks.prisma)) {
      if (typeof model === "function") {
        model.mockReset();
        continue;
      }

      for (const method of Object.values(model)) {
        method.mockReset();
      }
    }
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
  });

  it("lists tenant-scoped social connections without token material", async () => {
    mocks.prisma.socialConnection.findMany.mockResolvedValue([connectionRecord]);

    const response = await listConnections(new Request("http://test.local/api/v1/social/connections"));
    const payload = (await response.json()) as { data: Array<{ id: string; provider: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([expect.objectContaining({ id: "connection_1", provider: "x" })]);
    expect(JSON.stringify(payload)).not.toContain("encrypted_access");
    expect(mocks.prisma.socialConnection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1"
        }
      })
    );
  });

  it("starts OAuth with a durable hashed state and provider authorization redirect", async () => {
    mocks.prisma.socialOAuthState.create.mockResolvedValue({});

    const response = await startOAuth(
      new Request("http://test.local/api/v1/social/connections/oauth/start?provider=x&redirectTo=/social-media")
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("https://twitter.com/i/oauth2/authorize");
    expect(mocks.prisma.socialOAuthState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        createdByUserId: "user_1",
        provider: SocialProvider.X,
        redirectTo: "/social-media"
      })
    });
    expect(JSON.stringify(mocks.prisma.socialOAuthState.create.mock.calls[0]?.[0])).not.toContain(
      "x-client-secret"
    );
  });

  it("sanitizes unsafe OAuth redirect targets before storing state", async () => {
    mocks.prisma.socialOAuthState.create.mockResolvedValue({});

    const response = await startOAuth(
      new Request("http://test.local/api/v1/social/connections/oauth/start?provider=x&redirectTo=//evil.test")
    );

    expect(response.status).toBe(302);
    expect(mocks.prisma.socialOAuthState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        redirectTo: "/social-media"
      })
    });
  });

  it("redirects OAuth callbacks with missing code or invalid state", async () => {
    const missingCodeResponse = await handleOAuthCallback(
      new Request("http://test.local/api/v1/social/connections/oauth/callback?state=state-token")
    );

    expect(missingCodeResponse.status).toBe(302);
    expect(missingCodeResponse.headers.get("Location")).toBe("/social-media?socialError=oauth_missing_code");

    mocks.prisma.socialOAuthState.findFirst.mockResolvedValue(null);

    const invalidStateResponse = await handleOAuthCallback(
      new Request("http://test.local/api/v1/social/connections/oauth/callback?state=state-token&code=code")
    );

    expect(invalidStateResponse.status).toBe(302);
    expect(invalidStateResponse.headers.get("Location")).toBe("/social-media?socialError=oauth_state_invalid");
  });

  it("handles OAuth callbacks by consuming state and storing encrypted tokens", async () => {
    mocks.prisma.socialOAuthState.findFirst.mockResolvedValue({
      id: "state_1",
      organizationId: "org_1",
      createdByUserId: "user_1",
      provider: SocialProvider.X,
      redirectTo: "/social-media",
      codeVerifier: "verifier",
      expiresAt: new Date("2026-06-07T00:00:00.000Z"),
      consumedAt: null
    });
    mocks.exchangeOAuthCode.mockResolvedValue({
      providerAccountId: "x_account_1",
      accountName: "Coach X",
      accessToken: "provider-access",
      refreshToken: "provider-refresh",
      scopes: ["tweet.write"],
      tokenExpiresAt: new Date("2026-06-07T00:00:00.000Z")
    });
    mocks.prisma.socialConnection.upsert.mockResolvedValue(connectionRecord);
    mocks.prisma.socialOAuthState.update.mockResolvedValue({});
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await handleOAuthCallback(
      new Request("http://test.local/api/v1/social/connections/oauth/callback?state=state-token&code=code")
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/social-media?socialConnected=x");
    expect(mocks.prisma.socialConnection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          organizationId: "org_1",
          encryptedAccessToken: expect.not.stringContaining("provider-access"),
          encryptedRefreshToken: expect.not.stringContaining("provider-refresh")
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "social.connection.created" }) })
    );
  });

  it("creates scheduled posts with scoped targets and audit events", async () => {
    mocks.prisma.socialConnection.findMany.mockResolvedValue([connectionRecord]);
    mocks.prisma.socialPost.create.mockResolvedValue({
      ...postRecord,
      targets: [{ ...targetRecord, status: SocialTargetStatus.SCHEDULED }]
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createPost(
      new Request("http://test.local/api/v1/social/posts", {
        method: "POST",
        body: JSON.stringify({
          caption: "Client win of the week",
          scheduledFor: "2026-06-08T09:00:00.000Z",
          targetConnectionIds: ["connection_1"]
        })
      })
    );
    const payload = (await response.json()) as { data: { id: string; targets: Array<{ status: string }> } };

    expect(response.status).toBe(201);
    expect(payload.data.targets[0]?.status).toBe("scheduled");
    expect(mocks.prisma.socialPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          targets: {
            create: [
              expect.objectContaining({
                connectionId: "connection_1",
                provider: SocialProvider.X,
                status: SocialTargetStatus.SCHEDULED
              })
            ]
          }
        })
      })
    );
  });

  it("rejects social posts when selected connections are not tenant-visible", async () => {
    mocks.prisma.socialConnection.findMany.mockResolvedValue([]);

    const response = await createPost(
      new Request("http://test.local/api/v1/social/posts", {
        method: "POST",
        body: JSON.stringify({
          caption: "Client win of the week",
          scheduledFor: "2026-06-08T09:00:00.000Z",
          targetConnectionIds: ["connection_2"]
        })
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("connection_not_found");
  });

  it("revokes social connections locally and audits the action", async () => {
    mocks.prisma.socialConnection.findFirst.mockResolvedValue(connectionRecord);
    mocks.prisma.socialConnection.update.mockResolvedValue({
      ...connectionRecord,
      status: SocialConnectionStatus.REVOKED,
      revokedAt: new Date("2026-06-06T01:00:00.000Z")
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await revokeConnection(
      new Request("http://test.local/api/v1/social/connections/connection_1", { method: "DELETE" }),
      { params: Promise.resolve({ connectionId: "connection_1" }) }
    );
    const payload = (await response.json()) as { data: { status: string } };

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("revoked");
    expect(mocks.prisma.socialConnection.findFirst).toHaveBeenCalledWith({
      where: {
        id: "connection_1",
        organizationId: "org_1"
      }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "social.connection.revoked" })
      })
    );
  });

  it("returns not found when revoking a connection outside the tenant", async () => {
    mocks.prisma.socialConnection.findFirst.mockResolvedValue(null);

    const response = await revokeConnection(
      new Request("http://test.local/api/v1/social/connections/connection_2", { method: "DELETE" }),
      { params: Promise.resolve({ connectionId: "connection_2" }) }
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("not_found");
  });

  it("lists scheduled posts with target summaries", async () => {
    mocks.prisma.socialPost.findMany.mockResolvedValue([
      {
        ...postRecord,
        targets: [targetRecord]
      }
    ]);

    const response = await listPosts(new Request("http://test.local/api/v1/social/posts?status=scheduled"));
    const payload = (await response.json()) as { data: Array<{ id: string; targets: Array<{ provider: string }> }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]?.targets[0]?.provider).toBe("x");
  });

  it("lists social posts without a status filter", async () => {
    mocks.prisma.socialPost.findMany.mockResolvedValue([{ ...postRecord, targets: [] }]);

    const response = await listPosts(new Request("http://test.local/api/v1/social/posts"));

    expect(response.status).toBe(200);
    expect(mocks.prisma.socialPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1"
        }
      })
    );
  });

  it("cancels scheduled posts and pending targets", async () => {
    mocks.prisma.socialPost.findFirst.mockResolvedValue(postRecord);
    mocks.prisma.socialPost.update.mockResolvedValue({
      ...postRecord,
      status: SocialPostStatus.CANCELLED,
      cancelledAt: new Date("2026-06-06T01:00:00.000Z"),
      targets: [targetRecord]
    });
    mocks.prisma.socialPostTarget.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await cancelPost(
      new Request("http://test.local/api/v1/social/posts/post_1/cancel", { method: "POST" }),
      { params: Promise.resolve({ postId: "post_1" }) }
    );
    const payload = (await response.json()) as { data: { status: string } };

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("cancelled");
    expect(mocks.prisma.socialPostTarget.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: SocialTargetStatus.CANCELLED })
      })
    );
  });

  it("does not cancel already published social posts", async () => {
    mocks.prisma.socialPost.findFirst.mockResolvedValue({
      ...postRecord,
      status: SocialPostStatus.PUBLISHED,
      publishedAt: new Date("2026-06-06T01:00:00.000Z")
    });

    const response = await cancelPost(
      new Request("http://test.local/api/v1/social/posts/post_1/cancel", { method: "POST" }),
      { params: Promise.resolve({ postId: "post_1" }) }
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("invalid_state");
  });

  it("processes queued targets with durable success and retry attempts", async () => {
    mocks.prisma.socialPostTarget.findMany.mockResolvedValue([
      {
        ...targetRecord,
        connection: {
          ...connectionRecord,
          encryptedAccessToken: encryptSocialToken("provider-access", process.env.AUTH_SECRET ?? "")
        }
      }
    ]);
    mocks.publishSocialTarget.mockResolvedValueOnce({
      ok: false,
      retryable: true,
      status: 429,
      code: "provider_rate_limited",
      message: "Rate limited"
    });
    mocks.prisma.socialPostAttempt.create.mockResolvedValue({});
    mocks.prisma.socialPostTarget.update.mockResolvedValue({});

    const response = await processSocialJobs(
      new Request("http://test.local/api/v1/social/jobs/process", {
        method: "POST",
        body: JSON.stringify({ limit: 10 })
      })
    );
    const payload = (await response.json()) as { data: { processed: number; retried: number } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(expect.objectContaining({ processed: 1, retried: 1 }));
    expect(mocks.prisma.socialPostAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetId: "target_1",
          status: SocialTargetStatus.RETRYING,
          providerStatus: 429
        })
      })
    );
    expect(mocks.prisma.socialPostTarget.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SocialTargetStatus.RETRYING,
          attempts: { increment: 1 }
        })
      })
    );
  });

  it("processes due scheduled targets through the provider worker", async () => {
    mocks.prisma.socialPostTarget.findMany.mockResolvedValue([
      {
        ...targetRecord,
        status: SocialTargetStatus.SCHEDULED,
        connection: {
          ...connectionRecord,
          encryptedAccessToken: encryptSocialToken("provider-access", process.env.AUTH_SECRET ?? "")
        }
      }
    ]);
    mocks.publishSocialTarget.mockResolvedValueOnce({
      ok: true,
      status: 202,
      providerPostId: "provider_post_1"
    });
    mocks.prisma.socialPostAttempt.create.mockResolvedValue({});
    mocks.prisma.socialPostTarget.update.mockResolvedValue({});
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await processSocialJobs(
      new Request("http://test.local/api/v1/social/jobs/process", {
        method: "POST",
        body: JSON.stringify({ limit: 10 })
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.socialPostTarget.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              status: SocialTargetStatus.SCHEDULED
            })
          ])
        })
      })
    );
    expect(mocks.publishSocialTarget).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "provider-access" })
    );
    expect(mocks.prisma.socialPostTarget.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SocialTargetStatus.PUBLISHED,
          providerPostId: "provider_post_1"
        })
      })
    );
  });

  it("marks non-retryable provider failures as failed attempts", async () => {
    mocks.prisma.socialPostTarget.findMany.mockResolvedValue([
      {
        ...targetRecord,
        connection: {
          ...connectionRecord,
          encryptedAccessToken: encryptSocialToken("provider-access", process.env.AUTH_SECRET ?? "")
        }
      }
    ]);
    mocks.publishSocialTarget.mockResolvedValueOnce({
      ok: false,
      retryable: false,
      status: 403,
      code: "provider_error",
      message: "Permission denied"
    });
    mocks.prisma.socialPostAttempt.create.mockResolvedValue({});
    mocks.prisma.socialPostTarget.update.mockResolvedValue({});

    const response = await processSocialJobs(
      new Request("http://test.local/api/v1/social/jobs/process", {
        method: "POST",
        body: JSON.stringify({ limit: 10 })
      })
    );
    const payload = (await response.json()) as { data: { failed: number } };

    expect(response.status).toBe(200);
    expect(payload.data.failed).toBe(1);
    expect(mocks.prisma.socialPostAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SocialTargetStatus.FAILED,
          retryAt: null
        })
      })
    );
  });

  it("ingests analytics snapshots without provider token material", async () => {
    mocks.prisma.socialConnection.findMany.mockResolvedValue([connectionRecord]);
    mocks.prisma.socialAnalyticsSnapshot.create.mockResolvedValue({
      id: "snapshot_1",
      organizationId: "org_1",
      connectionId: "connection_1",
      provider: SocialProvider.X,
      providerPostId: null,
      metrics: { mode: "simulated", accountName: "Coach X" },
      capturedAt: new Date("2026-06-06T02:00:00.000Z"),
      createdAt: now
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await ingestAnalytics(
      new Request("http://test.local/api/v1/social/analytics/ingest", {
        method: "POST",
        body: JSON.stringify({
          connectionIds: ["connection_1"],
          capturedAt: "2026-06-06T02:00:00.000Z"
        })
      })
    );
    const payload = (await response.json()) as { data: Array<{ provider: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([expect.objectContaining({ provider: "x" })]);
    expect(JSON.stringify(mocks.prisma.socialAnalyticsSnapshot.create.mock.calls)).not.toContain(
      "encrypted_access"
    );
  });

  it("records live-mode analytics snapshots with provider post ids when requested", async () => {
    process.env.SOCIAL_PROVIDER_MODE = "live";
    mocks.prisma.socialConnection.findMany.mockResolvedValue([connectionRecord]);
    mocks.prisma.socialAnalyticsSnapshot.create.mockResolvedValue({
      id: "snapshot_2",
      organizationId: "org_1",
      connectionId: "connection_1",
      provider: SocialProvider.X,
      providerPostId: "provider_post_1",
      metrics: { mode: "live_pending", accountName: "Coach X" },
      capturedAt: new Date("2026-06-06T02:00:00.000Z"),
      createdAt: now
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await ingestAnalytics(
      new Request("http://test.local/api/v1/social/analytics/ingest", {
        method: "POST",
        body: JSON.stringify({
          postIds: ["provider_post_1"],
          capturedAt: "2026-06-06T02:00:00.000Z"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.socialAnalyticsSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerPostId: "provider_post_1",
          metrics: expect.objectContaining({ mode: "live_pending" })
        })
      })
    );
    delete process.env.SOCIAL_PROVIDER_MODE;
  });
});
