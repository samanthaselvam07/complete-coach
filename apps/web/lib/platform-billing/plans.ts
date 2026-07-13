export type PlatformPlanId = "core" | "scale";

export interface PlatformPlan {
  id: PlatformPlanId;
  name: string;
  stripeProductId: string;
  stripePriceId: string;
  coachSeatLimit: number;
  clientLimit: number;
}

export const PLATFORM_PLANS: Record<PlatformPlanId, PlatformPlan> = {
  core: {
    id: "core",
    name: "Core",
    stripeProductId: "prod_UsL4rRweWAB2XU",
    stripePriceId: "price_1TsaNxI51UQp7jCTVYdYxNIC",
    coachSeatLimit: 1,
    clientLimit: 40
  },
  scale: {
    id: "scale",
    name: "Scale",
    stripeProductId: "prod_UsL4hUCHyBkvkK",
    stripePriceId: "price_1TsaOPI51UQp7jCTB9TvXUIK",
    coachSeatLimit: 3,
    clientLimit: 60
  }
};

export function getPlatformPlanById(planId: string | null | undefined) {
  return isPlatformPlanId(planId) ? PLATFORM_PLANS[planId] : null;
}

export function getPlatformPlanByPriceId(priceId: string | null | undefined) {
  return Object.values(PLATFORM_PLANS).find((plan) => plan.stripePriceId === priceId) ?? null;
}

export function getDefaultPlatformPlan() {
  return PLATFORM_PLANS.core;
}

export function isPlatformPlanId(planId: unknown): planId is PlatformPlanId {
  return typeof planId === "string" && planId in PLATFORM_PLANS;
}
