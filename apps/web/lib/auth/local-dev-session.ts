import type { Session } from "next-auth";

const nodeEnvironment = process.env.NODE_ENV;
const publicLocalDevAuthBypassFlag = process.env.NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS;

export function isLocalDevAuthBypassEnabled(env: NodeJS.ProcessEnv = process.env) {
  const environment = env.NODE_ENV ?? nodeEnvironment;
  const bypassFlag = env.NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS ?? publicLocalDevAuthBypassFlag;

  return environment === "development" && bypassFlag === "1";
}

export const localDevelopmentSession = {
  user: {
    id: "local-dev-user",
    name: "Local Dev Coach",
    email: "coach@example.com"
  },
  activeOrganization: {
    id: "local-dev-organization",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner"
  },
  expires: "2099-01-01T00:00:00.000Z"
} satisfies Session;
