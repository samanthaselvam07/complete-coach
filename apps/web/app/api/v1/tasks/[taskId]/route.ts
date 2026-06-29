import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { getTaskUpdateData, serializeTask, updateTaskSchema } from "@/lib/operations/operation-records";

interface TaskRouteContext {
  params: Promise<{ taskId: string }>;
}

export async function PATCH(request: Request, context: TaskRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "tasks:write");
    const { taskId } = await context.params;
    const input = updateTaskSchema.parse(await request.json());
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
      data: getTaskUpdateData(input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "task.updated",
        targetType: "task",
        targetId: task.id
      }
    });

    return dataResponse(serializeTask(task));
  } catch (error) {
    return handleApiError(error);
  }
}
