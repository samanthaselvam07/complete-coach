import { randomUUID } from "node:crypto";
import pino from "pino";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|email|phone|password|secret|token|api.?key|message.?body|answers?|medical|health|notes?|address|name/i;

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
  base: {
    service: "complete-coach-web",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development"
  },
  formatters: {
    level(label) {
      return { level: label };
    }
  }
});

export function resolveRequestId(value: string | null | undefined) {
  return value && REQUEST_ID_PATTERN.test(value) ? value : randomUUID();
}

export function buildRequestLogContext(request: Request) {
  const url = new URL(request.url);

  return {
    requestId: resolveRequestId(request.headers.get("x-request-id")),
    method: request.method,
    path: url.pathname,
    queryKeys: Array.from(url.searchParams.keys()).sort()
  };
}

export function redactLogValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactLogValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactLogValue(nestedValue)
    ])
  );
}
