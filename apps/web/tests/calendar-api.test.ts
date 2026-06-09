import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CalendarConnectionScope,
  CalendarConnectionStatus,
  CalendarProvider
} from "@/app/generated/prisma/enums";
import { POST as createAppleConnection, GET as listCalendarConnections } from "@/app/api/v1/calendar/connections/route";
import { GET as startCalendarOAuth } from "@/app/api/v1/calendar/connections/oauth/start/route";
import { GET as handleCalendarOAuthCallback } from "@/app/api/v1/calendar/connections/oauth/callback/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  exchangeCalendarOAuthCode: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    calendarConnection: {
      findMany: vi.fn(),
      upsert: vi.fn()
    },
    calendarOAuthState: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

vi.mock("@/lib/calendar/calendar-provider-runtime", () => ({
  exchangeCalendarOAuthCode: mocks.exchangeCalendarOAuthCode
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

const coachSession = {
  user: { id: "coach_1", email: "coach@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "coach"
  }
};

const now = new Date("2026-06-09T00:00:00.000Z");

const calendarConnectionRecord = {
  id: "calendar_1",
  organizationId: "org_1",
  provider: CalendarProvider.GOOGLE,
  scope: CalendarConnectionScope.ORGANIZATION,
  providerAccountId: "google_account_1",
  accountName: "ops@completecoach.fit",
  calendarName: "Complete Coach HQ",
  scopes: ["https://www.googleapis.com/auth/calendar.events"],
  status: CalendarConnectionStatus.ACTIVE,
  encryptedAccessToken: "encrypted_access",
  encryptedRefreshToken: "encrypted_refresh",
  tokenExpiresAt: now,
  connectedAt: now,
  revokedAt: null,
  lastError: null,
  createdByUserId: "user_1",
  createdAt: now,
  updatedAt: now
};

describe("calendar connection API", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "a".repeat(32);
    process.env.GOOGLE_CALENDAR_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "google-client-secret";
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.exchangeCalendarOAuthCode.mockReset();

    for (const model of Object.values(mocks.prisma)) {
      for (const method of Object.values(model)) {
        method.mockReset();
      }
    }
  });

  it("lists scoped calendar connections without encrypted token material", async () => {
    mocks.prisma.calendarConnection.findMany.mockResolvedValue([calendarConnectionRecord]);

    const response = await listCalendarConnections(
      new Request("http://test.local/api/v1/calendar/connections?scope=organization")
    );
    const payload = (await response.json()) as { data: Array<{ id: string; provider: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([expect.objectContaining({ id: "calendar_1", provider: "google" })]);
    expect(JSON.stringify(payload)).not.toContain("encrypted_access");
    expect(mocks.prisma.calendarConnection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          scope: CalendarConnectionScope.ORGANIZATION
        }
      })
    );
  });

  it("limits coach-scoped calendar listing to the current user", async () => {
    mocks.prisma.calendarConnection.findMany.mockResolvedValue([{ ...calendarConnectionRecord, scope: CalendarConnectionScope.COACH }]);

    const response = await listCalendarConnections(
      new Request("http://test.local/api/v1/calendar/connections?scope=coach")
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.calendarConnection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org_1",
          scope: CalendarConnectionScope.COACH,
          createdByUserId: "user_1"
        }
      })
    );
  });

  it("prevents coaches from managing organisation calendar connections", async () => {
    mocks.auth.mockResolvedValue(coachSession);

    const response = await createAppleConnection(
      new Request("http://test.local/api/v1/calendar/connections", {
        method: "POST",
        body: JSON.stringify({ scope: "organization" })
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.prisma.calendarConnection.upsert).not.toHaveBeenCalled();
  });

  it("creates an Apple CalDAV setup connection for the selected scope", async () => {
    mocks.prisma.calendarConnection.upsert.mockResolvedValue({
      ...calendarConnectionRecord,
      provider: CalendarProvider.APPLE,
      scope: CalendarConnectionScope.COACH,
      providerAccountId: "apple-user_1",
      accountName: "Apple Calendar setup",
      calendarName: "Apple Calendar",
      scopes: ["caldav"],
      status: CalendarConnectionStatus.PENDING,
      encryptedAccessToken: null,
      encryptedRefreshToken: null
    });

    const response = await createAppleConnection(
      new Request("http://test.local/api/v1/calendar/connections", {
        method: "POST",
        body: JSON.stringify({ scope: "coach" })
      })
    );
    const payload = (await response.json()) as { data: { provider: string; scope: string; status: string } };

    expect(response.status).toBe(201);
    expect(payload.data).toEqual(expect.objectContaining({ provider: "apple", scope: "coach", status: "pending" }));
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "calendar.connection.created",
          targetType: "calendar_connection"
        })
      })
    );
  });

  it("starts Google calendar OAuth with a hashed state redirect", async () => {
    mocks.prisma.calendarOAuthState.create.mockResolvedValue({});

    const response = await startCalendarOAuth(
      new Request("http://test.local/api/v1/calendar/connections/oauth/start?provider=google&scope=organization&redirectTo=/organization-settings")
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(mocks.prisma.calendarOAuthState.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          createdByUserId: "user_1",
          provider: CalendarProvider.GOOGLE,
          scope: CalendarConnectionScope.ORGANIZATION,
          redirectTo: "/organization-settings",
          stateHash: expect.stringMatching(/^[a-f0-9]{64}$/u)
        })
      })
    );
    expect(JSON.stringify(mocks.prisma.calendarOAuthState.create.mock.calls[0]?.[0])).not.toContain("state=");
  });

  it("rejects Apple OAuth start because Apple uses CalDAV setup", async () => {
    const response = await startCalendarOAuth(
      new Request("http://test.local/api/v1/calendar/connections/oauth/start?provider=apple&scope=coach")
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.calendarOAuthState.create).not.toHaveBeenCalled();
  });

  it("redirects invalid calendar OAuth callbacks without storing tokens", async () => {
    const missingCodeResponse = await handleCalendarOAuthCallback(
      new Request("http://test.local/api/v1/calendar/connections/oauth/callback?state=state-token")
    );

    mocks.prisma.calendarOAuthState.findFirst.mockResolvedValue(null);

    const invalidStateResponse = await handleCalendarOAuthCallback(
      new Request("http://test.local/api/v1/calendar/connections/oauth/callback?state=state-token&code=code")
    );

    expect(missingCodeResponse.headers.get("location")).toBe("/settings?calendarError=oauth_missing_code");
    expect(invalidStateResponse.headers.get("location")).toBe("/settings?calendarError=oauth_state_invalid");
    expect(mocks.prisma.calendarConnection.upsert).not.toHaveBeenCalled();
  });

  it("handles calendar OAuth callbacks by storing encrypted tokens", async () => {
    mocks.prisma.calendarOAuthState.findFirst.mockResolvedValue({
      id: "state_1",
      organizationId: "org_1",
      createdByUserId: "user_1",
      provider: CalendarProvider.GOOGLE,
      scope: CalendarConnectionScope.ORGANIZATION,
      codeVerifier: "verifier",
      redirectTo: "/organization-settings"
    });
    mocks.exchangeCalendarOAuthCode.mockResolvedValue({
      providerAccountId: "google_account_1",
      accountName: "ops@completecoach.fit",
      calendarName: "Complete Coach HQ",
      accessToken: "provider-access",
      refreshToken: "provider-refresh",
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
      tokenExpiresAt: now
    });
    mocks.prisma.calendarConnection.upsert.mockResolvedValue(calendarConnectionRecord);
    mocks.prisma.calendarOAuthState.update.mockResolvedValue({});

    const response = await handleCalendarOAuthCallback(
      new Request("http://test.local/api/v1/calendar/connections/oauth/callback?state=state-token&code=code")
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/organization-settings?calendarConnected=google");
    expect(mocks.prisma.calendarConnection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          encryptedAccessToken: expect.not.stringContaining("provider-access"),
          encryptedRefreshToken: expect.not.stringContaining("provider-refresh")
        })
      })
    );
  });
});
