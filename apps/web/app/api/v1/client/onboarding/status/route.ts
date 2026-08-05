import { auth } from "@/auth";
import { dataResponse, handleApiError } from "@/lib/api/responses";
import { requireActiveClientActor } from "@/lib/auth/session-guards";
import { getClientOnboardingGateState } from "@/lib/clients/client-onboarding-gate";

export async function GET() {
  try {
    const actor = requireActiveClientActor(await auth());
    const gateState = await getClientOnboardingGateState({
      organizationId: actor.organizationId,
      clientId: actor.clientId
    });

    return dataResponse(gateState);
  } catch (error) {
    return handleApiError(error);
  }
}
