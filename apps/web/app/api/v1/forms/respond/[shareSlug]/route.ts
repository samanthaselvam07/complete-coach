import { LeadActivityType, LeadStage, LeadStatus } from "@/app/generated/prisma/enums";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { prisma } from "@/lib/db/prisma";
import { FormDefinitionSchema, type FormDefinition, type FormFieldDefinition } from "@/lib/forms/schema";
import { logger, redactLogValue } from "@/lib/observability/logger";
import { z } from "zod";

interface PublicFormRouteContext {
  params: Promise<{ shareSlug: string }>;
}

const publicFormSubmissionSchema = z.object({
  answers: z.record(z.string(), z.unknown()).default({})
});

type PublicLeadClient = Pick<typeof prisma, "auditLog" | "lead" | "leadActivity">;

export async function GET(_request: Request, context: PublicFormRouteContext) {
  try {
    const form = await getPublicForm((await context.params).shareSlug);

    if (!form || !form.versions[0]) {
      return errorResponse("not_found", "Form not found.", 404);
    }

    return dataResponse(serializePublicForm(form));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: PublicFormRouteContext) {
  try {
    const input = publicFormSubmissionSchema.parse(await request.json());
    const form = await getPublicForm((await context.params).shareSlug);

    if (!form || !form.versions[0]) {
      return errorResponse("not_found", "Form not found.", 404);
    }

    const definition = FormDefinitionSchema.parse(form.versions[0]?.schemaJson);
    const submittedAt = new Date();
    const lead = await syncPublicSubmissionToLead(prisma, {
      answers: input.answers,
      definition,
      formId: form.id,
      formName: form.name,
      formVersionId: form.versions[0]?.id ?? null,
      organizationId: form.organizationId,
      submittedAt
    });

    await writePublicSubmissionAudit({
      formId: form.id,
      formVersionId: form.versions[0]?.id ?? null,
      leadId: lead?.id ?? null,
      organizationId: form.organizationId,
      submittedAt
    });

    return dataResponse(
      {
        status: "submitted",
        leadId: lead?.id ?? null
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

async function getPublicForm(shareSlug: string) {
  return prisma.form.findFirst({
    where: {
      shareSlug,
      deletedAt: null
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1
      }
    }
  });
}

function serializePublicForm(form: NonNullable<Awaited<ReturnType<typeof getPublicForm>>>) {
  const latestVersion = form.versions[0];

  if (!latestVersion) {
    throw new Error("Public form has no saved version.");
  }

  const definition = FormDefinitionSchema.parse(latestVersion.schemaJson);

  return {
    id: form.id,
    name: form.name,
    description: form.description,
    type: form.type,
    shareSlug: form.shareSlug,
    versionId: latestVersion.id,
    schema: definition,
    ui: latestVersion.uiJson ?? {}
  };
}

async function syncPublicSubmissionToLead(
  client: PublicLeadClient,
  {
    answers,
    definition,
    formId,
    formName,
    formVersionId,
    organizationId,
    submittedAt
  }: {
    answers: Record<string, unknown>;
    definition: FormDefinition;
    formId: string;
    formName: string;
    formVersionId: string | null;
    organizationId: string;
    submittedAt: Date;
  }
) {
  const leadDetails = extractLeadDetails(definition.fields, answers);

  if (!leadDetails.name && !leadDetails.email) {
    return null;
  }

  const existingLead = leadDetails.email
    ? await client.lead.findFirst({
        where: {
          organizationId,
          email: leadDetails.email,
          deletedAt: null
        }
      })
    : null;
  const notes = buildPublicLeadNotes(definition.fields, answers);
  const lead = existingLead
    ? await client.lead.update({
        where: {
          id: existingLead.id,
          organizationId
        },
        data: {
          name: leadDetails.name || existingLead.name,
          phone: leadDetails.phone ?? existingLead.phone,
          location: leadDetails.location ?? existingLead.location,
          source: `Public form: ${formName}`,
          notes: mergeLeadNotes(existingLead.notes, notes),
          lastContactAt: submittedAt
        }
      })
    : await client.lead.create({
        data: {
          organizationId,
          name: leadDetails.name || leadDetails.email || "Public form lead",
          email: leadDetails.email,
          phone: leadDetails.phone,
          source: `Public form: ${formName}`,
          status: LeadStatus.WARM,
          stage: LeadStage.INITIAL_CONTACT,
          location: leadDetails.location,
          notes,
          lastContactAt: submittedAt,
          daysInStage: 0
        }
      });

  await client.leadActivity.create({
    data: {
      organizationId,
      leadId: lead.id,
      actorUserId: null,
      type: LeadActivityType.NOTE,
      body: `Public form submitted: ${formName}`,
      occurredAt: submittedAt
    }
  });

  try {
    await client.auditLog.create({
      data: {
        organizationId,
        actorUserId: null,
        action: existingLead ? "lead.updated_from_public_form" : "lead.created_from_public_form",
        targetType: "lead",
        targetId: lead.id,
        metadata: {
          formId,
          formVersionId
        }
      }
    });
  } catch (auditError) {
    logger.warn({
      event: "forms.public_lead_audit_failed",
      formId,
      leadId: lead.id,
      error: redactLogValue(auditError)
    });
  }

  return lead;
}

function extractLeadDetails(fields: FormFieldDefinition[], answers: Record<string, unknown>) {
  return {
    name: stringifyAnswer(findAnswer(fields, answers, isNameField)),
    email: normalizeEmail(stringifyAnswer(findAnswer(fields, answers, isEmailField))),
    phone: stringifyAnswer(findAnswer(fields, answers, isPhoneField)),
    location: stringifyAnswer(findAnswer(fields, answers, isLocationField))
  };
}

function findAnswer(
  fields: FormFieldDefinition[],
  answers: Record<string, unknown>,
  predicate: (field: FormFieldDefinition) => boolean
) {
  const field = fields.find(predicate);
  return field ? answers[field.id] : undefined;
}

function buildPublicLeadNotes(fields: FormFieldDefinition[], answers: Record<string, unknown>) {
  return fields
    .filter((field) => !["content-block", "photo"].includes(field.type))
    .filter((field) => !isNameField(field) && !isEmailField(field) && !isPhoneField(field) && !isLocationField(field))
    .map((field) => `${field.label}: ${stringifyAnswer(answers[field.id]) || "No answer"}`)
    .join("\n");
}

function mergeLeadNotes(existingNotes: string | null, submissionNotes: string) {
  if (!existingNotes) {
    return submissionNotes;
  }

  if (!submissionNotes) {
    return existingNotes;
  }

  return `${existingNotes}\n\n${submissionNotes}`;
}

async function writePublicSubmissionAudit({
  formId,
  formVersionId,
  leadId,
  organizationId,
  submittedAt
}: {
  formId: string;
  formVersionId: string | null;
  leadId: string | null;
  organizationId: string;
  submittedAt: Date;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: null,
        action: "form.public_submission.received",
        targetType: "form",
        targetId: formId,
        metadata: {
          formVersionId,
          leadId,
          submittedAt: submittedAt.toISOString()
        }
      }
    });
  } catch (auditError) {
    logger.warn({
      event: "forms.public_submission_audit_failed",
      formId,
      error: redactLogValue(auditError)
    });
  }
}

function isNameField(field: FormFieldDefinition) {
  const label = normalizeLabel(field.label);
  return label === "name" || label.includes("full name") || label.includes("client name") || label.includes("your name");
}

function isEmailField(field: FormFieldDefinition) {
  return field.type === "email" || normalizeLabel(field.label).includes("email");
}

function isPhoneField(field: FormFieldDefinition) {
  const label = normalizeLabel(field.label);
  return field.type === "phone" || label.includes("phone") || label.includes("mobile");
}

function isLocationField(field: FormFieldDefinition) {
  const label = normalizeLabel(field.label);
  return label.includes("location") || label.includes("timezone") || label.includes("time zone");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase() || null;
}

function stringifyAnswer(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value).trim();
}

function normalizeLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
