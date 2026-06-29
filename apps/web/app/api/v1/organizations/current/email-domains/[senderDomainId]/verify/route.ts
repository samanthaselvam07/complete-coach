import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  mapResendDomainToUpdate,
  ResendConfigurationError,
  serializeSenderDomain,
  verifyResendDomain
} from "@/lib/email/sender-domains";

interface VerifySenderDomainRouteContext {
  params: Promise<{ senderDomainId: string }>;
}

export async function POST(_request: Request, context: VerifySenderDomainRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "team:manage");
    const { senderDomainId } = await context.params;
    const senderDomain = await prisma.organizationSenderDomain.findFirst({
      where: {
        id: senderDomainId,
        organizationId: actor.organizationId
      }
    });

    if (!senderDomain) {
      return errorResponse("not_found", "Sender domain not found.", 404);
    }

    if (!senderDomain.providerDomainId) {
      return errorResponse("provider_domain_missing", "Sender domain is missing its Resend domain id.", 409);
    }

    const resendDomain = await verifyResendDomain(senderDomain.providerDomainId);
    const updatedDomain = await prisma.organizationSenderDomain.update({
      where: { id: senderDomain.id, organizationId: actor.organizationId },
      data: mapResendDomainToUpdate(resendDomain)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "organization.sender_domain.verified",
        targetType: "organization_sender_domain",
        targetId: updatedDomain.id,
        metadata: {
          domain: updatedDomain.domain,
          status: updatedDomain.status
        }
      }
    });

    return dataResponse(serializeSenderDomain(updatedDomain));
  } catch (error) {
    if (error instanceof ResendConfigurationError) {
      return errorResponse(
        "resend_not_configured",
        "Resend domain management is not configured for this environment.",
        503
      );
    }

    return handleApiError(error);
  }
}
