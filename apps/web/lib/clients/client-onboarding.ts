import { createHash, randomBytes } from "node:crypto";

import { ClientSubscriptionStatus } from "@/app/generated/prisma/enums";
import { sendTransactionalEmail } from "@/lib/email/resend";

export const CLIENT_ONBOARDING_TOKEN_PREFIX = "client-onboarding";
const CLIENT_ONBOARDING_TOKEN_DAYS = 7;

export function generateClientOnboardingToken() {
  return randomBytes(32).toString("base64url");
}

export function hashClientOnboardingToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getClientOnboardingIdentifier(clientId: string) {
  return `${CLIENT_ONBOARDING_TOKEN_PREFIX}:${clientId}`;
}

export function getClientOnboardingExpiry(now = new Date()) {
  return new Date(now.getTime() + CLIENT_ONBOARDING_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}

export function buildClientOnboardingUrl(requestUrl: string, token: string) {
  return new URL(`/client-onboarding/${token}`, new URL(requestUrl).origin).toString();
}

export function isPaidClientSubscriptionStatus(status: ClientSubscriptionStatus) {
  return status === ClientSubscriptionStatus.ACTIVE || status === ClientSubscriptionStatus.TRIALING;
}

export async function sendClientOnboardingEmail(input: {
  organizationId: string;
  organizationName: string;
  clientEmail: string;
  clientName: string;
  setupUrl: string;
  checkoutUrl?: string;
  packageName?: string | null;
}) {
  const requiresPayment = Boolean(input.checkoutUrl);
  const actionUrl = input.checkoutUrl ?? input.setupUrl;
  const subject = requiresPayment
    ? `${input.organizationName}: complete payment and set up your account`
    : `${input.organizationName}: set up your Complete Coach account`;
  const paymentCopy = requiresPayment
    ? `Your coach has assigned ${input.packageName ?? "your coaching package"}. Please complete payment first, then you will be redirected to set up your login.`
    : "Use the secure link below to set up your login.";

  return sendTransactionalEmail({
    organizationId: input.organizationId,
    toEmail: input.clientEmail,
    subject,
    text: [
      `Hi ${input.clientName},`,
      "",
      `${input.organizationName} has invited you to Complete Coach.`,
      paymentCopy,
      "",
      actionUrl,
      "",
      "This link expires in 7 days."
    ].join("\n"),
    html: [
      `<p>Hi ${escapeHtml(input.clientName)},</p>`,
      `<p>${escapeHtml(input.organizationName)} has invited you to Complete Coach.</p>`,
      `<p>${escapeHtml(paymentCopy)}</p>`,
      `<p><a href="${escapeHtml(actionUrl)}">${requiresPayment ? "Pay and set up account" : "Set up account"}</a></p>`,
      "<p>This link expires in 7 days.</p>"
    ].join(""),
    metadata: {
      type: "client_onboarding",
      requiresPayment
    }
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
