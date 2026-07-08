import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  createLeadSchema,
  getLeadStageData,
  serializeLead,
  shouldResolveCustomStage,
  toPrismaLeadStatus
} from "@/lib/crm/lead-records";
import { prisma } from "@/lib/db/prisma";

interface LeadRouteContext {
  params: Promise<{ leadId: string }>;
}

export async function GET(_request: Request, context: LeadRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const { leadId } = await context.params;
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!lead) {
      return errorResponse("not_found", "Lead not found.", 404);
    }

    return dataResponse(serializeLead(lead));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: LeadRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { leadId } = await context.params;
    const input = createLeadSchema.partial().parse(await request.json());
    const existingLead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!existingLead) {
      return errorResponse("not_found", "Lead not found.", 404);
    }

    const stageData = input.stage ? await resolveLeadStageData(actor.organizationId, input.stage) : null;
    const lead = await prisma.lead.update({
      where: { id: leadId, organizationId: actor.organizationId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.email ? { email: input.email.toLowerCase() } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.source ? { source: input.source } : {}),
        ...(input.status ? { status: toPrismaLeadStatus(input.status) } : {}),
        ...(stageData ? { ...stageData, daysInStage: 0 } : {}),
        ...(input.location ? { location: input.location } : {}),
        ...(input.notes ? { notes: input.notes } : {})
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "lead.updated",
        targetType: "lead",
        targetId: lead.id
      }
    });

    return dataResponse(serializeLead(lead));
  } catch (error) {
    return handleApiError(error);
  }
}

async function resolveLeadStageData(organizationId: string, stage: string) {
  if (!shouldResolveCustomStage(stage)) {
    return getLeadStageData(stage);
  }

  const crmStage = await prisma.crmStage.findFirst({
    where: {
      organizationId,
      slug: stage
    },
    select: { slug: true }
  });

  if (!crmStage) {
    throw new Error("CRM stage does not exist for this organization.");
  }

  return getLeadStageData(crmStage.slug);
}
