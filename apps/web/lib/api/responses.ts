import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { ZodError } from "zod";

import {
  ActiveOrganizationRequiredError,
  AuthenticationRequiredError
} from "@/lib/auth/session-guards";
import { ForbiddenError } from "@/lib/auth/permissions";
import { logger, redactLogValue } from "@/lib/observability/logger";

export function dataResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function errorResponse(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    },
    { status }
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return errorResponse("unauthorized", "Authentication is required.", 401);
  }

  if (error instanceof ActiveOrganizationRequiredError) {
    return errorResponse("active_organization_required", "An active organization is required.", 403);
  }

  if (error instanceof ForbiddenError) {
    return errorResponse("forbidden", "You do not have permission to perform this action.", 403);
  }

  if (error instanceof ZodError) {
    return errorResponse("validation_failed", "Request validation failed.", 422, error.flatten());
  }

  const databaseError = getKnownDatabaseError(error);

  if (databaseError) {
    logger.warn({
      event: "api.database_unavailable",
      errorCode: databaseError.code,
      message: databaseError.logMessage
    });

    return errorResponse(databaseError.code, databaseError.message, 503);
  }

  Sentry.captureException(error);
  logger.error({
    event: "api.unexpected_error",
    error: redactLogValue(serializeError(error))
  });

  return errorResponse("internal_error", "An unexpected error occurred.", 500);
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return { name: "UnknownError" };
}

function getKnownDatabaseError(error: unknown) {
  if (!isErrorWithCode(error)) {
    return null;
  }

  if (error.code === "P2021") {
    return {
      code: "database_schema_unavailable",
      message: "Database schema is not ready. Run migrations before using this endpoint.",
      logMessage: "Database schema unavailable for API request."
    };
  }

  if (error.code === "ETIMEDOUT" || error.code === "P1001" || error.code === "P1002") {
    return {
      code: "database_unavailable",
      message: "Database is temporarily unavailable.",
      logMessage: "Database connection unavailable for API request."
    };
  }

  return null;
}

function isErrorWithCode(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}
