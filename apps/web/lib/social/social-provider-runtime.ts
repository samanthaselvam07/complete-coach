import type { SocialPostTarget } from "@/app/generated/prisma/client";
import type { SocialProvider } from "@/app/generated/prisma/enums";
import {
  getProviderCredentials,
  getSocialProviderByPrisma,
  normalizeSocialProviderError,
  sanitizeSocialProviderResponse
} from "@/lib/social/social-providers";
import { toSocialProviderApi } from "@/lib/social/social-records";

interface OAuthExchangeInput {
  provider: SocialProvider;
  code: string;
  redirectUri: string;
  codeVerifier?: string | null;
}

export interface OAuthExchangeResult {
  providerAccountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string | null;
  scopes: string[];
  tokenExpiresAt?: Date | null;
}

export interface SocialPublishResult {
  ok: boolean;
  retryable?: boolean;
  status?: number;
  code?: string;
  message?: string;
  providerPostId?: string;
  response?: unknown;
}

export async function exchangeOAuthCode(input: OAuthExchangeInput): Promise<OAuthExchangeResult> {
  const definition = getSocialProviderByPrisma(input.provider);

  if (!definition) {
    throw new Error(`Unsupported social provider: ${input.provider}`);
  }

  const providerId = toSocialProviderApi(input.provider);
  const { clientId, clientSecret } = getProviderCredentials(providerId);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: input.code,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri
  });

  if (input.codeVerifier) {
    body.set("code_verifier", input.codeVerifier);
  }

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
    error?: { message?: string };
  };

  if (!response.ok || !payload.access_token) {
    throw normalizeSocialProviderError({ status: response.status, body: payload });
  }

  const account = await fetchProviderAccount(definition.accountUrl, payload.access_token);

  return {
    providerAccountId: account.id,
    accountName: account.name,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    scopes: payload.scope?.split(/[,\s]+/).filter(Boolean) ?? definition.requiredScopes,
    tokenExpiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000) : null
  };
}

export async function publishSocialTarget(input: {
  target: SocialPostTarget & {
    post: { caption: string; media: unknown };
    connection: { encryptedAccessToken: string };
  };
  accessToken: string;
}): Promise<SocialPublishResult> {
  const provider = toSocialProviderApi(input.target.provider);

  if (process.env.SOCIAL_PROVIDER_MODE !== "live") {
    return {
      ok: true,
      status: 202,
      providerPostId: `${provider}_${input.target.id}`,
      response: { mode: "simulated", provider }
    };
  }

  try {
    const response = await postToProvider(provider, input.target.post.caption, input.accessToken);
    return {
      ok: true,
      status: 200,
      providerPostId: response.id,
      response: sanitizeSocialProviderResponse(response)
    };
  } catch (error) {
    return {
      ok: false,
      ...normalizeSocialProviderError(error)
    };
  }
}

async function fetchProviderAccount(accountUrl: string, accessToken: string) {
  const response = await fetch(accountUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = (await response.json()) as { id?: string; name?: string; username?: string };

  if (!response.ok || !payload.id) {
    throw normalizeSocialProviderError({ status: response.status, body: payload });
  }

  return {
    id: payload.id,
    name: payload.name ?? payload.username ?? payload.id
  };
}

async function postToProvider(provider: string, caption: string, accessToken: string) {
  const endpoint =
    provider === "x"
      ? "https://api.twitter.com/2/tweets"
      : "https://graph.facebook.com/v23.0/me/feed";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(provider === "x" ? { text: caption } : { message: caption })
  });
  const payload = (await response.json()) as { id?: string; error?: unknown };

  if (!response.ok || !payload.id) {
    throw { status: response.status, body: payload };
  }

  return payload;
}
