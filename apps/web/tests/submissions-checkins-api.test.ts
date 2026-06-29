import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CheckInStatus,
  FormAssignmentStatus,
  FormSubmissionStatus,
  FormType
} from "@/app/generated/prisma/enums";
import { GET as getAssignments } from "@/app/api/v1/form-assignments/route";
import { GET as getAssignment } from "@/app/api/v1/form-assignments/[assignmentId]/route";
import { POST as submitAssignment } from "@/app/api/v1/form-assignments/[assignmentId]/submit/route";
import { GET as getSubmissions } from "@/app/api/v1/form-submissions/route";
import { GET as getSubmission } from "@/app/api/v1/form-submissions/[submissionId]/route";
import { GET as getCheckIns } from "@/app/api/v1/check-ins/route";
import { GET as getCheckIn } from "@/app/api/v1/check-ins/[checkInId]/route";
import { POST as reviewCheckIn } from "@/app/api/v1/check-ins/[checkInId]/review/route";
import { POST as completeCheckIn } from "@/app/api/v1/check-ins/[checkInId]/complete/route";
import { GET as getCheckInMetrics } from "@/app/api/v1/check-ins/[checkInId]/extracted-metrics/route";
import { GET as getClientMetrics } from "@/app/api/v1/clients/[clientId]/metrics/route";
import {
  serializeAssignment,
  serializeCheckIn,
  serializeCheckInDetail,
  serializeMetric,
  serializeSubmission
} from "@/lib/forms/submission-records";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
    auditLog: { create: vi.fn() },
    client: { findFirst: vi.fn() },
    formAssignment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    formSubmission: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    checkIn: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    clientMeasurement: {
      findMany: vi.fn(),
      upsert: vi.fn()
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

const formDefinition = {
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
    },
    {
      id: "energy",
      type: "scale",
      label: "Energy",
      required: false,
      metricKey: "energy",
      metricUnit: "score",
      exportPolicy: "metric"
    },
    {
      id: "notes",
      type: "long-text",
      label: "Notes",
      required: false,
      exportPolicy: "private"
    }
  ]
};

const assignmentRecord = {
  id: "assignment_1",
  organizationId: "org_1",
  formId: "form_1",
  formVersionId: "version_1",
  clientId: "client_1",
  status: FormAssignmentStatus.ASSIGNED,
  dueAt: new Date("2026-05-21T00:00:00.000Z"),
  completedAt: null,
  createdAt: new Date("2026-05-14T00:00:00.000Z"),
  form: {
    id: "form_1",
    name: "Weekly Check-In",
    type: FormType.CHECK_IN
  },
  formVersion: {
    id: "version_1",
    formId: "form_1",
    versionNumber: 1,
    schemaJson: formDefinition,
    uiJson: null,
    publishedAt: new Date("2026-05-14T00:00:00.000Z"),
    createdAt: new Date("2026-05-14T00:00:00.000Z")
  },
  client: {
    id: "client_1",
    firstName: "Api",
    lastName: "Client"
  }
};

const submissionRecord = {
  id: "submission_1",
  organizationId: "org_1",
  formId: "form_1",
  formVersionId: "version_1",
  assignmentId: "assignment_1",
  clientId: "client_1",
  answersJson: {
    "body-weight": 82.5,
    energy: 8,
    notes: "Feeling good."
  },
  status: FormSubmissionStatus.SUBMITTED,
  submittedAt: new Date("2026-05-14T06:00:00.000Z"),
  reviewedAt: null,
  createdAt: new Date("2026-05-14T06:00:00.000Z"),
  updatedAt: new Date("2026-05-14T06:00:00.000Z"),
  form: assignmentRecord.form,
  formVersion: assignmentRecord.formVersion,
  client: assignmentRecord.client
};

const checkInRecord = {
  id: "checkin_1",
  organizationId: "org_1",
  clientId: "client_1",
  formSubmissionId: "submission_1",
  type: "check-in",
  status: CheckInStatus.PENDING_REVIEW,
  dueAt: new Date("2026-05-21T00:00:00.000Z"),
  submittedAt: new Date("2026-05-14T06:00:00.000Z"),
  reviewedAt: null,
  reviewedByUserId: null,
  summary: null,
  coachNotes: null,
  createdAt: new Date("2026-05-14T06:00:00.000Z"),
  updatedAt: new Date("2026-05-14T06:00:00.000Z"),
  client: assignmentRecord.client,
  formSubmission: submissionRecord
};

