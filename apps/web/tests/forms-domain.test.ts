import { describe, expect, it } from "vitest";

import { extractMeasurementsFromSubmission } from "@/lib/forms/metric-extraction";
import { FormDefinitionSchema } from "@/lib/forms/schema";

describe("forms domain helpers", () => {
  it("validates form definitions with metric metadata", () => {
    const parsed = FormDefinitionSchema.parse({
      title: "Weekly Check-In",
      description: "Capture weekly progress.",
      fields: [
        {
          id: "body-weight",
          type: "number",
          label: "Body weight",
          required: true,
          metricKey: "body_weight",
          metricUnit: "kg",
          exportPolicy: "metric"
        },
        {
          id: "notes",
          type: "long-text",
          label: "Coach notes",
          required: false,
          exportPolicy: "private"
        }
      ]
    });

    expect(parsed.fields[0]?.metricKey).toBe("body_weight");
    expect(parsed.fields[1]?.exportPolicy).toBe("private");
  });

  it("rejects metric fields without stable metric keys", () => {
    const result = FormDefinitionSchema.safeParse({
      title: "Invalid Check-In",
      fields: [
        {
          id: "weight",
          type: "number",
          label: "Weight",
          required: true,
          metricUnit: "kg",
          exportPolicy: "metric"
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("keeps builder field categories in saved form definitions", () => {
    const parsed = FormDefinitionSchema.parse({
      title: "Initial Questionnaire",
      fields: [
        {
          id: "primary-goal",
          type: "long-text",
          label: "Primary goal",
          required: true,
          category: "Goals",
          exportPolicy: "private"
        }
      ]
    });

    expect(parsed.fields[0]?.category).toBe("Goals");
  });

  it("extracts deterministic typed measurements from metric fields", () => {
    const definition = FormDefinitionSchema.parse({
      title: "Weekly Check-In",
      fields: [
        {
          id: "weight",
          type: "number",
          label: "Weight",
          required: true,
          metricKey: "body_weight",
          metricUnit: "kg",
          exportPolicy: "metric"
        },
        {
          id: "energy",
          type: "scale",
          label: "Energy",
          required: true,
          metricKey: "energy_score",
          metricUnit: "score",
          exportPolicy: "metric"
        },
        {
          id: "notes",
          type: "long-text",
          label: "Private notes",
          required: false,
          exportPolicy: "private"
        }
      ]
    });

    const measurements = extractMeasurementsFromSubmission({
      definition,
      answers: {
        weight: "82.4",
        energy: 7,
        notes: "Sensitive free text"
      },
      clientId: "client_1",
      organizationId: "org_1",
      sourceId: "submission_1",
      submittedAt: new Date("2026-05-14T03:00:00.000Z")
    });

    expect(measurements).toEqual([
      {
        clientId: "client_1",
        measuredAt: new Date("2026-05-14T03:00:00.000Z"),
        metadata: { fieldId: "weight", label: "Weight" },
        metricKey: "body_weight",
        metricValue: 82.4,
        organizationId: "org_1",
        sourceId: "submission_1",
        sourceType: "form_submission",
        unit: "kg"
      },
      {
        clientId: "client_1",
        measuredAt: new Date("2026-05-14T03:00:00.000Z"),
        metadata: { fieldId: "energy", label: "Energy" },
        metricKey: "energy_score",
        metricValue: 7,
        organizationId: "org_1",
        sourceId: "submission_1",
        sourceType: "form_submission",
        unit: "score"
      }
    ]);
  });

  it("rejects invalid numeric metric answers", () => {
    const definition = FormDefinitionSchema.parse({
      title: "Weekly Check-In",
      fields: [
        {
          id: "weight",
          type: "number",
          label: "Weight",
          required: true,
          metricKey: "body_weight",
          metricUnit: "kg",
          exportPolicy: "metric"
        }
      ]
    });

    expect(() =>
      extractMeasurementsFromSubmission({
        definition,
        answers: { weight: "not-a-number" },
        clientId: "client_1",
        organizationId: "org_1",
        sourceId: "submission_1",
        submittedAt: new Date("2026-05-14T03:00:00.000Z")
      })
    ).toThrow("Invalid numeric metric answer for weight");
  });
});
