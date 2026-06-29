import { LeadActivityType } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  leadStageTransitionSchema,
  serializeLead,
  toPrismaLeadStage
} from "@/lib/crm/lead-records";
import { prisma } from "@/lib/db/prisma";

interface LeadStageTransitionRouteContext {
  params: Promise<{ leadId: string }>;
}

export async function POST(request: Request, context: LeadStageTransitionRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { leadId } = await context.params;
    const input = leadStageTransitionSchema.parse(await request.json());
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

    const lead = await prisma.$transaction(async (tx) => {
      const updatedLead = await tx.lead.update({
        where: { id: leadId, organizationId: actor.organizationId },
        data: {
          stage: toPrismaLeadStage(input.stage),
          daysInStage: 0,
          lastContactAt: new Date()
        }
      });

      await tx.leadActivity.create({
        data: {
          organizationId: actor.organizationId,
          leadId,
          actorUserId: actor.userId,
          type: LeadActivityType.STAGE_TRANSITION,
          body: `Moved lead to ${input.stage}`
        }
      });

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "lead.stage_transitioned",
          targetType: "lead",
          targetId: leadId,
          metadata: {
            from: existingLead.stage,
            to: input.stage
          }
        }
      });

      return updatedLead;
    });

    return dataResponse(serializeLead(lead));
  } catch (error) {
    return handleApiError(error);
  }
}
