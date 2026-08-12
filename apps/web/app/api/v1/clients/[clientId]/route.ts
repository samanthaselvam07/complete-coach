import { ClientStatus, MembershipRole, MembershipStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { createClientSchema, serializeClient, toPrismaClientStatus } from "@/lib/clients/client-records";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { z } from "zod";

interface ClientRouteContext {
  params: Promise<{ clientId: string }>;
}

const patchClientSchema = createClientSchema.partial().extend({
  email: z.string().trim().email().max(255).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  packageId: z.string().trim().max(120).nullable().optional(),
  packageName: z.string().trim().max(120).nullable().optional(),
  checkInDay: z.string().trim().max(20).nullable().optional(),
  primaryCoachUserId: z.string().trim().max(120).nullable().optional(),
  timezone: z.string().trim().max(80).nullable().optional(),
  startDate: z.string().date().nullable().optional()
});

export async function GET(_request: Request, context: ClientRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
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

    return dataResponse(serializeClient(client));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: ClientRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const input = patchClientSchema.parse(await request.json());
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!existingClient) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const requiresOnlinePayment = input.onboarding?.needsPayment === true && input.onboarding.paymentMode === "payment-link";
    const packageId = Object.prototype.hasOwnProperty.call(input, "packageId") ? input.packageId : existingClient.packageId;
    const email = Object.prototype.hasOwnProperty.call(input, "email") ? input.email : existingClient.email;

    if (requiresOnlinePayment && !email) {
      return errorResponse("client_email_required", "Client email is required to send an online payment setup link.", 422);
    }

    if (requiresOnlinePayment && !packageId) {
      return errorResponse("client_package_required", "Select a package before sending an online payment setup link.", 422);
    }

    if (Object.prototype.hasOwnProperty.call(input, "primaryCoachUserId") && input.primaryCoachUserId) {
      const primaryCoachError = await validatePrimaryCoachAssignment(actor, input.primaryCoachUserId);

      if (primaryCoachError) {
        return primaryCoachError;
      }
    }

    if (Object.prototype.hasOwnProperty.call(input, "primaryCoachUserId") && input.primaryCoachUserId === null && !canManageCoachAssignment(actor.role)) {
      return errorResponse("forbidden", "Only owners and admins can assign a client coach.", 403);
    }

    const client = await prisma.client.update({
      where: { id: clientId, organizationId: actor.organizationId },
      data: {
        ...getPatchField(input, "firstName", input.firstName),
        ...getPatchField(input, "lastName", input.lastName),
        ...getPatchField(input, "email", input.email ? input.email.toLowerCase() : input.email),
        ...getPatchField(input, "phone", input.phone),
        ...(input.status ? { status: toPrismaClientStatus(input.status) } : {}),
        ...getPatchField(input, "packageId", input.packageId),
        ...getPatchField(input, "packageName", input.packageName),
        ...(input.onboarding ? { requiresOnlinePayment } : {}),
        ...getPatchField(input, "checkInDay", input.checkInDay),
        ...getPatchField(input, "primaryCoachUserId", input.primaryCoachUserId),
        ...getPatchField(input, "timezone", input.timezone),
        ...getPatchField(input, "startDate", input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : input.startDate)
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.updated",
        targetType: "client",
        targetId: client.id
      }
    });

    return dataResponse(serializeClient(client));
  } catch (error) {
    return handleApiError(error);
  }
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

function getPatchField<TInput extends object, TKey extends keyof TInput, TValue>(input: TInput, key: TKey, value: TValue) {
  return Object.prototype.hasOwnProperty.call(input, key) ? { [key]: value } : {};
}

export async function DELETE(_request: Request, context: ClientRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        deletedAt: null
      },
      select: { id: true }
    });

    if (!existingClient) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.clientProfile.deleteMany({
        where: {
          clientId,
          organizationId: actor.organizationId
        }
      });
      await tx.client.update({
        where: { id: clientId, organizationId: actor.organizationId },
        data: {
          status: ClientStatus.ARCHIVED,
          archivedAt: new Date(),
          deletedAt: new Date()
        }
      });
      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "client.deleted",
          targetType: "client",
          targetId: clientId
        }
      });
    });

    return dataResponse({ id: clientId, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
