import { describe, expect, it } from "vitest";

import {
  buildCheckInReviewInput,
  estimateAiCostCents,
  generateHeuristicCheckInReview,
  hashAiInput,
  normalizeMethodologyProfile,
  redactAiInput
} from "@/lib/ai/ai-review";

const checkInRecord = {
  id: "checkin_1",
  clientId: "client_1",
  submittedAt: new Date("2026-06-06T08:00:00.000Z"),
  summary: null,
  coachNotes: "Private coach note",
  client: {
    firstName: "Michal",
    lastName: "Szalinski",
    email: "michal@example.com",
    phone: "+61400111222",
    profile: {
      sex: "male",
      goals: { primary: "fat loss" },
      injuries: [{ area: "elbow", note: "tennis elbow" }],
      medicalNotes: "Private medical history"
    }
  },
  formSubmission: {
    answersJson: {
      "Waist Circumference (belly button height in cm)": "88",
      "How Stressful was this week/10?": "8",
      "Rate your motivation levels for training": "6",
      "Please detail any injuries/niggles you exerienced this week":
        "Both arms have tennis elbow issues and strength has dropped.",
      "How many sessions per week are you working on mobility by rolling out/ stretching during the week? [more than 10mins]":
        "1",
      "How are you managing with the nutrition plan?": "Not on plan this week because of work events",
      "Please detail any alcohol consumption this week": "None",
      "How many litres of fluids (on average) are you consuming daily?": "4",
      email: "michal@example.com"
    }
  }
};

const metrics = [
  {
    metricKey: "body_weight",
    metricValue: 76.6,
    unit: "kg",
    measuredAt: new Date("2026-06-06T08:00:00.000Z")
  },
  {
    metricKey: "waist",
    metricValue: 88,
    unit: "cm",
    measuredAt: new Date("2026-06-06T08:00:00.000Z")
  }
];

describe("AI-assisted coaching domain", () => {
  it("builds minimized check-in review input without direct contact details or medical notes", () => {
    const input = buildCheckInReviewInput(checkInRecord, metrics);
    const serialized = JSON.stringify(input);

    expect(input.client.displayName).toBe("Michal S.");
    expect(input.client.email).toBeUndefined();
    expect(input.client.phone).toBeUndefined();
    expect(serialized).not.toContain("michal@example.com");
    expect(serialized).not.toContain("+61400111222");
    expect(serialized).not.toContain("Private medical history");
    expect(input.answers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          question: "How Stressful was this week/10?",
          answer: "8"
        })
      ])
    );
  });

  it("redacts sensitive values recursively before logs or audit metadata can store them", () => {
    expect(
      redactAiInput({
        email: "coach@example.com",
        nested: { phone: "0400111222", answer: "I have an injury", safe: "hydration 4L" },
        list: [{ medicalNotes: "private" }]
      })
    ).toEqual({
      email: "[REDACTED]",
      nested: { phone: "[REDACTED]", answer: "[REDACTED]", safe: "hydration 4L" },
      list: [{ medicalNotes: "[REDACTED]" }]
    });
  });

  it("generates CHFI-style five-section reviews with priority risk flags and pending approval outputs", () => {
    const input = buildCheckInReviewInput(checkInRecord, metrics);
    const review = generateHeuristicCheckInReview(input);

    expect(review.summaryMarkdown).toContain("## 1. Weight / Waist");
    expect(review.summaryMarkdown).toContain("## 5. Goals for Next Week");
    expect(review.flags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "urgent", category: "injury" }),
        expect.objectContaining({ severity: "high", category: "stress" }),
        expect.objectContaining({ severity: "medium", category: "mobility" })
      ])
    );
    expect(review.outputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "check-in-summary", requiresApproval: true }),
        expect.objectContaining({ type: "workout-suggestion", requiresApproval: true }),
        expect.objectContaining({ type: "nutrition-suggestion", requiresApproval: true }),
        expect.objectContaining({ type: "message-draft", requiresApproval: true })
      ])
    );
  });

  it("tailors review language and goals with a coach methodology profile", () => {
    const input = buildCheckInReviewInput(checkInRecord, metrics);
    const methodology = normalizeMethodologyProfile({
      name: "Habit-first physique coaching",
      methodology: "Habit-first",
      tone: "calm, direct, no shame",
      principles: ["Lead with pattern recognition", "Use minimum effective change before aggressive macro changes"],
      checkInSections: ["Wins", "Risks", "Next minimum effective change"],
      redFlagRules: ["Treat stress above 6/10 as a recovery constraint"],
      adjustmentRules: ["Do not reduce calories until adherence is reviewed"],
      forbiddenRecommendations: ["Never use compensation language"]
    });

    const review = generateHeuristicCheckInReview(input, methodology);

    expect(review.summaryMarkdown).toContain("Coaching lens: Habit-first physique coaching");
    expect(review.summaryMarkdown).toContain("Next minimum effective change");
    expect(review.outputs.find((output) => output.type === "nutrition-suggestion")).toEqual(
      expect.objectContaining({
        contentMarkdown: expect.stringContaining("Do not reduce calories until adherence is reviewed")
      })
    );
    expect(JSON.stringify(review)).not.toContain("compensation");
  });

  it("uses stable content hashes and tracks estimated provider cost", () => {
    const input = buildCheckInReviewInput(checkInRecord, metrics);

    expect(hashAiInput(input)).toBe(hashAiInput({ ...input }));
    expect(estimateAiCostCents({ inputTokens: 1200, outputTokens: 800, inputPerMillionCents: 300, outputPerMillionCents: 1500 })).toBe(
      1.56
    );
  });

  it("handles missing answers and low-risk check-ins without inventing flags", () => {
    const input = buildCheckInReviewInput(
      {
        id: "checkin_empty",
        clientId: "client_2",
        submittedAt: null,
        client: {
          firstName: "Sam",
          lastName: null,
          profile: null
        },
        formSubmission: {
          answersJson: null
        }
      },
      []
    );
    const review = generateHeuristicCheckInReview(input);

    expect(input.client.displayName).toBe("Sam");
    expect(input.answers).toEqual([]);
    expect(review.flags).toEqual([]);
    expect(review.outputs.find((output) => output.type === "message-draft")).toEqual(
      expect.objectContaining({
        severity: "low",
        contentMarkdown: expect.stringContaining("keeping the next week simple")
      })
    );
  });

  it("prioritizes high and medium non-injury flags correctly", () => {
    const highStressInput = buildCheckInReviewInput(
      {
        ...checkInRecord,
        formSubmission: {
          answersJson: {
            "How Stressful was this week/10?": "8"
          }
        }
      },
      []
    );
    const mediumInput = buildCheckInReviewInput(
      {
        ...checkInRecord,
        formSubmission: {
          answersJson: {
            "How many sessions per week are you working on mobility by rolling out/ stretching during the week? [more than 10mins]":
              "1"
          }
        }
      },
      []
    );

    expect(generateHeuristicCheckInReview(highStressInput).outputs.find((output) => output.type === "message-draft")).toEqual(
      expect.objectContaining({ severity: "high" })
    );
    expect(generateHeuristicCheckInReview(mediumInput).outputs.find((output) => output.type === "message-draft")).toEqual(
      expect.objectContaining({ severity: "medium" })
    );
  });
});
