import { createHash } from "node:crypto";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

const WINDOW_MS = 60_000;

export interface RateLimitPolicy {
  scope: "auth" | "external" | "mutation";
  limit: number;
  windowMs: number;
  failClosed: boolean;
}

interface RateLimitRow {
  count: number;
  expires_at: Date;
}

export function getRateLimitPolicy(pathname: string, method: string): RateLimitPolicy | null {
  if (pathname.startsWith("/api/auth/") && method !== "GET") {
    return { scope: "auth", limit: 10, windowMs: WINDOW_MS, failClosed: true };
  }

  if (pathname.startsWith("/api/v1/external/")) {
    return { scope: "external", limit: 60, windowMs: WINDOW_MS, failClosed: true };
  }

  if (
    (pathname.startsWith("/api/v1/") || pathname.startsWith("/api/webhooks/")) &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(method)
  ) {
    return { scope: "mutation", limit: 120, windowMs: WINDOW_MS, failClosed: false };
  }

  return null;
}

export function hashRateLimitKey(scope: string, identity: string) {
  return createHash("sha256").update(`${scope}:${identity}`).digest("hex");
}

export function isRateLimited(count: number, limit: number) {
  return count >= limit;
}

export async function enforceRateLimit(input: {
  policy: RateLimitPolicy;
  identity: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + input.policy.windowMs);
  const keyHash = hashRateLimitKey(input.policy.scope, input.identity);
  const rows = await prisma.$queryRaw<RateLimitRow[]>(Prisma.sql`
    INSERT INTO "rate_limit_buckets"
      ("key_hash", "scope", "count", "window_start", "expires_at", "updated_at")
    VALUES
      (${keyHash}, ${input.policy.scope}, 1, ${now}, ${expiresAt}, ${now})
    ON CONFLICT ("key_hash") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limit_buckets"."expires_at" <= ${now} THEN 1
        ELSE "rate_limit_buckets"."count" + 1
      END,
      "window_start" = CASE
        WHEN "rate_limit_buckets"."expires_at" <= ${now} THEN ${now}
        ELSE "rate_limit_buckets"."window_start"
      END,
      "expires_at" = CASE
        WHEN "rate_limit_buckets"."expires_at" <= ${now} THEN ${expiresAt}
        ELSE "rate_limit_buckets"."expires_at"
      END,
      "updated_at" = ${now}
    RETURNING "count", "expires_at"
  `);
  const row = rows[0];

  if (!row) {
    throw new Error("Rate limit bucket update returned no row.");
  }

  return {
    allowed: row.count <= input.policy.limit,
    limit: input.policy.limit,
    remaining: Math.max(0, input.policy.limit - row.count),
    resetAt: row.expires_at
  };
}
