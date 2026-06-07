import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getDashboardMetadata } from "@/app/api/v1/dashboard/metadata/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    organization: {
      findUnique: vi.fn()
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

describe("GET /api/v1/dashboard/metadata", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.organization.findUnique.mockReset();
  });

  it("returns the active organization timezone for dashboard date rendering", async () => {
    mocks.prisma.organization.findUnique.mockResolvedValue({ timezone: "Australia/Melbourne" });

    const response = await getDashboardMetadata();
    const payload = (await response.json()) as { data: { timezone: string } };

    expect(response.status).toBe(200);
    expect(payload.data.timezone).toBe("Australia/Melbourne");
    expect(mocks.prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: "org_1" },
      select: { timezone: true }
    });
  });

  it("falls back to UTC when no organization timezone is available", async () => {
    mocks.prisma.organization.findUnique.mockResolvedValue(null);

    const response = await getDashboardMetadata();
    const payload = (await response.json()) as { data: { timezone: string } };

    expect(response.status).toBe(200);
    expect(payload.data.timezone).toBe("UTC");
  });
});
