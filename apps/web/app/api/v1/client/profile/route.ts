import { hash } from "bcryptjs";
import { z } from "zod";

import { ClientStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

const profilePhotoSchema = z
  .string()
  .trim()
  .max(350_000)
  .regex(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/);

const clientProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().max(240).optional(),
  phone: z.string().trim().max(60).optional(),
  password: z.string().min(8).max(128).optional(),
  photoDataUrl: z.union([profilePhotoSchema, z.literal("")]).optional()
});

const deleteClientProfileSchema = z.object({
  confirmation: z.literal("DELETE")
});

export async function GET() {
  try {
    const actor = requireActiveClientActor(await auth());
    const [user, client] = await Promise.all([
      prisma.user.findUnique({
        where: { id: actor.userId },
        select: { id: true, name: true, email: true, image: true }
      }),
      findLinkedClient(actor)
    ]);

    if (!user) {
      return errorResponse("not_found", "Client account not found.", 404);
    }

    return dataResponse(serializeClientProfile(user, client));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const input = clientProfileSchema.parse(await request.json());
    const currentClient = await findLinkedClient(actor);
    const firstName = input.firstName ?? currentClient.firstName;
    const lastName = input.lastName ?? currentClient.lastName;
    const email = input.email ?? currentClient.email;
    const passwordHash = input.password ? await hash(input.password, 12) : undefined;
    const userData = {
      name: `${firstName} ${lastName}`.trim(),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.photoDataUrl !== undefined ? { image: input.photoDataUrl || null } : {}),
      ...(passwordHash ? { passwordHash, authProvider: "credentials" } : {})
    };

    let updatedProfile: ReturnType<typeof serializeClientProfile>;

    try {
      updatedProfile = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
          where: { id: actor.userId },
          data: userData,
          select: { id: true, name: true, email: true, image: true }
        });

        const updatedClient = await tx.client.update({
          where: { id: actor.clientId, organizationId: actor.organizationId },
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            timezone: true,
            status: true
          }
        });

        return serializeClientProfile(updatedUser, updatedClient, email);
      });
    } catch (error) {
      if (isUniqueEmailError(error)) {
        return errorResponse("email_already_exists", "That email address is already in use.", 409);
      }

      throw error;
    }

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "client.profile_updated",
        targetType: "client",
        targetId: actor.clientId,
        metadata: {
          updatedPassword: Boolean(input.password),
          updatedPhoto: input.photoDataUrl !== undefined
        }
      }
    });

    return dataResponse(updatedProfile);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    deleteClientProfileSchema.parse(await request.json());

    await prisma.$transaction(async (tx) => {
      const deletedAt = new Date();

      await tx.client.update({
        where: { id: actor.clientId, organizationId: actor.organizationId },
        data: {
          status: ClientStatus.DEACTIVATED,
          clientUserId: null,
          archivedAt: deletedAt,
          deletedAt
        }
      });

      await tx.session.deleteMany({ where: { userId: actor.userId } });
      await tx.account.deleteMany({ where: { userId: actor.userId } });
      await tx.user.update({
        where: { id: actor.userId },
        data: {
          name: "Deleted client",
          email: null,
          image: null,
          passwordHash: null,
          authProvider: "deleted",
          authProviderAccountId: null
        }
      });

      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: "client.account_deleted",
          targetType: "client",
          targetId: actor.clientId,
          metadata: { selfRequested: true }
        }
      });
    });

    return dataResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

function findLinkedClient(actor: { clientId: string; organizationId: string; userId: string }) {
  return prisma.client.findFirstOrThrow({
    where: {
      id: actor.clientId,
      organizationId: actor.organizationId,
      clientUserId: actor.userId,
      deletedAt: null
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      timezone: true,
      status: true
    }
  });
}

function serializeClientProfile(
  user: { id: string; name: string | null; email: string | null; image: string | null } | null,
  client: Awaited<ReturnType<typeof findLinkedClient>>,
  fallbackEmail?: string | null
) {
  return {
    user: {
      id: user?.id ?? "",
      name: user?.name ?? `${client.firstName} ${client.lastName}`.trim(),
      email: user?.email ?? fallbackEmail ?? client.email ?? "",
      photoUrl: user?.image ?? null
    },
    client: {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email ?? "",
      phone: client.phone ?? "",
      timezone: client.timezone,
      status: client.status
    },
    privacyPolicyUrl: "/privacy-policy"
  };
}

function isUniqueEmailError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
