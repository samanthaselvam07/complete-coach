import { hash } from "bcryptjs";
import { z } from "zod";

import { MembershipRole, MembershipStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_TIMEZONE = "UTC";

export const coachRegistrationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(256),
  organizationName: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).max(80).optional().default(DEFAULT_TIMEZONE)
});

export type CoachRegistrationInput = z.infer<typeof coachRegistrationSchema>;

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("Email is already registered.");
    this.name = "EmailAlreadyRegisteredError";
  }
}

type RegistrationTransaction = {
  user: {
    findUnique: typeof prisma.user.findUnique;
    create: typeof prisma.user.create;
  };
  organization: {
    findUnique: typeof prisma.organization.findUnique;
    create: typeof prisma.organization.create;
  };
  organizationMembership: {
    create: typeof prisma.organizationMembership.create;
  };
};

export async function registerCoachAccount(input: CoachRegistrationInput) {
  const parsed = coachRegistrationSchema.parse(input);

  return prisma.$transaction(async (transaction) => {
    const existingUser = await transaction.user.findUnique({
      where: { email: parsed.email },
      select: { id: true }
    });

    if (existingUser) {
      throw new EmailAlreadyRegisteredError();
    }

    const [passwordHash, slug] = await Promise.all([
      hash(parsed.password, 12),
      resolveUniqueOrganizationSlug(transaction, parsed.organizationName)
    ]);

    const user = await transaction.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        passwordHash,
        authProvider: "credentials"
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    const organization = await transaction.organization.create({
      data: {
        name: parsed.organizationName,
        slug,
        timezone: parsed.timezone
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    await transaction.organizationMembership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date()
      }
    });

    return {
      user: {
        id: user.id,
        name: user.name ?? parsed.name,
        email: user.email ?? parsed.email
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug
      }
    };
  });
}

export async function resolveUniqueOrganizationSlug(
  transaction: Pick<RegistrationTransaction, "organization">,
  organizationName: string
) {
  const baseSlug = slugifyOrganizationName(organizationName);

  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
    const existing = await transaction.organization.findUnique({
      where: { slug: candidate },
      select: { id: true }
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Unable to create a unique organization slug.");
}

export function slugifyOrganizationName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "complete-coach-organization";
}
