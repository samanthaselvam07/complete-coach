import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";

import { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { isMissingDatabaseColumn } from "@/lib/db/schema-compat";

const credentialSchema = z.object({
  id: z.string().trim().max(120),
  title: z.string().trim().max(160),
  institution: z.string().trim().max(200),
  completedAt: z.string().trim().max(40),
  credentialId: z.string().trim().max(160),
  fileName: z.string().trim().max(240)
});

const coachProfileSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  email: z.string().trim().email().max(240).optional(),
  professionalTitle: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(60).optional(),
  photoFileName: z.string().trim().max(2048).optional(),
  bio: z.string().trim().max(5000).optional(),
  philosophy: z.string().trim().max(3000).optional(),
  specialities: z.array(z.string().trim().min(1).max(80)).max(24).optional(),
  credentials: z.array(credentialSchema).max(24).optional(),
  clientCapacityLimit: z.number().int().min(0).max(500).optional(),
  password: z.string().min(8).max(128).optional()
});

interface CoachProfileRow {
  professional_title: string | null;
  phone: string | null;
  photo_file_name: string | null;
  bio: string | null;
  philosophy: string | null;
  specialities_json: unknown;
  credentials_json: unknown;
  client_capacity_limit: number | null;
}

export async function GET() {
  try {
    const actor = requireActiveActor(await auth());
    const [user, profile] = await Promise.all([
      prisma.user.findUnique({
        where: { id: actor.userId },
        select: { id: true, name: true, email: true, image: true }
      }),
      getCoachProfile(actor.organizationId, actor.userId)
    ]);

    if (!user) {
      return errorResponse("not_found", "Coach account not found.", 404);
    }

    return dataResponse(serializeCoachProfile(user, profile));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = requireActiveActor(await auth());
    const input = coachProfileSchema.parse(await request.json());
    const profileId = randomUUID();
    const passwordHash = input.password ? await hash(input.password, 12) : undefined;

    try {
      await prisma.user.update({
        where: { id: actor.userId },
        data: {
          name: input.name,
          email: input.email,
          image: input.photoFileName,
          ...(passwordHash ? { passwordHash, authProvider: "credentials" } : {})
        }
      });
    } catch (error) {
      if (isUniqueEmailError(error)) {
        return errorResponse("email_already_exists", "That email address is already in use.", 409);
      }

      throw error;
    }

    const existingProfile = await getCoachProfile(actor.organizationId, actor.userId);
    const profile = await upsertCoachProfile({
      id: profileId,
      organizationId: actor.organizationId,
      userId: actor.userId,
      professionalTitle: input.professionalTitle ?? existingProfile?.professional_title ?? undefined,
      phone: input.phone ?? existingProfile?.phone ?? undefined,
      photoFileName: input.photoFileName ?? existingProfile?.photo_file_name ?? undefined,
      bio: input.bio ?? existingProfile?.bio ?? undefined,
      philosophy: input.philosophy ?? existingProfile?.philosophy ?? undefined,
      specialities: input.specialities ?? parseStringArray(existingProfile?.specialities_json),
      credentials: input.credentials ?? parseCredentials(existingProfile?.credentials_json),
      clientCapacityLimit: input.clientCapacityLimit ?? existingProfile?.client_capacity_limit ?? undefined
    });

    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { id: true, name: true, email: true, image: true }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "coach.profile_updated",
        targetType: "user",
        targetId: actor.userId,
        metadata: {
          updatedPassword: Boolean(input.password)
        }
      }
    });

    return dataResponse(serializeCoachProfile(user, profile));
  } catch (error) {
    return handleApiError(error);
  }
}

async function getCoachProfile(organizationId: string, userId: string) {
  const rows = await queryCoachProfileWithCapacity(organizationId, userId);

  return rows[0] ?? null;
}

async function queryCoachProfileWithCapacity(organizationId: string, userId: string) {
  try {
    return await prisma.$queryRaw<CoachProfileRow[]>(Prisma.sql`
      SELECT
        "professional_title",
        "phone",
        "photo_file_name",
        "bio",
        "philosophy",
        "specialities_json",
        "credentials_json",
        "client_capacity_limit"
      FROM "coach_profiles"
      WHERE "organization_id" = ${organizationId} AND "user_id" = ${userId}
      LIMIT 1
    `);
  } catch (error) {
    if (!isMissingDatabaseColumn(error, "client_capacity_limit")) {
      throw error;
    }

    return queryCoachProfileWithoutCapacity(organizationId, userId);
  }
}

async function queryCoachProfileWithoutCapacity(organizationId: string, userId: string) {
  const rows = await prisma.$queryRaw<Array<Omit<CoachProfileRow, "client_capacity_limit">>>(Prisma.sql`
    SELECT
      "professional_title",
      "phone",
      "photo_file_name",
      "bio",
      "philosophy",
      "specialities_json",
      "credentials_json"
    FROM "coach_profiles"
    WHERE "organization_id" = ${organizationId} AND "user_id" = ${userId}
    LIMIT 1
  `);

  return rows.map((row) => ({ ...row, client_capacity_limit: null }));
}

