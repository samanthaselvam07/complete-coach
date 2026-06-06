import { z } from "zod";

const postgresqlUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith("postgresql://") || value.startsWith("postgres://"), {
    message: "Must be a PostgreSQL connection URL"
  });

const serverEnvSchema = z.object({
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  DATABASE_URL: postgresqlUrlSchema,
  DIRECT_URL: postgresqlUrlSchema.optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().trim().min(1).optional()
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

export function parseServerEnv(input: Record<string, unknown>) {
  const result = serverEnvSchema.safeParse(input);

  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server environment: ${fields}`);
  }

  return result.data;
}

export function getServerEnv() {
  cachedServerEnv ??= parseServerEnv(process.env);

  return cachedServerEnv;
}
