import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { expect, test, type Page } from "@playwright/test";

export const routeCases = [
  { path: "/", heading: "Coach Operations Dashboard" },
  { path: "/training", heading: "Training Programs" },
  { path: "/training/programs", heading: "Program Library" },
  { path: "/training/exercises", heading: "Exercise database" },
  { path: "/training/exercises/add", heading: "Add New Exercise" },
  { path: "/nutrition", heading: "Nutrition Plans" },
  { path: "/nutrition/meal-plans", heading: "Meal Plan Library" },
  { path: "/nutrition/food-database", heading: "Food Database" },
  { path: "/education", heading: "Educational Vault" },
  { path: "/education/add", heading: "Upload New Resource" },
  { path: "/supplementation", heading: "Supplementation" },
  { path: "/supplementation/plans", heading: "Supplementation Hub" },
  { path: "/supplementation/database", heading: "Supplementation Library" },
  { path: "/clients", heading: "Client Roster" },
  { path: "/clients/1", heading: "Marcus Rodriguez" },
  { path: "/clients/crm", heading: "Client Relationship Management" },
  { path: "/clients/check-ins", heading: "Check In Review Center" },
  { path: "/forms", heading: "Create a New Form" },
  { path: "/messages", heading: "Messages" },
  { path: "/packages", heading: "Packages & Pricing" },
  { path: "/team-management", heading: "Team Management" },
  { path: "/audit-logs", heading: "Audit Log" },
  { path: "/social-media", heading: "Social Media Hub" }
] as const;

test.skip(
  !process.env.DEMO_COACH_EMAIL || !process.env.DEMO_COACH_PASSWORD,
  "DEMO_COACH_EMAIL and DEMO_COACH_PASSWORD are required for authenticated UI smoke tests."
);

export function collectPageErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  return errors;
}

async function signInDemoOwner(page: Page) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(process.env.DEMO_COACH_EMAIL ?? "");
    await page.getByLabel("Password").fill(process.env.DEMO_COACH_PASSWORD ?? "");
    await page.getByRole("button", { name: "Sign in" }).click();

    try {
      await page.waitForURL(/\/$/, { timeout: 20_000 });
      await expect(page.getByRole("button", { name: /open account menu/i })).toBeVisible();
      return;
    } catch (error) {
      if (attempt === 1 || !page.url().includes("/api/auth/error")) {
        throw error;
      }
    }
  }
}

export function configureAuthenticatedUiStub(authStorageState: string) {
  test.use({ storageState: authStorageState });

  test.beforeAll(async ({ browser }) => {
    await mkdir(dirname(authStorageState), { recursive: true });

    const page = await browser.newPage({ storageState: undefined });

    try {
      await signInDemoOwner(page);
      await page.context().storageState({ path: authStorageState });
    } finally {
      await page.close();
    }
  });
}


export { expect, test };
