export function isMissingDatabaseColumn(error: unknown, columnName: string) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes(columnName.toLowerCase()) &&
    (message.includes("does not exist") ||
      (isErrorWithCode(error) &&
        error.code === "P2010" &&
        typeof error.meta?.code === "string" &&
        error.meta.code === "42703"))
  );
}

function isErrorWithCode(error: unknown): error is { code: string; meta?: { code?: unknown; message?: unknown } } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "meta" in error) {
    const meta = (error as { meta?: { message?: unknown } }).meta;

    if (typeof meta?.message === "string") {
      return meta.message;
    }
  }

  return "";
}
