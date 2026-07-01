import type { ExerciseCsvRow } from "@/lib/training/exercise-import-types";

const nameHeaders = ["exercise", "exercise name", "exercise_name", "name"] as const;

export function parseExerciseCsv(contents: string): ExerciseCsvRow[] {
  const rows = parseCsvRows(contents);
  if (!rows.length) {
    return [];
  }

  const [rawHeaders, ...dataRows] = rows;
  const headers = rawHeaders.map((header) => header.trim().toLowerCase());
  const hasNameHeader = nameHeaders.some((header) => headers.includes(header));

  if (!hasNameHeader) {
    throw new Error("Missing required exercise CSV header: exercise name");
  }

  return dataRows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => {
      const entry: Record<string, string> = {};
      headers.forEach((header, index) => {
        entry[header] = row[index]?.trim() ?? "";
      });
      return entry;
    });
}

function parseCsvRows(contents: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < contents.length; index += 1) {
    const char = contents[index];
    const next = contents[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((parsedRow) => parsedRow.some((value) => value.trim()));
}
