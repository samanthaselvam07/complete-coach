export type PlatformPlanId = "design_partner" | "core" | "pro" | "scale";

export interface PlatformPlan {
  id: PlatformPlanId;
  name: string;
  stripeProductId: string;
  stripePriceId: string;
  stripePaymentLinkUrl: string;
  coachSeatLimit: number;
  clientLimit: number;
}

export const PLATFORM_PLANS: Record<PlatformPlanId, PlatformPlan> = {
  design_partner: {
    id: "design_partner",
    name: "Design Partners",
    stripeProductId: "prod_UsKvRz38e79sjQ",
    stripePriceId: "price_1TsaFuI51UQp7jCTfRTLC7UH",
    stripePaymentLinkUrl: "https://buy.stripe.com/6oU4gzgYk1X71ZagMJ0ZW04",
    coachSeatLimit: 10,
    clientLimit: 200
  },
  core: {
    id: "core",
    name: "Core",
    stripeProductId: "prod_UsL4rRweWAB2XU",
    stripePriceId: "price_1Tvoc2I51UQp7jCTLDt3lc9w",
    stripePaymentLinkUrl: "https://buy.stripe.com/cNi00jgYkbxHeLW2VT0ZW02",
    coachSeatLimit: 1,
    clientLimit: 40
  },
  pro: {
    id: "pro",
    name: "Pro",
    stripeProductId: "prod_UsL4hUCHyBkvkK",
    stripePriceId: "price_1TsaOPI51UQp7jCTB9TvXUIK",
    stripePaymentLinkUrl: "https://buy.stripe.com/cNi7sLdM8fNX0V6gMJ0ZW00",
    coachSeatLimit: 3,
    clientLimit: 60
  },
  scale: {
    id: "scale",
    name: "Scale",
    stripeProductId: "prod_UvfzpLEEOi5N4H",
    stripePriceId: "price_1TvoddI51UQp7jCTIwk4C6rI",
    stripePaymentLinkUrl: "https://buy.stripe.com/aFafZh6jG6dnbzK9kh0ZW03",
    coachSeatLimit: 10,
    clientLimit: 200
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
