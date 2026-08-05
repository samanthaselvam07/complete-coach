import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { buildClientMigrationPlan } from "@/lib/migrations/client-import-normalizer";

const args = parseArgs(process.argv.slice(2));
const inputPath = args.file ?? args._[0];

if (!inputPath) {
  throw new Error(
    "Client migration JSON file is required. Example: pnpm --dir apps/web client:migration:dry-run ./data/imports/client-migration-sample.json"
  );
}

const payload = JSON.parse(await readFile(resolve(inputPath), "utf8")) as unknown;
const organizationId = args.organizationId ?? process.env.CLIENT_MIGRATION_ORGANIZATION_ID ?? "local-dev-organization";
const actorUserId = args.actorUserId ?? process.env.CLIENT_MIGRATION_ACTOR_USER_ID ?? "local-dev-user";
const plan = buildClientMigrationPlan({
  payload,
  organizationId,
  actorUserId,
  mode: "dry-run",
  replaceExisting: false
});

console.log("Client migration dry run");
console.log(`file: ${inputPath}`);
console.log(`organizationId: ${plan.organizationId}`);
console.log(`actorUserId: ${plan.actorUserId}`);
console.log(`externalClientId: ${plan.externalClientId}`);
console.log("counts:");
console.log(JSON.stringify(plan.counts, null, 2));

if (plan.warnings.length > 0) {
  console.log("warnings:");
  for (const warning of plan.warnings) {
    console.log(`- ${warning}`);
  }
} else {
  console.log("warnings: none");
}

function parseArgs(argv: string[]) {
  const parsed: { _: string[]; file?: string; organizationId?: string; actorUserId?: string } = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--file") {
      parsed.file = argv[index + 1];
      index += 1;
    } else if (arg === "--organization-id") {
      parsed.organizationId = argv[index + 1];
      index += 1;
    } else if (arg === "--actor-user-id") {
      parsed.actorUserId = argv[index + 1];
      index += 1;
    } else {
      parsed._.push(arg);
    }
  }

  return parsed;
}
