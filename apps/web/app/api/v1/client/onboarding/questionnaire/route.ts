import { auth } from "@/auth";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import {
  getAssignedClientQuestionnaire,
  submitAssignedClientQuestionnaire
} from "@/lib/clients/client-onboarding-gate";
import { serializeAssignment, submitAssignmentSchema } from "@/lib/forms/submission-records";

export async function GET() {
  try {
    const actor = requireActiveClientActor(await auth());
    const assignment = await getAssignedClientQuestionnaire(actor.organizationId, actor.clientId);

    return dataResponse(assignment ? serializeAssignment(assignment) : null);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireActiveClientActor(await auth());
    const input = submitAssignmentSchema.parse(await request.json());
    const submission = await submitAssignedClientQuestionnaire({
      organizationId: actor.organizationId,
      clientId: actor.clientId,
      userId: actor.userId,
      answers: input.answers
    });

    if (!submission) {
      return errorResponse("not_found", "No assigned onboarding Q&A was found.", 404);
    }

    return dataResponse(submission, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
