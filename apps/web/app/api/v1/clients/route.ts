import { MembershipRole, MembershipStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  buildClientOnboardingUrl,
  generateClientOnboardingToken,
  getClientOnboardingExpiry,
  getClientOnboardingIdentifier,
  hashClientOnboardingToken,
  sendClientOnboardingEmail
} from "@/lib/clients/client-onboarding";
import {
  buildClientWhere,
  clientListQuerySchema,
  createClientSchema,
  getClientCreateData,
  getClientProfileCreateData,
  serializeClient
} from "@/lib/clients/client-records";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { createClientSubscriptionCheckout } from "@/lib/payments/client-subscription-checkout";
import { assertPlatformClientCapacity, PlatformLimitError } from "@/lib/platform-billing/limits";
import { StripeApiError, StripeConfigurationError } from "@/lib/payments/stripe-connect";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const query = clientListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const where = buildClientWhere(actor.organizationId, query);
    const clients = await prisma.client.findMany({
      where: canViewAllClients(actor.role)
        ? where
        : {
            ...where,
            primaryCoachUserId: actor.userId
          },
      include: {
        primaryCoach: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: query.limit
    });

    return dataResponse(clients.map(serializeClient));
  } catch (error) {
    return handleApiError(error);
  }
}

function canViewAllClients(role: string) {
  return role === "owner" || role === "admin";
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const input = createClientSchema.parse(await request.json());
    const requiresOnlinePayment = input.onboarding?.needsPayment === true && input.onboarding.paymentMode === "payment-link";

    if (requiresOnlinePayment && !input.email) {
      return errorResponse("client_email_required", "Client email is required to send an online payment setup link.", 422);
    }

    if (requiresOnlinePayment && !input.packageId) {
      return errorResponse("client_package_required", "Select a package before sending an online payment setup link.", 422);
    }

    if (input.primaryCoachUserId) {
      const primaryCoachError = await validatePrimaryCoachAssignment(actor, input.primaryCoachUserId);

      if (primaryCoachError) {
        return primaryCoachError;
      }
    }

    await assertPlatformClientCapacity(actor.organizationId);
    const client = await prisma.$transaction(async (tx) => {
      const createdClient = await tx.client.create({
        data: getClientCreateData(actor.organizationId, {
          ...input,
          primaryCoachUserId: input.primaryCoachUserId ?? actor.userId
        })
      });

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "client.created",
          targetType: "client",
          targetId: createdClient.id,
          metadata: {
            status: input.status,
            onboarding: input.onboarding
          }
        }
      });

      return createdClient;
    });
    const profileCreateData = getClientProfileCreateData(actor.organizationId, client.id, input);

    if (profileCreateData) {
      try {
        await prisma.clientProfile.upsert({
          where: { clientId: client.id },
          create: profileCreateData,
          update: { dateOfBirth: profileCreateData.dateOfBirth }
        });
      } catch {
        // Onboarding profile fields are optional; never roll back the roster record because profile metadata failed.
      }
    }

    const onboarding = client.email
      ? await createAndSendClientOnboarding({
          actor,
          client,
          requestUrl: request.url,
          packageId: requiresOnlinePayment ? input.packageId : undefined,
          packageName: input.packageName
        })
      : null;

    if (onboarding && "response" in onboarding) {
      return onboarding.response;
    }

    return dataResponse(
      {
        ...serializeClient(client),
        onboarding
      },
      {
      status: 201,
      headers: { Location: `/api/v1/clients/${client.id}` }
      }
    );
  } catch (error) {
    if (error instanceof PlatformLimitError) {
      return errorResponse(error.code, error.message, 409, { limit: error.limit });
    }

    if (isUniqueClientEmailError(error)) {
      return errorResponse("client_email_exists", "A client with this email already exists.", 409);
    }

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

type ClientOnboardingResult =
  | {
      response: Response;
    }
  | {
      emailSent: true;
      requiresPayment: boolean;
      checkoutUrl: string | null;
      subscriptionId: string | null;
    }
  | null;

async function createAndSendClientOnboarding(input: {
  actor: { organizationId: string; userId: string };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  requestUrl: string;
  packageId?: string;
  packageName?: string | null;
}): Promise<ClientOnboardingResult> {
  if (!input.client.email) {
    return null;
  }

  const token = generateClientOnboardingToken();
  const tokenHash = hashClientOnboardingToken(token);
  const identifier = getClientOnboardingIdentifier(input.client.id);
  const setupUrl = buildClientOnboardingUrl(input.requestUrl, token);
  let checkoutUrl: string | undefined;
  let subscriptionId: string | undefined;

  await prisma.verificationToken.deleteMany({
    where: { identifier }
  });

  if (input.packageId) {
    const checkout = await createClientSubscriptionCheckout({
      organizationId: input.actor.organizationId,
      actorUserId: input.actor.userId,
      clientId: input.client.id,
      packageId: input.packageId,
      requestUrl: input.requestUrl,
      successUrl: `${setupUrl}?payment=success`,
      cancelUrl: `${setupUrl}?payment=cancelled`
    });

    if ("response" in checkout) {
      return { response: checkout.response };
    }

    checkoutUrl = checkout.checkoutUrl;
    subscriptionId = checkout.subscription.id;
  }

  await prisma.verificationToken.create({
    data: {
      identifier,
      token: tokenHash,
      expires: getClientOnboardingExpiry()
    }
  });

  const organization = await prisma.organization.findUnique({
    where: { id: input.actor.organizationId },
    select: { name: true }
  });

  await sendClientOnboardingEmail({
    organizationId: input.actor.organizationId,
    organizationName: organization?.name ?? "Complete Coach",
    clientEmail: input.client.email,
    clientName: `${input.client.firstName} ${input.client.lastName}`.trim(),
    setupUrl,
    checkoutUrl,
    packageName: input.packageName
  });

  return {
    emailSent: true,
    requiresPayment: Boolean(checkoutUrl),
    checkoutUrl: checkoutUrl ?? null,
    subscriptionId: subscriptionId ?? null
  };
}

async function validatePrimaryCoachAssignment(actor: { organizationId: string; role: string }, primaryCoachUserId: string) {
  if (!canManageCoachAssignment(actor.role)) {
    return errorResponse("forbidden", "Only owners and admins can assign a client coach.", 403);
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: actor.organizationId,
      userId: primaryCoachUserId,
      status: MembershipStatus.ACTIVE,
      role: { in: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COACH] }
    },
    select: { id: true }
  });

  if (!membership) {
    return errorResponse("invalid_primary_coach", "Select an active coach from this organization.", 422);
  }

  return null;
}

function canManageCoachAssignment(role: string) {
  return role === "owner" || role === "admin";
}

function isUniqueClientEmailError(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error) || (error as { code?: unknown }).code !== "P2002") {
    return false;
  }

  const target = "meta" in error ? (error as { meta?: { target?: unknown } }).meta?.target : undefined;
  const targetFields = Array.isArray(target) ? target.map(String) : typeof target === "string" ? [target] : [];

  return (
    targetFields.includes("clients_organization_id_email_active_key") ||
    (hasTargetField(targetFields, "email") &&
      (hasTargetField(targetFields, "organization_id") || hasTargetField(targetFields, "organizationId")))
  );
}

function hasTargetField(targetFields: string[], field: string) {
  return targetFields.some((targetField) => targetField === field || targetField.includes(field));
}
