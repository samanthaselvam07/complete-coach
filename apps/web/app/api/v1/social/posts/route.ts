import { SocialConnectionStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  createSocialPostSchema,
  getSocialPostCreateData,
  serializeSocialPost,
  socialPostListQuerySchema,
  toSocialPostStatus,
  toSocialProviderApi
} from "@/lib/social/social-records";
import { validateSocialPostForProvider } from "@/lib/social/social-providers";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "social:read");
    const query = socialPostListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const posts = await prisma.socialPost.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(query.status ? { status: toSocialPostStatus(query.status) } : {})
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
      },
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
      take: query.limit
    });

    return dataResponse(posts.map(serializeSocialPost));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "social:manage");
    const input = createSocialPostSchema.parse(await request.json());
    const connections = await prisma.socialConnection.findMany({
      where: {
        organizationId: actor.organizationId,
        id: { in: input.targetConnectionIds },
        status: SocialConnectionStatus.ACTIVE
      },
      select: {
        id: true,
        provider: true
      }
    });

    if (connections.length !== input.targetConnectionIds.length) {
      return errorResponse("connection_not_found", "One or more social connections were not found.", 404);
    }

    for (const connection of connections) {
      validateSocialPostForProvider(toSocialProviderApi(connection.provider), input);
    }

    const post = await prisma.socialPost.create({
      data: getSocialPostCreateData(actor.organizationId, actor.userId, input, connections),
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

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "social.post.scheduled",
        targetType: "social_post",
        targetId: post.id,
        metadata: {
          scheduledFor: input.scheduledFor ?? null,
          targetCount: connections.length
        }
      }
    });

    return dataResponse(serializeSocialPost(post), {
      status: 201,
      headers: { Location: `/api/v1/social/posts/${post.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
