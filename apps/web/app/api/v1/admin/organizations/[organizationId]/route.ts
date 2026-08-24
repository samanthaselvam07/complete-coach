import { OrganizationStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { serializeAdminOrganizationDetail } from "@/lib/admin/admin-records";
import {
  handlePlatformAdminGuardError,
  requirePlatformAdmin
} from "@/lib/admin/platform-admin";
import { prisma } from "@/lib/db/prisma";

interface AdminOrganizationRouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function GET(_request: Request, context: AdminOrganizationRouteContext) {
  try {
    requirePlatformAdmin(await auth());

    const { organizationId } = await context.params;
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        memberships: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        clients: {
          orderBy: { updatedAt: "desc" },
          take: 12,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
            packageName: true,
            compliance: true,
            timezone: true,
            startDate: true,
            latestCheckInAt: true,
            createdAt: true,
            primaryCoach: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        packages: {
          orderBy: { updatedAt: "desc" },
          take: 12,
          include: {
            createdBy: {
              select: {
                name: true,
                email: true
              }
            },
            _count: {
              select: {
                subscriptions: true
              }
            }
          }
        },
        clientSubscriptions: {
          orderBy: { updatedAt: "desc" },
          take: 12,
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            },
            coachingPackage: {
              select: {
                name: true,
                priceAmount: true,
                currency: true
              }
            }
          }
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            action: true,
            targetType: true,
            targetId: true,
            createdAt: true,
            actor: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            clients: true,
            memberships: true,
            packages: true,
            clientSubscriptions: true
          }
        }
      }
    });

    if (!organization) {
      return errorResponse("not_found", "Organization not found.", 404);
    }

    return dataResponse(serializeAdminOrganizationDetail(organization));
  } catch (error) {
    const guardError = handlePlatformAdminGuardError(error);

    if (guardError) {
      return errorResponse(guardError.code, guardError.message, guardError.status);
    }

    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: AdminOrganizationRouteContext) {
  try {
    const actor = requirePlatformAdmin(await auth());
    const { organizationId } = await context.params;
    const existingOrganization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        status: true,
        deletedAt: true
      }
    });

    if (!existingOrganization) {
      return errorResponse("not_found", "Organization not found.", 404);
    }

    const deletedAt = existingOrganization.deletedAt ?? new Date();
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        status: OrganizationStatus.ARCHIVED,
        deletedAt
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        deletedAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: actor.userId,
        action: "platform.organization.archived",
        targetType: "organization",
        targetId: organizationId,
        metadata: {
          previousStatus: existingOrganization.status,
          previousDeletedAt: existingOrganization.deletedAt,
          organizationName: existingOrganization.name
        }
      }
    });

    return dataResponse({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: "archived",
      deletedAt: organization.deletedAt?.toISOString() ?? null
    });
  } catch (error) {
    const guardError = handlePlatformAdminGuardError(error);

    if (guardError) {
      return errorResponse(guardError.code, guardError.message, guardError.status);
    }

    return handleApiError(error);
  }
}
