import "dotenv/config";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { buildClinicalPhysiquesPayload } from "@/lib/migrations/clinical-physiques-importer";

const args = parseArgs(process.argv.slice(2));
const inputDir = args.inputDir ?? args._[0];

if (!inputDir) {
  throw new Error(
    "Clinical Physiques import folder is required. Example: pnpm --dir apps/web client:migration:build-clinical-physiques ../../data/imports/client-folder"
  );
}

const resolvedInputDir = resolve(inputDir);
const checkInsPath = resolve(resolvedInputDir, args.checkIns ?? "angie_checkins.csv");
const bodyweightWaistPath = resolve(resolvedInputDir, args.bodyweightWaist ?? "angie_bodyweight_waist (1).csv");
const outputPath = resolve(resolvedInputDir, args.output ?? "migration-payload.json");
const inferredFirstName = toTitleCase(basename(resolvedInputDir));
const firstName = args.firstName ?? inferredFirstName;
const lastName = args.lastName ?? "Client";
const externalClientId = args.externalClientId ?? slugify(`clinical-physiques-${firstName}-${lastName}`);

const payload = buildClinicalPhysiquesPayload({
  checkInsCsv: await readFile(checkInsPath, "utf8"),
  bodyweightWaistCsv: await readFile(bodyweightWaistPath, "utf8"),
  extractedAt: new Date().toISOString(),
  client: {
    externalClientId,
    firstName,
    lastName,
    email: args.email,
    phone: args.phone,
    timezone: args.timezone
  }
});

await mkdir(resolve(outputPath, ".."), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log("Clinical Physiques migration payload built");
console.log(`inputDir: ${resolvedInputDir}`);
console.log(`output: ${outputPath}`);
console.log(`externalClientId: ${payload.client.externalClientId}`);
console.log("counts:");
console.log(
  JSON.stringify(
    {
      legacyCheckIns: payload.legacyCheckIns.length,
      measurements: payload.measurements.length
    },
    null,
    2
  )
);

function parseArgs(argv: string[]) {
  const parsed: {
    _: string[];
    inputDir?: string;
    checkIns?: string;
    bodyweightWaist?: string;
    output?: string;
    externalClientId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    timezone?: string;
  } = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--input-dir") {
      parsed.inputDir = argv[index + 1];
      index += 1;
    } else if (arg === "--check-ins") {
      parsed.checkIns = argv[index + 1];
      index += 1;
    } else if (arg === "--bodyweight-waist") {
      parsed.bodyweightWaist = argv[index + 1];
      index += 1;
    } else if (arg === "--output") {
      parsed.output = argv[index + 1];
      index += 1;
    } else if (arg === "--external-client-id") {
      parsed.externalClientId = argv[index + 1];
      index += 1;
    } else if (arg === "--first-name") {
      parsed.firstName = argv[index + 1];
      index += 1;
    } else if (arg === "--last-name") {
      parsed.lastName = argv[index + 1];
      index += 1;
    } else if (arg === "--email") {
      parsed.email = argv[index + 1];
      index += 1;
    } else if (arg === "--phone") {
      parsed.phone = argv[index + 1];
      index += 1;
    } else if (arg === "--timezone") {
      parsed.timezone = argv[index + 1];
      index += 1;
    } else {
      parsed._.push(arg);
    }
  }

  return parsed;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toTitleCase(value: string) {
  return value
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}
