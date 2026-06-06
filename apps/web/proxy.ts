import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { logger, resolveRequestId } from "@/lib/observability/logger";
import { enforceRateLimit, getRateLimitPolicy } from "@/lib/security/rate-limit";

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()"
} as const;

export async function proxy(request: NextRequest) {
  const startedAt = performance.now();
  const requestId = resolveRequestId(request.headers.get("x-request-id"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const policy = getRateLimitPolicy(request.nextUrl.pathname, request.method);
  let rateLimitHeaders: Record<string, string> = {};

  if (policy) {
    try {
      const result = await enforceRateLimit({
        policy,
        identity: getRequestIdentity(request)
      });
      rateLimitHeaders = {
        "x-ratelimit-limit": String(result.limit),
        "x-ratelimit-remaining": String(result.remaining),
        "x-ratelimit-reset": String(Math.ceil(result.resetAt.getTime() / 1_000))
      };

      if (!result.allowed) {
        const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1_000));
        logger.warn({
          event: "request.rate_limited",
          requestId,
          method: request.method,
          path: request.nextUrl.pathname,
          scope: policy.scope
        });

        return NextResponse.json(
          {
            error: {
              code: "rate_limited",
              message: "Too many requests."
            }
          },
          {
            status: 429,
            headers: buildResponseHeaders(requestId, {
              ...rateLimitHeaders,
              "retry-after": String(retryAfter)
            })
          }
        );
      }
    } catch (error) {
      logger.error({
        event: "rate_limit.failed",
        requestId,
        method: request.method,
        path: request.nextUrl.pathname,
        scope: policy.scope,
        errorName: error instanceof Error ? error.name : "UnknownError"
      });

      if (policy.failClosed) {
        return NextResponse.json(
          {
            error: {
              code: "rate_limit_unavailable",
              message: "Request protection is temporarily unavailable."
            }
          },
          {
            status: 503,
            headers: buildResponseHeaders(requestId)
          }
        );
      }
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  setResponseHeaders(response.headers, requestId, rateLimitHeaders);
  logger.info({
    event: "request.forwarded",
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100
  });

  return response;
}

function getRequestIdentity(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

  return `${ipAddress}:${request.nextUrl.pathname}`;
}

function buildResponseHeaders(requestId: string, extra: Record<string, string> = {}) {
  return {
    "x-request-id": requestId,
    ...SECURITY_HEADERS,
    ...extra
  };
}

function setResponseHeaders(
  headers: Headers,
  requestId: string,
  extra: Record<string, string>
) {
  for (const [key, value] of Object.entries(buildResponseHeaders(requestId, extra))) {
    headers.set(key, value);
  }
}

export const config = {
  matcher: ["/api/:path*"]
};
