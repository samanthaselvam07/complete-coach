import { describe, expect, it } from "vitest";

import {
  CalendarConnectionScope,
  CalendarConnectionStatus,
  CalendarProvider
} from "@/app/generated/prisma/enums";
import {
  buildCalendarAuthorizationUrl,
  decryptCalendarToken,
  encryptCalendarToken,
  getCalendarProviderByPrisma,
  getCalendarProviderCredentials,
  getCalendarProviderDefinition
} from "@/lib/calendar/calendar-providers";
import {
  serializeCalendarConnection,
  toCalendarProvider,
  toCalendarProviderApi,
  toCalendarScope,
  toCalendarScopeApi
} from "@/lib/calendar/calendar-records";

describe("calendar provider domain", () => {
  it("keeps provider secrets environment-only while exposing calendar metadata", () => {
    const provider = getCalendarProviderDefinition("google");

    expect(provider.displayName).toBe("Google Calendar");
    expect(provider.requiredScopes).toContain("https://www.googleapis.com/auth/calendar.events");
    expect(provider).not.toHaveProperty("clientSecret");
    expect(getCalendarProviderByPrisma(CalendarProvider.OUTLOOK)?.id).toBe("outlook");
    expect(() => getCalendarProviderCredentials("apple")).toThrow(/caldav setup/i);
  });

  it("encrypts calendar tokens and builds provider authorization URLs", () => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "google-client-secret";
    process.env.OUTLOOK_CALENDAR_CLIENT_ID = "outlook-client-id";
    process.env.OUTLOOK_CALENDAR_CLIENT_SECRET = "outlook-client-secret";

    const encrypted = encryptCalendarToken("calendar-token", "a".repeat(32));
    const googleUrl = buildCalendarAuthorizationUrl({
      provider: "google",
      state: "state-token",
      redirectUri: "https://app.example.com/api/v1/calendar/connections/oauth/callback"
    });
    const outlookUrl = buildCalendarAuthorizationUrl({
      provider: "outlook",
      state: "state-token",
      redirectUri: "https://app.example.com/api/v1/calendar/connections/oauth/callback"
    });

    expect(encrypted).not.toContain("calendar-token");
    expect(decryptCalendarToken(encrypted, "a".repeat(32))).toBe("calendar-token");
    expect(googleUrl).toContain("accounts.google.com");
    expect(googleUrl).toContain("access_type=offline");
    expect(outlookUrl).toContain("login.microsoftonline.com");
    expect(outlookUrl).not.toContain("access_type=offline");
  });

  it("maps and serializes calendar connections without token material", () => {
    const serialized = serializeCalendarConnection({
      id: "calendar_1",
      provider: CalendarProvider.APPLE,
      scope: CalendarConnectionScope.COACH,
      providerAccountId: "apple-coach",
      accountName: "Apple Calendar setup",
      calendarName: "Apple Calendar",
      scopes: ["caldav"],
      status: CalendarConnectionStatus.PENDING,
      tokenExpiresAt: null,
      connectedAt: new Date("2026-06-09T00:00:00.000Z"),
      revokedAt: null,
      lastError: null
    });

    expect(toCalendarProvider("google")).toBe(CalendarProvider.GOOGLE);
    expect(toCalendarProviderApi(CalendarProvider.OUTLOOK)).toBe("outlook");
    expect(toCalendarScope("organization")).toBe(CalendarConnectionScope.ORGANIZATION);
    expect(toCalendarScopeApi(CalendarConnectionScope.COACH)).toBe("coach");
    expect(serialized).toEqual(
      expect.objectContaining({
        provider: "apple",
        scope: "coach",
        status: "pending"
      })
    );
    expect(JSON.stringify(serialized)).not.toContain("encrypted");
  });
});
