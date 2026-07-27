import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  buildConversationWhere,
  conversationListQuerySchema,
  createConversationSchema,
  getConversationCreateData,
  serializeConversation
} from "@/lib/operations/operation-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "messages:read");
    const query = conversationListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const conversations = await prisma.conversation.findMany({
      where: buildConversationWhere(actor.organizationId, query),
      include: {
        client: { select: { firstName: true, lastName: true } },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" },
      take: query.limit
    });

    return dataResponse(conversations.map(serializeConversation));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "messages:write");
    const input = createConversationSchema.parse(await request.json());
    const client = await prisma.client.findFirst({
      where: {
        id: input.clientId,
        organizationId: actor.organizationId,
        deletedAt: null
      }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const existingConversation = await prisma.conversation.findFirst({
      where: {
        organizationId: actor.organizationId,
        clientId: client.id
      },
      include: {
        client: { select: { firstName: true, lastName: true } },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    if (existingConversation) {
      return dataResponse(serializeConversation(existingConversation), {
        headers: { Location: `/api/v1/conversations/${existingConversation.id}/messages` }
      });
    }

    const conversation = await prisma.conversation.create({
      data: getConversationCreateData(actor.organizationId, input),
      include: {
        client: { select: { firstName: true, lastName: true } },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "conversation.created",
        targetType: "conversation",
        targetId: conversation.id,
        metadata: { clientId: client.id }
      }
    });

    return dataResponse(serializeConversation(conversation), {
      status: 201,
      headers: { Location: `/api/v1/conversations/${conversation.id}/messages` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
