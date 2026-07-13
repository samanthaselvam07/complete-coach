import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";
import { getPlatformUsage } from "@/lib/platform-billing/limits";
import { getDefaultPlatformPlan, getPlatformPlanById } from "@/lib/platform-billing/plans";
import { evaluatePlatformBillingAccess } from "@/lib/platform-billing/rules";

export async function GET() {
  try {
    const actor = requireActiveActor(await auth(), "payments:read");
    const organization = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: {
        platformPlan: true,
        platformStripeCustomerId: true,
        platformStripeSubscriptionId: true,
        platformSubscriptionStatus: true,
        platformCurrentPeriodEnd: true
      }
    });
    const plan = getPlatformPlanById(organization?.platformPlan) ?? getDefaultPlatformPlan();
    const usage = await getPlatformUsage(actor.organizationId);
    const status = organization?.platformSubscriptionStatus ?? "not_started";
    const currentPeriodEnd = organization?.platformCurrentPeriodEnd ?? null;

    return dataResponse({
      plan,
      status,
      access: evaluatePlatformBillingAccess(status),
      stripeCustomerId: organization?.platformStripeCustomerId ?? null,
      stripeSubscriptionId: organization?.platformStripeSubscriptionId ?? null,
      currentPeriodEnd: currentPeriodEnd?.toISOString() ?? null,
      usage
    });
  } catch (error) {
    return handleApiError(error);
  }
}
