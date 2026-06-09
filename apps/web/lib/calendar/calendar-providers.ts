import { createHash } from "node:crypto";

import type { CalendarProvider } from "@/app/generated/prisma/enums";
import {
  decryptSocialToken,
  encryptSocialToken,
  normalizeSocialProviderError,
  sanitizeSocialProviderResponse
} from "@/lib/social/social-providers";
import type { CalendarProviderId } from "./calendar-records";

interface CalendarProviderDefinition {
  id: CalendarProviderId;
  prismaProvider: CalendarProvider;
  displayName: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  accountUrl?: string;
  requiredScopes: string[];
  clientIdEnv?: string;
  clientSecretEnv?: string;
}

export const calendarProviderDefinitions: Record<CalendarProviderId, CalendarProviderDefinition> = {
  apple: {
    id: "apple",
    prismaProvider: "APPLE" as CalendarProvider,
    displayName: "Apple Calendar",
    requiredScopes: ["caldav"]
  },
  google: {
    id: "google",
    prismaProvider: "GOOGLE" as CalendarProvider,
    displayName: "Google Calendar",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    accountUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    requiredScopes: ["https://www.googleapis.com/auth/calendar.events", "openid", "email", "profile"],
    clientIdEnv: "GOOGLE_CALENDAR_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CALENDAR_CLIENT_SECRET"
  },
  outlook: {
    id: "outlook",
    prismaProvider: "OUTLOOK" as CalendarProvider,
    displayName: "Outlook Calendar",
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    accountUrl: "https://graph.microsoft.com/v1.0/me",
    requiredScopes: ["offline_access", "Calendars.ReadWrite", "User.Read"],
    clientIdEnv: "OUTLOOK_CALENDAR_CLIENT_ID",
    clientSecretEnv: "OUTLOOK_CALENDAR_CLIENT_SECRET"
  }
};

export const encryptCalendarToken = encryptSocialToken;
export const decryptCalendarToken = decryptSocialToken;
export const sanitizeCalendarProviderResponse = sanitizeSocialProviderResponse;
export const normalizeCalendarProviderError = normalizeSocialProviderError;

export function getCalendarProviderDefinition(provider: CalendarProviderId) {
  return calendarProviderDefinitions[provider];
}

export function getCalendarProviderByPrisma(provider: CalendarProvider) {
  return Object.values(calendarProviderDefinitions).find((definition) => definition.prismaProvider === provider);
}

export function getCalendarProviderCredentials(provider: CalendarProviderId) {
  const definition = getCalendarProviderDefinition(provider);

  if (!definition.clientIdEnv || !definition.clientSecretEnv) {
    throw new Error(`${definition.displayName} uses CalDAV setup instead of OAuth.`);
  }

  const clientId = process.env[definition.clientIdEnv];
  const clientSecret = process.env[definition.clientSecretEnv];

  if (!clientId || !clientSecret) {
    throw new Error(`${definition.displayName} OAuth is not configured.`);
  }

  return { clientId, clientSecret };
}

export function hashCalendarState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export function buildCalendarAuthorizationUrl(input: {
  provider: Exclude<CalendarProviderId, "apple">;
  state: string;
  redirectUri: string;
  codeChallenge?: string;
}) {
  const definition = getCalendarProviderDefinition(input.provider);
  const { clientId } = getCalendarProviderCredentials(input.provider);

  if (!definition.authorizationUrl) {
    throw new Error(`${definition.displayName} OAuth is not supported.`);
  }

  const url = new URL(definition.authorizationUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", definition.requiredScopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  if (input.provider === "outlook") {
    url.searchParams.delete("access_type");
  }

  return url.toString();
}
