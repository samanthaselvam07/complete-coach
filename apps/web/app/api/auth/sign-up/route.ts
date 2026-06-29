import { ZodError } from "zod";

import {
  coachRegistrationSchema,
  EmailAlreadyRegisteredError,
  registerCoachAccount
} from "@/lib/auth/registration";
import { dataResponse, errorResponse, handleApiError } from "@/lib/api/responses";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = coachRegistrationSchema.parse(body);
    const registration = await registerCoachAccount(input);

    return dataResponse(registration, { status: 201 });
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return errorResponse("email_already_registered", "An account with this email already exists.", 409);
    }

    if (error instanceof SyntaxError || error instanceof ZodError) {
      return handleApiError(error);
    }

    return handleApiError(error);
  }
}
