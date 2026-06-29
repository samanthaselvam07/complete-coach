import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  PrismaPg: vi.fn(),
  PrismaClient: vi.fn()
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: mocks.PrismaPg
}));

vi.mock("@/app/generated/prisma/client", () => ({
  PrismaClient: mocks.PrismaClient
}));

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  mocks.PrismaPg.mockReset();
  mocks.PrismaClient.mockReset();
});

describe("Prisma client environment", () => {
  it("requires DATABASE_URL instead of falling back to a local database", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(import("@/lib/db/prisma")).rejects.toThrow(
      "DATABASE_URL is required. Configure the Neon database URL before starting Complete Coach."
    );
    expect(mocks.PrismaPg).not.toHaveBeenCalled();
  });

  it("creates the adapter with the configured database URL", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://neon.example/complete-coach");

    await import("@/lib/db/prisma");

    expect(mocks.PrismaPg).toHaveBeenCalledWith({
      connectionString: "postgresql://neon.example/complete-coach"
    });
    expect(mocks.PrismaClient).toHaveBeenCalled();
  });
});
