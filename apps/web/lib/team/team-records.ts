import { createHash } from "node:crypto";
import { z } from "zod";

import {
  MembershipRole,
  MembershipStatus,
  TeamInvitationStatus
} from "@/app/generated/prisma/enums";

const manageableRoleValues = ["admin", "coach", "assistant"] as const;
const manageableStatusValues = ["active", "suspended"] as const;

const roleToPrisma = {
  admin: MembershipRole.ADMIN,
  coach: MembershipRole.COACH,
  assistant: MembershipRole.ASSISTANT
} as const;

const statusToPrisma = {
  active: MembershipStatus.ACTIVE,
  suspended: MembershipStatus.SUSPENDED
} as const;

export const createTeamInvitationSchema = z
  .object({
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    role: z.enum(manageableRoleValues)
  })
  .strict();

export const updateTeamMemberSchema = z
  .object({
    role: z.enum(manageableRoleValues).optional(),
    status: z.enum(manageableStatusValues).optional()
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required."
  });

export type CreateTeamInvitationInput = z.infer<typeof createTeamInvitationSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getInvitationCreateData(
  organizationId: string,
  invitedByUserId: string,
  input: CreateTeamInvitationInput,
  tokenHash: string,
  expiresAt: Date
) {
  return {
    organizationId,
    email: input.email,
    role: roleToPrisma[input.role],
    tokenHash,
    invitedByUserId,
    expiresAt
  };
}

export function getMembershipUpdateData(input: UpdateTeamMemberInput) {
  return {
    ...(input.role ? { role: roleToPrisma[input.role] } : {}),
    ...(input.status ? { status: statusToPrisma[input.status] } : {})
  };
}

export function serializeTeamMember(record: {
  id: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  user: { id: string; name: string | null; email: string | null; image: string | null };
}) {
  return {
    id: record.id,
    userId: record.user.id,
    name: record.user.name,
    email: record.user.email,
    image: record.user.image,
    role: record.role.toLowerCase(),
    status: record.status.toLowerCase(),
    joinedAt: toIsoString(record.joinedAt),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function serializeTeamInvitation(record: {
  id: string;
  email: string;
  role: MembershipRole;
  status: TeamInvitationStatus | string;
  expiresAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}) {
  return {
    id: record.id,
    email: record.email,
    role: record.role.toLowerCase(),
    status: record.status.toLowerCase(),
    expiresAt: toIsoString(record.expiresAt),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

function toIsoString(value: Date | string | null) {
  if (value === null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}
