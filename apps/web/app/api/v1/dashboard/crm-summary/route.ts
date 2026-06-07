import { LeadStage } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

const stageDefinitions = [
  { prismaStage: LeadStage.INITIAL_CONTACT, stage: "initial-contact", label: "Initial Contact" },
  { prismaStage: LeadStage.CONSULTATION, stage: "consultation", label: "Consultation Scheduled" },
  { prismaStage: LeadStage.PROPOSAL, stage: "proposal", label: "Proposal Sent" },
  { prismaStage: LeadStage.NEGOTIATION, stage: "negotiation", label: "In Negotiation" },
  { prismaStage: LeadStage.CLOSED_WON, stage: "closed-won", label: "Closed - Won" }
] as const;

export async function GET() {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setUTCDate(fiveDaysAgo.getUTCDate() - 5);

    const [stageCounts, newLeadsLastFiveDays] = await Promise.all([
      prisma.lead.groupBy({
        by: ["stage"],
        where: {
          organizationId: actor.organizationId,
          deletedAt: null
        },
        _count: {
          _all: true
        }
      }),
      prisma.lead.count({
        where: {
          organizationId: actor.organizationId,
          deletedAt: null,
          createdAt: { gte: fiveDaysAgo }
        }
      })
    ]);

    const countByStage = new Map(stageCounts.map((stageCount) => [stageCount.stage, stageCount._count._all]));
    const stageBreakdown = stageDefinitions.map((stageDefinition) => ({
      stage: stageDefinition.stage,
      label: stageDefinition.label,
      count: countByStage.get(stageDefinition.prismaStage) ?? 0
    }));

    return dataResponse({
      newLeadsLastFiveDays,
      totalLeadsAndCustomers: stageBreakdown.reduce((sum, stage) => sum + stage.count, 0),
      stageBreakdown,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    return handleApiError(error);
  }
}
