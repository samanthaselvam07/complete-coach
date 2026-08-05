import { z } from "zod";

import { auth } from "@/auth";
import { ClientStatus, LeadStatus, TaskStatus } from "@/app/generated/prisma/enums";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

const globalSearchQuerySchema = z.object({
  query: z.string().trim().max(100).default(""),
  limit: z.coerce.number().int().min(1).max(10).default(5)
});

type SearchResultType = "task" | "client" | "lead";

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
}

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "clients:read");
    const query = globalSearchQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const searchTerm = query.query.trim();

    if (searchTerm.length < 2) {
      return dataResponse({ results: [] });
    }

    const [tasks, clients, leads] = await Promise.all([
      prisma.task.findMany({
        where: {
          organizationId: actor.organizationId,
          status: TaskStatus.OPEN,
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } }
          ]
        },
        orderBy: [{ dueAt: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
        take: query.limit
      }),
      prisma.client.findMany({
        where: {
          organizationId: actor.organizationId,
          deletedAt: null,
          status: { not: ClientStatus.ARCHIVED },
          ...(canViewAllClients(actor.role) ? {} : { primaryCoachUserId: actor.userId }),
          OR: [
            { firstName: { contains: searchTerm, mode: "insensitive" } },
            { lastName: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
            { packageName: { contains: searchTerm, mode: "insensitive" } }
          ]
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: query.limit
      }),
      prisma.lead.findMany({
        where: {
          organizationId: actor.organizationId,
          deletedAt: null,
          ...(canViewAllClients(actor.role) ? {} : { assignedUserId: actor.userId }),
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
            { phone: { contains: searchTerm, mode: "insensitive" } },
            { source: { contains: searchTerm, mode: "insensitive" } },
            { location: { contains: searchTerm, mode: "insensitive" } },
            { notes: { contains: searchTerm, mode: "insensitive" } }
          ]
        },
        orderBy: [{ updatedAt: "desc" }],
        take: query.limit
      })
    ]);

    return dataResponse({
      results: [
        ...tasks.map<SearchResult>((task) => ({
          id: task.id,
          type: "task",
          title: task.title,
          subtitle: task.description || "Open task",
          href: "/"
        })),
        ...clients.map<SearchResult>((client) => ({
          id: client.id,
          type: "client",
          title: `${client.firstName} ${client.lastName}`.trim(),
          subtitle: client.packageName || client.email || "Client profile",
          href: `/clients/${client.id}`
        })),
        ...leads.map<SearchResult>((lead) => ({
          id: lead.id,
          type: "lead",
          title: lead.name,
          subtitle: formatLeadSubtitle(lead.status, lead.source),
          href: `/clients/crm?search=${encodeURIComponent(lead.name)}`
        }))
      ]
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function canViewAllClients(role: string) {
  return role === "owner" || role === "admin";
}

function formatLeadSubtitle(status: LeadStatus, source: string | null) {
  const statusLabel = status.toLowerCase();
  return source ? `${statusLabel} lead from ${source}` : `${statusLabel} CRM lead`;
}
