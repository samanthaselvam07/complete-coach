import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { findActiveOrganizationMembershipForUser } from "@/lib/auth/active-organization";
import { credentialsSchema } from "@/lib/auth/credentials";
import { isLocalDevAuthBypassEnabled, localDevelopmentSession } from "@/lib/auth/local-dev-session";
import type { MembershipRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { getServerEnv } from "@/lib/env";
import { evaluatePlatformBillingAccess } from "@/lib/platform-billing/rules";

function isActiveOrganization(value: unknown): value is NonNullable<Session["activeOrganization"]> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const organization = value as Record<string, unknown>;

  return (
    typeof organization.id === "string" &&
    typeof organization.slug === "string" &&
    typeof organization.name === "string" &&
    ["owner", "admin", "coach", "assistant", "client"].includes(String(organization.role))
  );
}

const nextAuth = NextAuth(() => {
  const env = getServerEnv();

  return {
    adapter: PrismaAdapter(prisma),
    secret: env.AUTH_SECRET,
    trustHost: true,
    session: {
      strategy: "jwt" as const
    },
    providers: [
      Credentials({
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
          const parsed = credentialsSchema.safeParse(credentials);

          if (!parsed.success) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email: parsed.data.email }
          });

          if (!user?.passwordHash) {
            return null;
          }

          const validPassword = await compare(parsed.data.password, user.passwordHash);

          if (!validPassword) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image
          };
        }
      })
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (!user?.id) {
          return token;
        }

        const membership = await findActiveOrganizationMembershipForUser(user.id);

        if (membership) {
          token.activeOrganization = {
            id: membership.organizationId,
            slug: membership.organization.slug,
            name: membership.organization.name,
            role: membership.role.toLowerCase() as MembershipRole,
            platformAccess: evaluatePlatformBillingAccess(membership.organization.platformSubscriptionStatus)
          };
        }

        return token;
      },
      async session({ session, token }) {
        if (session.user && token.sub) {
          session.user.id = token.sub;
        }

        if (isActiveOrganization(token.activeOrganization)) {
          session.activeOrganization = token.activeOrganization;
        }

        return session;
      }
    }
  };
});

export const { handlers, signIn, signOut } = nextAuth;

export async function auth() {
  if (isLocalDevAuthBypassEnabled()) {
    return localDevelopmentSession;
  }

  return nextAuth.auth();
}
