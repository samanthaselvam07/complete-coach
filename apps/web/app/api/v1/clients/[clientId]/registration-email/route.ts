import { ClientSubscriptionStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  buildClientOnboardingUrl,
  generateClientOnboardingToken,
  getClientOnboardingExpiry,
  getClientOnboardingIdentifier,
  hashClientOnboardingToken,
  sendClientOnboardingEmail
} from "@/lib/clients/client-onboarding";
import { prisma } from "@/lib/db/prisma";
import { createClientSubscriptionCheckout } from "@/lib/payments/client-subscription-checkout";
import { StripeApiError, StripeConfigurationError } from "@/lib/payments/stripe-connect";

interface ClientRegistrationEmailContext {
  params: Promise<{ clientId: string }>;
}

export async function POST(request: Request, context: ClientRegistrationEmailContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    if (!client.email) {
      return errorResponse("client_email_required", "Client email is required to resend registration.", 422);
    }

    const token = generateClientOnboardingToken();
    const identifier = getClientOnboardingIdentifier(client.id);
    const expires = getClientOnboardingExpiry();
    const setupUrl = buildClientOnboardingUrl(request.url, token);
    const paymentRequired = Boolean(client.requiresOnlinePayment && client.packageId);
    const paidSubscription = paymentRequired
      ? await prisma.clientSubscription.findFirst({
          where: {
            organizationId: actor.organizationId,
            clientId: client.id,
            packageId: client.packageId ?? undefined,
            status: { in: [ClientSubscriptionStatus.ACTIVE, ClientSubscriptionStatus.TRIALING] }
          },
          orderBy: { updatedAt: "desc" }
        })
      : null;
    let checkoutUrl: string | undefined;
    let subscriptionId: string | null = null;

    if (paymentRequired && !paidSubscription && client.packageId) {
      const checkout = await createClientSubscriptionCheckout({
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        clientId: client.id,
        packageId: client.packageId,
        requestUrl: request.url,
        successUrl: `${setupUrl}?payment=success`,
        cancelUrl: `${setupUrl}?payment=cancelled`
      });

      if ("response" in checkout) {
        return checkout.response;
      }

      checkoutUrl = checkout.checkoutUrl;
      subscriptionId = checkout.subscription.id;
    }

    await prisma.verificationToken.deleteMany({
      where: { identifier }
    });
    await prisma.verificationToken.create({
      data: {
        identifier,
        token: hashClientOnboardingToken(token),
        expires
      }
    });

    const organization = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: { name: true }
    });

    await sendClientOnboardingEmail({
      organizationId: actor.organizationId,
      organizationName: organization?.name ?? "Complete Coach",
      clientEmail: client.email,
      clientName: `${client.firstName} ${client.lastName}`.trim(),
      setupUrl,
      checkoutUrl,
      packageName: client.packageName
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.registration_email_resent",
        targetType: "client",
        targetId: client.id,
        metadata: {
          requiresPayment: Boolean(checkoutUrl),
          subscriptionId
        }
      }
    });

    return dataResponse({
      emailSent: true,
      expiresAt: expires.toISOString(),
      requiresPayment: Boolean(checkoutUrl),
      subscriptionId
    });
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      return errorResponse("stripe_unconfigured", "Stripe is not configured.", 503);
    }

    if (error instanceof StripeApiError) {
      return errorResponse("stripe_request_failed", "Stripe request failed.", 502, {
        status: error.status,
        message: error.message
      });
    }

    return handleApiError(error);
  }
}
