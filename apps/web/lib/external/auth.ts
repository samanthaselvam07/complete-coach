import { ExternalApiKeyStatus } from "@/app/generated/prisma/enums";
import { errorResponse } from "@/lib/api/responses";
import { prisma } from "@/lib/db/prisma";
import { verifyExternalApiKey } from "@/lib/external/api-keys";

const EXTERNAL_RATE_LIMIT_WINDOW_MS = 60_000;
const EXTERNAL_RATE_LIMIT_MAX_REQUESTS = 60;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export interface ExternalApiActor {
  apiKeyId: string;
  organizationId: string;
  scopes: Set<string>;
}

interface ExternalApiKeyRecord {
  id: string;
  organizationId: string;
  keyHash: string;
  scopes: unknown;
  status: ExternalApiKeyStatus | string;
  allowedIps: unknown;
  expiresAt: Date | string | null;
}

export class ExternalApiAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export async function requireExternalApiActor(request: Request, requiredScope: string) {
  const secret = getBearerSecret(request);

  if (!secret) {
    throw new ExternalApiAuthError("unauthorized", "A valid bearer API key is required.", 401);
  }

  const keyPrefix = secret.slice(0, 16);
  const apiKey = (await prisma.externalApiKey.findUnique({
    where: { keyPrefix }
  })) as ExternalApiKeyRecord | null;

  if (!apiKey || !(await verifyExternalApiKey(secret, apiKey.keyHash))) {
    throw new ExternalApiAuthError("unauthorized", "A valid bearer API key is required.", 401);
  }

  if (apiKey.status !== ExternalApiKeyStatus.ACTIVE) {
    throw new ExternalApiAuthError("unauthorized", "The API key is not active.", 401);
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() <= Date.now()) {
    throw new ExternalApiAuthError("unauthorized", "The API key has expired.", 401);
  }

  const ipAddress = getRequestIp(request);

  if (!isAllowedIp(apiKey.allowedIps, ipAddress)) {
    throw new ExternalApiAuthError("forbidden", "The API key is not allowed from this IP address.", 403);
  }

  enforceRateLimit(apiKey.id, ipAddress);

  const scopes = new Set(normalizeScopes(apiKey.scopes));

  if (!scopes.has(requiredScope)) {
    throw new ExternalApiAuthError("forbidden", "The API key does not have the required scope.", 403);
  }

  await prisma.externalApiKey.update({
    where: { id: apiKey.id, organizationId: apiKey.organizationId },
    data: { lastUsedAt: new Date() }
  });

  return {
    actor: {
      apiKeyId: apiKey.id,
      organizationId: apiKey.organizationId,
      scopes
    },
    ipAddress
  };
}

export function handleExternalApiError(error: unknown) {
  if (error instanceof ExternalApiAuthError) {
    return errorResponse(error.code, error.message, error.status);
  }

  throw error;
}

export async function auditExternalApiUse(input: {
  actor: ExternalApiActor;
  request: Request;
  ipAddress: string | null;
  targetType?: string;
  targetId?: string | null;
  includePii?: boolean;
}) {
  const url = new URL(input.request.url);
  const safeQueryKeys = Array.from(url.searchParams.keys()).filter((key) => key !== "cursor").sort();

  await prisma.auditLog.create({
    data: {
      organizationId: input.actor.organizationId,
      actorApiKeyId: input.actor.apiKeyId,
      action: "external_api.used",
      targetType: input.targetType ?? "external_api",
      targetId: input.targetId ?? null,
      metadata: {
        method: input.request.method,
        path: url.pathname,
        queryKeys: safeQueryKeys
      },
      ipAddress: input.ipAddress,
      userAgent: input.request.headers.get("user-agent")
    }
  });

  if (input.includePii) {
    await prisma.auditLog.create({
      data: {
        organizationId: input.actor.organizationId,
        actorApiKeyId: input.actor.apiKeyId,
        action: "external_api.pii_accessed",
        targetType: input.targetType ?? "external_api",
        targetId: input.targetId ?? null,
        metadata: {
          path: url.pathname
        },
        ipAddress: input.ipAddress,
        userAgent: input.request.headers.get("user-agent")
      }
    });
  }
}

export function canIncludePii(actor: ExternalApiActor, includePii: boolean) {
  if (!includePii) {
    return false;
  }

  if (!actor.scopes.has("external:client_pii:read")) {
    throw new ExternalApiAuthError("forbidden", "The API key does not have permission to read client PII.", 403);
  }

  return true;
}

export function clearExternalRateLimitBuckets() {
  rateLimitBuckets.clear();
}

function getBearerSecret(request: Request) {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);

  return match?.[1] ?? null;
}

function normalizeScopes(scopes: unknown) {
  if (!Array.isArray(scopes)) {
    return [];
  }

  return scopes.filter((scope): scope is string => typeof scope === "string");
}

function isAllowedIp(allowedIps: unknown, ipAddress: string | null) {
  if (!Array.isArray(allowedIps) || allowedIps.length === 0) {
    return true;
  }

  if (!ipAddress) {
    return false;
  }

  return allowedIps.includes(ipAddress);
}

function enforceRateLimit(apiKeyId: string, ipAddress: string | null) {
  const now = Date.now();
  const bucketKey = `${apiKeyId}:${ipAddress ?? "unknown"}`;
  const bucket = rateLimitBuckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, { count: 1, resetAt: now + EXTERNAL_RATE_LIMIT_WINDOW_MS });
    return;
  }

  if (bucket.count >= EXTERNAL_RATE_LIMIT_MAX_REQUESTS) {
    throw new ExternalApiAuthError("rate_limited", "Too many external API requests.", 429);
  }

  bucket.count += 1;
}

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
}
