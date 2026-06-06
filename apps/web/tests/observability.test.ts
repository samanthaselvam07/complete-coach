import { describe, expect, it, vi } from "vitest";

import {
  buildRequestLogContext,
  redactLogValue,
  resolveRequestId
} from "@/lib/observability/logger";
import {
  getRateLimitPolicy,
  hashRateLimitKey,
  isRateLimited
} from "@/lib/security/rate-limit";

describe("structured logging", () => {
  it("uses a valid inbound request id or creates a UUID", () => {
    expect(resolveRequestId("req_123-abc")).toBe("req_123-abc");
    expect(resolveRequestId("contains spaces")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("redacts nested secrets and sensitive content", () => {
    expect(
      redactLogValue({
        email: "person@example.com",
        password: "Password123!",
        authorization: "Bearer secret",
        nested: {
          messageBody: "private coaching note",
          token: "secret-token",
          safe: "visible"
        }
      })
    ).toEqual({
      email: "[REDACTED]",
      password: "[REDACTED]",
      authorization: "[REDACTED]",
      nested: {
        messageBody: "[REDACTED]",
        token: "[REDACTED]",
        safe: "visible"
      }
    });
    expect(redactLogValue(["safe", { apiKey: "secret" }, 3])).toEqual([
      "safe",
      { apiKey: "[REDACTED]" },
      3
    ]);
    expect(redactLogValue(null)).toBeNull();
  });

  it("builds safe request context without query values", () => {
    expect(
      buildRequestLogContext(
        new Request("https://app.example.com/api/v1/clients?search=private&limit=10", {
          method: "GET",
          headers: { "x-request-id": "req_123" }
        })
      )
    ).toEqual({
      requestId: "req_123",
      method: "GET",
      path: "/api/v1/clients",
      queryKeys: ["limit", "search"]
    });
  });
});

describe("rate limiting", () => {
  it("assigns stricter auth and external policies", () => {
    expect(getRateLimitPolicy("/api/auth/callback/credentials", "POST")).toEqual(
      expect.objectContaining({ limit: 10, scope: "auth" })
    );
    expect(getRateLimitPolicy("/api/v1/external/clients", "GET")).toEqual(
      expect.objectContaining({ limit: 60, scope: "external" })
    );
    expect(getRateLimitPolicy("/api/v1/clients", "POST")).toEqual(
      expect.objectContaining({ limit: 120, scope: "mutation" })
    );
    expect(getRateLimitPolicy("/api/v1/clients", "GET")).toBeNull();
  });

  it("hashes limiter identity and applies the configured threshold", () => {
    expect(hashRateLimitKey("auth", "203.0.113.8")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRateLimitKey("auth", "203.0.113.8")).not.toContain("203.0.113.8");
    expect(isRateLimited(9, 10)).toBe(false);
    expect(isRateLimited(10, 10)).toBe(true);
  });

  it("does not depend on mutable global buckets", async () => {
    vi.resetModules();
    const first = await import("@/lib/security/rate-limit");
    vi.resetModules();
    const second = await import("@/lib/security/rate-limit");

    expect(first.getRateLimitPolicy("/api/v1/tasks", "POST")).toEqual(
      second.getRateLimitPolicy("/api/v1/tasks", "POST")
    );
  });
});
