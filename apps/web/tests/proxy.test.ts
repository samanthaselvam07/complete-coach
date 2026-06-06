import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn()
}));

vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return { ...actual, enforceRateLimit: mocks.enforceRateLimit };
});
vi.mock("@/lib/observability/logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/observability/logger")>();
  return {
    ...actual,
    logger: { error: mocks.error, info: mocks.info, warn: mocks.warn }
  };
});

import { proxy } from "@/proxy";

describe("application proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propagates request ids and security headers", async () => {
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAt: new Date("2026-06-06T00:01:00.000Z")
    });

    const response = await proxy(
      new NextRequest("https://app.example.com/api/v1/clients", {
        method: "POST",
        headers: {
          "x-request-id": "req_123",
          "x-forwarded-for": "203.0.113.8"
        }
      })
    );

    expect(response.headers.get("x-request-id")).toBe("req_123");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("x-ratelimit-remaining")).toBe("119");
  });

  it("returns a standard 429 response when the limit is exceeded", async () => {
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAt: new Date(Date.now() + 30_000)
    });

    const response = await proxy(
      new NextRequest("https://app.example.com/api/auth/callback/credentials", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.8" }
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(429);
    expect(payload.error.code).toBe("rate_limited");
    expect(response.headers.get("retry-after")).toBeTruthy();
  });

  it("forwards read requests without invoking the limiter", async () => {
    const response = await proxy(
      new NextRequest("https://app.example.com/api/v1/clients", {
        method: "GET"
      })
    );

    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });

  it("fails closed for auth limiter storage errors", async () => {
    mocks.enforceRateLimit.mockRejectedValue(new Error("database unavailable"));

    const response = await proxy(
      new NextRequest("https://app.example.com/api/auth/callback/credentials", {
        method: "POST"
      })
    );

    expect(response.status).toBe(503);
  });

  it("fails open for ordinary mutation limiter storage errors", async () => {
    mocks.enforceRateLimit.mockRejectedValue(new Error("database unavailable"));

    const response = await proxy(
      new NextRequest("https://app.example.com/api/v1/tasks", {
        method: "POST"
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });
});
