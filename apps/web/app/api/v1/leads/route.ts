import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  buildLeadWhere,
  createLeadSchema,
  getLeadCreateData,
  getLeadStageData,
  leadListQuerySchema,
  serializeLead,
  shouldResolveCustomStage
} from "@/lib/crm/lead-records";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const query = leadListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const leads = await prisma.lead.findMany({
      where: buildLeadWhere(actor.organizationId, query),
      orderBy: [{ createdAt: "asc" }],
      take: query.limit
    });

    return dataResponse(leads.map(serializeLead));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const input = createLeadSchema.parse(await request.json());
    const stageData = await resolveLeadStageData(actor.organizationId, input.stage);
    const lead = await prisma.lead.create({
      data: getLeadCreateData(actor.organizationId, input, stageData)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "lead.created",
        targetType: "lead",
        targetId: lead.id,
        metadata: { status: input.status, stage: input.stage }
      }
    });

    return dataResponse(serializeLead(lead), {
      status: 201,
      headers: { Location: `/api/v1/leads/${lead.id}` }
    });
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
