import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  buildCalendarAuthorizationUrl,
  hashCalendarState
} from "@/lib/calendar/calendar-providers";
import {
  calendarConnectionScopeSchema,
  calendarProviderSchema,
  toCalendarProvider,
  toCalendarScope
} from "@/lib/calendar/calendar-records";
import { prisma } from "@/lib/db/prisma";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1_000;

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "calendar:manage");
    const url = new URL(request.url);
    const provider = calendarProviderSchema.parse(url.searchParams.get("provider"));
    const scopeValue = calendarConnectionScopeSchema.parse(url.searchParams.get("scope") ?? "coach");
    const redirectTo = getSafeRedirect(url.searchParams.get("redirectTo"));

    if (provider === "apple") {
      return errorResponse("unsupported_oauth_provider", "Apple Calendar uses CalDAV setup instead of OAuth.", 422);
    }

    if (scopeValue === "organization" && !["owner", "admin"].includes(actor.role)) {
      return errorResponse("forbidden", "Only owners and admins can manage organisation calendar connections.", 403);
    }

    const state = randomBytes(32).toString("base64url");
    const redirectUri = new URL("/api/v1/calendar/connections/oauth/callback", url.origin).toString();

    await prisma.calendarOAuthState.create({
      data: {
        organizationId: actor.organizationId,
        createdByUserId: actor.userId,
        provider: toCalendarProvider(provider),
        scope: toCalendarScope(scopeValue),
        stateHash: hashCalendarState(state),
        redirectTo,
        expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS)
      }
    });

    return NextResponse.redirect(
      buildCalendarAuthorizationUrl({
        provider,
        state,
        redirectUri
      }),
      302
    );
  } catch (error) {
    return handleApiError(error);
  }
}

function getSafeRedirect(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/settings";
  }

  return value;
}
