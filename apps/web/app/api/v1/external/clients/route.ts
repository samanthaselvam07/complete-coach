import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/responses";
import {
  auditExternalApiUse,
  canIncludePii,
  handleExternalApiError,
  requireExternalApiActor
} from "@/lib/external/auth";
import { prisma } from "@/lib/db/prisma";
import {
  buildExternalCursorWhere,
  buildExternalPage,
  externalClientQuerySchema,
  serializeExternalClient,
  toExternalClientStatus
} from "@/lib/external/records";

export async function GET(request: Request) {
  try {
    const { actor, ipAddress } = await requireExternalApiActor(request, "external:clients:read");
    const query = externalClientQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const includePii = canIncludePii(actor, query.include_pii);
    const clients = await prisma.client.findMany({
      where: {
        organizationId: actor.organizationId,
        deletedAt: null,
        externalClientId: { not: null },
        ...(toExternalClientStatus(query.status) ? { status: toExternalClientStatus(query.status) } : {}),
        ...(query.updated_since ? { updatedAt: { gte: new Date(query.updated_since) } } : {}),
        ...buildExternalCursorWhere(query.cursor, "updatedAt")
      },
      include: {
        profile: {
          select: {
            waterTargetLitres: true,
            stepTarget: true
          }
        }
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: query.limit + 1
    });

    await auditExternalApiUse({ actor, request, ipAddress, targetType: "client", includePii });

    return NextResponse.json(
      buildExternalPage(clients, query.limit, (client) => client.updatedAt, (client) =>
        serializeExternalClient(client, includePii)
      )
    );
  } catch (error) {
    try {
      return handleExternalApiError(error);
    } catch (apiError) {
      return handleApiError(apiError);
    }
  }
}
