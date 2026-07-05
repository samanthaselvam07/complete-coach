import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  LibraryScope,
  SupplementPlanAssignmentStatus,
  SupplementPlanTemplateStatus
} from "@/app/generated/prisma/enums";
import { GET as getSupplements, POST as createSupplement } from "@/app/api/v1/supplements/route";
import {
  GET as getSupplementCoachDetails,
  PATCH as updateSupplementCoachDetails
} from "@/app/api/v1/supplements/[supplementId]/coach-details/route";
import {
  GET as getSupplementTemplates,
  POST as createSupplementTemplate
} from "@/app/api/v1/supplement-plan-templates/route";
import {
  DELETE as deleteSupplementTemplate,
  GET as getSupplementTemplate,
  PATCH as updateSupplementTemplate
} from "@/app/api/v1/supplement-plan-templates/[templateId]/route";
import {
  GET as getSupplementAssignments,
  POST as createSupplementAssignment
} from "@/app/api/v1/supplement-plan-assignments/route";
import { DELETE as deleteSupplementAssignment } from "@/app/api/v1/supplement-plan-assignments/[assignmentId]/route";
import {
  buildSupplementTemplateWhere,
  buildSupplementWhere,
  serializeSupplement,
  serializeSupplementAssignment
} from "@/lib/supplementation/supplement-records";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    auditLog: { create: vi.fn() },
    supplementLibraryItem: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn()
    },
    supplementCoachDetail: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    supplementPlanTemplate: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn()
    },
    supplementPlanAssignment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn()
    },
    client: {
      findFirst: vi.fn()
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

const globalSupplement = {
  id: "supplement_global",
  organizationId: null,
  scope: LibraryScope.GLOBAL,
  name: "Creatine Monohydrate",
  category: "Performance",
  recommendedTiming: "Daily",
  dosage: "5g",
  bioavailabilityNotes: "Use micronized monohydrate.",
  clinicalDescription: "Supports repeated high-intensity efforts.",
  tags: ["strength"],
  imageObjectId: null,
  createdAt: new Date("2026-06-02T00:00:00.000Z"),
  updatedAt: new Date("2026-06-02T00:00:00.000Z")
};

const privateSupplement = {
  ...globalSupplement,
  id: "supplement_private",
  organizationId: "org_1",
  scope: LibraryScope.PRIVATE,
  name: "Coach Electrolytes",
  category: "Hydration"
};

const supplementCoachDetail = {
  id: "supplement_coach_detail_1",
  organizationId: "org_1",
  supplementId: "supplement_global",
  coachDosageInstructions: "Use the client-ready brand instructions.",
  coachNotes: "Use the brand stocked through our supplement partner.",
  affiliateLink: "https://completecoach.fit/recommended",
  createdAt: new Date("2026-06-02T00:00:00.000Z"),
  updatedAt: new Date("2026-06-02T00:00:00.000Z")
};

const supplementTemplateJson = {
  phases: [
    {
      name: "Training Day",
      supplements: [
        {
          supplementId: "supplement_private",
          supplementName: "Coach Electrolytes",
          dosage: "1 serve",
          timing: "During training"
        }
      ]
    }
  ]
};

const supplementTemplate = {
  id: "supplement_template_1",
  organizationId: "org_1",
  name: "Hydration Support",
  description: "Training day hydration protocol",
  status: SupplementPlanTemplateStatus.PUBLISHED,
  templateJson: supplementTemplateJson,
  createdAt: new Date("2026-06-02T00:00:00.000Z"),
  updatedAt: new Date("2026-06-02T00:00:00.000Z")
};

const supplementAssignment = {
  id: "supplement_assignment_1",
  organizationId: "org_1",
  clientId: "client_1",
  templateId: "supplement_template_1",
  name: "Hydration Support",
  status: SupplementPlanAssignmentStatus.ACTIVE,
  snapshotJson: {
    templateId: "supplement_template_1",
    templateName: "Hydration Support",
    template: supplementTemplateJson
  },
  startsOn: new Date("2026-06-02T00:00:00.000Z"),
  endsOn: null,
  createdAt: new Date("2026-06-02T00:00:00.000Z"),
  updatedAt: new Date("2026-06-02T00:00:00.000Z"),
  client: {
    firstName: "Api",
    lastName: "Client"
  }
};

describe("supplementation persistence APIs", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.supplementLibraryItem.create.mockReset();
    mocks.prisma.supplementLibraryItem.findFirst.mockReset();
    mocks.prisma.supplementLibraryItem.findMany.mockReset();
    mocks.prisma.supplementCoachDetail.findUnique.mockReset();
    mocks.prisma.supplementCoachDetail.upsert.mockReset();
    mocks.prisma.supplementPlanTemplate.create.mockReset();
    mocks.prisma.supplementPlanTemplate.findMany.mockReset();
    mocks.prisma.supplementPlanTemplate.findFirst.mockReset();
    mocks.prisma.supplementPlanTemplate.updateMany.mockReset();
    mocks.prisma.supplementPlanAssignment.create.mockReset();
    mocks.prisma.supplementPlanAssignment.findMany.mockReset();
    mocks.prisma.supplementPlanAssignment.findFirst.mockReset();
    mocks.prisma.supplementPlanAssignment.deleteMany.mockReset();
    mocks.prisma.client.findFirst.mockReset();
  });

  it("lists global and private supplements for the active organization", async () => {
    mocks.prisma.supplementLibraryItem.findMany.mockResolvedValue([globalSupplement, privateSupplement]);

    const response = await getSupplements(new Request("http://test.local/api/v1/supplements?search=creatine"));
    const payload = (await response.json()) as { data: Array<{ id: string; scope: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([
      expect.objectContaining({ id: "supplement_global", scope: "global" }),
      expect.objectContaining({ id: "supplement_private", scope: "private" })
    ]);
    expect(mocks.prisma.supplementLibraryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: "org_1" }]
        })
      })
    );
  });

  it("creates private supplements and audits the write", async () => {
    mocks.prisma.supplementLibraryItem.create.mockResolvedValue(privateSupplement);

    const response = await createSupplement(
      new Request("http://test.local/api/v1/supplements", {
        method: "POST",
        body: JSON.stringify({
          name: "Coach Electrolytes",
          category: "Hydration",
          recommendedTiming: "During training",
          dosage: "1 serve",
          bioavailabilityNotes: "Use sodium-heavy mix.",
          clinicalDescription: "Supports endurance sessions.",
          tags: ["hydration"]
        })
      })
    );
    const payload = (await response.json()) as { data: { id: string; scope: string } };

    expect(response.status).toBe(201);
    expect(payload.data).toEqual(expect.objectContaining({ id: "supplement_private", scope: "private" }));
    expect(mocks.prisma.supplementLibraryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          createdByUserId: "user_1",
          scope: LibraryScope.PRIVATE
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "supplement.created" })
      })
    );
  });

  it("returns organization-specific supplement coach details", async () => {
    mocks.prisma.supplementLibraryItem.findFirst.mockResolvedValue(globalSupplement);
    mocks.prisma.supplementCoachDetail.findUnique.mockResolvedValue(supplementCoachDetail);

    const response = await getSupplementCoachDetails(
      new Request("http://test.local/api/v1/supplements/supplement_global/coach-details"),
      { params: Promise.resolve({ supplementId: "supplement_global" }) }
    );
    const payload = (await response.json()) as { data: { coachNotes: string; affiliateLink: string } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(
      expect.objectContaining({
        coachNotes: "Use the brand stocked through our supplement partner.",
        affiliateLink: "https://completecoach.fit/recommended"
      })
    );
    expect(mocks.prisma.supplementLibraryItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: "org_1" }]
        })
      })
    );
    expect(mocks.prisma.supplementCoachDetail.findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_supplementId: {
          organizationId: "org_1",
          supplementId: "supplement_global"
        }
      }
    });
  });

  it("upserts organization-specific supplement coach details and audits the write", async () => {
    mocks.prisma.supplementLibraryItem.findFirst.mockResolvedValue(globalSupplement);
    mocks.prisma.supplementCoachDetail.upsert.mockResolvedValue({
      ...supplementCoachDetail,
      coachDosageInstructions: "Client-facing dosage set by the coach.",
      coachNotes: "Preferred brand notes.",
      affiliateLink: "https://completecoach.fit/products"
    });

    const response = await updateSupplementCoachDetails(
      new Request("http://test.local/api/v1/supplements/supplement_global/coach-details", {
        method: "PATCH",
        body: JSON.stringify({
          coachDosageInstructions: "Client-facing dosage set by the coach.",
          coachNotes: "Preferred brand notes.",
          affiliateLink: "https://completecoach.fit/products"
        })
      }),
      { params: Promise.resolve({ supplementId: "supplement_global" }) }
    );
    const payload = (await response.json()) as { data: { coachDosageInstructions: string } };

    expect(response.status).toBe(200);
    expect(payload.data.coachDosageInstructions).toBe("Client-facing dosage set by the coach.");
    expect(mocks.prisma.supplementCoachDetail.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_supplementId: {
            organizationId: "org_1",
            supplementId: "supplement_global"
          }
        },
        create: expect.objectContaining({
          organizationId: "org_1",
          supplementId: "supplement_global",
          createdByUserId: "user_1",
          updatedByUserId: "user_1"
        }),
        update: expect.objectContaining({
          updatedByUserId: "user_1"
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "supplement.coach_details.updated" })
      })
    );
  });

  it("does not expose coach details for inaccessible supplements", async () => {
    mocks.prisma.supplementLibraryItem.findFirst.mockResolvedValue(null);

    const response = await getSupplementCoachDetails(
      new Request("http://test.local/api/v1/supplements/missing/coach-details"),
      { params: Promise.resolve({ supplementId: "missing" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.supplementCoachDetail.findUnique).not.toHaveBeenCalled();
  });

  it("creates supplement templates with structured protocol JSON", async () => {
    mocks.prisma.supplementPlanTemplate.create.mockResolvedValue(supplementTemplate);

    const response = await createSupplementTemplate(
      new Request("http://test.local/api/v1/supplement-plan-templates", {
        method: "POST",
        body: JSON.stringify({
          name: "Hydration Support",
          description: "Training day hydration protocol",
          status: "published",
          template: supplementTemplateJson
        })
      })
    );
    const payload = (await response.json()) as { data: { id: string; status: string } };

    expect(response.status).toBe(201);
    expect(payload.data).toEqual(expect.objectContaining({ id: "supplement_template_1", status: "published" }));
    expect(mocks.prisma.supplementPlanTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          templateJson: supplementTemplateJson
        })
      })
    );
  });

  it("loads a single supplement template for editing within the active organization", async () => {
    mocks.prisma.supplementPlanTemplate.findFirst.mockResolvedValue(supplementTemplate);

    const response = await getSupplementTemplate(
      new Request("http://test.local/api/v1/supplement-plan-templates/supplement_template_1"),
      { params: Promise.resolve({ templateId: "supplement_template_1" }) }
    );
    const payload = (await response.json()) as { data: { id: string; template: unknown } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(
      expect.objectContaining({
        id: "supplement_template_1",
        template: supplementTemplateJson
      })
    );
    expect(mocks.prisma.supplementPlanTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: "supplement_template_1", organizationId: "org_1", deletedAt: null }
    });
  });

  it("updates and soft deletes supplement templates for the active organization", async () => {
    mocks.prisma.supplementPlanTemplate.findFirst.mockResolvedValue(supplementTemplate);
    mocks.prisma.supplementPlanTemplate.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.supplementPlanTemplate.findFirst
      .mockResolvedValueOnce(supplementTemplate)
      .mockResolvedValueOnce({
        ...supplementTemplate,
        name: "Updated Hydration Support"
      });

    const updateResponse = await updateSupplementTemplate(
      new Request("http://test.local/api/v1/supplement-plan-templates/supplement_template_1", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Hydration Support"
        })
      }),
      { params: Promise.resolve({ templateId: "supplement_template_1" }) }
    );
    const updatePayload = (await updateResponse.json()) as { data: { name: string } };

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.data.name).toBe("Updated Hydration Support");
    expect(mocks.prisma.supplementPlanTemplate.updateMany).toHaveBeenCalledWith({
      where: { id: "supplement_template_1", organizationId: "org_1", deletedAt: null },
      data: { name: "Updated Hydration Support" }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "supplement_plan_template.updated" })
      })
    );

    mocks.prisma.auditLog.create.mockClear();
    mocks.prisma.supplementPlanTemplate.findFirst.mockResolvedValue(supplementTemplate);
    mocks.prisma.supplementPlanTemplate.updateMany.mockResolvedValue({ count: 1 });

    const deleteResponse = await deleteSupplementTemplate(
      new Request("http://test.local/api/v1/supplement-plan-templates/supplement_template_1", {
        method: "DELETE"
      }),
      { params: Promise.resolve({ templateId: "supplement_template_1" }) }
    );

    expect(deleteResponse.status).toBe(200);
    expect(mocks.prisma.supplementPlanTemplate.updateMany).toHaveBeenLastCalledWith({
      where: { id: "supplement_template_1", organizationId: "org_1", deletedAt: null },
      data: { deletedAt: expect.any(Date) }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "supplement_plan_template.deleted" })
      })
    );
  });

  it("assigns supplement templates with immutable snapshots", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1" });
    mocks.prisma.supplementPlanTemplate.findFirst.mockResolvedValue(supplementTemplate);
    mocks.prisma.supplementPlanAssignment.create.mockResolvedValue(supplementAssignment);

    const response = await createSupplementAssignment(
      new Request("http://test.local/api/v1/supplement-plan-assignments", {
        method: "POST",
        body: JSON.stringify({
          clientId: "client_1",
          templateId: "supplement_template_1",
          startsOn: "2026-06-02"
        })
      })
    );
    const payload = (await response.json()) as { data: { id: string; snapshot: unknown } };

    expect(response.status).toBe(201);
    expect(payload.data).toEqual(expect.objectContaining({ id: "supplement_assignment_1" }));
    expect(mocks.prisma.supplementPlanAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          templateId: "supplement_template_1",
          snapshotJson: expect.objectContaining({
            templateId: "supplement_template_1",
            templateName: "Hydration Support"
          })
        })
      })
    );
  });

  it("deletes supplement assignments for the active organization", async () => {
    mocks.prisma.supplementPlanAssignment.findFirst.mockResolvedValue(supplementAssignment);
    mocks.prisma.supplementPlanAssignment.deleteMany.mockResolvedValue({ count: 1 });

    const response = await deleteSupplementAssignment(
      new Request("http://test.local/api/v1/supplement-plan-assignments/supplement_assignment_1", {
        method: "DELETE"
      }),
      { params: Promise.resolve({ assignmentId: "supplement_assignment_1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.supplementPlanAssignment.deleteMany).toHaveBeenCalledWith({
      where: { id: "supplement_assignment_1", organizationId: "org_1" }
    });
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "supplement_plan_assignment.deleted" })
      })
    );
  });

  it("returns not found when assigning a supplement plan to a missing client or template", async () => {
    mocks.prisma.client.findFirst.mockResolvedValue(null);
    mocks.prisma.supplementPlanTemplate.findFirst.mockResolvedValue(supplementTemplate);

    const missingClientResponse = await createSupplementAssignment(
      new Request("http://test.local/api/v1/supplement-plan-assignments", {
        method: "POST",
        body: JSON.stringify({
          clientId: "missing",
          templateId: "supplement_template_1",
          startsOn: "2026-06-02"
        })
      })
    );

    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1" });
    mocks.prisma.supplementPlanTemplate.findFirst.mockResolvedValue(null);

    const missingTemplateResponse = await createSupplementAssignment(
      new Request("http://test.local/api/v1/supplement-plan-assignments", {
        method: "POST",
        body: JSON.stringify({
          clientId: "client_1",
          templateId: "missing",
          startsOn: "2026-06-02"
        })
      })
    );

    expect(missingClientResponse.status).toBe(404);
    expect(missingTemplateResponse.status).toBe(404);
    expect(mocks.prisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "client_1", organizationId: "org_1", deletedAt: null }
      })
    );
    expect(mocks.prisma.supplementPlanTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "missing", organizationId: "org_1", deletedAt: null }
      })
    );
    expect(mocks.prisma.supplementPlanAssignment.create).not.toHaveBeenCalled();
    expect(mocks.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("lists supplement assignments with client names", async () => {
    mocks.prisma.supplementPlanAssignment.findMany.mockResolvedValue([supplementAssignment]);

    const response = await getSupplementAssignments(
      new Request("http://test.local/api/v1/supplement-plan-assignments?clientId=client_1")
    );
    const payload = (await response.json()) as { data: Array<{ clientName: string }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]).toEqual(expect.objectContaining({ clientName: "Api Client" }));
    expect(mocks.prisma.supplementPlanAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org_1", clientId: "client_1" }
      })
    );
  });

  it("filters supplement templates by active organization", async () => {
    mocks.prisma.supplementPlanTemplate.findMany.mockResolvedValue([supplementTemplate]);

    await getSupplementTemplates(new Request("http://test.local/api/v1/supplement-plan-templates?status=published"));

    expect(mocks.prisma.supplementPlanTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          status: SupplementPlanTemplateStatus.PUBLISHED
        })
      })
    );
  });

  it("covers supplement helper branches for optional filters and nullable serialization", () => {
    expect(buildSupplementWhere("org_1", { limit: 50 })).toEqual({
      deletedAt: null,
      OR: [{ scope: LibraryScope.GLOBAL }, { organizationId: "org_1" }]
    });
    expect(buildSupplementTemplateWhere("org_1", { limit: 50 })).toEqual({
      organizationId: "org_1",
      deletedAt: null
    });
    expect(serializeSupplement({ ...privateSupplement, tags: null })).toEqual(
      expect.objectContaining({ tags: [] })
    );
    expect(
      serializeSupplementAssignment({
        ...supplementAssignment,
        client: undefined,
        startsOn: "2026-06-02",
        endsOn: "2026-06-09"
      })
    ).toEqual(expect.objectContaining({ clientName: null, endsOn: "2026-06-09" }));
  });
});
