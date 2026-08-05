import { resolve } from "node:path";

import { hash } from "bcryptjs";
import { config } from "dotenv";

import { MembershipRole, MembershipStatus } from "@/app/generated/prisma/client";

const args = parseArgs(process.argv.slice(2));

if (args.envFile) {
  config({ path: resolve(args.envFile), override: true });
} else {
  config();
}

const { prisma } = await import("@/lib/db/prisma");

const email = process.env.DEMO_COACH_EMAIL?.toLowerCase();
const password = process.env.DEMO_COACH_PASSWORD;

if (!email || !password) {
  throw new Error("DEMO_COACH_EMAIL and DEMO_COACH_PASSWORD are required.");
}

const organization = await prisma.organization.upsert({
  where: { slug: "complete-coach-demo" },
  update: {
    status: "ACTIVE",
    timezone: "Australia/Melbourne",
    platformPlan: "scale",
    platformSubscriptionStatus: "active"
  },
  create: {
    name: "Complete Coach Demo",
    slug: "complete-coach-demo",
    status: "ACTIVE",
    timezone: "Australia/Melbourne",
    platformPlan: "scale",
    platformSubscriptionStatus: "active"
  }
});

const existingUser =
  (await prisma.user.findUnique({ where: { email } })) ??
  (await prisma.user.findUnique({
    where: {
      authProvider_authProviderAccountId: {
        authProvider: "credentials",
        authProviderAccountId: email
      }
    }
  }));

const user = existingUser
  ? await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        email,
        name: existingUser.name ?? "Demo Coach",
        passwordHash: await hash(password, 12),
        authProvider: "credentials",
        authProviderAccountId: email
      }
    })
  : await prisma.user.create({
      data: {
        email,
        name: "Demo Coach",
        passwordHash: await hash(password, 12),
        authProvider: "credentials",
        authProviderAccountId: email
      }
    });

await prisma.organizationMembership.upsert({
  where: {
    organizationId_userId: {
      organizationId: organization.id,
      userId: user.id
    }
  },
  update: {
    role: MembershipRole.OWNER,
    status: MembershipStatus.ACTIVE,
    joinedAt: new Date()
  },
  create: {
    organizationId: organization.id,
    userId: user.id,
    role: MembershipRole.OWNER,
    status: MembershipStatus.ACTIVE,
    joinedAt: new Date()
  }
});

console.log(
  JSON.stringify(
    {
      email,
      userId: user.id,
      organizationId: organization.id,
      organizationSlug: organization.slug,
      role: "OWNER",
      status: "ACTIVE"
    },
    null,
    2
  )
);

await prisma.$disconnect();

function parseArgs(argv: string[]) {
  const parsed: { envFile?: string } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--env-file") {
      parsed.envFile = argv[index + 1];
      index += 1;
    }
  }

  return parsed;
}
