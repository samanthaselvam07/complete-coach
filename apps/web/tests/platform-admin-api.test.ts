import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ClientStatus,
  ClientSubscriptionStatus,
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  PackageBillingInterval,
  PackageStatus
} from "@/app/generated/prisma/enums";
import { GET as getAdminOverview } from "@/app/api/v1/admin/overview/route";
import { POST as createAdminOrganization } from "@/app/api/v1/admin/organizations/route";
import {
  DELETE as archiveAdminOrganization,
  GET as getAdminOrganizationDetail
} from "@/app/api/v1/admin/organizations/[organizationId]/route";
import {
  GET as listAdminPlatformSubscriptions,
  POST as syncAdminPlatformSubscription
} from "@/app/api/v1/admin/organizations/[organizationId]/platform-subscription/route";
import { isPlatformAdminEmail } from "@/lib/admin/platform-admin";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  fetch: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    auditLog: { create: vi.fn() },
    client: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    coachingPackage: {
      findFirst: vi.fn()
    },
    organization: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    user: {
      upsert: vi.fn()
    },
    clientSubscription: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  },
  sendTransactionalEmail: vi.fn()
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

vi.mock("@/lib/email/resend", () => ({
  sendTransactionalEmail: mocks.sendTransactionalEmail
}));

const platformAdminSession = {
  user: { id: "user_admin", email: "sammi@completecoach.fit", name: "Sammi" },
  activeOrganization: {
    id: "org_owner",
    slug: "complete-coach",
    name: "Complete Coach",
    role: "owner"
  }
};

const coachSession = {
  ...platformAdminSession,
  user: { id: "user_coach", email: "coach@example.com", name: "Coach" }
};

const now = new Date("2026-06-29T00:00:00.000Z");

const subscriptionRecord = {
  id: "sub_1",
  organizationId: "org_1",
  clientId: "client_1",
  packageId: "package_1",
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: "stripe_sub_1",
  stripeCheckoutSessionId: "checkout_1",
  status: ClientSubscriptionStatus.ACTIVE,
  currentPeriodStart: now,
  currentPeriodEnd: new Date("2026-07-29T00:00:00.000Z"),
  cancelAt: null,
  createdAt: now,
  updatedAt: now,
  client: {
    firstName: "Client",
    lastName: "One",
    email: "client@example.com"
  },
  coachingPackage: {
    name: "Scale Plan",
    priceAmount: 4900,
    currency: "aud",
    billingInterval: PackageBillingInterval.MONTHLY,
    status: PackageStatus.ACTIVE
  }
};

const organizationRecord = {
  id: "org_1",
  name: "Demo Coaching",
  slug: "demo-coaching",
  status: OrganizationStatus.ACTIVE,
  timezone: "Australia/Melbourne",
  stripeConnectStatus: "enabled",
  platformPlan: "core",
  platformStripeCustomerId: "cus_platform_1",
  platformStripeSubscriptionId: "sub_platform_1",
  platformSubscriptionStatus: "active",
  platformCurrentPeriodStart: now,
  platformCurrentPeriodEnd: new Date("2026-07-29T00:00:00.000Z"),
  platformCancelAt: null,
  createdAt: now,
  updatedAt: now,
  memberships: [
    {
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
      user: {
        name: "Demo Owner",
        email: "owner@example.com"
      }
    }
  ],
  clientSubscriptions: [subscriptionRecord],
  _count: {
    clients: 12,
    memberships: 2,
    packages: 3,
    clientSubscriptions: 1
  }
};

const organizationDetailRecord = {
  ...organizationRecord,
  deletedAt: null,
  stripeConnectAccountId: "acct_1",
  clients: [
    {
      id: "client_1",
      firstName: "Client",
      lastName: "One",
      email: "client@example.com",
      phone: null,
      status: ClientStatus.ACTIVE,
      packageName: "Scale Plan",
      compliance: 92,
      timezone: "Australia/Melbourne",
      startDate: now,
      latestCheckInAt: now,
      createdAt: now,
      primaryCoach: {
        name: "Demo Owner",
        email: "owner@example.com"
      }
    }
  ],
  packages: [
    {
      id: "package_1",
      name: "Scale Plan",
      description: "Monthly coaching package",
      priceAmount: 4900,
      currency: "aud",
      billingInterval: PackageBillingInterval.MONTHLY,
      status: PackageStatus.ACTIVE,
      stripeProductId: "prod_1",
      stripePriceId: "price_1",
      createdAt: now,
      updatedAt: now,
      createdBy: {
        name: "Demo Owner",
        email: "owner@example.com"
      },
      _count: {
        subscriptions: 1
      }
    }
  ],
  auditLogs: [
    {
      id: "audit_1",
      action: "platform.organization.created",
      targetType: "organization",
      targetId: "org_1",
      createdAt: now,
      actor: {
        name: "Sammi",
        email: "sammi@completecoach.fit"
      }
    }
  ]
};

