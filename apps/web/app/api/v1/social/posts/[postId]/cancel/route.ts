import { SocialPostStatus, SocialTargetStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { serializeSocialPost } from "@/lib/social/social-records";

interface SocialPostCancelRouteContext {
  params: Promise<{ postId: string }>;
}

export async function POST(_request: Request, context: SocialPostCancelRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "social:manage");
    const { postId } = await context.params;
    const existingPost = await prisma.socialPost.findFirst({
      where: {
        id: postId,
        organizationId: actor.organizationId
      }
    });

    if (!existingPost) {
      return errorResponse("not_found", "Social post not found.", 404);
    }

    if (existingPost.status === SocialPostStatus.PUBLISHED) {
      return errorResponse("invalid_state", "Published social posts cannot be cancelled.", 409);
    }

    const cancelledPost = await prisma.$transaction(async (tx) => {
      const post = await tx.socialPost.update({
        where: { id: postId, organizationId: actor.organizationId },
        data: {
          status: SocialPostStatus.CANCELLED,
          cancelledAt: new Date()
        },
        include: {
          targets: {
            include: {
              connection: {
                select: {
                  id: true,
                  accountName: true
                }
              }
            }
          }
        }
      });

      await tx.socialPostTarget.updateMany({
        where: {
          postId,
          organizationId: actor.organizationId,
          status: {
            in: [SocialTargetStatus.SCHEDULED, SocialTargetStatus.QUEUED, SocialTargetStatus.RETRYING]
          }
        },
        data: {
          status: SocialTargetStatus.CANCELLED,
          nextAttemptAt: null
        }
      });

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "social.post.cancelled",
          targetType: "social_post",
          targetId: post.id
        }
      });

      return post;
    });

    return dataResponse(serializeSocialPost(cancelledPost));
  } catch (error) {
    return handleApiError(error);
  }
}
