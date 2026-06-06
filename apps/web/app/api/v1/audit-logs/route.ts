import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  auditLogQuerySchema,
  buildAuditCursor,
  buildAuditCursorWhere,
  serializeAuditLog
} from "@/lib/audit/audit-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "audit:read");
    const query = auditLogQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const records = await prisma.auditLog.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(query.action ? { action: query.action } : {}),
        ...buildAuditCursorWhere(query.cursor)
      },
      include: {
        actor: {
          select: { id: true, name: true }
        }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1
    });
    const hasMore = records.length > query.limit;
    const page = records.slice(0, query.limit);
    const lastRecord = page.at(-1);

    return dataResponse(page.map(serializeAuditLog), {
      headers: {
        "x-has-more": String(hasMore),
        ...(hasMore && lastRecord
          ? { "x-next-cursor": buildAuditCursor(lastRecord.createdAt, lastRecord.id) }
          : {})
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
