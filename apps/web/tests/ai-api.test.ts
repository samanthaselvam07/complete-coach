import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AiGenerationStatus,
  AiOutputStatus,
  AiOutputType,
  AiWorkflowType,
  CheckInStatus
} from "@/app/generated/prisma/enums";
import { POST as generateCheckInReview } from "@/app/api/v1/check-ins/[checkInId]/ai-review/route";
import { GET as listMethodologyProfiles, POST as createMethodologyProfile } from "@/app/api/v1/ai/methodology-profiles/route";
import { POST as setDefaultMethodologyProfile } from "@/app/api/v1/ai/methodology-profiles/[profileId]/default/route";
import { GET as listRecommendations } from "@/app/api/v1/ai/recommendations/route";
import { GET as getAiUsage } from "@/app/api/v1/ai/usage/route";
import { POST as approveRecommendation } from "@/app/api/v1/ai/recommendations/[recommendationId]/approve/route";
import { POST as rejectRecommendation } from "@/app/api/v1/ai/recommendations/[recommendationId]/reject/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    auditLog: { create: vi.fn() },
    aiPromptVersion: { findFirst: vi.fn(), create: vi.fn() },
    aiMethodologyProfile: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    aiGeneration: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    aiOutput: { createMany: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    checkIn: { findFirst: vi.fn() },
    clientMeasurement: { findMany: vi.fn() }
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

const assistantSession = {
  user: { id: "user_2", email: "assistant@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "assistant"
  }
};

const promptVersion = {
  id: "prompt_1",
  organizationId: null,
  workflow: AiWorkflowType.CHECK_IN_REVIEW,
  version: "chfi-17-step-v1",
  name: "CHFI 17-step weekly check-in review",
  provider: "complete-coach",
  model: "heuristic-v1",
  systemPrompt: "Use the CHFI 17-step framework.",
  userPromptTemplate: "Review check-in input.",
  outputSchema: null,
  isActive: true,
  createdByUserId: null,
  createdAt: new Date("2026-06-06T00:00:00.000Z")
};

const checkInRecord = {
  id: "checkin_1",
  organizationId: "org_1",
  clientId: "client_1",
  formSubmissionId: "submission_1",
  type: "check-in",
  status: CheckInStatus.PENDING_REVIEW,
  dueAt: null,
  submittedAt: new Date("2026-06-06T08:00:00.000Z"),
  reviewedAt: null,
  reviewedByUserId: null,
  summary: null,
  coachNotes: null,
  createdAt: new Date("2026-06-06T08:00:00.000Z"),
  updatedAt: new Date("2026-06-06T08:00:00.000Z"),
  client: {
    id: "client_1",
    firstName: "Michal",
    lastName: "Szalinski",
    email: "michal@example.com",
    phone: "+61400111222",
    profile: {
      sex: "male",
      goals: { primary: "fat loss" },
      injuries: [],
      medicalNotes: "Private medical notes"
    }
  },
  formSubmission: {
    answersJson: {
      "Waist Circumference (belly button height in cm)": "88",
      "How Stressful was this week/10?": "8",
      "Please detail any injuries/niggles you exerienced this week": "Tennis elbow has reduced strength.",
      "How are you managing with the nutrition plan?": "Not on plan this week",
      email: "michal@example.com"
    }
  }
};

const generationRecord = {
  id: "generation_1",
  organizationId: "org_1",
  workflow: AiWorkflowType.CHECK_IN_REVIEW,
  status: AiGenerationStatus.SUCCEEDED,
  promptVersionId: "prompt_1",
  methodologyProfileId: "methodology_1",
  provider: "complete-coach",
  model: "heuristic-v1",
  clientId: "client_1",
  targetType: "check_in",
  targetId: "checkin_1",
  inputHash: "hash",
  inputSummary: {},
  redactedInput: {},
  outputJson: {},
  errorMessage: null,
  inputTokens: 1000,
  outputTokens: 600,
  estimatedCostCents: 0,
  requestedByUserId: "user_1",
  createdAt: new Date("2026-06-06T08:00:00.000Z"),
  updatedAt: new Date("2026-06-06T08:00:00.000Z")
};

const recommendationRecord = {
  id: "output_1",
  organizationId: "org_1",
  generationId: "generation_1",
  clientId: "client_1",
  targetType: "check_in",
  targetId: "checkin_1",
  type: AiOutputType.MESSAGE_DRAFT,
  status: AiOutputStatus.PENDING_APPROVAL,
  severity: "high",
  title: "Draft client check-in reply",
  contentMarkdown: "Book a GP appointment and keep training pain-free.",
  dataJson: { flags: [] },
  requiresApproval: true,
  approvedByUserId: null,
  approvedAt: null,
  rejectedByUserId: null,
  rejectedAt: null,
  rejectionReason: null,
  createdAt: new Date("2026-06-06T08:00:00.000Z"),
  updatedAt: new Date("2026-06-06T08:00:00.000Z"),
  generation: generationRecord
};

const methodologyProfileRecord = {
  id: "methodology_1",
  organizationId: "org_1",
  name: "Habit-first physique coaching",
  methodology: "Habit-first",
  description: "Use minimum effective change and calm direct feedback.",
  tone: "calm, direct, no shame",
  principlesJson: ["Lead with pattern recognition"],
  checkInSectionsJson: ["Wins", "Risks", "Next minimum effective change"],
  redFlagRulesJson: ["Treat stress above 6/10 as a recovery constraint"],
  adjustmentRulesJson: ["Do not reduce calories until adherence is reviewed"],
  forbiddenRecommendationsJson: ["Never use compensation language"],
  isDefault: true,
  isActive: true,
  createdByUserId: "user_1",
  createdAt: new Date("2026-06-06T08:00:00.000Z"),
  updatedAt: new Date("2026-06-06T08:00:00.000Z")
};

describe("AI-assisted coaching APIs", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    for (const model of Object.values(mocks.prisma)) {
      if (typeof model === "function") {
        model.mockReset();
        continue;
      }

      for (const method of Object.values(model)) {
        method.mockReset();
      }
    }
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
  });

  it("generates tenant-scoped check-in reviews with prompt tracking, output records, and redacted audit metadata", async () => {
    mocks.prisma.checkIn.findFirst.mockResolvedValue(checkInRecord);
    mocks.prisma.clientMeasurement.findMany.mockResolvedValue([]);
    mocks.prisma.aiPromptVersion.findFirst.mockResolvedValue(promptVersion);
    mocks.prisma.aiMethodologyProfile.findFirst.mockResolvedValue(methodologyProfileRecord);
    mocks.prisma.aiGeneration.create.mockResolvedValue({ ...generationRecord, status: AiGenerationStatus.RUNNING });
    mocks.prisma.aiGeneration.update.mockResolvedValue(generationRecord);
    mocks.prisma.aiOutput.createMany.mockResolvedValue({ count: 5 });
    mocks.prisma.aiOutput.findMany.mockResolvedValue([recommendationRecord]);
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await generateCheckInReview(new Request("http://test.local/api/v1/check-ins/checkin_1/ai-review", { method: "POST" }), {
      params: Promise.resolve({ checkInId: "checkin_1" })
    });
    const payload = (await response.json()) as { data: { generation: { id: string }; outputs: Array<{ id: string }> } };

    expect(response.status).toBe(201);
    expect(payload.data.generation.id).toBe("generation_1");
    expect(payload.data.outputs).toHaveLength(1);
    expect(mocks.prisma.checkIn.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "checkin_1", organizationId: "org_1" }
      })
    );
    expect(mocks.prisma.aiGeneration.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        workflow: AiWorkflowType.CHECK_IN_REVIEW,
        status: AiGenerationStatus.RUNNING,
        promptVersionId: "prompt_1",
        methodologyProfileId: "methodology_1",
        clientId: "client_1",
        targetType: "check_in",
        targetId: "checkin_1",
        requestedByUserId: "user_1"
      })
    });
    expect(mocks.prisma.aiOutput.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          organizationId: "org_1",
          status: AiOutputStatus.PENDING_APPROVAL,
          requiresApproval: true
        })
      ])
    });
    expect(JSON.stringify(mocks.prisma.auditLog.create.mock.calls)).not.toContain("michal@example.com");
    expect(JSON.stringify(mocks.prisma.auditLog.create.mock.calls)).not.toContain("Private medical notes");
    expect(JSON.stringify(mocks.prisma.auditLog.create.mock.calls)).toContain("methodology_1");
  });

  it("creates, lists, and sets default coach methodology profiles", async () => {
    mocks.prisma.aiMethodologyProfile.create.mockResolvedValue(methodologyProfileRecord);
    mocks.prisma.aiMethodologyProfile.findMany.mockResolvedValue([methodologyProfileRecord]);
    mocks.prisma.aiMethodologyProfile.findFirst.mockResolvedValue(methodologyProfileRecord);
    mocks.prisma.aiMethodologyProfile.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.aiMethodologyProfile.update.mockResolvedValue({ ...methodologyProfileRecord, isDefault: true });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const createResponse = await createMethodologyProfile(
      new Request("http://test.local/api/v1/ai/methodology-profiles", {
        method: "POST",
        body: JSON.stringify({
          name: "Habit-first physique coaching",
          methodology: "Habit-first",
          tone: "calm, direct, no shame",
          principles: ["Lead with pattern recognition"],
          checkInSections: ["Wins", "Risks", "Next minimum effective change"],
          redFlagRules: ["Treat stress above 6/10 as a recovery constraint"],
          adjustmentRules: ["Do not reduce calories until adherence is reviewed"],
          forbiddenRecommendations: ["Never use compensation language"],
          isDefault: true
        })
      })
    );

    expect(createResponse.status).toBe(201);
    expect(mocks.prisma.aiMethodologyProfile.updateMany).toHaveBeenCalledWith({
      where: { organizationId: "org_1", isDefault: true },
      data: { isDefault: false }
    });
    expect(mocks.prisma.aiMethodologyProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        name: "Habit-first physique coaching",
        principlesJson: ["Lead with pattern recognition"],
        isDefault: true,
        createdByUserId: "user_1"
      })
    });

    const listResponse = await listMethodologyProfiles(new Request("http://test.local/api/v1/ai/methodology-profiles"));
    const listPayload = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(listPayload.data[0]).toEqual(expect.objectContaining({ id: "methodology_1", isDefault: true }));
    expect(JSON.stringify(listPayload)).not.toContain("coach@example.com");

    const defaultResponse = await setDefaultMethodologyProfile(
      new Request("http://test.local/api/v1/ai/methodology-profiles/methodology_1/default", { method: "POST" }),
      { params: Promise.resolve({ profileId: "methodology_1" }) }
    );
    expect(defaultResponse.status).toBe(200);
    expect(mocks.prisma.aiMethodologyProfile.update).toHaveBeenCalledWith({
      where: { id: "methodology_1" },
      data: { isDefault: true }
    });
  });

  it("rejects check-in review generation when a requested methodology profile is outside the tenant", async () => {
    mocks.prisma.checkIn.findFirst.mockResolvedValue(checkInRecord);
    mocks.prisma.clientMeasurement.findMany.mockResolvedValue([]);
    mocks.prisma.aiPromptVersion.findFirst.mockResolvedValue(promptVersion);
    mocks.prisma.aiMethodologyProfile.findFirst.mockResolvedValue(null);

    const response = await generateCheckInReview(
      new Request("http://test.local/api/v1/check-ins/checkin_1/ai-review", {
        method: "POST",
        body: JSON.stringify({ methodologyProfileId: "missing_profile" })
      }),
      {
        params: Promise.resolve({ checkInId: "checkin_1" })
      }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.aiGeneration.create).not.toHaveBeenCalled();
  });

  it("blocks read-only assistants from generating AI recommendations", async () => {
    mocks.auth.mockResolvedValue(assistantSession);

    const response = await generateCheckInReview(new Request("http://test.local/api/v1/check-ins/checkin_1/ai-review", { method: "POST" }), {
      params: Promise.resolve({ checkInId: "checkin_1" })
    });

    expect(response.status).toBe(403);
    expect(mocks.prisma.checkIn.findFirst).not.toHaveBeenCalled();
  });

  it("lists recommendations without exposing raw AI input or provider output", async () => {
    mocks.prisma.aiOutput.findMany.mockResolvedValue([recommendationRecord]);

    const response = await listRecommendations(new Request("http://test.local/api/v1/ai/recommendations?clientId=client_1"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data[0]).toEqual(expect.objectContaining({ id: "output_1", status: "pending-approval" }));
    expect(JSON.stringify(payload)).not.toContain("redactedInput");
    expect(JSON.stringify(payload)).not.toContain("outputJson");
  });

  it("requires human approval before recommendations become approved or rejected", async () => {
    mocks.prisma.aiOutput.findFirst.mockResolvedValue(recommendationRecord);
    mocks.prisma.aiOutput.update.mockResolvedValue({
      ...recommendationRecord,
      status: AiOutputStatus.APPROVED,
      approvedByUserId: "user_1",
      approvedAt: new Date("2026-06-06T09:00:00.000Z")
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const approveResponse = await approveRecommendation(
      new Request("http://test.local/api/v1/ai/recommendations/output_1/approve", { method: "POST" }),
      {
        params: Promise.resolve({ recommendationId: "output_1" })
      }
    );

    expect(approveResponse.status).toBe(200);
    expect(mocks.prisma.aiOutput.update).toHaveBeenCalledWith({
      where: { id: "output_1" },
      data: expect.objectContaining({
        status: AiOutputStatus.APPROVED,
        approvedByUserId: "user_1"
      })
    });

    mocks.prisma.aiOutput.findFirst.mockResolvedValue(recommendationRecord);
    mocks.prisma.aiOutput.update.mockResolvedValue({
      ...recommendationRecord,
      status: AiOutputStatus.REJECTED,
      rejectedByUserId: "user_1",
      rejectionReason: "Too strong"
    });

    const rejectResponse = await rejectRecommendation(
      new Request("http://test.local/api/v1/ai/recommendations/output_1/reject", {
        method: "POST",
        body: JSON.stringify({ reason: "Too strong" })
      }),
      {
        params: Promise.resolve({ recommendationId: "output_1" })
      }
    );

    expect(rejectResponse.status).toBe(200);
    expect(mocks.prisma.aiOutput.update).toHaveBeenLastCalledWith({
      where: { id: "output_1" },
      data: expect.objectContaining({
        status: AiOutputStatus.REJECTED,
        rejectedByUserId: "user_1",
        rejectionReason: "Too strong"
      })
    });
  });

  it("returns semantic errors for missing or already-decided recommendations", async () => {
    mocks.prisma.aiOutput.findFirst.mockResolvedValueOnce(null);

    const missingResponse = await approveRecommendation(
      new Request("http://test.local/api/v1/ai/recommendations/missing/approve", { method: "POST" }),
      {
        params: Promise.resolve({ recommendationId: "missing" })
      }
    );

    expect(missingResponse.status).toBe(404);

    mocks.prisma.aiOutput.findFirst.mockResolvedValueOnce({
      ...recommendationRecord,
      status: AiOutputStatus.APPROVED
    });

    const invalidStateResponse = await approveRecommendation(
      new Request("http://test.local/api/v1/ai/recommendations/output_1/approve", { method: "POST" }),
      {
        params: Promise.resolve({ recommendationId: "output_1" })
      }
    );

    expect(invalidStateResponse.status).toBe(409);
    expect(mocks.prisma.aiOutput.update).not.toHaveBeenCalled();
  });

  it("validates rejection reasons before changing recommendation state", async () => {
    const response = await rejectRecommendation(
      new Request("http://test.local/api/v1/ai/recommendations/output_1/reject", {
        method: "POST",
        body: JSON.stringify({ reason: "" })
      }),
      {
        params: Promise.resolve({ recommendationId: "output_1" })
      }
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.aiOutput.findFirst).not.toHaveBeenCalled();
  });

  it("reports organization-scoped AI usage and cost without raw payloads", async () => {
    mocks.prisma.aiGeneration.findMany.mockResolvedValue([
      {
        ...generationRecord,
        id: "generation_1",
        workflow: AiWorkflowType.CHECK_IN_REVIEW,
        status: AiGenerationStatus.SUCCEEDED,
        inputTokens: 1000,
        outputTokens: 500,
        estimatedCostCents: "1.25"
      },
      {
        ...generationRecord,
        id: "generation_2",
        workflow: AiWorkflowType.MESSAGE_DRAFT,
        status: AiGenerationStatus.FAILED,
        inputTokens: 300,
        outputTokens: 0,
        estimatedCostCents: "0.10"
      }
    ]);

    const response = await getAiUsage(
      new Request("http://test.local/api/v1/ai/usage?dateFrom=2026-06-01T00:00:00.000Z&dateTo=2026-06-30T00:00:00.000Z")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(
      expect.objectContaining({
        totalGenerations: 2,
        totalInputTokens: 1300,
        totalOutputTokens: 500,
        totalEstimatedCostCents: 1.35
      })
    );
    expect(payload.data.byWorkflow).toEqual(
      expect.objectContaining({
        "check-in-review": expect.objectContaining({ generations: 1, estimatedCostCents: 1.25 }),
        "message-draft": expect.objectContaining({ generations: 1, estimatedCostCents: 0.1 })
      })
    );
    expect(mocks.prisma.aiGeneration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          createdAt: {
            gte: new Date("2026-06-01T00:00:00.000Z"),
            lte: new Date("2026-06-30T00:00:00.000Z")
          }
        })
      })
    );
    expect(JSON.stringify(payload)).not.toContain("redactedInput");
    expect(JSON.stringify(payload)).not.toContain("outputJson");
  });
});
