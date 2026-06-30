import { describe, expect, it } from "vitest";

import {
  LibraryScope,
  SupplementPlanAssignmentStatus,
  SupplementPlanTemplateStatus
} from "@/app/generated/prisma/enums";
import {
  buildSupplementAssignmentSnapshot,
  buildSupplementTemplateWhere,
  buildSupplementWhere,
  getSupplementCoachDetailsUpsertData,
  getSupplementCreateData,
  getSupplementTemplateCreateData,
  serializeSupplement,
  serializeSupplementAssignment,
  serializeSupplementCoachDetails,
  serializeSupplementTemplate
} from "@/lib/supplementation/supplement-records";

const supplementTemplateJson = {
  phases: [
    {
      name: "Base",
      supplements: [
        {
          supplementName: "Creatine Monohydrate",
          dosage: "5g",
          timing: "Daily",
          notes: "Take with food."
        }
      ]
    }
  ]
};

describe("supplement record mappers", () => {
  it("builds tenant-scoped supplement filters with optional facets", () => {
    expect(buildSupplementWhere("org_1", { limit: 50 })).toEqual({
      deletedAt: null,
      OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: "org_1" }]
    });

    expect(
      buildSupplementWhere("org_1", {
        scope: "private",
        category: "Performance",
        search: "creatine",
        limit: 100
      })
    ).toEqual({
      deletedAt: null,
      OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: "org_1" }],
      scope: LibraryScope.PRIVATE,
      category: "Performance",
      AND: [
        {
          OR: [
            { name: { contains: "creatine", mode: "insensitive" } },
            { category: { contains: "creatine", mode: "insensitive" } },
            { recommendedTiming: { contains: "creatine", mode: "insensitive" } }
          ]
        }
      ]
    });
  });

  it("builds create and coach detail upsert payloads", () => {
    expect(
      getSupplementCreateData("org_1", "user_1", {
        name: "Creatine",
        category: "Performance",
        recommendedTiming: "Daily",
        dosage: "5g",
        bioavailabilityNotes: "",
        clinicalDescription: "Supports repeated high-intensity effort.",
        tags: ["strength", "power"],
        imageObjectId: "image_1"
      })
    ).toEqual({
      organizationId: "org_1",
      createdByUserId: "user_1",
      scope: LibraryScope.PRIVATE,
      name: "Creatine",
      category: "Performance",
      recommendedTiming: "Daily",
      dosage: "5g",
      bioavailabilityNotes: "",
      clinicalDescription: "Supports repeated high-intensity effort.",
      tags: ["strength", "power"],
      imageObjectId: "image_1"
    });

    expect(
      getSupplementCoachDetailsUpsertData("org_1", "user_1", "supplement_1", {
        coachDosageInstructions: "  Take after training  ",
        coachNotes: " ",
        affiliateLink: ""
      })
    ).toMatchObject({
      where: { organizationId_supplementId: { organizationId: "org_1", supplementId: "supplement_1" } },
      update: {
        coachDosageInstructions: "Take after training",
        coachNotes: null,
        affiliateLink: null,
        updatedByUserId: "user_1"
      },
      create: {
        organizationId: "org_1",
        supplementId: "supplement_1",
        coachDosageInstructions: "Take after training",
        coachNotes: null,
        affiliateLink: null,
        createdByUserId: "user_1",
        updatedByUserId: "user_1"
      }
    });
  });

  it("builds supplement template filters, create payloads, and snapshots", () => {
    expect(buildSupplementTemplateWhere("org_1", { limit: 50 })).toEqual({
      organizationId: "org_1",
      deletedAt: null
    });
    expect(buildSupplementTemplateWhere("org_1", { status: "archived", limit: 50 })).toEqual({
      organizationId: "org_1",
      deletedAt: null,
      status: SupplementPlanTemplateStatus.ARCHIVED
    });

    const templateRecord = {
      id: "template_1",
      organizationId: "org_1",
      name: "Strength Support",
      description: null,
      status: SupplementPlanTemplateStatus.PUBLISHED,
      templateJson: supplementTemplateJson,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      updatedAt: "2026-06-02T00:00:00.000Z"
    };

    expect(
      getSupplementTemplateCreateData("org_1", "user_1", {
        name: "Strength Support",
        description: "",
        status: "published",
        template: supplementTemplateJson
      })
    ).toEqual({
      organizationId: "org_1",
      createdByUserId: "user_1",
      name: "Strength Support",
      description: "",
      status: SupplementPlanTemplateStatus.PUBLISHED,
      templateJson: supplementTemplateJson
    });
    expect(buildSupplementAssignmentSnapshot(templateRecord)).toEqual({
      templateId: "template_1",
      templateName: "Strength Support",
      description: null,
      template: supplementTemplateJson
    });
    expect(serializeSupplementTemplate(templateRecord)).toMatchObject({
      id: "template_1",
      organizationId: "org_1",
      status: "published",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z"
    });
  });

  it("serializes supplements, coach details, and assignment statuses", () => {
    expect(
      serializeSupplement({
        id: "supplement_global",
        organizationId: null,
        scope: LibraryScope.GLOBAL,
        name: "Magnesium",
        category: "Recovery",
        recommendedTiming: null,
        dosage: null,
        bioavailabilityNotes: null,
        clinicalDescription: null,
        tags: ["sleep"],
        imageObjectId: null,
        createdAt: "2026-06-01",
        updatedAt: new Date("2026-06-02T00:00:00.000Z")
      })
    ).toMatchObject({
      scope: "global",
      tags: ["sleep"],
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z"
    });
    expect(
      serializeSupplement({
        id: "supplement_private",
        organizationId: "org_1",
        scope: LibraryScope.PRIVATE,
        name: "Private Blend",
        category: "Recovery",
        recommendedTiming: "Night",
        dosage: "2 caps",
        bioavailabilityNotes: "With food",
        clinicalDescription: "Coach created.",
        tags: null,
        imageObjectId: "image_1",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z"
      })
    ).toMatchObject({ scope: "private", tags: [], imageObjectId: "image_1" });

    expect(serializeSupplementCoachDetails(null)).toEqual({
      coachDosageInstructions: "",
      coachNotes: "",
      affiliateLink: "",
      createdAt: null,
      updatedAt: null
    });
    expect(
      serializeSupplementCoachDetails({
        id: "detail_1",
        organizationId: "org_1",
        supplementId: "supplement_1",
        coachDosageInstructions: "Daily",
        coachNotes: "Monitor digestion.",
        affiliateLink: "https://example.com",
        createdAt: "2026-06-01",
        updatedAt: "2026-06-02"
      })
    ).toMatchObject({
      coachDosageInstructions: "Daily",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z"
    });

    const baseAssignment = {
      id: "assignment_1",
      organizationId: "org_1",
      clientId: "client_1",
      templateId: null,
      name: "Strength Support",
      snapshotJson: supplementTemplateJson,
      startsOn: "2026-06-01T00:00:00.000Z",
      endsOn: null,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: new Date("2026-06-02T00:00:00.000Z")
    };

    expect(
      serializeSupplementAssignment({
        ...baseAssignment,
        status: SupplementPlanAssignmentStatus.ACTIVE,
        client: { firstName: "Ava", lastName: "Stone" }
      })
    ).toMatchObject({ clientName: "Ava Stone", status: "active", startsOn: "2026-06-01", endsOn: null });
    expect(
      serializeSupplementAssignment({
        ...baseAssignment,
        id: "assignment_paused",
        status: SupplementPlanAssignmentStatus.PAUSED,
        endsOn: "2026-06-08T00:00:00.000Z"
      })
    ).toMatchObject({ clientName: null, status: "paused", endsOn: "2026-06-08" });
    expect(serializeSupplementAssignment({ ...baseAssignment, id: "assignment_completed", status: SupplementPlanAssignmentStatus.COMPLETED })).toMatchObject({
      status: "completed"
    });
    expect(serializeSupplementAssignment({ ...baseAssignment, id: "assignment_cancelled", status: SupplementPlanAssignmentStatus.CANCELLED })).toMatchObject({
      status: "cancelled"
    });
  });
});
