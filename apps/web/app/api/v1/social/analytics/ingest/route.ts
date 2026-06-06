import { z } from "zod";

import { SocialConnectionStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { toSocialProviderApi } from "@/lib/social/social-records";

const ingestSocialAnalyticsSchema = z.object({
  connectionIds: z.array(z.string().min(1)).optional(),
  postIds: z.array(z.string().min(1)).optional(),
  capturedAt: z.string().datetime().optional()
});

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "social:manage");
    const input = ingestSocialAnalyticsSchema.parse(await request.json().catch(() => ({})));
    const connections = await prisma.socialConnection.findMany({
      where: {
        organizationId: actor.organizationId,
        status: SocialConnectionStatus.ACTIVE,
        ...(input.connectionIds ? { id: { in: input.connectionIds } } : {})
      },
      take: 50
    });
    const capturedAt = input.capturedAt ? new Date(input.capturedAt) : new Date();
    const snapshots = [];

    for (const connection of connections) {
      snapshots.push(
        await prisma.socialAnalyticsSnapshot.create({
          data: {
            organizationId: actor.organizationId,
            connectionId: connection.id,
            provider: connection.provider,
            providerPostId: input.postIds?.[0] ?? null,
            metrics: {
              mode: process.env.SOCIAL_PROVIDER_MODE === "live" ? "live_pending" : "simulated",
              accountName: connection.accountName
            },
            capturedAt
          }
        })
      );
    }

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "social.analytics.ingested",
        targetType: "social_analytics_snapshot",
        metadata: {
          connectionCount: snapshots.length
        }
      }
    });

    return dataResponse(
      snapshots.map((snapshot) => ({
        id: snapshot.id,
        connectionId: snapshot.connectionId,
        provider: toSocialProviderApi(snapshot.provider),
        providerPostId: snapshot.providerPostId,
        metrics: snapshot.metrics,
        capturedAt: snapshot.capturedAt.toISOString()
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}
