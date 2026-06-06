import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  buildAuthorizationUrl,
  hashSocialState
} from "@/lib/social/social-providers";
import {
  socialProviderSchema,
  toSocialProvider
} from "@/lib/social/social-records";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1_000;

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "social:manage");
    const url = new URL(request.url);
    const provider = socialProviderSchema.parse(url.searchParams.get("provider"));
    const redirectTo = getSafeRedirect(url.searchParams.get("redirectTo"));
    const state = randomBytes(32).toString("base64url");
    const codeVerifier = randomBytes(32).toString("base64url");
    const redirectUri = new URL("/api/v1/social/connections/oauth/callback", url.origin).toString();

    await prisma.socialOAuthState.create({
      data: {
        organizationId: actor.organizationId,
        createdByUserId: actor.userId,
        provider: toSocialProvider(provider),
        stateHash: hashSocialState(state),
        codeVerifier,
        redirectTo,
        expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS)
      }
    });

    return NextResponse.redirect(
      buildAuthorizationUrl({
        provider,
        state,
        redirectUri,
        codeChallenge: codeVerifier
      }),
      302
    );
  } catch (error) {
    return handleApiError(error);
  }
}

function getSafeRedirect(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/social-media";
  }

  return value;
}
