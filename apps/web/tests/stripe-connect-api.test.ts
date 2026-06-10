import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as createStripeConnectAccountLink } from "@/app/api/v1/stripe/connect/account-link/route";
import { POST as createStripeConnectDashboardLink } from "@/app/api/v1/stripe/connect/dashboard-link/route";
import { GET as startStripeConnectOnboarding } from "@/app/api/v1/stripe/connect/onboarding/start/route";
import { deriveConnectStatus } from "@/lib/payments/stripe-connect";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    organization: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

const ownerSession = {
  user: { id: "user_1", email: "coach@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner"
  }
};

const adminSession = {
  ...ownerSession,
  activeOrganization: {
    ...ownerSession.activeOrganization,
    role: "admin"
  }
};

describe("Stripe Connect account-link API", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_API_BASE_URL;
    vi.unstubAllGlobals();
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.organization.findUnique.mockReset();
    mocks.prisma.organization.update.mockReset();
  });

  it("returns service unavailable when Stripe is not configured", async () => {
    const response = await createStripeConnectAccountLink(
      new Request("http://test.local/api/v1/stripe/connect/account-link", {
        method: "POST",
        body: JSON.stringify({})
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("stripe_unconfigured");
    expect(mocks.prisma.organization.findUnique).not.toHaveBeenCalled();
  });

  it("creates a connected account, persists it, and returns a single-use onboarding URL", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          id: "acct_new",
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          object: "account_link",
          created: 1_779_033_600,
          expires_at: 1_779_033_900,
          url: "https://connect.stripe.test/setup/acct_new"
        })
      );
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      name: "Complete Coach Demo",
      stripeConnectAccountId: null,
      stripeConnectStatus: null
    });
    mocks.prisma.organization.update.mockResolvedValue({});
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createStripeConnectAccountLink(
      new Request("http://test.local/api/v1/stripe/connect/account-link", {
        method: "POST",
        body: JSON.stringify({})
      })
    );
    const payload = (await response.json()) as {
      data: { accountId: string; status: string; onboardingUrl: string; expiresAt: string };
    };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({
      accountId: "acct_new",
      status: "onboarding-required",
      onboardingUrl: "https://connect.stripe.test/setup/acct_new",
      expiresAt: "2026-05-17T16:05:00.000Z"
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("metadata%5Borganization_id%5D=org_1");
    expect(String(fetchMock.mock.calls[1][1].body)).toContain("type=account_onboarding");
    expect(String(fetchMock.mock.calls[1][1].body)).toContain("return_url=http%3A%2F%2Ftest.local%2Fpackages");
    expect(mocks.prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: {
        stripeConnectAccountId: "acct_new",
        stripeConnectStatus: "onboarding-required"
      }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "stripe_connect.account_link_created",
          targetId: "acct_new"
        })
      })
    );
  });

  it("reuses an existing connected account when creating a new account link", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        object: "account_link",
        created: 1_779_033_600,
        expires_at: 1_779_034_200,
        url: "https://connect.stripe.test/setup/acct_existing"
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      name: "Complete Coach Demo",
      stripeConnectAccountId: "acct_existing",
      stripeConnectStatus: "pending-review"
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createStripeConnectAccountLink(
      new Request("http://test.local/api/v1/stripe/connect/account-link", {
        method: "POST",
        body: JSON.stringify({
          returnUrl: "https://app.example.com/packages?return=1",
          refreshUrl: "https://app.example.com/packages?refresh=1"
        })
      })
    );
    const payload = (await response.json()) as { data: { accountId: string; status: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(expect.objectContaining({ accountId: "acct_existing", status: "pending-review" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][1].body)).toContain("account=acct_existing");
    expect(String(fetchMock.mock.calls[0][1].body)).toContain(
      "return_url=https%3A%2F%2Fapp.example.com%2Fpackages%3Freturn%3D1"
    );
    expect(mocks.prisma.organization.update).not.toHaveBeenCalled();
  });

  it("maps Stripe API failures to a safe gateway error", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: { message: "Invalid request." }
          },
          { status: 400 }
        )
      )
    );
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      name: "Complete Coach Demo",
      stripeConnectAccountId: null,
      stripeConnectStatus: null
    });

    const response = await createStripeConnectAccountLink(
      new Request("http://test.local/api/v1/stripe/connect/account-link", {
        method: "POST",
        body: JSON.stringify({})
      })
    );
    const payload = (await response.json()) as { error: { code: string; details: { status: number } } };

    expect(response.status).toBe(502);
    expect(payload.error.code).toBe("stripe_request_failed");
    expect(payload.error.details.status).toBe(400);
    expect(mocks.prisma.organization.update).not.toHaveBeenCalled();
  });

  it("blocks non-owner account-link management", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    mocks.auth.mockResolvedValue(adminSession);

    const response = await createStripeConnectAccountLink(
      new Request("http://test.local/api/v1/stripe/connect/account-link", {
        method: "POST",
        body: JSON.stringify({})
      })
    );

    expect(response.status).toBe(403);
    expect(mocks.prisma.organization.findUnique).not.toHaveBeenCalled();
  });

  it("resolves safe relative account-link redirects against the request origin", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        object: "account_link",
        created: 1_779_033_600,
        expires_at: 1_779_034_200,
        url: "https://connect.stripe.test/setup/acct_existing"
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      name: "Complete Coach Demo",
      stripeConnectAccountId: "acct_existing",
      stripeConnectStatus: "pending-review"
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createStripeConnectAccountLink(
      new Request("https://app.example.com/api/v1/stripe/connect/account-link", {
        method: "POST",
        body: JSON.stringify({
          returnUrl: "/organization-settings",
          refreshUrl: "/organization-settings?stripe=refresh"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][1].body)).toContain(
      "return_url=https%3A%2F%2Fapp.example.com%2Forganization-settings"
    );
    expect(String(fetchMock.mock.calls[0][1].body)).toContain(
      "refresh_url=https%3A%2F%2Fapp.example.com%2Forganization-settings%3Fstripe%3Drefresh"
    );
  });
});

