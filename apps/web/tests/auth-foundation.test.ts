import { describe, expect, it } from "vitest";

import {
  ALL_CAPABILITIES,
  assertCapability,
  getCapabilitiesForRole,
  hasCapability,
  type MembershipRole
} from "@/lib/auth/permissions";
import {
  assertOrganizationAccess,
  resolveActiveOrganization,
  scopeTenantWhere,
  type MembershipSummary
} from "@/lib/auth/tenant";
import { createActiveOrganizationSession } from "@/lib/auth/session-organization";
import { buildAuditEvent } from "@/lib/audit/audit-log";
import { parseServerEnv } from "@/lib/env";
import { getLocalEnvFileCandidates } from "@/lib/env-loader";

describe("server environment validation", () => {
  it("looks for the repository root env file before app-local overrides", () => {
    expect(getLocalEnvFileCandidates("/Users/sam/projects/complete-coach/apps/web")).toEqual([
      "/Users/sam/projects/complete-coach/.env",
      "/Users/sam/projects/complete-coach/apps/web/.env",
      "/Users/sam/projects/complete-coach/.env.local",
      "/Users/sam/projects/complete-coach/apps/web/.env.local"
    ]);
  });

  it("falls back to the canonical checkout env files from sibling worktrees", () => {
    expect(getLocalEnvFileCandidates("/Users/sam/projects/complete-coach-Clients/apps/web")).toEqual([
      "/Users/sam/projects/complete-coach-Clients/.env",
      "/Users/sam/projects/complete-coach-Clients/apps/web/.env",
      "/Users/sam/projects/complete-coach-Clients/.env.local",
      "/Users/sam/projects/complete-coach-Clients/apps/web/.env.local",
      "/Users/sam/projects/complete-coach/.env",
      "/Users/sam/projects/complete-coach/apps/web/.env",
      "/Users/sam/projects/complete-coach/.env.local",
      "/Users/sam/projects/complete-coach/apps/web/.env.local"
    ]);
  });

  it("accepts valid Auth.js and Neon/PostgreSQL environment values", () => {
    const env = parseServerEnv({
      AUTH_SECRET: "a".repeat(32),
      DATABASE_URL: "postgresql://user:pass@example.com/neondb?sslmode=require",
      DIRECT_URL: "postgresql://user:pass@direct.example.com/neondb?sslmode=require",
      NEXTAUTH_URL: "http://localhost:3000",
      SENTRY_DSN: "https://public@example.ingest.sentry.io/123"
    });

    expect(env.AUTH_SECRET).toHaveLength(32);
    expect(env.DATABASE_URL).toContain("postgresql://");
    expect(env.DIRECT_URL).toContain("direct.example.com");
    expect(env.SENTRY_DSN).toContain("sentry.io");
  });

  it("rejects missing secrets and non-PostgreSQL database URLs", () => {
    expect(() =>
      parseServerEnv({
        AUTH_SECRET: "short",
        DATABASE_URL: "mysql://user:pass@example.com/db"
      })
    ).toThrow(/AUTH_SECRET|DATABASE_URL/);
  });
});

describe("role capability mapping", () => {
  it.each<MembershipRole>(["owner", "admin", "coach", "assistant", "client"])(
    "defines capabilities for %s",
    (role) => {
      expect(getCapabilitiesForRole(role).length).toBeGreaterThan(0);
    }
  );

  it("grants owners every application capability", () => {
    expect(getCapabilitiesForRole("owner")).toEqual(ALL_CAPABILITIES);
  });

  it("keeps clients away from team and payment administration", () => {
    expect(hasCapability("client", "team:manage")).toBe(false);
    expect(hasCapability("client", "payments:manage")).toBe(false);
    expect(hasCapability("client", "messages:read")).toBe(true);
  });

  it("throws a stable forbidden error when a role lacks a capability", () => {
    expect(() => assertCapability("assistant", "payments:manage")).toThrow(/Forbidden/);
  });
});

describe("tenant organization resolution", () => {
  const memberships: MembershipSummary[] = [
    {
      organizationId: "org_alpha",
      organizationSlug: "alpha",
      organizationName: "Alpha Performance",
      role: "coach",
      status: "active"
    },
    {
      organizationId: "org_beta",
      organizationSlug: "beta",
      organizationName: "Beta Strength",
      role: "owner",
      status: "invited"
    }
  ];

  it("resolves the first active membership by default", () => {
    expect(resolveActiveOrganization(memberships)).toMatchObject({
      organizationId: "org_alpha",
      role: "coach"
    });
  });

  it("rejects inactive or unknown requested organizations", () => {
    expect(() => resolveActiveOrganization(memberships, "org_beta")).toThrow(/No active/);
    expect(() => resolveActiveOrganization(memberships, "org_missing")).toThrow(/No active/);
  });

  it("enforces organization access before tenant-owned operations", () => {
    expect(() => assertOrganizationAccess(memberships, "org_alpha", "clients:read")).not.toThrow();
    expect(() => assertOrganizationAccess(memberships, "org_alpha", "payments:manage")).toThrow(
      /Forbidden/
    );
    expect(() => assertOrganizationAccess(memberships, "org_beta", "clients:read")).toThrow(
      /No active/
    );
  });

  it("always applies the actor organization id to tenant-scoped Prisma filters", () => {
    expect(scopeTenantWhere("org_alpha", { status: "active" })).toEqual({
      status: "active",
      organizationId: "org_alpha"
    });

    expect(scopeTenantWhere("org_alpha", { organizationId: "org_beta" })).toEqual({
      organizationId: "org_alpha"
    });
  });
});

describe("active organization session mapping", () => {
  it("maps current platform billing status into session access", () => {
    expect(
      createActiveOrganizationSession({
        organizationId: "org_1",
        role: "OWNER",
        organization: {
          slug: "complete-coach-demo",
          name: "Complete Coach Demo",
          platformSubscriptionStatus: "active"
        }
      })
    ).toEqual({
      id: "org_1",
      slug: "complete-coach-demo",
      name: "Complete Coach Demo",
      role: "owner",
      platformAccess: {
        state: "active",
        canUsePlatform: true,
        reason: "subscription_active",
        message: "Platform access is active."
      }
    });

    expect(
      createActiveOrganizationSession({
        organizationId: "org_1",
        role: "OWNER",
        organization: {
          slug: "complete-coach-demo",
          name: "Complete Coach Demo",
          platformSubscriptionStatus: "incomplete"
        }
      }).platformAccess
    ).toMatchObject({
      state: "blocked",
      canUsePlatform: false,
      reason: "subscription_inactive"
    });
  });
});

describe("audit event baseline", () => {
  it("builds structured audit events without hardcoding secrets or credentials", () => {
    expect(
      buildAuditEvent({
        action: "membership.role_changed",
        actorUserId: "user_1",
        organizationId: "org_1",
        targetType: "organization_membership",
        targetId: "membership_1",
        metadata: { from: "coach", to: "admin" }
      })
    ).toMatchObject({
      action: "membership.role_changed",
      actorUserId: "user_1",
      organizationId: "org_1",
      targetType: "organization_membership",
      targetId: "membership_1",
      metadata: { from: "coach", to: "admin" }
    });
  });
});
