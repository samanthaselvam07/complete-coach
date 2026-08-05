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

if (!args.externalClientId) {
  const inputPath = args.file ?? args._[0];

  if (!inputPath) {
    throw new Error("Pass --external-client-id or a migration payload JSON file.");
  }

  const payload = JSON.parse(await readFile(resolve(inputPath), "utf8")) as { client?: { externalClientId?: string } };
  args.externalClientId = payload.client?.externalClientId;
}

if (!args.externalClientId) {
  throw new Error("External client id could not be resolved.");
}

const client = await prisma.client.findFirst({
  where: { externalClientId: args.externalClientId },
  select: {
    id: true,
    organizationId: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    status: true,
    latestCheckInAt: true,
    startDate: true,
    profile: { select: { id: true } }
  }
});

if (!client) {
  throw new Error(`Client not found for externalClientId "${args.externalClientId}".`);
}

const [checkIns, completedCheckIns, formSubmissions, measurements, bodyweightMeasurements, waistMeasurements, accountActivityLogs] =
  await Promise.all([
    prisma.checkIn.count({ where: { organizationId: client.organizationId, clientId: client.id } }),
    prisma.checkIn.count({ where: { organizationId: client.organizationId, clientId: client.id, status: "COMPLETED" } }),
    prisma.formSubmission.count({ where: { organizationId: client.organizationId, clientId: client.id } }),
    prisma.clientMeasurement.count({ where: { organizationId: client.organizationId, clientId: client.id } }),
    prisma.clientMeasurement.count({ where: { organizationId: client.organizationId, clientId: client.id, metricKey: "bodyweight" } }),
    prisma.clientMeasurement.count({ where: { organizationId: client.organizationId, clientId: client.id, metricKey: "waist" } }),
    prisma.clientAccountActivityLog.count({ where: { organizationId: client.organizationId, clientId: client.id } })
  ]);

const latestCheckIn = await prisma.checkIn.findFirst({
  where: { organizationId: client.organizationId, clientId: client.id },
  orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
  select: {
    id: true,
    status: true,
    submittedAt: true,
    formSubmission: {
      select: {
        id: true,
        answersJson: true
      }
    }
  }
});

console.log("Client migration verification");
console.log(
  JSON.stringify(
    {
      client,
      counts: {
        checkIns,
        completedCheckIns,
        formSubmissions,
        measurements,
        bodyweightMeasurements,
        waistMeasurements,
        accountActivityLogs
      },
      latestCheckIn: latestCheckIn
        ? {
            id: latestCheckIn.id,
            status: latestCheckIn.status,
            submittedAt: latestCheckIn.submittedAt,
            hasFormSubmission: Boolean(latestCheckIn.formSubmission),
            answerCount:
              latestCheckIn.formSubmission?.answersJson && typeof latestCheckIn.formSubmission.answersJson === "object"
                ? Object.keys(latestCheckIn.formSubmission.answersJson).length
                : 0
          }
        : null
    },
    null,
    2
  )
);

await prisma.$disconnect();

function parseArgs(argv: string[]) {
  const parsed: {
    _: string[];
    file?: string;
    envFile?: string;
    externalClientId?: string;
  } = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--file") {
      parsed.file = argv[index + 1];
      index += 1;
    } else if (arg === "--env-file") {
      parsed.envFile = argv[index + 1];
      index += 1;
    } else if (arg === "--external-client-id") {
      parsed.externalClientId = argv[index + 1];
      index += 1;
    } else {
      parsed._.push(arg);
    }
  }

  return parsed;
}
