import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  encryptSocialToken,
  hashSocialState
} from "@/lib/social/social-providers";
import { exchangeOAuthCode } from "@/lib/social/social-provider-runtime";
import { toSocialProviderApi } from "@/lib/social/social-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "social:manage");
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");

    if (!state || !code) {
      return redirectToPath("/social-media?socialError=oauth_missing_code");
    }

    const oauthState = await prisma.socialOAuthState.findFirst({
      where: {
        stateHash: hashSocialState(state),
        organizationId: actor.organizationId,
        createdByUserId: actor.userId,
        consumedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!oauthState) {
      return redirectToPath("/social-media?socialError=oauth_state_invalid");
    }

    const providerPayload = await exchangeOAuthCode({
      provider: oauthState.provider,
      code,
      codeVerifier: oauthState.codeVerifier,
      redirectUri: new URL("/api/v1/social/connections/oauth/callback", url.origin).toString()
    });
    const authSecret = getAuthSecret();
    const provider = toSocialProviderApi(oauthState.provider);
    const connection = await prisma.socialConnection.upsert({
      where: {
        organizationId_provider_providerAccountId: {
          organizationId: actor.organizationId,
          provider: oauthState.provider,
          providerAccountId: providerPayload.providerAccountId
        }
      },
      create: {
        organizationId: actor.organizationId,
        createdByUserId: actor.userId,
        provider: oauthState.provider,
        providerAccountId: providerPayload.providerAccountId,
        accountName: providerPayload.accountName,
        scopes: providerPayload.scopes,
        encryptedAccessToken: encryptSocialToken(providerPayload.accessToken, authSecret),
        encryptedRefreshToken: providerPayload.refreshToken
          ? encryptSocialToken(providerPayload.refreshToken, authSecret)
          : null,
        tokenExpiresAt: providerPayload.tokenExpiresAt ?? null
      },
      update: {
        accountName: providerPayload.accountName,
        scopes: providerPayload.scopes,
        encryptedAccessToken: encryptSocialToken(providerPayload.accessToken, authSecret),
        encryptedRefreshToken: providerPayload.refreshToken
          ? encryptSocialToken(providerPayload.refreshToken, authSecret)
          : null,
        tokenExpiresAt: providerPayload.tokenExpiresAt ?? null,
        status: "ACTIVE",
        lastError: null,
        revokedAt: null,
        connectedAt: new Date()
      }
    });

    await prisma.socialOAuthState.update({
      where: { id: oauthState.id, organizationId: actor.organizationId },
      data: { consumedAt: new Date() }
    });
    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "social.connection.created",
        targetType: "social_connection",
        targetId: connection.id,
        metadata: {
          provider,
          accountName: providerPayload.accountName,
          scopes: providerPayload.scopes
        }
      }
    });

    return redirectToPath(`${oauthState.redirectTo ?? "/social-media"}?socialConnected=${provider}`);
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
