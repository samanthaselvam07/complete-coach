import { z } from "zod";

import type { MembershipRole } from "@/lib/auth/permissions";

export interface ClientNoteSummary {
  id: string;
  clientId: string;
  noteDate: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export const clientNotesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  date: z.string().date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const createClientNoteSchema = z.object({
  noteDate: z.string().date(),
  body: z.string().trim().min(1).max(10000)
});

export type ClientNotesQuery = z.infer<typeof clientNotesQuerySchema>;
export type CreateClientNoteInput = z.infer<typeof createClientNoteSchema>;

interface ClientNoteRecord {
  id: string;
  clientId: string;
  noteDate: Date | string;
  body: string;
  createdAt: Date | string;
  author?: {
    name: string | null;
    email: string | null;
  } | null;
}

export function canViewAllClientNotes(role: MembershipRole) {
  return role === "owner" || role === "admin";
}

export function buildClientNoteWhere(organizationId: string, clientId: string, query: ClientNotesQuery) {
  return {
    organizationId,
    clientId,
    ...(query.date ? { noteDate: new Date(`${query.date}T00:00:00.000Z`) } : {}),
    ...(query.search
      ? {
          body: {
            contains: query.search,
            mode: "insensitive" as const
          }
        }
      : {})
  };
}

export function serializeClientNote(record: ClientNoteRecord): ClientNoteSummary {
  return {
    id: record.id,
    clientId: record.clientId,
    noteDate: toDateInputValue(record.noteDate),
    body: record.body,
    authorName: record.author?.name || record.author?.email || "Coach",
    createdAt: toIsoString(record.createdAt)
  };
}

function toDateInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  return date.toISOString().slice(0, 10);
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
