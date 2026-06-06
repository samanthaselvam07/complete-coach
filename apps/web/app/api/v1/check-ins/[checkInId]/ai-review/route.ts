import type { InputJsonValue } from "@prisma/client/runtime/client";

import { auth } from "@/auth";
import {
  AiGenerationStatus,
  AiOutputStatus,
  AiWorkflowType
} from "@/app/generated/prisma/enums";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveActor } from "@/lib/auth/session-guards";
import {
  buildCheckInReviewInput,
  generateHeuristicCheckInReview,
  hashAiInput,
  redactAiInput
} from "@/lib/ai/ai-review";
import {
  CHFI_CHECK_IN_PROMPT,
  serializeAiGeneration,
  serializeAiOutput,
  toPrismaAiOutputType
} from "@/lib/ai/ai-records";
import { prisma } from "@/lib/db/prisma";

interface AiReviewRouteContext {
  params: Promise<{ checkInId: string }>;
}

export async function POST(_request: Request, context: AiReviewRouteContext) {
  try {
    const actor = requireActiveActor(await auth(), "ai:generate");
    const { checkInId } = await context.params;

    const checkIn = await prisma.checkIn.findFirst({
      where: {
        id: checkInId,
        organizationId: actor.organizationId
      },
      include: {
        client: {
          include: {
            profile: true
          }
        },
        formSubmission: true
      }
    });

    if (!checkIn) {
      return errorResponse("not_found", "Check-in not found.", 404);
    }

    const metrics = checkIn.formSubmissionId
      ? await prisma.clientMeasurement.findMany({
          where: {
            organizationId: actor.organizationId,
            sourceType: "form_submission",
            sourceId: checkIn.formSubmissionId
          },
          orderBy: [{ metricKey: "asc" }]
        })
      : [];

    const reviewInput = buildCheckInReviewInput(checkIn, metrics);
    const redactedInput = redactAiInput(reviewInput);
    const inputHash = hashAiInput(reviewInput);
    const promptVersion = await ensurePromptVersion(actor.organizationId, actor.userId);
    const review = generateHeuristicCheckInReview(reviewInput);

    const createdGeneration = await prisma.aiGeneration.create({
      data: {
        organizationId: actor.organizationId,
        workflow: AiWorkflowType.CHECK_IN_REVIEW,
        status: AiGenerationStatus.RUNNING,
        promptVersionId: promptVersion.id,
        provider: promptVersion.provider,
        model: promptVersion.model,
        clientId: checkIn.clientId,
        targetType: "check_in",
        targetId: checkIn.id,
        inputHash,
        inputSummary: {
          checkInId: checkIn.id,
          clientId: checkIn.clientId,
          answersCount: reviewInput.answers.length,
          metricsCount: reviewInput.metrics.length,
          flagsCount: review.flags.length
        },
        redactedInput: redactedInput as InputJsonValue,
        requestedByUserId: actor.userId
      }
    });

    await prisma.aiOutput.createMany({
      data: review.outputs.map((output) => ({
        organizationId: actor.organizationId,
        generationId: createdGeneration.id,
        clientId: checkIn.clientId,
        targetType: "check_in",
        targetId: checkIn.id,
        type: toPrismaAiOutputType(output.type),
        status: AiOutputStatus.PENDING_APPROVAL,
        severity: output.severity,
        title: output.title,
        contentMarkdown: output.contentMarkdown,
        dataJson: output.data as InputJsonValue,
        requiresApproval: output.requiresApproval
      }))
    });

    const generation = await prisma.aiGeneration.update({
      where: { id: createdGeneration.id },
      data: {
        status: AiGenerationStatus.SUCCEEDED,
        outputJson: {
          flags: review.flags,
          summaryWordCount: review.summaryMarkdown.split(/\s+/).filter(Boolean).length
        } as unknown as InputJsonValue,
        inputTokens: review.usage.inputTokens,
        outputTokens: review.usage.outputTokens,
        estimatedCostCents: review.usage.estimatedCostCents
      }
    });

    const outputs = await prisma.aiOutput.findMany({
      where: {
        organizationId: actor.organizationId,
        generationId: generation.id
      },
      orderBy: [{ createdAt: "asc" }]
    });

    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: "ai.check_in_review.generated",
        targetType: "check_in",
        targetId: checkIn.id,
        metadata: {
          generationId: generation.id,
          promptVersionId: promptVersion.id,
          workflow: "check-in-review",
          outputCount: outputs.length,
          flagsCount: review.flags.length,
          inputSummary: {
            answersCount: reviewInput.answers.length,
            metricsCount: reviewInput.metrics.length
          }
        }
      }
    });

    return dataResponse(
      {
        generation: serializeAiGeneration(generation),
        outputs: outputs.map(serializeAiOutput)
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

async function ensurePromptVersion(organizationId: string, userId: string) {
  const existing = await prisma.aiPromptVersion.findFirst({
    where: {
      workflow: CHFI_CHECK_IN_PROMPT.workflow,
      version: CHFI_CHECK_IN_PROMPT.version,
      isActive: true,
      OR: [{ organizationId }, { organizationId: null }]
    },
    orderBy: [{ organizationId: "desc" }]
  });

  if (existing) {
    return existing;
  }

  return prisma.aiPromptVersion.create({
    data: {
      organizationId: null,
      workflow: CHFI_CHECK_IN_PROMPT.workflow,
      version: CHFI_CHECK_IN_PROMPT.version,
      name: CHFI_CHECK_IN_PROMPT.name,
      provider: CHFI_CHECK_IN_PROMPT.provider,
      model: CHFI_CHECK_IN_PROMPT.model,
      systemPrompt: CHFI_CHECK_IN_PROMPT.systemPrompt,
      userPromptTemplate: CHFI_CHECK_IN_PROMPT.userPromptTemplate,
      outputSchema: CHFI_CHECK_IN_PROMPT.outputSchema,
      createdByUserId: userId
    }
  });
}
