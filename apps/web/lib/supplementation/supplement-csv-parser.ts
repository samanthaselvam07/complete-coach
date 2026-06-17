import type { SupplementCsvRow } from "@/lib/supplementation/supplement-import-types";

const requiredHeaders = ["Supplement name", "category"] as const;

export function parseSupplementCsv(contents: string): SupplementCsvRow[] {
  const rows = parseCsvRows(contents);
  if (!rows.length) {
    return [];
  }

  const [headers, ...dataRows] = rows;
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    throw new Error(`Missing required supplement CSV headers: ${missingHeaders.join(", ")}`);
  }

  return dataRows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => {
      const entry: Record<string, string> = {};
      headers.forEach((header, index) => {
        entry[header] = row[index]?.trim() ?? "";
      });
      return entry as SupplementCsvRow;
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