async function upsertCoachProfile(input: {
  id: string;
  organizationId: string;
  userId: string;
  professionalTitle?: string;
  phone?: string;
  photoFileName?: string;
  bio?: string;
  philosophy?: string;
  specialities?: string[];
  credentials?: z.infer<typeof credentialSchema>[];
  clientCapacityLimit?: number;
}) {
  const specialitiesJson = JSON.stringify(input.specialities ?? []);
  const credentialsJson = JSON.stringify(input.credentials ?? []);
  const rows = await queryUpsertCoachProfileWithCapacity(input, specialitiesJson, credentialsJson);

  return rows[0] ?? null;
}

async function queryUpsertCoachProfileWithCapacity(
  input: Parameters<typeof upsertCoachProfile>[0],
  specialitiesJson: string,
  credentialsJson: string
) {
  try {
    return await prisma.$queryRaw<CoachProfileRow[]>(Prisma.sql`
      INSERT INTO "coach_profiles"
        (
          "id",
          "organization_id",
          "user_id",
          "professional_title",
          "phone",
          "photo_file_name",
          "bio",
          "philosophy",
          "specialities_json",
          "credentials_json",
          "client_capacity_limit",
          "updated_at"
        )
      VALUES
        (
          ${input.id},
          ${input.organizationId},
          ${input.userId},
          ${input.professionalTitle ?? null},
          ${input.phone ?? null},
          ${input.photoFileName ?? null},
          ${input.bio ?? null},
          ${input.philosophy ?? null},
          CAST(${specialitiesJson} AS JSONB),
          CAST(${credentialsJson} AS JSONB),
          ${input.clientCapacityLimit ?? null},
          now()
        )
      ON CONFLICT ("organization_id", "user_id") DO UPDATE SET
        "professional_title" = EXCLUDED."professional_title",
        "phone" = EXCLUDED."phone",
        "photo_file_name" = EXCLUDED."photo_file_name",
        "bio" = EXCLUDED."bio",
        "philosophy" = EXCLUDED."philosophy",
        "specialities_json" = EXCLUDED."specialities_json",
        "credentials_json" = EXCLUDED."credentials_json",
        "client_capacity_limit" = EXCLUDED."client_capacity_limit",
        "updated_at" = now()
      RETURNING
        "professional_title",
        "phone",
        "photo_file_name",
        "bio",
        "philosophy",
        "specialities_json",
        "credentials_json",
        "client_capacity_limit"
    `);
  } catch (error) {
    if (!isMissingDatabaseColumn(error, "client_capacity_limit")) {
      throw error;
    }

    return queryUpsertCoachProfileWithoutCapacity(input, specialitiesJson, credentialsJson);
  }
}

async function queryUpsertCoachProfileWithoutCapacity(
  input: Parameters<typeof upsertCoachProfile>[0],
  specialitiesJson: string,
  credentialsJson: string
) {
  const rows = await prisma.$queryRaw<Array<Omit<CoachProfileRow, "client_capacity_limit">>>(Prisma.sql`
    INSERT INTO "coach_profiles"
      (
        "id",
        "organization_id",
        "user_id",
        "professional_title",
        "phone",
        "photo_file_name",
        "bio",
        "philosophy",
        "specialities_json",
        "credentials_json",
        "updated_at"
      )
    VALUES
      (
        ${input.id},
        ${input.organizationId},
        ${input.userId},
        ${input.professionalTitle ?? null},
        ${input.phone ?? null},
        ${input.photoFileName ?? null},
        ${input.bio ?? null},
        ${input.philosophy ?? null},
        CAST(${specialitiesJson} AS JSONB),
        CAST(${credentialsJson} AS JSONB),
        now()
      )
    ON CONFLICT ("organization_id", "user_id") DO UPDATE SET
      "professional_title" = EXCLUDED."professional_title",
      "phone" = EXCLUDED."phone",
      "photo_file_name" = EXCLUDED."photo_file_name",
      "bio" = EXCLUDED."bio",
      "philosophy" = EXCLUDED."philosophy",
      "specialities_json" = EXCLUDED."specialities_json",
      "credentials_json" = EXCLUDED."credentials_json",
      "updated_at" = now()
    RETURNING
      "professional_title",
      "phone",
      "photo_file_name",
      "bio",
      "philosophy",
      "specialities_json",
      "credentials_json"
  `);

  return rows.map((row) => ({ ...row, client_capacity_limit: null }));
}

function serializeCoachProfile(
  user: { id: string; name: string | null; email: string | null; image: string | null } | null,
  profile: CoachProfileRow | null
) {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    professionalTitle: profile?.professional_title ?? "",
    phone: profile?.phone ?? "",
    photoFileName: profile?.photo_file_name ?? user?.image ?? "",
    bio: profile?.bio ?? "",
    philosophy: profile?.philosophy ?? "",
    specialities: parseStringArray(profile?.specialities_json),
    credentials: parseCredentials(profile?.credentials_json),
    clientCapacityLimit: profile?.client_capacity_limit ?? 40
  };
}

function parseStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseCredentials(value: unknown) {
  const parsed = z.array(credentialSchema).safeParse(value);

  return parsed.success ? parsed.data : [];
}

function isUniqueEmailError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
