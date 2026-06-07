import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  buildTaskWhere,
  createTaskSchema,
  getTaskCreateData,
  serializeTask,
  taskListQuerySchema
} from "@/lib/operations/operation-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "tasks:read");
    const query = taskListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const tasks = await prisma.task.findMany({
      where: buildTaskWhere(actor.organizationId, query),
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
      take: query.limit
    });

    return dataResponse(tasks.map(serializeTask));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "tasks:write");
    const input = createTaskSchema.parse(await request.json());
    const task = await prisma.task.create({
      data: getTaskCreateData(actor.organizationId, actor.userId, input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "task.created",
        targetType: "task",
        targetId: task.id,
        metadata: {
          category: input.category,
          priority: input.priority
        }
      }
    });

    return dataResponse(serializeTask(task), {
      status: 201,
      headers: { Location: `/api/v1/tasks/${task.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