describe("submissions, check-ins, and metrics APIs", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.$transaction.mockReset();
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.client.findFirst.mockReset();
    mocks.prisma.formAssignment.findMany.mockReset();
    mocks.prisma.formAssignment.findFirst.mockReset();
    mocks.prisma.formAssignment.update.mockReset();
    mocks.prisma.formSubmission.create.mockReset();
    mocks.prisma.formSubmission.findMany.mockReset();
    mocks.prisma.formSubmission.findFirst.mockReset();
    mocks.prisma.formSubmission.update.mockReset();
    mocks.prisma.checkIn.create.mockReset();
    mocks.prisma.checkIn.findMany.mockReset();
    mocks.prisma.checkIn.findFirst.mockReset();
    mocks.prisma.checkIn.update.mockReset();
    mocks.prisma.clientMeasurement.findMany.mockReset();
    mocks.prisma.clientMeasurement.upsert.mockReset();
  });

  it("lists tenant-scoped form assignments", async () => {
    mocks.prisma.formAssignment.findMany.mockResolvedValue([assignmentRecord]);

    const response = await getAssignments(new Request("http://test.local/api/v1/form-assignments?status=assigned"));
    const payload = (await response.json()) as { data: Array<{ id: string; clientName: string }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]).toEqual(expect.objectContaining({ id: "assignment_1", clientName: "Api Client" }));
    expect(mocks.prisma.formAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          status: FormAssignmentStatus.ASSIGNED
        })
      })
    );
  });

  it("lists form assignments with optional client filters and default limits", async () => {
    mocks.prisma.formAssignment.findMany.mockResolvedValue([{ ...assignmentRecord, status: "COMPLETED" }]);

    const filteredResponse = await getAssignments(
      new Request("http://test.local/api/v1/form-assignments?clientId=client_1&limit=10")
    );
    const unfilteredResponse = await getAssignments(new Request("http://test.local/api/v1/form-assignments"));
    const payload = (await filteredResponse.json()) as { data: Array<{ status: string }> };

    expect(filteredResponse.status).toBe(200);
    expect(unfilteredResponse.status).toBe(200);
    expect(payload.data[0].status).toBe("completed");
    expect(mocks.prisma.formAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        where: expect.objectContaining({ clientId: "client_1" })
      })
    );
  });

  it("returns an assigned immutable form version", async () => {
    mocks.prisma.formAssignment.findFirst.mockResolvedValue(assignmentRecord);

    const response = await getAssignment(new Request("http://test.local/api/v1/form-assignments/assignment_1"), {
      params: Promise.resolve({ assignmentId: "assignment_1" })
    });
    const payload = (await response.json()) as { data: { formVersion: { schema: { title: string } } } };

    expect(response.status).toBe(200);
    expect(payload.data.formVersion.schema.title).toBe("Weekly Check-In");
  });

  it("returns not found for missing assignments and submissions", async () => {
    mocks.prisma.formAssignment.findFirst.mockResolvedValueOnce(null);
    mocks.prisma.formSubmission.findFirst.mockResolvedValueOnce(null);

    const assignmentResponse = await getAssignment(new Request("http://test.local/api/v1/form-assignments/missing"), {
      params: Promise.resolve({ assignmentId: "missing" })
    });
    const submissionResponse = await getSubmission(new Request("http://test.local/api/v1/form-submissions/missing"), {
      params: Promise.resolve({ submissionId: "missing" })
    });

    expect(assignmentResponse.status).toBe(404);
    expect(submissionResponse.status).toBe(404);
  });

  it("submits an assignment, creates a check-in, and upserts extracted metrics idempotently", async () => {
    mocks.prisma.formAssignment.findFirst.mockResolvedValue(assignmentRecord);
    mocks.prisma.formSubmission.create.mockResolvedValue(submissionRecord);
    mocks.prisma.formAssignment.update.mockResolvedValue({ ...assignmentRecord, status: FormAssignmentStatus.SUBMITTED });
    mocks.prisma.checkIn.create.mockResolvedValue(checkInRecord);
    mocks.prisma.clientMeasurement.upsert.mockResolvedValue({});
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const response = await submitAssignment(
      new Request("http://test.local/api/v1/form-assignments/assignment_1/submit", {
        method: "POST",
        body: JSON.stringify({
          answers: {
            "body-weight": 82.5,
            energy: 8,
            notes: "Feeling good."
          }
        })
      }),
      { params: Promise.resolve({ assignmentId: "assignment_1" }) }
    );

    expect(response.status).toBe(201);
    expect(mocks.prisma.$transaction).toHaveBeenCalled();
    expect(mocks.prisma.checkIn.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          formSubmissionId: "submission_1",
          status: CheckInStatus.PENDING_REVIEW
        })
      })
    );
    expect(mocks.prisma.clientMeasurement.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.clientMeasurement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_sourceType_sourceId_metricKey: {
            organizationId: "org_1",
            sourceType: "form_submission",
            sourceId: "submission_1",
            metricKey: "body_weight"
          }
        }
      })
    );
  });

  it("rejects invalid submission answers without writing records", async () => {
    mocks.prisma.formAssignment.findFirst.mockResolvedValue(assignmentRecord);

    const response = await submitAssignment(
      new Request("http://test.local/api/v1/form-assignments/assignment_1/submit", {
        method: "POST",
        body: JSON.stringify({ answers: { "body-weight": "not-a-number" } })
      }),
      { params: Promise.resolve({ assignmentId: "assignment_1" }) }
    );

    expect(response.status).toBe(422);
    expect(mocks.prisma.formSubmission.create).not.toHaveBeenCalled();
  });

  it("lists tenant-scoped form submissions", async () => {
    mocks.prisma.formSubmission.findMany.mockResolvedValue([submissionRecord]);

    const response = await getSubmissions(
      new Request("http://test.local/api/v1/form-submissions?status=submitted&clientId=client_1")
    );
    const payload = (await response.json()) as { data: Array<{ id: string; formName: string; status: string }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]).toEqual(
      expect.objectContaining({ id: "submission_1", formName: "Weekly Check-In", status: "submitted" })
    );
    expect(mocks.prisma.formSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          status: FormSubmissionStatus.SUBMITTED
        })
      })
    );
  });

  it("lists form submissions with optional form filters and default limits", async () => {
    mocks.prisma.formSubmission.findMany.mockResolvedValue([{ ...submissionRecord, status: "REVIEWED" }]);

    const filteredResponse = await getSubmissions(
      new Request("http://test.local/api/v1/form-submissions?formId=form_1&limit=5")
    );
    const unfilteredResponse = await getSubmissions(new Request("http://test.local/api/v1/form-submissions"));
    const payload = (await filteredResponse.json()) as { data: Array<{ status: string }> };

    expect(filteredResponse.status).toBe(200);
    expect(unfilteredResponse.status).toBe(200);
    expect(payload.data[0].status).toBe("reviewed");
    expect(mocks.prisma.formSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        where: expect.objectContaining({ formId: "form_1" })
      })
    );
  });

  it("returns a persisted form submission detail", async () => {
    mocks.prisma.formSubmission.findFirst.mockResolvedValue(submissionRecord);

    const response = await getSubmission(new Request("http://test.local/api/v1/form-submissions/submission_1"), {
      params: Promise.resolve({ submissionId: "submission_1" })
    });
    const payload = (await response.json()) as { data: { answers: unknown; clientName: string } };

    expect(response.status).toBe(200);
    expect(payload.data.answers).toEqual(submissionRecord.answersJson);
    expect(payload.data.clientName).toBe("Api Client");
  });

  it("lists check-ins and serializes client/timing data for the review queue", async () => {
    mocks.prisma.checkIn.findMany.mockResolvedValue([checkInRecord]);

    const response = await getCheckIns(new Request("http://test.local/api/v1/check-ins?status=pending-review"));
    const payload = (await response.json()) as { data: Array<{ id: string; name: string; status: string }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]).toEqual(expect.objectContaining({ id: "checkin_1", name: "Api Client", status: "pending" }));
  });

  it("lists check-ins with optional client filters and default limits", async () => {
    mocks.prisma.checkIn.findMany.mockResolvedValue([{ ...checkInRecord, status: "COMPLETED" }]);

    const filteredResponse = await getCheckIns(
      new Request("http://test.local/api/v1/check-ins?clientId=client_1&limit=3")
    );
    const unfilteredResponse = await getCheckIns(new Request("http://test.local/api/v1/check-ins"));
    const payload = (await filteredResponse.json()) as { data: Array<{ status: string; checkInStatus: string }> };

    expect(filteredResponse.status).toBe(200);
    expect(unfilteredResponse.status).toBe(200);
    expect(payload.data[0]).toEqual(expect.objectContaining({ status: "completed", checkInStatus: "completed" }));
    expect(mocks.prisma.checkIn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        where: expect.objectContaining({ clientId: "client_1" })
      })
    );
  });

  it("returns check-in detail with raw answers and extracted metrics", async () => {
    mocks.prisma.checkIn.findFirst.mockResolvedValue(checkInRecord);
    mocks.prisma.clientMeasurement.findMany.mockResolvedValue([
      {
        id: "metric_1",
        clientId: "client_1",
        sourceType: "form_submission",
        sourceId: "submission_1",
        measuredAt: new Date("2026-05-14T06:00:00.000Z"),
        metricKey: "body_weight",
        metricValue: 82.5,
        unit: "kg",
        metadata: { fieldId: "body-weight", label: "Body weight" },
        createdAt: new Date("2026-05-14T06:00:00.000Z")
      }
    ]);

    const response = await getCheckIn(new Request("http://test.local/api/v1/check-ins/checkin_1"), {
      params: Promise.resolve({ checkInId: "checkin_1" })
    });
    const payload = (await response.json()) as { data: { answers: unknown; metrics: Array<{ metricKey: string }> } };

    expect(response.status).toBe(200);
    expect(payload.data.answers).toEqual(submissionRecord.answersJson);
    expect(payload.data.metrics[0].metricKey).toBe("body_weight");
  });

  it("does not read check-in detail or metrics outside the active organization", async () => {
    mocks.prisma.checkIn.findFirst.mockResolvedValue(null);

    const response = await getCheckIn(new Request("http://test.local/api/v1/check-ins/org_2_checkin"), {
      params: Promise.resolve({ checkInId: "org_2_checkin" })
    });
    const payload = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(404);
    expect(payload.error).toMatchObject({ code: "not_found", message: "Check-in not found." });
    expect(mocks.prisma.checkIn.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "org_2_checkin",
          organizationId: "org_1"
        }
      })
    );
    expect(mocks.prisma.clientMeasurement.findMany).not.toHaveBeenCalled();
  });

  it("returns not found and empty metric responses for check-in metric edge cases", async () => {
    mocks.prisma.checkIn.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...checkInRecord, formSubmissionId: null });

    const missingResponse = await getCheckInMetrics(
      new Request("http://test.local/api/v1/check-ins/missing/extracted-metrics"),
      { params: Promise.resolve({ checkInId: "missing" }) }
    );
    const emptyResponse = await getCheckInMetrics(
      new Request("http://test.local/api/v1/check-ins/checkin_1/extracted-metrics"),
      { params: Promise.resolve({ checkInId: "checkin_1" }) }
    );
    const payload = (await emptyResponse.json()) as { data: unknown[] };

    expect(missingResponse.status).toBe(404);
    expect(emptyResponse.status).toBe(200);
    expect(payload.data).toEqual([]);
  });

  it("reviews and completes check-ins with semantic state transitions", async () => {
    mocks.prisma.checkIn.findFirst.mockResolvedValueOnce(checkInRecord).mockResolvedValueOnce({
      ...checkInRecord,
      status: CheckInStatus.REVIEWED
    });
    mocks.prisma.checkIn.update
      .mockResolvedValueOnce({ ...checkInRecord, status: CheckInStatus.REVIEWED })
      .mockResolvedValueOnce({ ...checkInRecord, status: CheckInStatus.COMPLETED });
    mocks.prisma.formSubmission.update.mockResolvedValue({});
    mocks.prisma.auditLog.create.mockResolvedValue({});

    const reviewResponse = await reviewCheckIn(
      new Request("http://test.local/api/v1/check-ins/checkin_1/review", {
        method: "POST",
        body: JSON.stringify({ summary: "Strong week", coachNotes: "Increase steps." })
      }),
      { params: Promise.resolve({ checkInId: "checkin_1" }) }
    );
    const completeResponse = await completeCheckIn(
      new Request("http://test.local/api/v1/check-ins/checkin_1/complete", { method: "POST" }),
      { params: Promise.resolve({ checkInId: "checkin_1" }) }
    );

    expect(reviewResponse.status).toBe(200);
    expect(completeResponse.status).toBe(200);
    expect(mocks.prisma.checkIn.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: CheckInStatus.REVIEWED }) })
    );
    expect(mocks.prisma.checkIn.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: CheckInStatus.COMPLETED }) })
    );
  });

  it("rejects invalid check-in state transitions", async () => {
    mocks.prisma.checkIn.findFirst.mockResolvedValue({ ...checkInRecord, status: CheckInStatus.COMPLETED });

    const response = await reviewCheckIn(
      new Request("http://test.local/api/v1/check-ins/checkin_1/review", {
        method: "POST",
        body: JSON.stringify({ summary: "Already complete" })
      }),
      { params: Promise.resolve({ checkInId: "checkin_1" }) }
    );

    expect(response.status).toBe(409);
    expect(mocks.prisma.checkIn.update).not.toHaveBeenCalled();
  });

  it("returns extracted metrics for check-ins and clients", async () => {
    mocks.prisma.checkIn.findFirst.mockResolvedValue(checkInRecord);
    mocks.prisma.client.findFirst.mockResolvedValue({ id: "client_1" });
    mocks.prisma.clientMeasurement.findMany.mockResolvedValue([
      {
        id: "metric_1",
        clientId: "client_1",
        sourceType: "form_submission",
        sourceId: "submission_1",
        measuredAt: new Date("2026-05-14T06:00:00.000Z"),
        metricKey: "energy",
        metricValue: 8,
        unit: "score",
        metadata: { fieldId: "energy", label: "Energy" },
        createdAt: new Date("2026-05-14T06:00:00.000Z")
      }
    ]);

    const checkInMetricsResponse = await getCheckInMetrics(
      new Request("http://test.local/api/v1/check-ins/checkin_1/extracted-metrics"),
      { params: Promise.resolve({ checkInId: "checkin_1" }) }
    );
    const clientMetricsResponse = await getClientMetrics(
      new Request("http://test.local/api/v1/clients/client_1/metrics?metricKey=energy"),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );

    expect(checkInMetricsResponse.status).toBe(200);
    expect(clientMetricsResponse.status).toBe(200);
    expect(mocks.prisma.clientMeasurement.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          clientId: "client_1",
          metricKey: "energy"
        })
      })
    );
  });

  it("filters client metrics by date range and returns not found for cross-tenant clients", async () => {
    mocks.prisma.client.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "client_1" });
    mocks.prisma.clientMeasurement.findMany.mockResolvedValue([]);

    const missingClientResponse = await getClientMetrics(
      new Request("http://test.local/api/v1/clients/client_1/metrics"),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );
    const filteredResponse = await getClientMetrics(
      new Request(
        "http://test.local/api/v1/clients/client_1/metrics?dateFrom=2026-05-01T00:00:00.000Z&dateTo=2026-05-31T00:00:00.000Z&limit=2"
      ),
      { params: Promise.resolve({ clientId: "client_1" }) }
    );

    expect(missingClientResponse.status).toBe(404);
    expect(filteredResponse.status).toBe(200);
    expect(mocks.prisma.clientMeasurement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 2,
        where: expect.objectContaining({
          measuredAt: {
            gte: new Date("2026-05-01T00:00:00.000Z"),
            lte: new Date("2026-05-31T00:00:00.000Z")
          }
        })
      })
    );
  });

  it("serializes sparse records with stable fallback values", () => {
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(new Date("2026-05-14T00:00:00.000Z").getTime());

    expect(
      serializeAssignment({
        ...assignmentRecord,
        status: "ARCHIVED",
        form: null,
        formVersion: null,
        client: null,
        dueAt: null,
        completedAt: null,
        createdAt: "2026-05-14T00:00:00.000Z"
      }).status
    ).toBe("ARCHIVED");
    expect(
      serializeSubmission({
        ...submissionRecord,
        status: "CUSTOM",
        form: null,
        client: { name: "Named Client" },
        reviewedAt: "2026-05-15T00:00:00.000Z"
      })
    ).toEqual(expect.objectContaining({ status: "CUSTOM", clientName: "Named Client", formName: "Submitted form" }));
    expect(
      serializeCheckIn({
        ...checkInRecord,
        status: "PENDING_REVIEW",
        client: { firstName: "", lastName: "" },
        formSubmission: null,
        dueAt: null,
        submittedAt: null,
        createdAt: new Date()
      })
    ).toEqual(expect.objectContaining({ name: "Unknown client", status: "pending" }));
    expect(
      serializeCheckIn({
        ...checkInRecord,
        status: CheckInStatus.REVIEWED,
        submittedAt: "2026-05-13T00:00:00.000Z",
        createdAt: "2026-05-13T00:00:00.000Z"
      }).lastCheckIn
    ).toBe("1 day ago");
    expect(
      serializeCheckIn({
        ...checkInRecord,
        status: CheckInStatus.REVIEWED,
        submittedAt: "2026-05-10T00:00:00.000Z",
        createdAt: "2026-05-10T00:00:00.000Z"
      }).lastCheckIn
    ).toBe("4 days ago");
    expect(serializeCheckInDetail({ ...checkInRecord, formSubmission: null }, [])).toEqual(
      expect.objectContaining({ answers: null, submission: null, metrics: [] })
    );
    expect(
      serializeMetric({
        id: "metric_sparse",
        clientId: "client_1",
        sourceType: "manual",
        sourceId: "source_1",
        measuredAt: "2026-05-14T00:00:00.000Z",
        metricKey: "energy",
        metricValue: { toString: () => "7" },
        unit: null,
        metadata: null
      })
    ).not.toHaveProperty("createdAt");
    dateNowSpy.mockRestore();
  });
});
