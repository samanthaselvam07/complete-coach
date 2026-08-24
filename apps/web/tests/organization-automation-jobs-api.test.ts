import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as processAutomationJobs } from "@/app/api/v1/organizations/current/automations/jobs/process/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  enqueueScheduledAutomationJobs: vi.fn(),
  processDueAutomationJobs: vi.fn()
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/organizations/automation-records", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/organizations/automation-records")>();

  return {
    ...actual,
    enqueueScheduledAutomationJobs: mocks.enqueueScheduledAutomationJobs,
    processDueAutomationJobs: mocks.processDueAutomationJobs
  };
});

describe("organization automation job processor API", () => {
  beforeEach(() => {
    process.env.AUTOMATION_JOBS_SECRET = "cron_secret";
    mocks.auth.mockReset();
    mocks.enqueueScheduledAutomationJobs.mockReset();
    mocks.processDueAutomationJobs.mockReset();
    mocks.enqueueScheduledAutomationJobs.mockResolvedValue({ checked: 2, queued: 1, skipped: 0 });
    mocks.processDueAutomationJobs.mockResolvedValue({ processed: 1, sent: 1, skipped: 0, retried: 0, failed: 0 });
  });

  it("allows cron bearer requests to generate and process jobs across organizations", async () => {
    const response = await processAutomationJobs(
      new Request("http://test.local/api/v1/organizations/current/automations/jobs/process", {
        method: "POST",
        headers: { Authorization: "Bearer cron_secret" },
        body: JSON.stringify({ limit: 10 })
      })
    );
    const payload = (await response.json()) as { data: { mode: string } };

    expect(response.status).toBe(200);
    expect(payload.data.mode).toBe("system");
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.enqueueScheduledAutomationJobs).toHaveBeenCalledWith({ organizationId: undefined });
    expect(mocks.processDueAutomationJobs).toHaveBeenCalledWith({ organizationId: undefined, limit: 10 });
  });
});
