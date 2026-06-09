import type { CalendarProvider } from "@/app/generated/prisma/enums";
import {
  getCalendarProviderByPrisma,
  getCalendarProviderCredentials,
  normalizeCalendarProviderError
} from "@/lib/calendar/calendar-providers";
import { toCalendarProviderApi } from "@/lib/calendar/calendar-records";

interface CalendarOAuthExchangeInput {
  provider: CalendarProvider;
  code: string;
  redirectUri: string;
}

export interface CalendarOAuthExchangeResult {
  providerAccountId: string;
  accountName: string;
  calendarName: string;
  accessToken: string;
  refreshToken?: string | null;
  scopes: string[];
  tokenExpiresAt?: Date | null;
}

export async function exchangeCalendarOAuthCode(input: CalendarOAuthExchangeInput): Promise<CalendarOAuthExchangeResult> {
  const definition = getCalendarProviderByPrisma(input.provider);

  if (!definition?.tokenUrl || !definition.accountUrl) {
    throw new Error(`Unsupported calendar provider: ${input.provider}`);
  }

  const providerId = toCalendarProviderApi(input.provider);
  const { clientId, clientSecret } = getCalendarProviderCredentials(providerId);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: input.code,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri
  });
  const response = await fetch(definition.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw normalizeCalendarProviderError({ status: response.status, body: payload });
  }

  const account = await fetchCalendarAccount(definition.accountUrl, payload.access_token, providerId);

  return {
    providerAccountId: account.id,
    accountName: account.name,
    calendarName: account.calendarName,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    scopes: payload.scope?.split(/[,\s]+/).filter(Boolean) ?? definition.requiredScopes,
    tokenExpiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000) : null
  };
}

async function fetchCalendarAccount(accountUrl: string, accessToken: string, provider: string) {
  const response = await fetch(accountUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = (await response.json()) as {
    id?: string;
    sub?: string;
    email?: string;
    mail?: string;
    userPrincipalName?: string;
    name?: string;
    displayName?: string;
  };

  if (!response.ok || (!payload.id && !payload.sub)) {
    throw normalizeCalendarProviderError({ status: response.status, body: payload });
  }

  const accountName = payload.email ?? payload.mail ?? payload.userPrincipalName ?? payload.name ?? payload.displayName ?? payload.id ?? payload.sub ?? provider;

  return {
    id: payload.id ?? payload.sub ?? accountName,
    name: accountName,
    calendarName: provider === "google" ? "Google Calendar" : "Outlook Calendar"
  };
}
