import { z } from "zod";
import { describe, expect, it } from "vitest";

import { handleApiError } from "@/lib/api/responses";
import {
  ActiveOrganizationRequiredError,
  AuthenticationRequiredError,
  PlatformBillingAccessRequiredError
} from "@/lib/auth/session-guards";
import { ForbiddenError } from "@/lib/auth/permissions";

describe("API response helpers", () => {
  it("maps expected auth and validation errors to stable envelopes", async () => {
    await expectJson(handleApiError(new AuthenticationRequiredError()), 401, "unauthorized");
    await expectJson(
      handleApiError(new ActiveOrganizationRequiredError()),
      403,
      "active_organization_required"
    );
    await expectJson(handleApiError(new ForbiddenError("assistant", "clients:write")), 403, "forbidden");
    await expectJson(
      handleApiError(new PlatformBillingAccessRequiredError("Platform access is paused until billing is active.")),
      402,
      "platform_billing_required"
    );
    await expectJson(
      handleApiError(z.object({ email: z.string().email() }).safeParse({ email: "bad" }).error),
      422,
      "validation_failed"
    );
  });

  it("maps unexpected errors without exposing raw details", async () => {
    await expectJson(handleApiError(new Error("database password leaked")), 500, "internal_error");
  });

  it("maps known database setup and connectivity errors without stack traces", async () => {
    await expectJson(handleApiError({ code: "P2021" }), 503, "database_schema_unavailable");
    await expectJson(handleApiError({ code: "P2022" }), 503, "database_schema_unavailable");
    await expectJson(handleApiError({ code: "P2010", meta: { code: "42P01" } }), 503, "database_schema_unavailable");
    await expectJson(handleApiError({ code: "ETIMEDOUT" }), 503, "database_unavailable");
  });
});

async function expectJson(response: Response, status: number, code: string) {
  const payload = (await response.json()) as { error: { code: string; message: string } };

  expect(response.status).toBe(status);
  expect(payload.error.code).toBe(code);
  expect(payload.error.message).not.toContain("password");
}
