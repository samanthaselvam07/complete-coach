import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const authStorageState = `test-results/.auth/education-supplementation-user-${process.pid}.json`;

test.describe.configure({ mode: "serial" });

test.skip(
  !process.env.DEMO_COACH_EMAIL || !process.env.DEMO_COACH_PASSWORD,
  "DEMO_COACH_EMAIL and DEMO_COACH_PASSWORD are required for authenticated M9 smoke tests."
);

async function signInDemoOwner(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(process.env.DEMO_COACH_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.DEMO_COACH_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/$/, { timeout: 20_000 });
  await expect(page.getByRole("button", { name: /open account menu/i })).toBeVisible();
}

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

test.describe("M9 education and supplementation persistence smoke", () => {
  test("coach uploads and creates an education resource", async ({ page }) => {
    let createdResourceBody: Record<string, unknown> | null = null;

    await page.route("**/api/v1/education-resources/upload-url", async (route) => {
      await route.fulfill({
        json: {
          data: {
            objectId: "organizations/org_e2e/education/resources/pdf/00000000-0000-4000-8000-000000000000.pdf",
            uploadUrl: "https://uploads.example.test/resource.pdf",
            requiredHeaders: { "Content-Type": "application/pdf" },
            resourceType: "pdf"
          }
        }
      });
    });
    await page.route("https://uploads.example.test/resource.pdf", async (route) => {
      await route.fulfill({ status: 200, body: "" });
    });
    await page.route("**/api/v1/education-resources", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      createdResourceBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        json: { data: { id: "education_e2e_created", title: createdResourceBody.title } }
      });
    });

    await page.goto("/education/add");
    await page.getByLabel("Resource Title").fill("E2E Recovery Basics");
    await page.getByLabel("Browse Files").setInputFiles({
      name: "recovery-basics.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("pdf")
    });
    await page.getByRole("button", { name: "Publish as Resource" }).click();

    await expect(page.getByRole("status")).toHaveText("Resource published.");
    expect(createdResourceBody).toMatchObject({
      title: "E2E Recovery Basics",
      resourceType: "pdf",
      objectId: "organizations/org_e2e/education/resources/pdf/00000000-0000-4000-8000-000000000000.pdf"
    });
  });

  test("education vault renders persisted resources", async ({ page }) => {
    await page.route("**/api/v1/education-resources**", async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: "education_e2e",
              title: "E2E Persisted Recovery PDF",
              category: "Recovery",
              resourceType: "pdf"
            }
          ]
        }
      });
    });

    await page.goto("/education");

    await expect(page.getByText("E2E Persisted Recovery PDF")).toBeVisible();
    await expect(page.getByText("Synced library")).toBeVisible();
  });

  test("coach creates a persisted supplement and views API-backed plans", async ({ page }) => {
    let createdSupplementBody: Record<string, unknown> | null = null;

    await page.route("**/api/v1/supplements**", async (route) => {
      if (route.request().method() === "POST") {
        createdSupplementBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 201,
          json: {
            data: {
              id: "supplement_e2e_created",
              name: createdSupplementBody.name,
              category: createdSupplementBody.category,
              recommendedTiming: createdSupplementBody.recommendedTiming,
              dosage: createdSupplementBody.dosage,
              bioavailabilityNotes: "E2E persisted note.",
              clinicalDescription: null
            }
          }
        });
        return;
      }

      await route.fulfill({ json: { data: [] } });
    });

    await page.goto("/supplementation/database");
    await page.getByRole("button", { name: "New Entry" }).click();
    await page.getByLabel("Supplement Name").fill("E2E Electrolytes");
    await page.getByRole("button", { name: "Anytime", exact: true }).click();
    await page.getByRole("button", { name: "Timing Anytime" }).click();
    await page.getByLabel("Standard Dosage").fill("1 serve");
    await page.getByRole("button", { name: "Create Protocol" }).click();

    await expect(page.getByText("E2E Electrolytes")).toBeVisible();
    expect(createdSupplementBody).toMatchObject({
      name: "E2E Electrolytes",
      category: "Anytime",
      recommendedTiming: "Once anytime",
      dosage: "1 serve"
    });

    await page.route("**/api/v1/supplement-plan-assignments**", async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: "assignment_e2e",
              name: "E2E Hydration Support",
              clientName: "E2E Plan Client",
              status: "active",
              snapshot: {
                template: {
                  phases: [{ supplements: [{ supplementName: "Electrolytes" }] }]
                }
              }
            }
          ]
        }
      });
    });
    await page.route("**/api/v1/supplement-plan-templates**", async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: "template_e2e",
              name: "E2E Template",
              description: "E2E persisted template.",
              status: "published",
              template: { phases: [{ supplements: [{ supplementName: "Electrolytes" }] }] }
            }
          ]
        }
      });
    });

    await page.goto("/supplementation/plans");
    await expect(page.getByText("E2E Plan Client")).toBeVisible();
    await page.getByRole("tab", { name: "Protocol Library" }).click();
    await expect(page.getByText("E2E Template")).toBeVisible();
  });
});
