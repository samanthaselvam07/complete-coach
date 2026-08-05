import type { MigratedClientPayload } from "@/lib/migrations/client-import-types";

interface BuildClinicalPhysiquesPayloadInput {
  checkInsCsv: string;
  bodyweightWaistCsv: string;
  client: {
    externalClientId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    timezone?: string;
  };
  extractedAt?: string;
}

type CsvRow = Record<string, string>;

const CHECK_IN_NUMBER_HEADER = "Check-in #";
const CHECK_IN_DATE_HEADER = "Date";
const CHECK_IN_DAY_HEADER = "Check-in Day";
const BODYWEIGHT_HEADER = "Bodyweight (kg)";
const WAIST_HEADER = "Waist Circumference (cm)";

export function buildClinicalPhysiquesPayload(input: BuildClinicalPhysiquesPayloadInput): MigratedClientPayload {
  const checkInRows = parseCsv(input.checkInsCsv);
  const measurementRows = parseCsv(input.bodyweightWaistCsv);
  const legacyCheckIns = checkInRows
    .map((row) => {
      const date = normalizeDate(row[CHECK_IN_DATE_HEADER]);

      if (!date) {
        return null;
      }

      const answers = Object.fromEntries(
        Object.entries(row)
          .filter(([header, value]) => {
            return ![CHECK_IN_NUMBER_HEADER, CHECK_IN_DATE_HEADER, CHECK_IN_DAY_HEADER].includes(header) && value.trim();
          })
          .map(([header, value]) => [header, coerceCellValue(value)])
      );

      return {
        sourceId: `clinical-physiques-check-in:${row[CHECK_IN_NUMBER_HEADER] || date}`,
        submittedAt: toUtcDateTime(date),
        checkInNumber: toInteger(row[CHECK_IN_NUMBER_HEADER]),
        checkInDay: emptyToUndefined(row[CHECK_IN_DAY_HEADER]),
        answers
      };
    })
    .filter((checkIn): checkIn is NonNullable<typeof checkIn> => Boolean(checkIn));

  const measurements = measurementRows.flatMap((row, index) => {
    const date = normalizeDate(row.Date);

    if (!date) {
      return [];
    }

    const measuredAt = toUtcDateTime(date);
    const rowId = row.Date || String(index + 1);
    const values = [
      {
        sourceType: "clinical-physiques-bodyweight-waist",
        sourceId: `clinical-physiques-bodyweight-waist:${rowId}:bodyweight`,
        measuredAt,
        metricKey: "bodyweight",
        metricValue: toNumber(row[BODYWEIGHT_HEADER]),
        unit: "kg",
        metadata: { sourceColumn: BODYWEIGHT_HEADER }
      },
      {
        sourceType: "clinical-physiques-bodyweight-waist",
        sourceId: `clinical-physiques-bodyweight-waist:${rowId}:waist`,
        measuredAt,
        metricKey: "waist",
        metricValue: toNumber(row[WAIST_HEADER]),
        unit: "cm",
        metadata: { sourceColumn: WAIST_HEADER }
      }
    ];

    return values.filter((measurement) => measurement.metricValue !== null).map((measurement) => ({
      ...measurement,
      metricValue: measurement.metricValue as number
    }));
  });
  const checkInMeasurements = legacyCheckIns.flatMap((checkIn) => {
    const waistValue = toNumber(String(checkIn.answers[WAIST_HEADER] ?? ""));

    if (waistValue === null) {
      return [];
    }

    return [
      {
        sourceType: "clinical-physiques-check-in",
        sourceId: `${checkIn.sourceId}:waist`,
        measuredAt: checkIn.submittedAt,
        metricKey: "waist",
        metricValue: waistValue,
        unit: "cm",
        metadata: { sourceColumn: WAIST_HEADER, sourceCheckInId: checkIn.sourceId }
      }
    ];
  });

  const latestCheckIn = legacyCheckIns.at(-1);
  const firstMeasurementDate = measurementRows.map((row) => normalizeDate(row.Date)).find(Boolean);

  return {
    sourceSystem: "clinical-physiques-export",
    extractedAt: input.extractedAt,
    client: {
      externalClientId: input.client.externalClientId,
      firstName: input.client.firstName,
      lastName: input.client.lastName,
      email: input.client.email,
      phone: input.client.phone,
      status: "active",
      timezone: input.client.timezone ?? "Australia/Melbourne",
      startDate: firstMeasurementDate,
      latestCheckInAt: latestCheckIn?.submittedAt,
      compliance: 0
    },
    profile: {},
    notes: [],
    legacyCheckIns,
    goals: [],
    roadmapPhases: [],
    calendarEvents: [],
    measurements: [...measurements, ...checkInMeasurements],
    activityLogs: [],
    workoutSessions: []
  };
}

export function parseCsv(content: string): CsvRow[] {
  const records = parseCsvRecords(content);
  const [headers, ...rows] = records;

  if (!headers || headers.length === 0) {
    return [];
  }

  return rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => {
      return Object.fromEntries(headers.map((header, index) => [header.trim(), row[index]?.trim() ?? ""]));
    });
}

function parseCsvRecords(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      currentCell += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += character;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function normalizeDate(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const match = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/.exec(trimmed);

  if (!match?.groups) {
    return undefined;
  }

  return `${match.groups.year}-${match.groups.month}-${match.groups.day}`;
}

function toUtcDateTime(date: string) {
  return `${date}T00:00:00.000Z`;
}

function emptyToUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toInteger(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function toNumber(value: string | undefined) {
  const cleaned = value?.replace(/[^\d.-]/g, "").trim();

  if (!cleaned) {
    return null;
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function coerceCellValue(value: string) {
  const numericValue = toNumber(value);
  return numericValue ?? value.trim();
}
