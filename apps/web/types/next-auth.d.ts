import type { DefaultSession } from "next-auth";
import type { MembershipRole } from "@/lib/auth/permissions";
import type { PlatformBillingAccess } from "@/lib/platform-billing/rules";

export interface ActiveOrganizationSession {
  id: string;
  slug: string;
  name: string;
  role: MembershipRole;
  platformAccess?: PlatformBillingAccess;
  founderOnboardingRequired: boolean;
  founderOnboardingCompleted: boolean;
}

export interface ActiveClientSession {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  timezone: string;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    activeOrganization?: ActiveOrganizationSession;
    activeClient?: ActiveClientSession;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    activeOrganization?: ActiveOrganizationSession;
    activeClient?: ActiveClientSession;
  }
}
