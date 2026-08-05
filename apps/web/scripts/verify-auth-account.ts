import { resolve } from "node:path";

import { config } from "dotenv";

const args = parseArgs(process.argv.slice(2));

if (args.envFile) {
  config({ path: resolve(args.envFile), override: true });
} else {
  config();
}

const { prisma } = await import("@/lib/db/prisma");

const email = (args.email ?? process.env.DEMO_COACH_EMAIL)?.toLowerCase();

if (!email) {
  throw new Error("Pass --email or configure DEMO_COACH_EMAIL.");
}

const user = await prisma.user.findUnique({
  where: { email },
  select: {
    id: true,
    email: true,
    name: true,
    memberships: {
      select: {
        role: true,
        status: true,
        organization: {
          select: {
            slug: true,
            status: true,
            platformPlan: true,
            platformSubscriptionStatus: true
          }
        }
      }
    }
  }
});

console.log(
  JSON.stringify(
    {
      found: Boolean(user),
      email,
      name: user?.name ?? null,
      membershipCount: user?.memberships.length ?? 0,
      memberships:
        user?.memberships.map((membership) => ({
          role: membership.role,
          status: membership.status,
          organizationSlug: membership.organization.slug,
          organizationStatus: membership.organization.status,
          platformPlan: membership.organization.platformPlan,
          platformSubscriptionStatus: membership.organization.platformSubscriptionStatus
        })) ?? []
    },
    null,
    2
  )
);

await prisma.$disconnect();

function parseArgs(argv: string[]) {
  const parsed: {
    email?: string;
    envFile?: string;
  } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--email") {
      parsed.email = argv[index + 1];
      index += 1;
    } else if (arg === "--env-file") {
      parsed.envFile = argv[index + 1];
      index += 1;
    }
  }

  return parsed;
}
