import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { serializeNotification } from "@/lib/operations/notification-records";

interface RouteContext {
  params: Promise<{ notificationId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "notifications:read");
    const { notificationId } = await context.params;
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        organizationId: actor.organizationId,
        recipientUserId: actor.userId
      }
    });

    if (!notification) {
      return errorResponse("not_found", "Notification not found.", 404);
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId, organizationId: actor.organizationId },
      data: { readAt: new Date() }
    });

    return dataResponse(serializeNotification(updatedNotification));
  } catch (error) {
    return handleApiError(error);
  }
}
