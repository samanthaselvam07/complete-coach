import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { aiUsageQuerySchema } from "@/lib/ai/ai-records";
import { requireActiveActor } from "@/lib/auth/session-guards";
import { prisma } from "@/lib/db/prisma";

interface AiUsageRecord {
  workflow: string;
  status: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostCents: number | string | { toString: () => string };
}

export async function GET(request: Request) {
  try {
    const actor = requireActiveActor(await auth(), "ai:read");
    const url = new URL(request.url);
    const query = aiUsageQuerySchema.parse(Object.fromEntries(url.searchParams));

    const records = await prisma.aiGeneration.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(query.dateFrom || query.dateTo
          ? {
              createdAt: {
                ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
                ...(query.dateTo ? { lte: new Date(query.dateTo) } : {})
              }
            }
          : {})
      },
      select: {
        workflow: true,
        status: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCostCents: true
      }
    });

    return dataResponse(summarizeUsage(records));
  } catch (error) {
    return handleApiError(error);
  }
}

function summarizeUsage(records: AiUsageRecord[]) {
  const summary = {
    totalGenerations: records.length,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalEstimatedCostCents: 0,
    byWorkflow: {} as Record<
      string,
      {
        generations: number;
        inputTokens: number;
        outputTokens: number;
        estimatedCostCents: number;
        statuses: Record<string, number>;
      }
    >
  };

  for (const record of records) {
    const workflow = serializeWorkflow(record.workflow);
    const cost = Number(record.estimatedCostCents);
    summary.totalInputTokens += record.inputTokens;
    summary.totalOutputTokens += record.outputTokens;
    summary.totalEstimatedCostCents += cost;

    summary.byWorkflow[workflow] ??= {
      generations: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostCents: 0,
      statuses: {}
    };
    summary.byWorkflow[workflow].generations += 1;
    summary.byWorkflow[workflow].inputTokens += record.inputTokens;
    summary.byWorkflow[workflow].outputTokens += record.outputTokens;
    summary.byWorkflow[workflow].estimatedCostCents += cost;
    summary.byWorkflow[workflow].statuses[serializeStatus(record.status)] =
      (summary.byWorkflow[workflow].statuses[serializeStatus(record.status)] ?? 0) + 1;
  }

  summary.totalEstimatedCostCents = roundMoney(summary.totalEstimatedCostCents);
  for (const workflow of Object.keys(summary.byWorkflow)) {
    summary.byWorkflow[workflow].estimatedCostCents = roundMoney(summary.byWorkflow[workflow].estimatedCostCents);
  }

  return summary;
}

function serializeWorkflow(workflow: string) {
  return workflow.toLowerCase().replaceAll("_", "-");
}

function serializeStatus(status: string) {
  return status.toLowerCase().replaceAll("_", "-");
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
