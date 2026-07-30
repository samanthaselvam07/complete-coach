import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import {
  MembershipRole as PrismaMembershipRole,
  MembershipStatus
} from "@/app/generated/prisma/enums";
import { credentialsSchema } from "@/lib/auth/credentials";
import { resolveActiveClientSessionForUser } from "@/lib/auth/active-client";
import { createLocalDevelopmentSession, isLocalDevAuthBypassEnabled, localDevelopmentSession } from "@/lib/auth/local-dev-session";
import { resolveActiveOrganizationSessionForUser } from "@/lib/auth/session-organization";
import { prisma } from "@/lib/db/prisma";
import { getServerEnv } from "@/lib/env";

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

function isActiveClient(value: unknown): value is NonNullable<Session["activeClient"]> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const client = value as Record<string, unknown>;

  return (
    typeof client.id === "string" &&
    typeof client.organizationId === "string" &&
    typeof client.name === "string" &&
    (typeof client.email === "string" || client.email === null) &&
    typeof client.timezone === "string"
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
        const userId = user?.id ?? token.sub;

        if (!userId) {
          return token;
        }

        const activeOrganization = await resolveActiveOrganizationSessionForUser(userId);

        if (activeOrganization) {
          token.activeOrganization = activeOrganization;
          if (activeOrganization.role === "client") {
            const activeClient = await resolveActiveClientSessionForUser(userId, activeOrganization.id);

            if (activeClient) {
              token.activeClient = activeClient;
            } else {
              delete token.activeClient;
            }
          } else {
            delete token.activeClient;
          }
        } else {
          delete token.activeOrganization;
          delete token.activeClient;
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

        if (isActiveClient(token.activeClient)) {
          session.activeClient = token.activeClient;
        }

        return session;
      }
    }
  };
});

export const { handlers, signIn, signOut } = nextAuth;

export async function auth() {
  if (isLocalDevAuthBypassEnabled()) {
    const { organization, user } = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.upsert({
        where: { slug: localDevelopmentSession.activeOrganization.slug },
        update: {},
        create: {
          id: localDevelopmentSession.activeOrganization.id,
          name: localDevelopmentSession.activeOrganization.name,
          slug: localDevelopmentSession.activeOrganization.slug,
          timezone: "Australia/Melbourne",
          platformSubscriptionStatus: "active"
        },
        select: {
          id: true,
          slug: true,
          name: true
        }
      });

      const user = await tx.user.upsert({
        where: { email: localDevelopmentSession.user.email },
        update: {
          name: localDevelopmentSession.user.name
        },
        create: {
          id: localDevelopmentSession.user.id,
          email: localDevelopmentSession.user.email,
          name: localDevelopmentSession.user.name,
          authProvider: "local-dev",
          authProviderAccountId: localDevelopmentSession.user.email
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      await tx.organizationMembership.upsert({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: user.id
          }
        },
        update: {
          role: PrismaMembershipRole.OWNER,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date()
        },
        create: {
          organizationId: organization.id,
          userId: user.id,
          role: PrismaMembershipRole.OWNER,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date()
        }
      });

      return { organization, user };
    });

    return createLocalDevelopmentSession({
      organization,
      user: {
        id: user.id,
        name: user.name ?? localDevelopmentSession.user.name,
        email: user.email ?? localDevelopmentSession.user.email
      }
    });
  }

  return nextAuth.auth();
}
