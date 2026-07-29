import { hash } from "bcryptjs";
import { z } from "zod";

import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import {
  CLIENT_ONBOARDING_TOKEN_PREFIX,
  hashClientOnboardingToken,
  isPaidClientSubscriptionStatus
} from "@/lib/clients/client-onboarding";
import { prisma } from "@/lib/db/prisma";

interface ClientOnboardingRouteContext {
  params: Promise<{ token: string }>;
}

const completeClientOnboardingSchema = z
  .object({
    password: z.string().min(8).max(256)
  })
  .strict();

export async function GET(_request: Request, context: ClientOnboardingRouteContext) {
  try {
    const onboarding = await resolveClientOnboarding(context);

    if (!onboarding) {
      return errorResponse("onboarding_link_invalid", "This setup link is invalid or expired.", 404);
    }

    return dataResponse(serializeClientOnboarding(onboarding));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: ClientOnboardingRouteContext) {
  try {
    const input = completeClientOnboardingSchema.parse(await request.json());
    const onboarding = await resolveClientOnboarding(context);

    if (!onboarding) {
      return errorResponse("onboarding_link_invalid", "This setup link is invalid or expired.", 404);
    }

    if (requiresPaymentBeforeLogin(onboarding)) {
      return errorResponse("payment_required", "Complete your package payment before setting up your login.", 402, {
        status: onboarding.latestSubscription?.status.toLowerCase() ?? "incomplete"
      });
    }

    if (!onboarding.client.email) {
      return errorResponse("client_email_required", "This client profile does not have an email address.", 409);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: onboarding.client.email },
      select: { id: true }
    });

    if (existingUser && onboarding.client.clientUserId !== existingUser.id) {
      return errorResponse("email_already_registered", "An account already exists for this email address.", 409);
    }

    const passwordHash = await hash(input.password, 12);
    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: `${onboarding.client.firstName} ${onboarding.client.lastName}`.trim(),
            passwordHash,
            authProvider: "credentials"
          },
          select: { id: true, email: true, name: true }
        })
      : await prisma.user.create({
          data: {
            name: `${onboarding.client.firstName} ${onboarding.client.lastName}`.trim(),
            email: onboarding.client.email,
            passwordHash,
            authProvider: "credentials",
            authProviderAccountId: onboarding.client.email
          },
          select: { id: true, email: true, name: true }
        });

    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: {
          id: onboarding.client.id,
          organizationId: onboarding.client.organizationId
        },
        data: { clientUserId: user.id }
      });
      await tx.verificationToken.deleteMany({
        where: {
          identifier: onboarding.token.identifier,
          token: onboarding.token.token
        }
      });
      await tx.auditLog.create({
        data: {
          organizationId: onboarding.client.organizationId,
          actorUserId: user.id,
          action: "client.onboarding_completed",
          targetType: "client",
          targetId: onboarding.client.id
        }
      });
    });

    return dataResponse({
      userId: user.id,
      clientId: onboarding.client.id,
      organizationId: onboarding.client.organizationId
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function resolveClientOnboarding(context: ClientOnboardingRouteContext) {
  const { token } = await context.params;
  const tokenRecord = await prisma.verificationToken.findFirst({
    where: {
      identifier: { startsWith: `${CLIENT_ONBOARDING_TOKEN_PREFIX}:` },
      token: hashClientOnboardingToken(token),
      expires: { gt: new Date() }
    }
  });

  if (!tokenRecord) {
    return null;
  }

  const clientId = tokenRecord.identifier.slice(`${CLIENT_ONBOARDING_TOKEN_PREFIX}:`.length);
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      deletedAt: null
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true
        }
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          packageId: true,
          coachingPackage: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  if (!client) {
    return null;
  }

  return {
    token: tokenRecord,
    client,
    latestSubscription: client.subscriptions.at(0) ?? null
  };
}

function serializeClientOnboarding(onboarding: NonNullable<Awaited<ReturnType<typeof resolveClientOnboarding>>>) {
  const paymentRequired = requiresPaymentBeforeLogin(onboarding);

  return {
    clientName: `${onboarding.client.firstName} ${onboarding.client.lastName}`.trim(),
    clientEmail: onboarding.client.email,
    organizationName: onboarding.client.organization.name,
    packageName: onboarding.latestSubscription?.coachingPackage.name ?? onboarding.client.packageName,
    paymentRequired,
    paymentStatus: onboarding.latestSubscription?.status.toLowerCase() ?? null,
    canSetPassword: !paymentRequired
  };
}

function requiresPaymentBeforeLogin(onboarding: NonNullable<Awaited<ReturnType<typeof resolveClientOnboarding>>>) {
  return Boolean(
    onboarding.latestSubscription && !isPaidClientSubscriptionStatus(onboarding.latestSubscription.status)
  );
}
