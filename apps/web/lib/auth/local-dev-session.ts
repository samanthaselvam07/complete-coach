import type { Session } from "next-auth";

const nodeEnvironment = process.env.NODE_ENV;
const publicLocalDevAuthBypassFlag = process.env.NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS;
const localDevelopmentOrganization = {
  id: "local-dev-organization",
  slug: "complete-coach-demo",
  name: "Complete Coach Demo"
};
const localDevelopmentUser = {
  id: "local-dev-user",
  name: "Local Dev Coach",
  email: "coach@example.com"
};

export function isLocalDevAuthBypassEnabled(env: NodeJS.ProcessEnv = process.env) {
  const environment = env.NODE_ENV ?? nodeEnvironment;
  const bypassFlag = env.NEXT_PUBLIC_LOCAL_DEV_AUTH_BYPASS ?? publicLocalDevAuthBypassFlag;

  return environment === "development" && bypassFlag === "1";
}

export const localDevelopmentSession = {
  user: localDevelopmentUser,
  activeOrganization: {
    ...localDevelopmentOrganization,
    role: "owner",
    platformAccess: {
      state: "active",
      canUsePlatform: true,
      reason: "subscription_active",
      message: "Platform access is active."
    }
  },
  expires: "2099-01-01T00:00:00.000Z"
} satisfies Session;

export function createLocalDevelopmentSession({
  organization = localDevelopmentOrganization,
  user = localDevelopmentUser
}: {
  organization?: typeof localDevelopmentOrganization;
  user?: typeof localDevelopmentUser;
} = {}): Session {
  return {
    ...localDevelopmentSession,
    user: {
      ...localDevelopmentSession.user,
      id: user.id,
      name: user.name,
      email: user.email
    },
    activeOrganization: {
      ...localDevelopmentSession.activeOrganization,
      id: organization.id,
      slug: organization.slug,
      name: organization.name
    }
  };
}