describe("Stripe Connect dashboard-link API", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_API_BASE_URL;
    vi.unstubAllGlobals();
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.organization.findUnique.mockReset();
    mocks.prisma.organization.update.mockReset();
  });

  it("creates an on-demand Express dashboard login link", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        object: "login_link",
        created: 1_779_033_600,
        url: "https://stripe.com/express/test-login"
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({
      stripeConnectAccountId: "acct_existing",
      stripeConnectStatus: "active"
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await createStripeConnectDashboardLink();
    const payload = (await response.json()) as { data: { dashboardUrl: string; status: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({
      accountId: "acct_existing",
      status: "active",
      dashboardUrl: "https://stripe.com/express/test-login"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://stripe.test/v1/accounts/acct_existing/login_links",
      expect.objectContaining({ method: "POST" })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "stripe_connect.dashboard_link_created",
          targetId: "acct_existing"
        })
      })
    );
  });

  it("requires a connected account before creating a dashboard link", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    mocks.prisma.organization.findUnique.mockResolvedValue({
      stripeConnectAccountId: null,
      stripeConnectStatus: null
    });

    const response = await createStripeConnectDashboardLink();
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("stripe_connect_required");
  });
});

describe("Stripe Connect onboarding redirect API", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_API_BASE_URL;
    vi.unstubAllGlobals();
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.organization.findUnique.mockReset();
    mocks.prisma.organization.update.mockReset();
  });

  it("redirects directly to a server-generated Stripe onboarding link", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          id: "acct_new",
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          object: "account_link",
          created: 1_779_033_600,
          expires_at: 1_779_033_900,
          url: "https://connect.stripe.test/setup/acct_new"
        })
      );
    vi.stubGlobal("fetch", fetchMock);
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      stripeConnectAccountId: null,
      stripeConnectStatus: null
    });
    mocks.prisma.organization.update.mockResolvedValue({});
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await startStripeConnectOnboarding(
      new Request("https://app.example.com/api/v1/stripe/connect/onboarding/start?returnUrl=/organization-settings")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://connect.stripe.test/setup/acct_new");
    expect(String(fetchMock.mock.calls[1][1].body)).toContain(
      "return_url=https%3A%2F%2Fapp.example.com%2Forganization-settings"
    );
  });

  it("redirects back to organization settings with a safe Stripe error", async () => {
    process.env.STRIPE_SECRET_KEY = "test_secret_key";
    process.env.STRIPE_API_BASE_URL = "https://stripe.test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: { message: "You can only create new accounts if you've signed up for Connect." }
          },
          { status: 400 }
        )
      )
    );
    mocks.prisma.organization.findUnique.mockResolvedValue({
      id: "org_1",
      stripeConnectAccountId: null,
      stripeConnectStatus: null
    });

    const response = await startStripeConnectOnboarding(
      new Request("https://app.example.com/api/v1/stripe/connect/onboarding/start")
    );
    const location = response.headers.get("location") ?? "";

    expect(response.status).toBe(307);
    expect(location).toContain("https://app.example.com/organization-settings?stripe_error=");
    expect(new URL(location).searchParams.get("stripe_error")).toBe(
      "You can only create new accounts if you've signed up for Connect."
    );
  });
});

describe("Stripe Connect helpers", () => {
  it("derives connect status from trusted Stripe account flags", () => {
    expect(deriveConnectStatus({ id: "acct_1" })).toBe("onboarding-required");
    expect(deriveConnectStatus({ id: "acct_1", details_submitted: true })).toBe("pending-review");
    expect(deriveConnectStatus({ id: "acct_1", charges_enabled: true, payouts_enabled: true })).toBe("active");
  });
});
