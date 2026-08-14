import { z } from "zod";

export class StripeConfigurationError extends Error {
  constructor() {
    super("Stripe is not configured.");
    this.name = "StripeConfigurationError";
  }
}

export class StripeApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "StripeApiError";
  }
}

interface StripeConfig {
  secretKey: string;
  apiBaseUrl: string;
}

interface StripeAccount {
  id: string;
  details_submitted?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
}

interface StripeAccountLink {
  object: "account_link";
  created: number;
  expires_at: number;
  url: string;
}

interface StripeProduct {
  id: string;
}

interface StripePrice {
  id: string;
}

interface StripeCustomer {
  id: string;
}

interface StripeCheckoutSession {
  id: string;
  url: string | null;
}

interface StripeList<T> {
  data: T[];
  has_more: boolean;
}

export interface StripeBalanceTransaction {
  id: string;
  amount: number;
  fee: number;
  net: number;
  currency: string;
  created: number;
  type: string;
  reporting_category?: string;
}

export interface StripeBalance {
  available: Array<{ amount: number; currency: string }>;
  pending: Array<{ amount: number; currency: string }>;
}

export const stripeAccountLinkSchema = z.object({
  returnUrl: z.string().trim().min(1).refine(isSafeRedirectUrl, "Must be an absolute URL or safe relative path.").optional(),
  refreshUrl: z.string().trim().min(1).refine(isSafeRedirectUrl, "Must be an absolute URL or safe relative path.").optional()
});

export type StripeAccountLinkInput = z.infer<typeof stripeAccountLinkSchema>;

export function getStripeConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new StripeConfigurationError();
  }

  return {
    secretKey,
    apiBaseUrl: process.env.STRIPE_API_BASE_URL ?? "https://api.stripe.com"
  };
}

export async function createConnectedAccount(config: StripeConfig, input: { organizationId: string; email?: string }) {
  const account = await postStripeForm<StripeAccount>(config, "/v1/accounts", {
    type: "standard",
    email: input.email,
    "capabilities[card_payments][requested]": "true",
    "capabilities[transfers][requested]": "true",
    "metadata[organization_id]": input.organizationId
  });

  return {
    accountId: account.id,
    status: deriveConnectStatus(account)
  };
}

export async function createAccountLink(
  config: StripeConfig,
  input: { accountId: string; returnUrl: string; refreshUrl: string }
) {
  return postStripeForm<StripeAccountLink>(config, "/v1/account_links", {
    account: input.accountId,
    return_url: input.returnUrl,
    refresh_url: input.refreshUrl,
    type: "account_onboarding"
  });
}

export async function retrieveConnectedAccount(config: StripeConfig, accountId: string) {
  return getStripe<StripeAccount>(config, `/v1/accounts/${encodeURIComponent(accountId)}`);
}

export async function retrieveConnectedBalance(config: StripeConfig, accountId: string) {
  return getStripe<StripeBalance>(config, "/v1/balance", { accountId });
}

