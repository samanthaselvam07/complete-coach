import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  buildClientNoteWhere,
  canViewAllClientNotes,
  clientNotesQuerySchema,
  createClientNoteSchema,
  serializeClientNote
} from "@/lib/clients/client-notes";
import { prisma } from "@/lib/db/prisma";

interface ClientNotesRouteContext {
  params: Promise<{ clientId: string }>;
}

export async function GET(request: Request, context: ClientNotesRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const { clientId } = await context.params;
    const query = clientNotesQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        deletedAt: null,
        ...(canViewAllClientNotes(actor.role) ? {} : { primaryCoachUserId: actor.userId })
      }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const notes = await prisma.clientNote.findMany({
      where: buildClientNoteWhere(actor.organizationId, clientId, query),
      include: {
        author: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [{ noteDate: "desc" }, { createdAt: "desc" }],
      take: query.limit
    });

    return dataResponse(notes.map(serializeClientNote));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: ClientNotesRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "clients:write");
    const { clientId } = await context.params;
    const input = createClientNoteSchema.parse(await request.json());
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: actor.organizationId,
        deletedAt: null,
        ...(canViewAllClientNotes(actor.role) ? {} : { primaryCoachUserId: actor.userId })
      }
    });

    if (!client) {
      return errorResponse("not_found", "Client not found.", 404);
    }

    const note = await prisma.clientNote.create({
      data: {
        organizationId: actor.organizationId,
        clientId,
        authorUserId: actor.userId,
        noteDate: new Date(`${input.noteDate}T00:00:00.000Z`),
        body: input.body
      },
      include: {
        author: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.note_created",
        targetType: "client",
        targetId: client.id,
        metadata: { noteDate: input.noteDate }
      }
    });

    return dataResponse(serializeClientNote(note), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
