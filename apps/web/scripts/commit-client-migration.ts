import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { config } from "dotenv";

const args = parseArgs(process.argv.slice(2));

if (args.envFile) {
  config({ path: resolve(args.envFile), override: true });
} else {
  config();
}

const { prisma } = await import("@/lib/db/prisma");
const { commitClientMigration } = await import("@/lib/migrations/client-import-writer");

const inputPath = args.file ?? args._[0];

if (!inputPath) {
  throw new Error(
    "Client migration JSON file is required. Example: pnpm --dir apps/web client:migration:commit ./data/imports/client/migration-payload.json"
  );
}

const payload = JSON.parse(await readFile(resolve(inputPath), "utf8")) as unknown;
const organization = await resolveOrganization(args.organizationId, args.organizationSlug);
const actorUserId = args.actorUserId ?? (args.actorEmail ? await resolveActorUserId(args.actorEmail, organization.id) : undefined);

const result = await commitClientMigration({
  payload,
  prisma,
  organizationId: organization.id,
  actorUserId
});

console.log("Client migration committed");
console.log(`file: ${inputPath}`);
console.log(`organizationId: ${organization.id}`);
console.log(`organizationSlug: ${organization.slug}`);
console.log(`actorUserId: ${actorUserId ?? "system"}`);
console.log(`externalClientId: ${result.plan.externalClientId}`);
console.log(`clientId: ${result.clientId}`);
console.log("counts:");
console.log(JSON.stringify(result.plan.counts, null, 2));

await prisma.$disconnect();

async function resolveOrganization(organizationId?: string, organizationSlug?: string) {
  if (organizationId) {
    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });

    if (!organization) {
      throw new Error(`Organization not found for id "${organizationId}".`);
    }

    return organization;
  }

  if (organizationSlug) {
    const organization = await prisma.organization.findUnique({ where: { slug: organizationSlug } });

    if (!organization) {
      throw new Error(`Organization not found for slug "${organizationSlug}".`);
    }

    return organization;
  }

  const organization = await prisma.organization.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" }
  });

  if (!organization) {
    throw new Error("No organization found. Pass --organization-id or --organization-slug.");
  }

  return organization;
}

async function resolveActorUserId(actorEmail: string, organizationId: string) {
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId,
      user: {
        email: actorEmail.toLowerCase()
      }
    },
    select: { userId: true }
  });

  if (!membership) {
    throw new Error(`No organization member found for actor email "${actorEmail}".`);
  }

  return membership.userId;
}

function parseArgs(argv: string[]) {
  const parsed: {
    _: string[];
    file?: string;
    organizationId?: string;
    organizationSlug?: string;
    actorUserId?: string;
    actorEmail?: string;
    envFile?: string;
  } = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--file") {
      parsed.file = argv[index + 1];
      index += 1;
    } else if (arg === "--organization-id") {
      parsed.organizationId = argv[index + 1];
      index += 1;
    } else if (arg === "--organization-slug") {
      parsed.organizationSlug = argv[index + 1];
      index += 1;
    } else if (arg === "--actor-user-id") {
      parsed.actorUserId = argv[index + 1];
      index += 1;
    } else if (arg === "--actor-email") {
      parsed.actorEmail = argv[index + 1];
      index += 1;
    } else if (arg === "--env-file") {
      parsed.envFile = argv[index + 1];
      index += 1;
    } else {
      parsed._.push(arg);
    }
  }

  return parsed;
}