describe("platform admin APIs", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(platformAdminSession);
    mocks.prisma.$transaction.mockReset();
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.client.findFirst.mockReset();
    mocks.prisma.client.update.mockReset();
    mocks.prisma.coachingPackage.findFirst.mockReset();
    mocks.prisma.organization.create.mockReset();
    mocks.prisma.organization.findFirst.mockReset();
    mocks.prisma.organization.findMany.mockReset();
    mocks.prisma.organization.findUnique.mockReset();
    mocks.prisma.organization.update.mockReset();
    mocks.prisma.user.upsert.mockReset();
    mocks.prisma.clientSubscription.create.mockReset();
    mocks.prisma.clientSubscription.findUnique.mockReset();
    mocks.prisma.clientSubscription.update.mockReset();
    mocks.fetch.mockReset();
    vi.stubGlobal("fetch", mocks.fetch);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_admin_console");
    mocks.sendTransactionalEmail.mockReset();
  });

  it("recognizes configured platform owner inboxes", () => {
    expect(isPlatformAdminEmail("sammi@completecoach.fit")).toBe(true);
    expect(isPlatformAdminEmail("samantha.selvam07@gmail.com")).toBe(true);
    expect(isPlatformAdminEmail("coach@example.com")).toBe(false);
  });

  it("returns platform-level metrics and organization billing summaries", async () => {
    mocks.prisma.organization.findMany.mockResolvedValue([organizationRecord]);

    const response = await getAdminOverview();
    const payload = (await response.json()) as {
      data: {
        metrics: { totalOrganizations: number; activeSubscriptions: number };
        organizations: Array<{ id: string; billing: { platform: { planId: string | null; status: string } } }>;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.metrics).toEqual(
      expect.objectContaining({
        totalOrganizations: 1,
        activeSubscriptions: 1
      })
    );
    expect(payload.data.organizations[0]).toEqual(
      expect.objectContaining({
        id: "org_1",
        billing: expect.objectContaining({
          platform: expect.objectContaining({ planId: "core", status: "active" })
        })
      })
    );
  });

  it("rejects non-platform admins before reading platform data", async () => {
    mocks.auth.mockResolvedValue(coachSession);

    const response = await getAdminOverview();
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("platform_admin_required");
    expect(mocks.prisma.organization.findMany).not.toHaveBeenCalled();
  });

  it("returns full organization details for platform admins", async () => {
    mocks.prisma.organization.findUnique.mockResolvedValue(organizationDetailRecord);

    const response = await getAdminOrganizationDetail(
      new Request("http://test.local/api/v1/admin/organizations/org_1"),
      { params: Promise.resolve({ organizationId: "org_1" }) }
    );
    const payload = (await response.json()) as {
      data: {
        id: string;
        team: Array<{ email: string | null }>;
        clients: Array<{ name: string; compliance: number }>;
        packages: Array<{ stripePriceIdPresent: boolean }>;
        auditLogs: Array<{ action: string }>;
        stripeConnect: { accountIdPresent: boolean };
        billing: { platform: { planName: string; stripeSubscriptionId: string | null } };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(
      expect.objectContaining({
        id: "org_1",
        stripeConnect: expect.objectContaining({ accountIdPresent: true }),
        billing: expect.objectContaining({
          platform: expect.objectContaining({ planName: "Core", stripeSubscriptionId: "sub_platform_1" })
        })
      })
    );
    expect(payload.data.team).toEqual([expect.objectContaining({ email: "owner@example.com" })]);
    expect(payload.data.clients).toEqual([expect.objectContaining({ name: "Client One", compliance: 92 })]);
    expect(payload.data.packages).toEqual([expect.objectContaining({ stripePriceIdPresent: true })]);
    expect(payload.data.auditLogs).toEqual([expect.objectContaining({ action: "platform.organization.created" })]);
  });

  it("returns not found when an organization detail record does not exist", async () => {
    mocks.prisma.organization.findUnique.mockResolvedValue(null);

    const response = await getAdminOrganizationDetail(
      new Request("http://test.local/api/v1/admin/organizations/missing"),
      { params: Promise.resolve({ organizationId: "missing" }) }
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("not_found");
  });

  it("creates a manual organization with an invited owner membership", async () => {
    mocks.prisma.organization.findUnique.mockResolvedValue(null);
    mocks.prisma.user.upsert.mockResolvedValue({
      id: "user_owner",
      name: "New Owner",
      email: "owner@newcoaching.com"
    });
    mocks.prisma.organization.create.mockResolvedValue({
      id: "org_new",
      name: "New Coaching",
      slug: "new-coaching",
      memberships: [
        {
          user: {
            name: "New Owner",
            email: "owner@newcoaching.com"
          }
        }
      ]
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createAdminOrganization(
      new Request("http://test.local/api/v1/admin/organizations", {
        method: "POST",
        body: JSON.stringify({
          name: "New Coaching",
          slug: "new-coaching",
          ownerName: "New Owner",
          ownerEmail: "Owner@NewCoaching.com",
          timezone: "Australia/Melbourne"
        })
      })
    );
    const payload = (await response.json()) as { data: { id: string; ownerMembershipStatus: string } };

    expect(response.status).toBe(201);
    expect(payload.data).toEqual(expect.objectContaining({ id: "org_new", ownerMembershipStatus: "invited" }));
    expect(mocks.prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "owner@newcoaching.com" }
      })
    );
    expect(mocks.prisma.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          memberships: {
            create: expect.objectContaining({
              role: "OWNER",
              status: "INVITED"
            })
          }
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "platform.organization.created",
          targetId: "org_new"
        })
      })
    );
    expect(mocks.sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_new",
        toEmail: "owner@newcoaching.com",
        fromEmail: "Complete Coach <info@completecoach.fit>",
        template: {
          id: "complete-coach-design-partner-welcome",
          variables: {
            OWNER_NAME: "New",
            ORGANIZATION_NAME: "New Coaching",
            SIGN_IN_URL: "https://completecoach.fit/sign-in"
          }
        },
        metadata: expect.objectContaining({
          template: "complete-coach-design-partner-welcome"
        })
      })
    );
  });

  it("archives organizations through an audited platform action", async () => {
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      name: "Demo Coaching",
      status: OrganizationStatus.ACTIVE,
      deletedAt: null
    });
    mocks.prisma.organization.update.mockResolvedValue({
      id: "org_1",
      name: "Demo Coaching",
      slug: "demo-coaching",
      status: OrganizationStatus.ARCHIVED,
      deletedAt: now
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await archiveAdminOrganization(
      new Request("http://test.local/api/v1/admin/organizations/org_1", {
        method: "DELETE"
      }),
      { params: Promise.resolve({ organizationId: "org_1" }) }
    );
    const payload = (await response.json()) as { data: { id: string; status: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(expect.objectContaining({ id: "org_1", status: "archived" }));
    expect(mocks.prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org_1" },
        data: expect.objectContaining({
          status: OrganizationStatus.ARCHIVED,
          deletedAt: expect.any(Date)
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "platform.organization.archived",
          targetId: "org_1"
        })
      })
    );
  });

  it("syncs an organization's Complete Coach subscription from Stripe", async () => {
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      name: "Demo Coaching",
      platformStripeCustomerId: "cus_platform_2",
      platformStripeSubscriptionId: null
    });
    mocks.prisma.organization.findFirst.mockResolvedValue(null);
    mocks.fetch.mockResolvedValue(
      Response.json({
        data: [
          {
            id: "sub_platform_2",
            status: "active",
            customer: "cus_platform_2",
            current_period_start: 1782691200,
            current_period_end: 1785283200,
            cancel_at: null,
            items: {
              data: [
                {
                  price: {
                    id: "price_1TvoddI51UQp7jCTIwk4C6rI"
                  }
                }
              ]
            }
          },
          {
            id: "sub_other_customer",
            status: "active",
            customer: "cus_other",
            items: {
              data: [
                {
                  price: {
                    id: "price_1TvoddI51UQp7jCTIwk4C6rI"
                  }
                }
              ]
            }
          }
        ]
      })
    );
    mocks.prisma.organization.update.mockResolvedValue({
      platformPlan: "scale",
      platformStripeCustomerId: "cus_platform_2",
      platformStripeSubscriptionId: "sub_platform_2",
      platformSubscriptionStatus: "active",
      platformCurrentPeriodStart: new Date("2026-06-29T00:00:00.000Z"),
      platformCurrentPeriodEnd: new Date("2026-07-29T00:00:00.000Z"),
      platformCancelAt: null
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await syncAdminPlatformSubscription(
      new Request("http://test.local/api/v1/admin/organizations/org_1/platform-subscription", {
        method: "POST",
        body: JSON.stringify({
          planId: "scale"
        })
      }),
      { params: Promise.resolve({ organizationId: "org_1" }) }
    );
    const payload = (await response.json()) as {
      data: { billing: { planId: string | null; status: string; stripeSubscriptionId: string | null } };
    };

    expect(response.status).toBe(200);
    expect(payload.data.billing).toEqual(
      expect.objectContaining({
        planId: "scale",
        status: "active",
        stripeSubscriptionId: "sub_platform_2"
      })
    );
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.stripe.com/v1/subscriptions?"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /)
        })
      })
    );
    expect(mocks.prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org_1" },
        data: expect.objectContaining({
          platformPlan: "scale",
          platformStripeCustomerId: "cus_platform_2",
          platformStripeSubscriptionId: "sub_platform_2",
          platformSubscriptionStatus: "active"
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "platform.organization.platform_subscription_synced",
          targetId: "org_1"
        })
      })
    );
  });

  it("lists Complete Coach packages for admin dropdowns", async () => {
    const response = await listAdminPlatformSubscriptions();
    const payload = (await response.json()) as {
      data: {
        plans: Array<{ id: string; name: string; stripePriceId: string; coachSeatLimit: number; clientLimit: number | null }>;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.plans).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "core",
        name: "Core",
        stripePriceId: "price_1Tvoc2I51UQp7jCTLDt3lc9w"
      }),
      expect.objectContaining({
        id: "design_partner",
        coachSeatLimit: 3,
        clientLimit: 100
      }),
      expect.objectContaining({
        id: "pro",
        clientLimit: 80
      }),
      expect.objectContaining({
        id: "scale",
        coachSeatLimit: 5,
        clientLimit: null
      })
    ]));
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
