import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientSubscriptionStatus } from "@/app/generated/prisma/enums";
import { GET, PATCH } from "@/app/api/v1/client-onboarding/[token]/route";
import { hashClientOnboardingToken } from "@/lib/clients/client-onboarding";

const mocks = vi.hoisted(() => ({
  hash: vi.fn(),
  prisma: {
    verificationToken: {
      findFirst: vi.fn(),
      deleteMany: vi.fn()
    },
    client: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

vi.mock("bcryptjs", () => ({
  hash: mocks.hash
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

const token = "client-token";
const tokenHash = hashClientOnboardingToken(token);
const routeContext = {
  params: Promise.resolve({ token })
};

describe("client onboarding API", () => {
  beforeEach(() => {
    mocks.hash.mockReset();
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.prisma.verificationToken.findFirst.mockReset();
    mocks.prisma.verificationToken.deleteMany.mockReset();
    mocks.prisma.client.findFirst.mockReset();
    mocks.prisma.client.update.mockReset();
    mocks.prisma.user.findUnique.mockReset();
    mocks.prisma.user.create.mockReset();
    mocks.prisma.user.update.mockReset();
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.$transaction.mockReset();
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
    mocks.prisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
    mocks.prisma.client.update.mockResolvedValue({});
    mocks.prisma.auditLog.create.mockResolvedValue({});
  });

  it("reports payment required while the package subscription is incomplete", async () => {
    mockValidToken();
    mocks.prisma.client.findFirst.mockResolvedValue(mockClient({ status: ClientSubscriptionStatus.INCOMPLETE }));

    const response = await GET(new Request("http://test.local/api/v1/client-onboarding/client-token"), routeContext);
    const payload = (await response.json()) as { data: { paymentRequired: boolean; canSetPassword: boolean } };

    expect(response.status).toBe(200);
    expect(payload.data.paymentRequired).toBe(true);
    expect(payload.data.canSetPassword).toBe(false);
    expect(mocks.prisma.verificationToken.findFirst).toHaveBeenCalledWith({
      where: {
        identifier: { startsWith: "client-onboarding:" },
        token: tokenHash,
        expires: { gt: expect.any(Date) }
      }
    });
  });

  it("blocks password setup until Stripe marks the subscription paid", async () => {
    mockValidToken();
    mocks.prisma.client.findFirst.mockResolvedValue(mockClient({ status: ClientSubscriptionStatus.INCOMPLETE }));

    const response = await PATCH(
      new Request("http://test.local/api/v1/client-onboarding/client-token", {
        method: "PATCH",
        body: JSON.stringify({ password: "password123" })
      }),
      routeContext
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(402);
    expect(payload.error.code).toBe("payment_required");
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
  });

  it("creates a client login and consumes the setup token once payment is active", async () => {
    mockValidToken();
    mocks.prisma.client.findFirst.mockResolvedValue(mockClient({ status: ClientSubscriptionStatus.ACTIVE }));
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    mocks.prisma.user.create.mockResolvedValue({
      id: "user_client_1",
      email: "client@example.com",
      name: "Client Example"
    });

    const response = await PATCH(
      new Request("http://test.local/api/v1/client-onboarding/client-token", {
        method: "PATCH",
        body: JSON.stringify({ password: "password123" })
      }),
      routeContext
    );
    const payload = (await response.json()) as { data: { userId: string; clientId: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({
      userId: "user_client_1",
      clientId: "client_1",
      organizationId: "org_1"
    });
    expect(mocks.prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "client@example.com",
          passwordHash: "hashed-password",
          authProvider: "credentials"
        })
      })
    );
    expect(mocks.prisma.client.update).toHaveBeenCalledWith({
      where: {
        id: "client_1",
        organizationId: "org_1"
      },
      data: { clientUserId: "user_client_1" }
    });
    expect(mocks.prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: {
        identifier: "client-onboarding:client_1",
        token: tokenHash
      }
    });
  });
});

function mockValidToken() {
  mocks.prisma.verificationToken.findFirst.mockResolvedValue({
    identifier: "client-onboarding:client_1",
    token: tokenHash,
    expires: new Date("2026-08-01T00:00:00.000Z")
  });
}

function mockClient(input: { status: ClientSubscriptionStatus }) {
  return {
    id: "client_1",
    organizationId: "org_1",
    clientUserId: null,
    firstName: "Client",
    lastName: "Example",
    email: "client@example.com",
    packageName: "Scale",
    organization: {
      id: "org_1",
      name: "Complete Coach Demo"
    },
    subscriptions: [
      {
        id: "sub_1",
        status: input.status,
        packageId: "package_1",
        coachingPackage: {
          name: "Scale"
        }
      }
    ]
  };
}
