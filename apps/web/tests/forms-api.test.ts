import { beforeEach, describe, expect, it, vi } from "vitest";

import { FormStatus, FormType } from "@/app/generated/prisma/enums";
import { GET as getForms, POST as postForm } from "@/app/api/v1/forms/route";
import { GET as getForm, PATCH as patchForm } from "@/app/api/v1/forms/[formId]/route";
import { POST as postFormVersion } from "@/app/api/v1/forms/[formId]/versions/route";
import { POST as publishForm } from "@/app/api/v1/forms/[formId]/publish/route";
import { POST as postFormAssignment } from "@/app/api/v1/forms/[formId]/assignments/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    client: {
      findFirst: vi.fn()
    },
    form: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    formVersion: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    formAssignment: {
      create: vi.fn()
    },
    auditLog: {
      create: vi.fn()
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

const formRecord = {
  id: "form_1",
  name: "Weekly Check-In",
  description: "Weekly client review",
  type: FormType.CHECK_IN,
  status: FormStatus.DRAFT,
  currentVersionId: null,
  createdAt: new Date("2026-05-14T00:00:00.000Z"),
  updatedAt: new Date("2026-05-14T00:00:00.000Z")
};

const validDefinition = {
  title: "Weekly Check-In",
  fields: [
    {
      id: "body-weight",
      type: "number",
      label: "Body weight",
      required: true,
      metricKey: "body_weight",
      metricUnit: "kg",
      exportPolicy: "metric"
    }
  ]
};

describe("forms API", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.prisma.$transaction.mockReset();
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
    mocks.prisma.client.findFirst.mockReset();
    mocks.prisma.form.findMany.mockReset();
    mocks.prisma.form.create.mockReset();
    mocks.prisma.form.findFirst.mockReset();
    mocks.prisma.form.update.mockReset();
    mocks.prisma.formVersion.aggregate.mockReset();
    mocks.prisma.formVersion.create.mockReset();
    mocks.prisma.formVersion.findFirst.mockReset();
    mocks.prisma.formVersion.update.mockReset();
    mocks.prisma.formAssignment.create.mockReset();
    mocks.prisma.auditLog.create.mockReset();
  });

  it("requires authentication for form lists", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await getForms(new Request("http://test.local/api/v1/forms"));

    expect(response.status).toBe(401);
  });

  it("lists forms scoped to the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findMany.mockResolvedValue([formRecord]);

    const response = await getForms(new Request("http://test.local/api/v1/forms?type=check-in"));
    const payload = (await response.json()) as { data: Array<{ id: string; type: string }> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([
      expect.objectContaining({
        id: "form_1",
        type: "check-in"
      })
    ]);
    expect(mocks.prisma.form.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          type: FormType.CHECK_IN
        })
      })
    );
  });

  it("creates a form and writes an audit log", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.create.mockResolvedValue(formRecord);
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await postForm(
      new Request("http://test.local/api/v1/forms", {
        method: "POST",
        body: JSON.stringify({
          name: "Weekly Check-In",
          description: "Weekly client review",
          type: "check-in"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.prisma.form.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          createdByUserId: "user_1",
          type: FormType.CHECK_IN
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "form.created",
          organizationId: "org_1",
          targetId: "form_1"
        })
      })
    );
  });

  it("returns a scoped form with versions", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue({
      ...formRecord,
      versions: [
        {
          id: "version_1",
          formId: "form_1",
          versionNumber: 1,
          schemaJson: validDefinition,
          uiJson: null,
          publishedAt: null,
          createdAt: new Date("2026-05-14T00:00:00.000Z")
        }
      ]
    });

    const response = await getForm(new Request("http://test.local/api/v1/forms/form_1"), {
      params: Promise.resolve({ formId: "form_1" })
    });
    const payload = (await response.json()) as { data: { id: string; versions: Array<{ id: string }> } };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual(
      expect.objectContaining({
        id: "form_1",
        versions: [expect.objectContaining({ id: "version_1" })]
      })
    );
    expect(mocks.prisma.form.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "form_1",
          organizationId: "org_1",
          deletedAt: null
        })
      })
    );
  });

  it("returns not found for a form outside the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue(null);

    const response = await getForm(new Request("http://test.local/api/v1/forms/form_1"), {
      params: Promise.resolve({ formId: "form_1" })
    });

    expect(response.status).toBe(404);
  });

  it("updates form metadata only after scoped lookup", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue(formRecord);
    mocks.prisma.form.update.mockResolvedValue({ ...formRecord, name: "Renamed Check-In" });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await patchForm(
      new Request("http://test.local/api/v1/forms/form_1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Renamed Check-In" })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.form.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "form_1",
          organizationId: "org_1",
          deletedAt: null
        })
      })
    );
    expect(mocks.prisma.form.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: "Renamed Check-In" },
        where: { id: "form_1", organizationId: "org_1" }
      })
    );
  });

  it("returns not found when updating a form outside the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue(null);

    const response = await patchForm(
      new Request("http://test.local/api/v1/forms/form_1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Renamed Check-In" })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.form.update).not.toHaveBeenCalled();
  });

  it("creates immutable form versions with incrementing version numbers", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue(formRecord);
    mocks.prisma.formVersion.aggregate.mockResolvedValue({ _max: { versionNumber: 1 } });
    mocks.prisma.formVersion.create.mockResolvedValue({
      id: "version_2",
      formId: "form_1",
      versionNumber: 2,
      schemaJson: validDefinition,
      uiJson: null,
      publishedAt: null,
      createdAt: new Date("2026-05-14T00:00:00.000Z")
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await postFormVersion(
      new Request("http://test.local/api/v1/forms/form_1/versions", {
        method: "POST",
        body: JSON.stringify({ schema: validDefinition })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );
    const payload = (await response.json()) as { data: { versionNumber: number } };

    expect(response.status).toBe(201);
    expect(payload.data.versionNumber).toBe(2);
    expect(mocks.prisma.formVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          formId: "form_1",
          versionNumber: 2,
          schemaJson: validDefinition
        })
      })
    );
  });

  it("creates a first version and persists optional UI metadata", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue(formRecord);
    mocks.prisma.formVersion.aggregate.mockResolvedValue({ _max: { versionNumber: null } });
    mocks.prisma.formVersion.create.mockResolvedValue({
      id: "version_1",
      formId: "form_1",
      versionNumber: 1,
      schemaJson: validDefinition,
      uiJson: { layout: "single-column" },
      publishedAt: null,
      createdAt: new Date("2026-05-14T00:00:00.000Z")
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await postFormVersion(
      new Request("http://test.local/api/v1/forms/form_1/versions", {
        method: "POST",
        body: JSON.stringify({ schema: validDefinition, ui: { layout: "single-column" } })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(201);
    expect(mocks.prisma.formVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          versionNumber: 1,
          uiJson: { layout: "single-column" }
        })
      })
    );
  });

  it("does not create a form version for a form outside the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue(null);

    const response = await postFormVersion(
      new Request("http://test.local/api/v1/forms/form_1/versions", {
        method: "POST",
        body: JSON.stringify({ schema: validDefinition })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.formVersion.create).not.toHaveBeenCalled();
  });

  it("publishes a scoped form version in a transaction", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue(formRecord);
    mocks.prisma.formVersion.findFirst.mockResolvedValue({
      id: "version_1",
      formId: "form_1",
      versionNumber: 1,
      schemaJson: validDefinition,
      uiJson: null,
      publishedAt: null,
      createdAt: new Date("2026-05-14T00:00:00.000Z")
    });
    mocks.prisma.formVersion.update.mockResolvedValue({});
    mocks.prisma.form.update.mockResolvedValue({
      ...formRecord,
      status: FormStatus.PUBLISHED,
      currentVersionId: "version_1"
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await publishForm(
      new Request("http://test.local/api/v1/forms/form_1/publish", {
        method: "POST",
        body: JSON.stringify({ formVersionId: "version_1" })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.$transaction).toHaveBeenCalled();
    expect(mocks.prisma.form.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentVersionId: "version_1",
          status: FormStatus.PUBLISHED
        })
      })
    );
  });

  it("does not publish a missing scoped form version", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue(formRecord);
    mocks.prisma.formVersion.findFirst.mockResolvedValue(null);

    const response = await publishForm(
      new Request("http://test.local/api/v1/forms/form_1/publish", {
        method: "POST",
        body: JSON.stringify({ formVersionId: "missing_version" })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not publish a form outside the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue(null);

    const response = await publishForm(
      new Request("http://test.local/api/v1/forms/form_1/publish", {
        method: "POST",
        body: JSON.stringify({ formVersionId: "version_1" })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.formVersion.findFirst).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("assigns a published form version to a scoped client", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue({
      ...formRecord,
      currentVersionId: "version_1",
      status: FormStatus.PUBLISHED
    });
    mocks.prisma.formVersion.findFirst.mockResolvedValue({
      id: "version_1",
      formId: "form_1",
      publishedAt: new Date("2026-05-14T00:00:00.000Z")
    });
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1", organizationId: "org_1" });
    mocks.prisma.formAssignment.create.mockResolvedValue({
      id: "assignment_1",
      formId: "form_1",
      formVersionId: "version_1",
      clientId: "client_1",
      status: "assigned",
      dueAt: new Date("2026-05-21T00:00:00.000Z"),
      completedAt: null,
      createdAt: new Date("2026-05-14T00:00:00.000Z")
    });
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await postFormAssignment(
      new Request("http://test.local/api/v1/forms/form_1/assignments", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", dueAt: "2026-05-21T00:00:00.000Z" })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(201);
    expect(mocks.prisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "client_1",
          organizationId: "org_1"
        })
      })
    );
    expect(mocks.prisma.formAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          formVersionId: "version_1",
          clientId: "client_1"
        })
      })
    );
  });

  it("does not assign an unpublished form", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue({
      ...formRecord,
      currentVersionId: null
    });

    const response = await postFormAssignment(
      new Request("http://test.local/api/v1/forms/form_1/assignments", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1" })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(409);
    expect(mocks.prisma.formAssignment.create).not.toHaveBeenCalled();
  });

  it("does not assign a missing scoped form version", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue({
      ...formRecord,
      currentVersionId: "version_1",
      status: FormStatus.PUBLISHED
    });
    mocks.prisma.formVersion.findFirst.mockResolvedValue(null);

    const response = await postFormAssignment(
      new Request("http://test.local/api/v1/forms/form_1/assignments", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1", formVersionId: "missing_version" })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.client.findFirst).not.toHaveBeenCalled();
    expect(mocks.prisma.formAssignment.create).not.toHaveBeenCalled();
  });

  it("does not assign a form outside the active organization", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue(null);

    const response = await postFormAssignment(
      new Request("http://test.local/api/v1/forms/form_1/assignments", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1" })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.formVersion.findFirst).not.toHaveBeenCalled();
    expect(mocks.prisma.formAssignment.create).not.toHaveBeenCalled();
  });

  it("does not assign an unpublished form version", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue({
      ...formRecord,
      currentVersionId: "version_1",
      status: FormStatus.PUBLISHED
    });
    mocks.prisma.formVersion.findFirst.mockResolvedValue({
      id: "version_1",
      formId: "form_1",
      publishedAt: null
    });

    const response = await postFormAssignment(
      new Request("http://test.local/api/v1/forms/form_1/assignments", {
        method: "POST",
        body: JSON.stringify({ clientId: "client_1" })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(409);
    expect(mocks.prisma.client.findFirst).not.toHaveBeenCalled();
    expect(mocks.prisma.formAssignment.create).not.toHaveBeenCalled();
  });

  it("does not assign forms to clients outside the active organization scope", async () => {
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.form.findFirst.mockResolvedValue({
      ...formRecord,
      currentVersionId: "version_1",
      status: FormStatus.PUBLISHED
    });
    mocks.prisma.formVersion.findFirst.mockResolvedValue({
      id: "version_1",
      formId: "form_1",
      publishedAt: new Date("2026-05-14T00:00:00.000Z")
    });
    mocks.prisma.client.findFirst.mockResolvedValue(null);

    const response = await postFormAssignment(
      new Request("http://test.local/api/v1/forms/form_1/assignments", {
        method: "POST",
        body: JSON.stringify({ clientId: "other_org_client" })
      }),
      { params: Promise.resolve({ formId: "form_1" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.formAssignment.create).not.toHaveBeenCalled();
  });
});
