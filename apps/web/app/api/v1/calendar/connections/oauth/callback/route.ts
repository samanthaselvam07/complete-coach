import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  encryptCalendarToken,
  hashCalendarState
} from "@/lib/calendar/calendar-providers";
import { exchangeCalendarOAuthCode } from "@/lib/calendar/calendar-provider-runtime";
import {
  toCalendarProviderApi,
  toCalendarScopeApi
} from "@/lib/calendar/calendar-records";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "calendar:manage");
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");

    if (!state || !code) {
      return redirectToPath("/settings?calendarError=oauth_missing_code");
    }

    const oauthState = await prisma.calendarOAuthState.findFirst({
      where: {
        stateHash: hashCalendarState(state),
        organizationId: actor.organizationId,
        createdByUserId: actor.userId,
        consumedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!oauthState) {
      return redirectToPath("/settings?calendarError=oauth_state_invalid");
    }

    const providerPayload = await exchangeCalendarOAuthCode({
      provider: oauthState.provider,
      code,
      redirectUri: new URL("/api/v1/calendar/connections/oauth/callback", url.origin).toString()
    });
    const authSecret = getAuthSecret();
    const provider = toCalendarProviderApi(oauthState.provider);
    const scope = toCalendarScopeApi(oauthState.scope);
    const connection = await prisma.calendarConnection.upsert({
      where: {
        organizationId_scope_provider_providerAccountId_createdByUserId: {
          organizationId: actor.organizationId,
          scope: oauthState.scope,
          provider: oauthState.provider,
          providerAccountId: providerPayload.providerAccountId,
          createdByUserId: actor.userId
        }
      },
      create: {
        organizationId: actor.organizationId,
        createdByUserId: actor.userId,
        provider: oauthState.provider,
        scope: oauthState.scope,
        providerAccountId: providerPayload.providerAccountId,
        accountName: providerPayload.accountName,
        calendarName: providerPayload.calendarName,
        scopes: providerPayload.scopes,
        encryptedAccessToken: encryptCalendarToken(providerPayload.accessToken, authSecret),
        encryptedRefreshToken: providerPayload.refreshToken
          ? encryptCalendarToken(providerPayload.refreshToken, authSecret)
          : null,
        tokenExpiresAt: providerPayload.tokenExpiresAt ?? null
      },
      update: {
        accountName: providerPayload.accountName,
        calendarName: providerPayload.calendarName,
        scopes: providerPayload.scopes,
        encryptedAccessToken: encryptCalendarToken(providerPayload.accessToken, authSecret),
        encryptedRefreshToken: providerPayload.refreshToken
          ? encryptCalendarToken(providerPayload.refreshToken, authSecret)
          : null,
        tokenExpiresAt: providerPayload.tokenExpiresAt ?? null,
        status: "ACTIVE",
        lastError: null,
        revokedAt: null,
        connectedAt: new Date()
      }
    });

    await prisma.calendarOAuthState.update({
      where: { id: oauthState.id, organizationId: actor.organizationId },
      data: { consumedAt: new Date() }
    });
    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "calendar.connection.created",
        targetType: "calendar_connection",
        targetId: connection.id,
        metadata: {
          provider,
          scope,
          accountName: providerPayload.accountName,
          calendarName: providerPayload.calendarName,
          scopes: providerPayload.scopes
        }
      }
    });

    return redirectToPath(`${oauthState.redirectTo ?? "/settings"}?calendarConnected=${provider}`);
  } catch (error) {
    return handleApiError(error);
  }
}

function redirectToPath(path: string) {
  return new NextResponse(null, {
    status: 302,
    headers: { Location: path }
  });
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Invalid server environment: AUTH_SECRET");
  }

  return secret;
}
