import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  getOrganizationAutomationUpsertData,
  serializeOrganizationAutomations,
  updateOrganizationAutomationSchema
} from "@/lib/organizations/automation-records";

export async function GET() {
  try {
    const actor = requireActiveActor(await auth(), "team:manage");
    const automations = await prisma.organizationAutomation.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: [{ trigger: "asc" }]
    });

    return dataResponse(serializeOrganizationAutomations(automations));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "team:manage");
    const input = updateOrganizationAutomationSchema.parse(await request.json());

    await prisma.$transaction(
      input.automations.map((automation) =>
        prisma.organizationAutomation.upsert(
          getOrganizationAutomationUpsertData(actor.organizationId, actor.userId, automation)
        )
      )
    );

    const automations = await prisma.organizationAutomation.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: [{ trigger: "asc" }]
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "organization.automations.updated",
        targetType: "organization_automation",
        metadata: {
          triggers: input.automations.map((automation) => automation.id)
        }
      }
    });

    return dataResponse(serializeOrganizationAutomations(automations));
  } catch (error) {
    return handleApiError(error);
  }
}
