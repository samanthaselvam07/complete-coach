# USDA FoodData Central Spike

## Scope
This spike checks whether Complete Coach can pull food records from the USDA FoodData Central API and map them into import candidates for the future food database.

USDA API reference:
- https://app.swaggerhub.com/apis/fdcnal/food-data_central_api/1.0.1
- https://fdc.nal.usda.gov/api-guide

## Implementation
Added a small USDA client:
- `apps/web/lib/nutrition/usda-fooddata-central.ts`

Added a live verification script:
- `apps/web/scripts/usda-fooddata-spike.ts`

Added mocked coverage:
- `apps/web/tests/usda-fooddata-central.test.ts`

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
