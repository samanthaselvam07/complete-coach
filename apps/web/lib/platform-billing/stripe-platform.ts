import { z } from "zod";

import { StripeApiError, StripeConfigurationError } from "@/lib/payments/stripe-connect";
import type { PlatformPlan } from "@/lib/platform-billing/plans";

interface StripeConfig {
  secretKey: string;
  apiBaseUrl: string;
}

interface StripeCustomer {
  id: string;
}

interface StripeCheckoutSession {
  id: string;
  url: string | null;
}

interface StripePortalSession {
  id: string;
  url: string;
}

export const platformCheckoutSchema = z.object({
  planId: z.enum(["design_partner", "core", "pro", "scale"]),
  successUrl: z.string().trim().min(1).refine(isSafeRedirectUrl, "Must be an absolute URL or safe relative path.").optional(),
  cancelUrl: z.string().trim().min(1).refine(isSafeRedirectUrl, "Must be an absolute URL or safe relative path.").optional()
});

export const platformPortalSchema = z.object({
  returnUrl: z.string().trim().min(1).refine(isSafeRedirectUrl, "Must be an absolute URL or safe relative path.").optional()
});

export type PlatformCheckoutInput = z.infer<typeof platformCheckoutSchema>;
export type PlatformPortalInput = z.infer<typeof platformPortalSchema>;

export function getPlatformStripeConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new StripeConfigurationError();
  }

  return {
    secretKey,
    apiBaseUrl: process.env.STRIPE_API_BASE_URL ?? "https://api.stripe.com"
  };
}

export async function createPlatformCustomer(
  config: StripeConfig,
  input: { organizationId: string; organizationName: string; email?: string | null }
) {
  return postStripeForm<StripeCustomer>(config, "/v1/customers", {
    name: input.organizationName,
    email: input.email ?? undefined,
    "metadata[organization_id]": input.organizationId,
    "metadata[billing_type]": "platform_subscription"
  });
}

export async function createPlatformCheckoutSession(
  config: StripeConfig,
  input: {
    organizationId: string;
    customerId: string;
    plan: PlatformPlan;
    successUrl: string;
    cancelUrl: string;
  }
) {
  return postStripeForm<StripeCheckoutSession>(config, "/v1/checkout/sessions", {
    mode: "subscription",
    customer: input.customerId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.organizationId,
    "line_items[0][price]": input.plan.stripePriceId,
    "line_items[0][quantity]": "1",
    "metadata[billing_type]": "platform_subscription",
    "metadata[organization_id]": input.organizationId,
    "metadata[platform_plan]": input.plan.id,
    "subscription_data[metadata][billing_type]": "platform_subscription",
    "subscription_data[metadata][organization_id]": input.organizationId,
    "subscription_data[metadata][platform_plan]": input.plan.id
  });
}

export async function createPlatformPortalSession(
  config: StripeConfig,
  input: { customerId: string; returnUrl: string }
) {
  return postStripeForm<StripePortalSession>(config, "/v1/billing_portal/sessions", {
    customer: input.customerId,
    return_url: input.returnUrl
  });
}

export function resolvePlatformRedirectUrl(requestUrl: string, value: string | undefined, fallbackPath: string) {
  if (!value) {
    return new URL(fallbackPath, new URL(requestUrl).origin).toString();
  }

  if (value.startsWith("/")) {
    return new URL(value, new URL(requestUrl).origin).toString();
  }

  return value;
}

async function postStripeForm<T>(config: StripeConfig, path: string, fields: Record<string, string | undefined>) {
  const body = new URLSearchParams();

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) {
      body.set(key, value);
    }
  });

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new StripeApiError(getStripeErrorMessage(payload), response.status);
  }

  return payload as T;
}

function isSafeRedirectUrl(value: string) {
  if (value.startsWith("/")) {
    return !value.startsWith("//");
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function getStripeErrorMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as { error?: { message?: unknown } }).error?.message === "string"
  ) {
    return (payload as { error: { message: string } }).error.message;
  }

  return "Stripe request failed.";
}
