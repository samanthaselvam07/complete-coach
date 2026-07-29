import { randomUUID } from "node:crypto";

import { ClientSubscriptionStatus, PackageStatus } from "@/app/generated/prisma/enums";
import { errorResponse } from "@/lib/api/responses";
import { prisma } from "@/lib/db/prisma";
import { isRecurringPackage } from "@/lib/payments/package-records";
import { serializeClientSubscription } from "@/lib/payments/subscription-records";
import {
  buildDefaultConnectReturnUrls,
  createStripeCheckoutSession,
  createStripeCustomer,
  getStripeConfig
} from "@/lib/payments/stripe-connect";

interface CreateClientSubscriptionCheckoutInput {
  organizationId: string;
  actorUserId: string;
  clientId: string;
  packageId: string;
  requestUrl: string;
  successUrl?: string;
  cancelUrl?: string;
}

type ClientSubscriptionCheckoutResult =
  | {
      response: Response;
    }
  | {
      subscription: { id: string };
      serializedSubscription: ReturnType<typeof serializeClientSubscription>;
      checkoutUrl: string;
    };

export async function createClientSubscriptionCheckout(
  input: CreateClientSubscriptionCheckoutInput
): Promise<ClientSubscriptionCheckoutResult> {
  const config = getStripeConfig();
  const [organization, client, coachingPackage, existingCustomerSubscription] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: {
        id: true,
        stripeConnectAccountId: true
      }
    }),
    prisma.client.findFirst({
      where: {
        id: input.clientId,
        organizationId: input.organizationId,
        deletedAt: null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    }),
    prisma.coachingPackage.findFirst({
      where: {
        id: input.packageId,
        organizationId: input.organizationId,
        deletedAt: null,
        status: PackageStatus.ACTIVE
      }
    }),
    prisma.clientSubscription.findFirst({
      where: {
        organizationId: input.organizationId,
        clientId: input.clientId,
        stripeCustomerId: { not: null }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  if (!organization) {
    return { response: errorResponse("not_found", "Organization not found.", 404) };
  }

  if (!organization.stripeConnectAccountId) {
    return {
      response: errorResponse("stripe_connect_required", "Stripe Connect onboarding is required before creating subscriptions.", 409)
    };
  }

  if (!client) {
    return { response: errorResponse("not_found", "Client not found.", 404) };
  }

  if (!coachingPackage) {
    return { response: errorResponse("not_found", "Package not found.", 404) };
  }

  if (!isRecurringPackage(coachingPackage)) {
    return { response: errorResponse("invalid_package", "Only recurring packages can create client subscriptions.", 422) };
  }

  if (!coachingPackage.stripePriceId) {
    return { response: errorResponse("stripe_price_required", "Package must be synced to Stripe before subscription creation.", 409) };
  }

  const subscriptionId = randomUUID();
  const customerId =
    existingCustomerSubscription?.stripeCustomerId ??
    (
      await createStripeCustomer(config, {
        organizationId: input.organizationId,
        clientId: client.id,
        accountId: organization.stripeConnectAccountId,
        email: client.email,
        name: `${client.firstName} ${client.lastName}`
      })
    ).id;
  const defaults = buildDefaultConnectReturnUrls(input.requestUrl);
  const checkoutSession = await createStripeCheckoutSession(config, {
    organizationId: input.organizationId,
    clientId: client.id,
    packageId: coachingPackage.id,
    subscriptionId,
    customerId,
    priceId: coachingPackage.stripePriceId,
    connectedAccountId: organization.stripeConnectAccountId,
    successUrl: input.successUrl ?? defaults.returnUrl,
    cancelUrl: input.cancelUrl ?? defaults.refreshUrl
  });

  if (!checkoutSession.url) {
    return { response: errorResponse("stripe_checkout_unavailable", "Stripe did not return a checkout URL.", 502) };
  }

  const subscription = await prisma.clientSubscription.create({
    data: {
      id: subscriptionId,
      organizationId: input.organizationId,
      clientId: client.id,
      packageId: coachingPackage.id,
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: checkoutSession.id,
      status: ClientSubscriptionStatus.INCOMPLETE
    },
    include: {
      client: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      },
      coachingPackage: {
        select: {
          name: true,
          priceAmount: true,
          currency: true
        }
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "client_subscription.checkout_created",
      targetType: "client_subscription",
      targetId: subscription.id,
      metadata: {
        clientId: client.id,
        packageId: coachingPackage.id,
        stripeCheckoutSessionId: checkoutSession.id
      }
    }
  });

  return {
    subscription,
    serializedSubscription: serializeClientSubscription(subscription),
    checkoutUrl: checkoutSession.url
  };
}
