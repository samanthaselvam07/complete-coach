import { z } from "zod";

import type { AppSession } from "@/lib/auth/session-guards";
import { AuthenticationRequiredError, requireAuthenticatedSession } from "@/lib/auth/session-guards";

const fallbackPlatformAdminEmails = ["sammi@completecoach.fit", "samantha.selvam07@gmail.com"];

export class PlatformAdminForbiddenError extends Error {
  constructor() {
    super("Forbidden: platform administrator access is required");
    this.name = "PlatformAdminForbiddenError";
  }
}

export interface PlatformAdminActor {
  userId: string;
  email: string;
}

export function getPlatformAdminEmails() {
  const configuredEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set(configuredEmails.length > 0 ? configuredEmails : fallbackPlatformAdminEmails);
}

export function isPlatformAdminEmail(email: string | null | undefined) {
  return Boolean(email && getPlatformAdminEmails().has(email.toLowerCase()));
}

export function requirePlatformAdmin(session: AppSession | null): PlatformAdminActor {
  const authenticatedSession = requireAuthenticatedSession(session);
  const email = authenticatedSession.user.email;

  if (!email || !isPlatformAdminEmail(email)) {
    throw new PlatformAdminForbiddenError();
  }

  return {
    userId: authenticatedSession.user.id,
    email
  };
}

export function handlePlatformAdminGuardError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return {
      code: "unauthorized",
      message: "Authentication is required.",
      status: 401
    };
  }

  if (error instanceof PlatformAdminForbiddenError) {
    return {
      code: "platform_admin_required",
      message: "Platform administrator access is required.",
      status: 403
    };
  }

  return null;
}

export const adminCreateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  ownerEmail: z.string().trim().email().max(320),
  ownerName: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).max(80).default("Australia/Melbourne").refine(isSupportedTimezone, "Select a valid timezone.")
});

export const adminPlatformSubscriptionSyncSchema = z.object({
  planId: z.enum(["design_partner", "core", "pro", "scale"])
});

export type AdminCreateOrganizationInput = z.infer<typeof adminCreateOrganizationSchema>;
export type AdminPlatformSubscriptionSyncInput = z.infer<typeof adminPlatformSubscriptionSyncSchema>;

function isSupportedTimezone(timezone: string) {
  if (typeof Intl.supportedValuesOf !== "function") {
    try {
      new Intl.DateTimeFormat("en-AU", { timeZone: timezone }).format(new Date());
      return true;
    } catch {
      return false;
    }
  }

  return Intl.supportedValuesOf("timeZone").includes(timezone);
}
