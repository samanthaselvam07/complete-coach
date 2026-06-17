import {
  fsanzRowToImportCandidate,
  type FsanzFoodImportRow
} from "@/lib/nutrition/fsanz-food-import-adapter";
import type {
  FoodImportSourceId,
  ImportedFoodCandidate,
  ImportedFoodNutrient
} from "@/lib/nutrition/food-import-types";

type FsanzCsvSourceId = Extract<
  FoodImportSourceId,
  "fsanz_afcd" | "fsanz_ausnut" | "fsanz_branded"
>;

type FsanzCsvParserOptions = {
  sourceId?: FsanzCsvSourceId;
  version?: string;
};

type ParsedCsvRow = Record<string, string>;

const requiredHeaderAliases = {
  foodId: ["food id", "foodid", "food code", "food_code", "id", "public food key"],
  name: ["food name", "food_name", "name", "description", "food description"]
} as const;

const optionalHeaderAliases = {
  category: ["category", "food group", "food_group", "group", "major food group"],
  brandName: ["brand", "brand name", "brand_name", "brand owner"],
  barcode: ["barcode", "gtin", "gtin upc", "gtin_upc", "upc"],
  servingSizeText: ["serving size", "serving_size", "serve size", "serve_size"],
  servingSizeGrams: ["serving size grams", "serving_size_grams", "serve size g", "serve_size_g"]
} as const;

const nutrientHeaderAliases = [
  {
    name: "Energy",
    unit: "kJ",
    aliases: ["energy kj", "energy (kj)", "energy, with dietary fibre (kj)", "energy with dietary fibre kj"]
  },
  {
    name: "Protein",
    unit: "g",
    aliases: ["protein g", "protein (g)", "protein"]
  },
  {
    name: "Available carbohydrate",
    unit: "g",
    aliases: [
      "available carbohydrate g",
      "available carbohydrate (g)",
      "carbohydrate g",
      "carbohydrate (g)",
      "carbohydrate",
      "carbohydrate by difference"
    ]
  },
  {
    name: "Total fat",
    unit: "g",
    aliases: ["total fat g", "total fat (g)", "fat g", "fat (g)", "fat"]
  },
  {
    name: "Dietary fibre",
    unit: "g",
    aliases: ["dietary fibre g", "dietary fibre (g)", "fibre g", "fibre (g)", "fiber g", "fiber (g)"]
  }
] as const;

export function parseFsanzFoodCsv(
  contents: string,
  options: FsanzCsvParserOptions = {}
): ImportedFoodCandidate[] {
  const rows = parseCsvRows(contents);
  if (!rows.length) {
    return [];
  }

  const [headers, ...dataRows] = rows;
  const headerLookup = buildHeaderLookup(headers);
  const missingHeaders = [
    findHeader(headerLookup, requiredHeaderAliases.foodId) ? undefined : "food id",
    findHeader(headerLookup, requiredHeaderAliases.name) ? undefined : "food name"
  ].filter(Boolean);

  if (missingHeaders.length) {
    throw new Error(`Missing required AUS/NZ food CSV headers: ${missingHeaders.join(", ")}`);
  }

  return dataRows
    .map((row) => rowToObject(headers, row))
    .filter((row) => Object.values(row).some((cell) => cell.trim()))
    .map((row) =>
      fsanzRowToImportCandidate({
        sourceId: options.sourceId ?? "fsanz_ausnut",
        foodId: readRequired(row, headerLookup, requiredHeaderAliases.foodId),
        version: options.version,
        name: readRequired(row, headerLookup, requiredHeaderAliases.name),
        brandName: readOptional(row, headerLookup, optionalHeaderAliases.brandName),
        barcode: readOptional(row, headerLookup, optionalHeaderAliases.barcode),
        category: readOptional(row, headerLookup, optionalHeaderAliases.category),
        servingSizeText: readOptional(row, headerLookup, optionalHeaderAliases.servingSizeText),
        servingSizeGrams: readNumber(row, headerLookup, optionalHeaderAliases.servingSizeGrams),
        nutrientsPer100g: readNutrients(row, headerLookup),
        raw: row
      } satisfies FsanzFoodImportRow)
    );
}

function readNutrients(row: ParsedCsvRow, headerLookup: Map<string, string>) {
  const nutrients: ImportedFoodNutrient[] = [];

  for (const nutrient of nutrientHeaderAliases) {
    const value = readNumber(row, headerLookup, nutrient.aliases);

    if (value !== undefined) {
      nutrients.push({
        name: nutrient.name,
        unit: nutrient.unit,
        value
      });
    }
  }

  return nutrients;
}

function readRequired(row: ParsedCsvRow, headerLookup: Map<string, string>, aliases: readonly string[]) {
  const value = readOptional(row, headerLookup, aliases);
  if (!value) {
    throw new Error(`Missing required AUS/NZ food CSV value for ${aliases[0]}.`);
  }
  return value;
}

function readOptional(row: ParsedCsvRow, headerLookup: Map<string, string>, aliases: readonly string[]) {
  const header = findHeader(headerLookup, aliases);
  return header ? row[header]?.trim() || undefined : undefined;
}

function readNumber(row: ParsedCsvRow, headerLookup: Map<string, string>, aliases: readonly string[]) {
  const value = readOptional(row, headerLookup, aliases);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function findHeader(headerLookup: Map<string, string>, aliases: readonly string[]) {
  for (const alias of aliases) {
    const header = headerLookup.get(normaliseHeader(alias));
    if (header) {
      return header;
    }
  }

  return undefined;
}

function buildHeaderLookup(headers: string[]) {
  const lookup = new Map<string, string>();
  headers.forEach((header) => {
    lookup.set(normaliseHeader(header), header);
  });
  return lookup;
}

function normaliseHeader(header: string) {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function rowToObject(headers: string[], row: string[]) {
  const entry: ParsedCsvRow = {};
  headers.forEach((header, index) => {
    entry[header] = row[index]?.trim() ?? "";
  });
  return entry;
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
