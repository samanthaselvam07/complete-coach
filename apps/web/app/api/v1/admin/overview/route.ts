import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { buildAdminSummary } from "@/lib/admin/admin-records";
import {
  handlePlatformAdminGuardError,
  requirePlatformAdmin
} from "@/lib/admin/platform-admin";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    requirePlatformAdmin(await auth());

    const organizations = await prisma.organization.findMany({
      where: {
        deletedAt: null
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        clientSubscriptions: {
          orderBy: { updatedAt: "desc" },
          take: 5,
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

    return dataResponse(buildAdminSummary(organizations));
  } catch (error) {
    const guardError = handlePlatformAdminGuardError(error);

    if (guardError) {
      return errorResponse(guardError.code, guardError.message, guardError.status);
    }

    return handleApiError(error);
  }
}
