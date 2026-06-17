# USDA FoodData Central Spike

## Scope
This spike checks whether Complete Coach can pull food records from the USDA FoodData Central API and map them into import candidates for the future food database.

USDA API reference:
- https://app.swaggerhub.com/apis/fdcnal/food-data_central_api/1.0.1
- https://fdc.nal.usda.gov/api-guide

## Implementation
Added a small USDA client:
- `apps/web/lib/nutrition/usda-fooddata-central.ts`

Added source-agnostic import processing:
- `apps/web/lib/nutrition/food-import-types.ts`
- `apps/web/lib/nutrition/food-import-normalizer.ts`
- `apps/web/lib/nutrition/food-import-processor.ts`
- `apps/web/lib/nutrition/food-import-persistence.ts`

Added source adapters:
- `apps/web/lib/nutrition/usda-food-import-adapter.ts`
- `apps/web/lib/nutrition/fsanz-food-import-adapter.ts`

Added a live verification script:
- `apps/web/scripts/usda-fooddata-spike.ts`

Added mocked coverage:
- `apps/web/tests/usda-fooddata-central.test.ts`
- `apps/web/tests/food-import-processor.test.ts`

## Import Processing Design
Each source maps into a shared `ImportedFoodCandidate` shape before it is normalised.

Supported source IDs:
- `usda_fdc`
- `fsanz_afcd`
- `fsanz_ausnut`
- `fsanz_branded`
- `efsa_foodex2`
- `custom`

The processor then creates `FoodLibraryImportRecord` values that fit the current `food_library_items` table:
- `name`
- `category`
- `servingSize`
- `calories`
- `proteinGrams`
- `carbsGrams`
- `fatGrams`
- `fiberGrams`
- `metadata`

Metadata preserves source details that the current food table does not model directly:
- import key
- source ID
- source food ID
- source version
- data type
- region/country codes
- brand
- barcode
- full per-100g nutrient rows
- optional raw source payload

This lets Complete Coach import source-tracked global foods now, then migrate to dedicated source tables later without losing provenance.

## Other Database Adapters
### USDA FoodData Central
USDA maps through `usdaFoodToImportCandidate`.

This supports:
- Foundation foods
- SR Legacy foods
- Survey/FNDDS foods
- Branded foods

### FSANZ AFCD / AUSNUT / Australian Branded Food Database
FSANZ-style rows map through `fsanzRowToImportCandidate`.

The adapter expects the parser/import job to provide:
- source dataset ID
- food ID
- version
- name
- category
- serving details
- per-100g nutrient rows

The parser itself should be source-file-specific because AFCD, AUSNUT, and branded exports may not share identical column names.

### EFSA / FoodEx2
`efsa_foodex2` is reserved as a source ID, but EFSA FoodEx2 should be treated primarily as a classification/crosswalk source rather than a nutrient composition feed.

Future EU nutrient imports should map composition data from the licensed nutrient source into `ImportedFoodCandidate`, then optionally include FoodEx2 classification metadata.

## Import Plan Behaviour
`buildFoodImportPlan` compares import records by stable import key:

```txt
sourceId:sourceFoodId:sourceVersion
```

It returns:
- creates for new source foods
- updates for existing imported source foods
- skipped records for duplicate candidates inside the same batch

`getGlobalFoodImportCreateData` and `getGlobalFoodImportUpdateData` turn normalised records into Prisma-ready writes for `food_library_items`.

## Running The Live Pull
The script uses `FDC_API_KEY` when present and falls back to USDA's `DEMO_KEY`.

```bash
pnpm --dir apps/web exec tsx scripts/usda-fooddata-spike.ts "greek yogurt"
```

Optional filters:

```bash
FDC_DATA_TYPES="Foundation,SR Legacy" pnpm --dir apps/web exec tsx scripts/usda-fooddata-spike.ts "chicken breast"
FDC_PAGE_SIZE=10 pnpm --dir apps/web exec tsx scripts/usda-fooddata-spike.ts "rice"
```

## Result
The API is reachable from the local environment with `DEMO_KEY`.

Verified command:

```bash
pnpm --dir apps/web exec tsx scripts/usda-fooddata-spike.ts "greek yogurt"
```

Verified output included:
- `totalHits: 25278`
- branded results from Ocean Spray, Trader Joe's, Chobani, and Olympiana
- barcode/GTIN values such as `894700010038`
- serving sizes such as `150g` and `170g`
- per-100g macro nutrients including energy, protein, carbohydrate, and fat

The `/fdc/v1/foods/search` endpoint returns:
- `fdcId`
- description
- data type
- branded metadata where available
- barcode/GTIN where available
- serving size where available
- nutrient rows with USDA nutrient IDs, names, units, and values

This is enough to support a source-aware import pipeline for generic and branded USDA foods.

## Notes For Production
- Use a real USDA API key rather than `DEMO_KEY`.
- Store raw USDA source payloads separately from normalised Complete Coach food records.
- Keep `fdcId`, data type, barcode, source version, and nutrient IDs for auditability.
- Import should be repeatable and idempotent.
- Branded results can be noisy for generic text searches, so production search should rank by data type, brand intent, barcode presence, and coach/client region.
- For large imports, prefer bulk source files and background jobs over live API search.
- Add dedicated source tables when import volume and update history outgrow `food_library_items.metadata`.
