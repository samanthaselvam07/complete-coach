import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  createResendDomain,
  createSenderDomainSchema,
  mapResendDomainToUpdate,
  ResendConfigurationError,
  serializeSenderDomain
} from "@/lib/email/sender-domains";

export async function GET() {
  try {
    const actor = requireActiveActor(await auth(), "team:manage");
    const domains = await prisma.organizationSenderDomain.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });

    return dataResponse(domains.map(serializeSenderDomain));
  } catch (error) {
    return handleSenderDomainError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "team:manage");
    const input = createSenderDomainSchema.parse(await request.json());
    const existingDomain = await prisma.organizationSenderDomain.findUnique({
      where: {
        organizationId_domain: {
          organizationId: actor.organizationId,
          domain: input.domain
        }
      }
    });

    if (existingDomain) {
      return errorResponse("sender_domain_exists", "This sender domain is already configured.", 409);
    }

    const resendDomain = await createResendDomain(input.domain);
    const createdDomain = await prisma.organizationSenderDomain.create({
      data: {
        organizationId: actor.organizationId,
        domain: input.domain,
        provider: "resend",
        fromLocalPart: input.fromLocalPart,
        senderName: input.senderName,
        createdByUserId: actor.userId,
        ...mapResendDomainToUpdate(resendDomain)
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "organization.sender_domain.created",
        targetType: "organization_sender_domain",
        targetId: createdDomain.id,
        metadata: {
          domain: createdDomain.domain,
          provider: createdDomain.provider,
          status: createdDomain.status
        }
      }
    });

    return dataResponse(serializeSenderDomain(createdDomain), { status: 201 });
  } catch (error) {
    return handleSenderDomainError(error);
  }
}

function handleSenderDomainError(error: unknown) {
  if (error instanceof ResendConfigurationError) {
    return errorResponse(
      "resend_not_configured",
      "Resend domain management is not configured for this environment.",
      503
    );
  }

  return handleApiError(error);
}