export async function listConnectedBalanceTransactions(
  config: StripeConfig,
  input: { accountId: string; createdGte: number; createdLte: number }
) {
  const transactions: StripeBalanceTransaction[] = [];
  let startingAfter: string | undefined;

  do {
    const params = new URLSearchParams({
      limit: "100",
      "created[gte]": String(input.createdGte),
      "created[lte]": String(input.createdLte)
    });

    if (startingAfter) {
      params.set("starting_after", startingAfter);
    }

    const page = await getStripe<StripeList<StripeBalanceTransaction>>(
      config,
      `/v1/balance_transactions?${params.toString()}`,
      { accountId: input.accountId }
    );

    transactions.push(...page.data);
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (startingAfter);

  return transactions;
}

export async function createStripeProduct(
  config: StripeConfig,
  input: { organizationId: string; packageId: string; accountId: string; name: string; description?: string | null }
) {
  return postStripeForm<StripeProduct>(
    config,
    "/v1/products",
    {
      name: input.name,
      description: input.description ?? undefined,
      "metadata[organization_id]": input.organizationId,
      "metadata[package_id]": input.packageId
    },
    { accountId: input.accountId }
  );
}

export async function createStripePrice(
  config: StripeConfig,
  input: {
    organizationId: string;
    packageId: string;
    accountId: string;
    productId: string;
    unitAmount: number;
    currency: string;
    recurringInterval?: "day" | "week" | "month" | "year";
    recurringIntervalCount?: number;
  }
) {
  return postStripeForm<StripePrice>(
    config,
    "/v1/prices",
    {
      product: input.productId,
      unit_amount: String(input.unitAmount),
      currency: input.currency,
      ...(input.recurringInterval ? { "recurring[interval]": input.recurringInterval } : {}),
      ...(input.recurringInterval && input.recurringIntervalCount && input.recurringIntervalCount > 1
        ? { "recurring[interval_count]": String(input.recurringIntervalCount) }
        : {}),
      "metadata[organization_id]": input.organizationId,
      "metadata[package_id]": input.packageId
    },
    { accountId: input.accountId }
  );
}

export async function createStripeCustomer(
  config: StripeConfig,
  input: { organizationId: string; clientId: string; accountId: string; email?: string | null; name: string }
) {
  return postStripeForm<StripeCustomer>(
    config,
    "/v1/customers",
    {
      email: input.email ?? undefined,
      name: input.name,
      "metadata[organization_id]": input.organizationId,
      "metadata[client_id]": input.clientId
    },
    { accountId: input.accountId }
  );
}

export async function createStripeCheckoutSession(
  config: StripeConfig,
  input: {
    organizationId: string;
    clientId: string;
    packageId: string;
    subscriptionId: string;
    customerId: string;
    priceId: string;
    connectedAccountId: string;
    successUrl: string;
    cancelUrl: string;
  }
) {
  return postStripeForm<StripeCheckoutSession>(
    config,
    "/v1/checkout/sessions",
    {
      mode: "subscription",
      customer: input.customerId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.clientId,
      "line_items[0][price]": input.priceId,
      "line_items[0][quantity]": "1",
      "metadata[organization_id]": input.organizationId,
      "metadata[client_id]": input.clientId,
      "metadata[package_id]": input.packageId,
      "metadata[subscription_id]": input.subscriptionId,
      "subscription_data[metadata][organization_id]": input.organizationId,
      "subscription_data[metadata][client_id]": input.clientId,
      "subscription_data[metadata][package_id]": input.packageId,
      "subscription_data[metadata][subscription_id]": input.subscriptionId
    },
    { accountId: input.connectedAccountId }
  );
}

export async function pauseStripeSubscriptionCollection(
  config: StripeConfig,
  input: {
    connectedAccountId: string;
    subscriptionId: string;
    resumeAt: Date;
  }
) {
  return postStripeForm<{ id: string }>(
    config,
    `/v1/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
    {
      "pause_collection[behavior]": "void",
      "pause_collection[resumes_at]": String(Math.floor(input.resumeAt.getTime() / 1000))
    },
    { accountId: input.connectedAccountId }
  );
}

export function deriveConnectStatus(account: StripeAccount) {
  if (account.charges_enabled && account.payouts_enabled) {
    return "active";
  }

  if (account.details_submitted) {
    return "pending-review";
  }

  return "onboarding-required";
}

export function buildDefaultConnectReturnUrls(requestUrl: string) {
  const origin = new URL(requestUrl).origin;

  return {
    returnUrl: `${origin}/packages?stripe_connect=return`,
    refreshUrl: `${origin}/packages?stripe_connect=refresh`
  };
}

export function resolveConnectRedirectUrl(requestUrl: string, value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (value.startsWith("/")) {
    return new URL(value, new URL(requestUrl).origin).toString();
  }

  return value;
}

async function postStripeForm<T>(
  config: StripeConfig,
  path: string,
  fields: Record<string, string | undefined>,
  options?: { accountId?: string }
) {
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
      "Content-Type": "application/x-www-form-urlencoded",
      ...(options?.accountId ? { "Stripe-Account": options.accountId } : {})
    },
    body
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new StripeApiError(getStripeErrorMessage(payload), response.status);
  }

  return payload as T;
}

async function getStripe<T>(config: StripeConfig, path: string, options?: { accountId?: string }) {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString("base64")}`,
      ...(options?.accountId ? { "Stripe-Account": options.accountId } : {})
    }
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
