import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  createMessageSchema,
  messageListQuerySchema,
  serializeMessage
} from "@/lib/operations/operation-records";
import { validateMessageAttachmentObjectKeys } from "@/lib/operations/message-attachments";

interface ConversationMessagesRouteContext {
  params: Promise<{ conversationId: string }>;
}

export async function GET(request: Request, context: ConversationMessagesRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "messages:read");
    const { conversationId } = await context.params;
    const query = messageListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: actor.organizationId
      }
    });

    if (!conversation) {
      return errorResponse("not_found", "Conversation not found.", 404);
    }

    const messages = await prisma.message.findMany({
      where: {
        organizationId: actor.organizationId,
        conversationId,
        deletedAt: null
      },
      include: {
        attachments: true,
        receipts: true
      },
      orderBy: { createdAt: "asc" },
      take: query.limit
    });

    return dataResponse(messages.map(serializeMessage));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: ConversationMessagesRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "messages:write");
    const { conversationId } = await context.params;
    const input = createMessageSchema.parse(await request.json());
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: actor.organizationId
      }
    });

    if (!conversation) {
      return errorResponse("not_found", "Conversation not found.", 404);
    }

    try {
      validateMessageAttachmentObjectKeys(actor.organizationId, input.attachmentObjectIds);
    } catch (error) {
      return errorResponse(
        "invalid_attachment",
        error instanceof Error ? error.message : "Invalid message attachment.",
        422
      );
    }

    const message = await prisma.message.create({
      data: {
        organizationId: actor.organizationId,
        conversationId,
        senderUserId: actor.userId,
        body: input.body,
        attachments: {
          create: input.attachmentObjectIds.map((objectId) => ({
            organizationId: actor.organizationId,
            objectId
          }))
        }
      },
      include: {
        attachments: true,
        receipts: true
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId, organizationId: actor.organizationId },
      data: { updatedAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "message.created",
        targetType: "message",
        targetId: message.id,
        metadata: {
          conversationId,
          attachmentCount: input.attachmentObjectIds.length
        }
      }
    });

    return dataResponse(serializeMessage(message), {
      status: 201,
      headers: { Location: `/api/v1/conversations/${conversationId}/messages#${message.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
