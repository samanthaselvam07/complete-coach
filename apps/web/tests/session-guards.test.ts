import { describe, expect, it } from "vitest";

import {
  ActiveClientRequiredError,
  PlatformBillingAccessRequiredError,
  requireActiveClientActor,
  requireActiveActor,
  requireAuthenticatedSession,
  type AppSession
} from "@/lib/auth/session-guards";

const activeOrganization = {
  id: "org_1",
  slug: "complete-coach-demo",
  name: "Complete Coach Demo",
  role: "owner"
} as const;

const authenticatedSession: AppSession = {
  user: {
    id: "user_1",
    email: "coach@example.com",
    name: "Demo Coach"
  },
  activeOrganization,
  expires: "2099-01-01T00:00:00.000Z"
};

describe("session guards", () => {
  it("requires an authenticated user id", () => {
    expect(requireAuthenticatedSession(authenticatedSession).user.id).toBe("user_1");
    expect(() => requireAuthenticatedSession(null)).toThrow(/Unauthenticated/);
  });

  it("returns actor context for the active organization", () => {
    expect(requireActiveActor(authenticatedSession, "clients:read")).toEqual({
      userId: "user_1",
      organizationId: "org_1",
      organizationSlug: "complete-coach-demo",
      organizationName: "Complete Coach Demo",
      role: "owner"
    });
  });

  it("rejects sessions without an active organization", () => {
    expect(() =>
      requireActiveActor({
        ...authenticatedSession,
        activeOrganization: undefined
      })
    ).toThrow(/active organization/);
  });

  it("enforces capabilities on the actor role", () => {
    expect(() =>
      requireActiveActor(
        {
          ...authenticatedSession,
          activeOrganization: {
            ...activeOrganization,
            role: "assistant"
          }
        },
        "payments:manage"
      )
    ).toThrow(/Forbidden/);
  });

  it("blocks non-payment access when platform billing is inactive", () => {
    const blockedSession: AppSession = {
      ...authenticatedSession,
      activeOrganization: {
        ...activeOrganization,
        platformAccess: {
          state: "blocked",
          canUsePlatform: false,
          reason: "subscription_inactive",
          message: "Platform access is paused until billing is active."
        }
      }
    };

    expect(() => requireActiveActor(blockedSession, "clients:read")).toThrow(PlatformBillingAccessRequiredError);
    expect(() => requireActiveActor(blockedSession, "payments:manage")).not.toThrow();
  });

  it("allows setup-warning platform access while a plan is being selected", () => {
    const setupSession: AppSession = {
      ...authenticatedSession,
      activeOrganization: {
        ...activeOrganization,
        platformAccess: {
          state: "blocked",
          canUsePlatform: false,
          reason: "subscription_required",
          message: "Choose a Complete Coach plan to activate platform access."
        }
      }
    };

    expect(requireActiveActor(setupSession, "clients:write")).toMatchObject({
      userId: "user_1",
      organizationId: "org_1"
    });
  });

  it("returns linked client context for a client session", () => {
    const clientSession: AppSession = {
      user: {
        id: "user_client",
        email: "client@example.com",
        name: "Demo Client"
      },
      activeOrganization: {
        ...activeOrganization,
        role: "client"
      },
      activeClient: {
        id: "client_1",
        organizationId: "org_1",
        name: "Demo Client",
        email: "client@example.com",
        timezone: "Australia/Melbourne"
      },
      expires: "2099-01-01T00:00:00.000Z"
    };

    expect(requireActiveClientActor(clientSession)).toEqual({
      userId: "user_client",
      organizationId: "org_1",
      organizationSlug: "complete-coach-demo",
      organizationName: "Complete Coach Demo",
      role: "client",
      clientId: "client_1",
      clientName: "Demo Client",
      clientEmail: "client@example.com",
      clientTimezone: "Australia/Melbourne"
    });
  });

  it("rejects client sessions without a linked client profile", () => {
    expect(() =>
      requireActiveClientActor({
        ...authenticatedSession,
        activeOrganization: {
          ...activeOrganization,
          role: "client"
        }
      })
    ).toThrow(ActiveClientRequiredError);
  });
});
