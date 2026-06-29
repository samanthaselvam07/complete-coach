import { z } from "zod";
import type { InputJsonValue } from "@prisma/client/runtime/client";

import { ExternalWebhookEndpointStatus } from "@/app/generated/prisma/enums";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { auditExternalApiUse, handleExternalApiError, requireExternalApiActor } from "@/lib/external/auth";
import { prisma } from "@/lib/db/prisma";
import { serializeWebhookEndpoint } from "@/lib/external/webhooks";

const eventTypeSchema = z.enum([
  "external_export.created",
  "external_export.completed",
  "external_export.failed",
  "metric.extracted",
  "check_in.reviewed",
  "check_in.completed"
]);

const updateWebhookEndpointSchema = z.object({
  url: z.string().url().refine((url) => new URL(url).protocol === "https:", "Webhook URL must use HTTPS.").optional(),
  description: z.string().trim().max(500).nullable().optional(),
  eventTypes: z.array(eventTypeSchema).min(1).max(20).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ endpointId: string }> }) {
  try {
    const { actor, ipAddress } = await requireExternalApiActor(request, "external:webhooks:manage");
    const { endpointId } = await params;
    const input = updateWebhookEndpointSchema.parse(await request.json());
    const existing = await prisma.externalWebhookEndpoint.findFirst({
      where: {
        id: endpointId,
        organizationId: actor.organizationId
      }
    });

    if (!existing) {
      return errorResponse("not_found", "Webhook endpoint was not found.", 404);
    }

    const endpoint = await prisma.externalWebhookEndpoint.update({
      where: { id: endpointId, organizationId: actor.organizationId },
      data: {
        ...(input.url !== undefined ? { url: input.url } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.eventTypes !== undefined ? { eventTypes: input.eventTypes as InputJsonValue } : {})
      }
    });

    await auditExternalApiUse({
      actor,
      request,
      ipAddress,
      targetType: "external_webhook_endpoint",
      targetId: endpointId
    });
    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorApiKeyId: actor.apiKeyId,
        action: "external_webhook_endpoint.updated",
        targetType: "external_webhook_endpoint",
        targetId: endpointId,
        metadata: {
          changedFields: Object.keys(input).sort()
        },
        ipAddress,
        userAgent: request.headers.get("user-agent")
      }
    });

    return dataResponse(serializeWebhookEndpoint(endpoint));
  } catch (error) {
    try {
      return handleExternalApiError(error);
    } catch (apiError) {
      return handleApiError(apiError);
    }
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ endpointId: string }> }) {
  try {
    const { actor, ipAddress } = await requireExternalApiActor(request, "external:webhooks:manage");
    const { endpointId } = await params;
    const existing = await prisma.externalWebhookEndpoint.findFirst({
      where: {
        id: endpointId,
        organizationId: actor.organizationId
      }
    });

    if (!existing) {
      return errorResponse("not_found", "Webhook endpoint was not found.", 404);
    }

    const endpoint = await prisma.externalWebhookEndpoint.update({
      where: { id: endpointId, organizationId: actor.organizationId },
      data: { status: ExternalWebhookEndpointStatus.DISABLED }
    });

    await auditExternalApiUse({
      actor,
      request,
      ipAddress,
      targetType: "external_webhook_endpoint",
      targetId: endpointId
    });
    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorApiKeyId: actor.apiKeyId,
        action: "external_webhook_endpoint.disabled",
        targetType: "external_webhook_endpoint",
        targetId: endpointId,
        metadata: {},
        ipAddress,
        userAgent: request.headers.get("user-agent")
      }
    });

    return dataResponse(serializeWebhookEndpoint(endpoint));
  } catch (error) {
    try {
      return handleExternalApiError(error);
    } catch (apiError) {
      return handleApiError(apiError);
    }
  }
}
