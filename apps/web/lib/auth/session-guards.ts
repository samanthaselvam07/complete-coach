import type { Session } from "next-auth";

import { assertCapability, type Capability } from "@/lib/auth/permissions";
import type { ActorContext } from "@/lib/auth/tenant";

export type AppSession = Session;

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Unauthenticated: a valid session is required");
    this.name = "AuthenticationRequiredError";
  }
}

export class ActiveOrganizationRequiredError extends Error {
  constructor() {
    super("Authenticated session requires an active organization");
    this.name = "ActiveOrganizationRequiredError";
  }
}

export class ActiveClientRequiredError extends Error {
  constructor() {
    super("Authenticated client session requires a linked client profile");
    this.name = "ActiveClientRequiredError";
  }
}

export class PlatformBillingAccessRequiredError extends Error {
  constructor(readonly message: string) {
    super(message);
    this.name = "PlatformBillingAccessRequiredError";
  }
}

export function requireAuthenticatedSession(session: AppSession | null) {
  if (!session?.user?.id) {
    throw new AuthenticationRequiredError();
  }

  return session;
}

export function requireActiveActor(
  session: AppSession | null,
  requiredCapability?: Capability
): ActorContext {
  const authenticatedSession = requireAuthenticatedSession(session);
  const organization = authenticatedSession.activeOrganization;

  if (!organization) {
    throw new ActiveOrganizationRequiredError();
  }

  if (requiredCapability) {
    assertCapability(organization.role, requiredCapability);
  }

  if (
    organization.platformAccess &&
    !organization.platformAccess.canUsePlatform &&
    organization.platformAccess.reason !== "subscription_required" &&
    requiredCapability !== "payments:read" &&
    requiredCapability !== "payments:manage"
  ) {
    throw new PlatformBillingAccessRequiredError(organization.platformAccess.message);
  }

  return {
    userId: authenticatedSession.user.id,
    organizationId: organization.id,
    organizationSlug: organization.slug,
    organizationName: organization.name,
    role: organization.role
  };
}

export function requireActiveClientActor(session: AppSession | null): ActorContext & {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientTimezone: string;
} {
  const actor = requireActiveActor(session);
  const activeClient = requireAuthenticatedSession(session).activeClient;

  if (actor.role !== "client" || !activeClient || activeClient.organizationId !== actor.organizationId) {
    throw new ActiveClientRequiredError();
  }

  return {
    ...actor,
    clientId: activeClient.id,
    clientName: activeClient.name,
    clientEmail: activeClient.email,
    clientTimezone: activeClient.timezone
  };
}
