import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { z } from "zod";

import type { SocialProvider } from "@/app/generated/prisma/enums";
import type { CreateSocialPostInput } from "@/lib/social/social-records";

export type SocialProviderId = "instagram" | "facebook" | "x";

interface SocialProviderDefinition {
  id: SocialProviderId;
  prismaProvider: SocialProvider;
  displayName: string;
  authorizationUrl: string;
  tokenUrl: string;
  accountUrl: string;
  requiredScopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
}

export const socialProviderDefinitions: Record<SocialProviderId, SocialProviderDefinition> = {
  instagram: {
    id: "instagram",
    prismaProvider: "META_INSTAGRAM" as SocialProvider,
    displayName: "Instagram",
    authorizationUrl: "https://www.facebook.com/v23.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v23.0/oauth/access_token",
    accountUrl: "https://graph.facebook.com/v23.0/me/accounts",
    requiredScopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    clientIdEnv: "META_CLIENT_ID",
    clientSecretEnv: "META_CLIENT_SECRET"
  },
  facebook: {
    id: "facebook",
    prismaProvider: "META_FACEBOOK" as SocialProvider,
    displayName: "Facebook",
    authorizationUrl: "https://www.facebook.com/v23.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v23.0/oauth/access_token",
    accountUrl: "https://graph.facebook.com/v23.0/me/accounts",
    requiredScopes: ["pages_show_list", "pages_manage_posts", "pages_read_engagement"],
    clientIdEnv: "META_CLIENT_ID",
    clientSecretEnv: "META_CLIENT_SECRET"
  },
  x: {
    id: "x",
    prismaProvider: "X" as SocialProvider,
    displayName: "X",
    authorizationUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    accountUrl: "https://api.twitter.com/2/users/me",
    requiredScopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    clientIdEnv: "X_CLIENT_ID",
    clientSecretEnv: "X_CLIENT_SECRET"
  }
};

const sensitiveKeyPattern = /token|secret|authorization|password|client_secret/i;

export function getSocialProviderDefinition(provider: SocialProviderId) {
  return socialProviderDefinitions[provider];
}

export function getSocialProviderByPrisma(provider: SocialProvider) {
  return Object.values(socialProviderDefinitions).find((definition) => definition.prismaProvider === provider);
}

export function getProviderCredentials(provider: SocialProviderId) {
  const definition = getSocialProviderDefinition(provider);
  const clientId = process.env[definition.clientIdEnv];
  const clientSecret = process.env[definition.clientSecretEnv];

  if (!clientId || !clientSecret) {
    throw new Error(`${definition.displayName} OAuth is not configured.`);
  }

  return { clientId, clientSecret };
}

export function encryptSocialToken(token: string, secret: string) {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSocialToken(payload: string, secret: string) {
  const [version, iv, tag, encrypted] = payload.split(".");

  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Invalid social token payload.");
  }

  const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function hashSocialState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export function sanitizeSocialProviderResponse(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeSocialProviderResponse);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[REDACTED]" : sanitizeSocialProviderResponse(nested)
    ])
  );
}

export function normalizeSocialProviderError(error: unknown) {
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status: unknown }).status) : 500;
  const retryable = status === 429 || status >= 500;

  return {
    code: status === 429 ? "provider_rate_limited" : "provider_error",
    message: getProviderErrorMessage(error),
    status,
    retryable,
    response: sanitizeSocialProviderResponse(
      typeof error === "object" && error && "body" in error ? (error as { body: unknown }).body : error
    )
  };
}

export function validateSocialPostForProvider(provider: SocialProviderId, input: CreateSocialPostInput) {
  if (provider === "instagram" && input.media.length === 0) {
    throw new Error("Instagram requires at least one image or video.");
  }

  if (provider === "x" && input.caption.length > 280) {
    throw new Error("X posts must be 280 characters or fewer.");
  }
}

export function buildAuthorizationUrl(input: {
  provider: SocialProviderId;
  state: string;
  redirectUri: string;
  codeChallenge?: string;
}) {
  const definition = getSocialProviderDefinition(input.provider);
  const { clientId } = getProviderCredentials(input.provider);
  const url = new URL(definition.authorizationUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", definition.requiredScopes.join(" "));

  if (input.provider === "x") {
    url.searchParams.set("code_challenge", input.codeChallenge ?? input.state);
    url.searchParams.set("code_challenge_method", "plain");
  }

  return url.toString();
}

function deriveKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

function getProviderErrorMessage(error: unknown) {
  const parsed = z
    .object({
      body: z
        .object({
          error: z
            .object({
              message: z.string().optional()
            })
            .optional()
        })
        .optional()
    })
    .safeParse(error);

  return parsed.data?.body?.error?.message ?? "Social provider request failed.";
}
