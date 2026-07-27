export type PlatformBillingAccessState = "active" | "warning" | "blocked";

export interface PlatformBillingAccess {
  state: PlatformBillingAccessState;
  canUsePlatform: boolean;
  reason:
    | "subscription_active"
    | "payment_attention_required"
    | "subscription_canceling"
    | "subscription_inactive"
    | "subscription_required";
  message: string;
}

export function evaluatePlatformBillingAccess(status: string | null | undefined): PlatformBillingAccess {
  const normalizedStatus = status ?? "not_started";

  if (normalizedStatus === "active" || normalizedStatus === "trialing") {
    return {
      state: "active",
      canUsePlatform: true,
      reason: "subscription_active",
      message: "Platform access is active."
    };
  }

  if (normalizedStatus === "not_started") {
    return {
      state: "warning",
      canUsePlatform: true,
      reason: "subscription_required",
      message: "Choose a Complete Coach plan to keep platform access active."
    };
  }

  return {
    state: "blocked",
    canUsePlatform: false,
    reason: normalizedStatus === "past_due" ? "payment_attention_required" : "subscription_inactive",
    message:
      normalizedStatus === "past_due"
        ? "Platform access is paused because the subscription payment is overdue."
        : "Platform access is paused until billing is active."
  };
}
