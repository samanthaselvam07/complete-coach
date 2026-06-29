import { TaskStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { serializeTask } from "@/lib/operations/operation-records";

interface TaskCompleteRouteContext {
  params: Promise<{ taskId: string }>;
}

export async function POST(_request: Request, context: TaskCompleteRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "tasks:write");
    const { taskId } = await context.params;
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: actor.organizationId
      }
    });

    if (!existingTask) {
      return errorResponse("not_found", "Task not found.", 404);
    }

    const task = await prisma.task.update({
      where: { id: taskId, organizationId: actor.organizationId },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "task.completed",
        targetType: "task",
        targetId: task.id
      }
    });

    return dataResponse(serializeTask(task));
  } catch (error) {
    return handleApiError(error);
  }
}
