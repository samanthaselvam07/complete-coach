import { z } from "zod";

export const auditLogQuerySchema = z.object({
  action: z.string().trim().min(1).max(120).optional(),
  targetType: z.string().trim().min(1).max(120).optional(),
  targetId: z.string().trim().min(1).max(160).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export function parseAuditCursor(cursor: string | undefined) {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      createdAt?: unknown;
      id?: unknown;
    };

    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") {
      return null;
    }

    const createdAt = new Date(parsed.createdAt);

    return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

export function buildAuditCursor(createdAt: Date | string, id: string) {
  return Buffer.from(
    JSON.stringify({
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
      id
    })
  ).toString("base64url");
}

export function buildAuditCursorWhere(cursor: string | undefined) {
  const parsed = parseAuditCursor(cursor);

  if (!parsed) {
    return {};
  }

  return {
    OR: [
      { createdAt: { lt: parsed.createdAt } },
      { createdAt: parsed.createdAt, id: { lt: parsed.id } }
    ]
  };
}

export function serializeAuditLog(record: {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: Date | string;
  actor: { id: string; name: string | null } | null;
}) {
  return {
    id: record.id,
    action: record.action,
    actor: record.actor ? { id: record.actor.id, name: record.actor.name } : null,
    targetType: record.targetType,
    targetId: record.targetId,
    metadata: sanitizeAuditMetadata(record.metadata),
    ipAddress: record.ipAddress,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt
  };
}

function sanitizeAuditMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const blockedKeys = /password|secret|token|authorization|cookie|message|answers?|medical|health/i;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !blockedKeys.test(key))
      .map(([key, nestedValue]) => [key, primitiveAuditValue(nestedValue)])
  );
}

function primitiveAuditValue(value: unknown) {
  return ["string", "number", "boolean"].includes(typeof value) || value === null
    ? value
    : "[structured]";
}
