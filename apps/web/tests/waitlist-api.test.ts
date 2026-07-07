import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postWaitlist } from "@/app/api/v1/waitlist/route";

const mocks = vi.hoisted(() => ({
  prisma: {
    waitlistSignup: {
      upsert: vi.fn()
    }
  }
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

describe("waitlist API", () => {
  beforeEach(() => {
    mocks.prisma.waitlistSignup.upsert.mockReset();
  });

  it("stores a normalized waitlist email without authentication", async () => {
    mocks.prisma.waitlistSignup.upsert.mockResolvedValue({
      id: "waitlist_1",
      email: "coach@example.com"
    });

    const response = await postWaitlist(
      new Request("http://test.local/api/v1/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "Vitest" },
        body: JSON.stringify({ email: " Coach@Example.com ", source: "waitlist-page" })
      })
    );
    const payload = (await response.json()) as { data: { id: string; email: string; status: string } };

    expect(response.status).toBe(202);
    expect(payload.data).toEqual({ id: "waitlist_1", email: "coach@example.com", status: "joined" });
    expect(mocks.prisma.waitlistSignup.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "coach@example.com" },
        create: expect.objectContaining({
          email: "coach@example.com",
          source: "waitlist-page",
          metadata: { userAgent: "Vitest" }
        })
      })
    );
  });

  it("rejects invalid email addresses", async () => {
    const response = await postWaitlist(
      new Request("http://test.local/api/v1/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" })
      })
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.waitlistSignup.upsert).not.toHaveBeenCalled();
  });
});
