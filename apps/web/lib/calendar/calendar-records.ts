import { z } from "zod";

import {
  CalendarConnectionScope,
  CalendarConnectionStatus,
  CalendarProvider
} from "@/app/generated/prisma/enums";

export const calendarProviderValues = ["apple", "google", "outlook"] as const;
export const calendarConnectionScopeValues = ["organization", "coach"] as const;

export const calendarProviderSchema = z.enum(calendarProviderValues);
export const calendarConnectionScopeSchema = z.enum(calendarConnectionScopeValues);

export const calendarConnectionListQuerySchema = z.object({
  scope: calendarConnectionScopeSchema.default("coach")
});

export const createAppleCalendarConnectionSchema = z.object({
  scope: calendarConnectionScopeSchema.default("coach")
});

export type CalendarProviderId = (typeof calendarProviderValues)[number];
export type CalendarConnectionScopeId = (typeof calendarConnectionScopeValues)[number];

const providerToApi = {
  [CalendarProvider.APPLE]: "apple",
  [CalendarProvider.GOOGLE]: "google",
  [CalendarProvider.OUTLOOK]: "outlook"
} as const;

const apiToProvider = {
  apple: CalendarProvider.APPLE,
  google: CalendarProvider.GOOGLE,
  outlook: CalendarProvider.OUTLOOK
} as const;

const scopeToApi = {
  [CalendarConnectionScope.ORGANIZATION]: "organization",
  [CalendarConnectionScope.COACH]: "coach"
} as const;

const apiToScope = {
  organization: CalendarConnectionScope.ORGANIZATION,
  coach: CalendarConnectionScope.COACH
} as const;

const statusToApi = {
  [CalendarConnectionStatus.PENDING]: "pending",
  [CalendarConnectionStatus.ACTIVE]: "active",
  [CalendarConnectionStatus.REVOKED]: "revoked",
  [CalendarConnectionStatus.ERROR]: "error"
} as const;

export function toCalendarProvider(value: CalendarProviderId) {
  return apiToProvider[value];
}

export function toCalendarProviderApi(provider: CalendarProvider) {
  return providerToApi[provider];
}

export function toCalendarScope(value: CalendarConnectionScopeId) {
  return apiToScope[value];
}

export function toCalendarScopeApi(scope: CalendarConnectionScope) {
  return scopeToApi[scope];
}

export function serializeCalendarConnection(connection: {
  id: string;
  provider: CalendarProvider;
  scope: CalendarConnectionScope;
  providerAccountId: string;
  accountName: string;
  calendarName: string | null;
  scopes: string[];
  status: CalendarConnectionStatus;
  tokenExpiresAt: Date | null;
  connectedAt: Date;
  revokedAt: Date | null;
  lastError: string | null;
}) {
  return {
    id: connection.id,
    provider: providerToApi[connection.provider],
    scope: scopeToApi[connection.scope],
    providerAccountId: connection.providerAccountId,
    accountName: connection.accountName,
    calendarName: connection.calendarName,
    scopes: connection.scopes,
    status: statusToApi[connection.status],
    tokenExpiresAt: connection.tokenExpiresAt?.toISOString() ?? null,
    connectedAt: connection.connectedAt.toISOString(),
    revokedAt: connection.revokedAt?.toISOString() ?? null,
    lastError: connection.lastError
  };
}
