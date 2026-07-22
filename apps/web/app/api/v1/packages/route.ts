import { ClientSubscriptionStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import {
  buildPackageWhere,
  createPackageSchema,
  getPackageCreateData,
  packageListQuerySchema,
  serializePackage
} from "@/lib/payments/package-records";

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "payments:read");
    const query = packageListQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const packages = await prisma.coachingPackage.findMany({
      where: buildPackageWhere(actor.organizationId, query),
      orderBy: [{ status: "asc" }, { name: "asc" }],
      take: query.limit,
      include: {
        _count: {
          select: {
            subscriptions: {
              where: { status: ClientSubscriptionStatus.ACTIVE }
            }
          }
        },
        subscriptions: {
          select: {
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAt: true,
            createdAt: true,
            updatedAt: true,
            client: {
              select: {
                status: true,
                archivedAt: true
              }
            }
          }
        }
      }
    });

    return dataResponse(packages.map(serializePackage));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "payments:manage");
    const input = createPackageSchema.parse(await request.json());
    const coachingPackage = await prisma.coachingPackage.create({
      data: getPackageCreateData(actor.organizationId, actor.userId, input)
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "package.created",
        targetType: "package",
        targetId: coachingPackage.id,
        metadata: {
          priceAmount: input.priceAmount,
          currency: input.currency,
          billingInterval: input.billingInterval
        }
      }
    });

    return dataResponse(serializePackage(coachingPackage), {
      status: 201,
      headers: { Location: `/api/v1/packages/${coachingPackage.id}` }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
