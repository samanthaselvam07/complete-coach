import { SocialTargetStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  decryptSocialToken,
  sanitizeSocialProviderResponse
} from "@/lib/social/social-providers";
import { publishSocialTarget } from "@/lib/social/social-provider-runtime";
import { processSocialJobsSchema, toSocialProviderApi } from "@/lib/social/social-records";

const retryDelayMs = 15 * 60 * 1_000;

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "social:manage");
    const input = processSocialJobsSchema.parse(await request.json().catch(() => ({})));
    const dueTargets = await prisma.socialPostTarget.findMany({
      where: {
        organizationId: actor.organizationId,
        OR: [
          {
            status: { in: [SocialTargetStatus.QUEUED, SocialTargetStatus.RETRYING] },
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }]
          },
          {
            status: SocialTargetStatus.SCHEDULED,
            post: {
              scheduledFor: { lte: new Date() }
            }
          }
        ]
      },
      include: {
        post: true,
        connection: true
      },
      orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
      take: input.limit
    });
    const authSecret = getAuthSecret();
    let published = 0;
    let retried = 0;
    let failed = 0;

    for (const target of dueTargets) {
      const result = await publishSocialTarget({
        target,
        accessToken: decryptSocialToken(target.connection.encryptedAccessToken, authSecret)
      });

      if (result.ok) {
        published += 1;
        await prisma.socialPostAttempt.create({
          data: {
            organizationId: actor.organizationId,
            targetId: target.id,
            status: SocialTargetStatus.PUBLISHED,
            providerStatus: result.status ?? null,
            providerResponse: sanitizeSocialProviderResponse(result.response) ?? undefined
          }
        });
        await prisma.socialPostTarget.update({
          where: { id: target.id },
          data: {
            status: SocialTargetStatus.PUBLISHED,
            attempts: { increment: 1 },
            providerPostId: result.providerPostId ?? null,
            lastError: null,
            nextAttemptAt: null,
            publishedAt: new Date()
          }
        });
        await prisma.auditLog.create({
          data: {
            organizationId: actor.organizationId,
            actorUserId: actor.userId,
            action: "social.post.published",
            targetType: "social_post_target",
            targetId: target.id,
            metadata: {
              provider: toSocialProviderApi(target.provider),
              providerPostId: result.providerPostId ?? null
            }
          }
        });
        continue;
      }

      const retryAt = result.retryable ? new Date(Date.now() + retryDelayMs) : null;
      const nextStatus = result.retryable ? SocialTargetStatus.RETRYING : SocialTargetStatus.FAILED;
      retried += result.retryable ? 1 : 0;
      failed += result.retryable ? 0 : 1;

      await prisma.socialPostAttempt.create({
        data: {
          organizationId: actor.organizationId,
          targetId: target.id,
          status: nextStatus,
          providerStatus: result.status ?? null,
          providerResponse: sanitizeSocialProviderResponse(result.response) ?? undefined,
          errorCode: result.code ?? null,
          errorMessage: result.message ?? "Social provider request failed.",
          retryAt
        }
      });
      await prisma.socialPostTarget.update({
        where: { id: target.id },
        data: {
          status: nextStatus,
          attempts: { increment: 1 },
          lastError: result.message ?? "Social provider request failed.",
          nextAttemptAt: retryAt
        }
      });
    }

    return dataResponse({
      processed: dueTargets.length,
      published,
      retried,
      failed
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("Invalid server environment: AUTH_SECRET");
  }

  return secret;
}
