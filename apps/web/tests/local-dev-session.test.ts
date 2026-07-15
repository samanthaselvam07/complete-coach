import { describe, expect, it } from "vitest";

import {
  createLocalDevelopmentSession,
  isLocalDevAuthBypassEnabled,
  localDevelopmentSession
} from "@/lib/auth/local-dev-session";

describe("local development auth bypass", () => {
  it("only enables the bypass in development when explicitly requested", () => {
    expect(
      isLocalDevAuthBypassEnabled({
        NODE_ENV: "development",
        NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS: "1"
      } as NodeJS.ProcessEnv)
    ).toBe(true);

    expect(
      isLocalDevAuthBypassEnabled({
        NODE_ENV: "development"
      } as NodeJS.ProcessEnv)
    ).toBe(false);

    expect(
      isLocalDevAuthBypassEnabled({
        NODE_ENV: "production",
        NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS: "1"
      } as NodeJS.ProcessEnv)
    ).toBe(false);
  });

  it("uses a non-secret fixture session for the local workspace", () => {
    expect(localDevelopmentSession.user.email).toBe("coach@example.com");
    expect(localDevelopmentSession.activeOrganization?.role).toBe("owner");
    expect(JSON.stringify(localDevelopmentSession)).not.toContain("password");
  });

  it("can bind the local session to the persisted demo organization", () => {
    const session = createLocalDevelopmentSession({
      id: "persisted-org-id",
      slug: "complete-coach-demo",
      name: "Complete Coach Demo"
    });

    expect(session.activeOrganization?.id).toBe("persisted-org-id");
    expect(session.activeOrganization?.role).toBe("owner");
    expect(session.activeOrganization?.platformAccess?.canUsePlatform).toBe(true);
  });
});
