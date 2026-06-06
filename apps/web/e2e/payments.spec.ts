import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const authStorageState = `test-results/.auth/payments-user-${process.pid}.json`;

test.describe.configure({ mode: "serial" });

interface E2ePackage {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  priceAmount: number;
  currency: string;
  billingInterval: string;
  stripeProductId: string | null;
  stripePriceId: string | null;
  status: string;
  features: string[];
  color: string;
  activeSubscriptions: number;
  projectedMonthlyRevenue: number;
  createdAt: string;
  updatedAt: string;
}

test.skip(
  !process.env.DEMO_COACH_EMAIL || !process.env.DEMO_COACH_PASSWORD,
  "DEMO_COACH_EMAIL and DEMO_COACH_PASSWORD are required for authenticated payments smoke tests."
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

test.describe("M8 payments and packages smoke", () => {
  test("coach manages API-backed packages and starts Stripe sync", async ({ page }) => {
    const packages: E2ePackage[] = [
      {
        id: "package_e2e_premium",
        organizationId: "org_e2e",
        name: "E2E Premium",
        description: "API-backed premium package",
        priceAmount: 39900,
        currency: "usd",
        billingInterval: "monthly",
        stripeProductId: "prod_e2e_premium",
        stripePriceId: "price_e2e_premium",
        status: "active",
        features: ["Weekly check-ins", "Program reviews"],
        color: "indigo",
        activeSubscriptions: 10,
        projectedMonthlyRevenue: 399000,
        createdAt: "2026-05-26T00:00:00.000Z",
        updatedAt: "2026-05-26T00:00:00.000Z"
      },
      {
        id: "package_e2e_starter",
        organizationId: "org_e2e",
        name: "E2E Starter",
        description: "Unsynced starter package",
        priceAmount: 19900,
        currency: "usd",
        billingInterval: "monthly",
        stripeProductId: null,
        stripePriceId: null,
        status: "active",
        features: ["Monthly check-ins"],
        color: "yellow",
        activeSubscriptions: 2,
        projectedMonthlyRevenue: 39800,
        createdAt: "2026-05-26T00:00:00.000Z",
        updatedAt: "2026-05-26T00:00:00.000Z"
      }
    ];
    let createdPackageBody: Record<string, unknown> | null = null;

    await page.route("**/api/v1/packages**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET" && url.pathname === "/api/v1/packages") {
        await route.fulfill({ json: { data: packages } });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/packages") {
        createdPackageBody = request.postDataJSON() as Record<string, unknown>;
        const createdPackage = {
          id: "package_e2e_created",
          organizationId: "org_e2e",
          name: String(createdPackageBody.name),
          description: String(createdPackageBody.description ?? ""),
          priceAmount: Number(createdPackageBody.priceAmount),
          currency: String(createdPackageBody.currency),
          billingInterval: String(createdPackageBody.billingInterval),
          stripeProductId: null,
          stripePriceId: null,
          status: "active",
          features: Array.isArray(createdPackageBody.features) ? createdPackageBody.features.map(String) : [],
          color: String(createdPackageBody.color),
          activeSubscriptions: 0,
          projectedMonthlyRevenue: 0,
          createdAt: "2026-05-26T00:00:00.000Z",
          updatedAt: "2026-05-26T00:00:00.000Z"
        };
        packages.push(createdPackage);
        await route.fulfill({ status: 201, json: { data: createdPackage } });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/packages/package_e2e_starter/stripe-sync") {
        const syncedPackage = {
          ...packages[1],
          stripeProductId: "prod_e2e_starter",
          stripePriceId: "price_e2e_starter"
        };
        packages[1] = syncedPackage;
        await route.fulfill({ json: { data: syncedPackage } });
        return;
      }

      if (request.method() === "PATCH" && url.pathname === "/api/v1/packages/package_e2e_created") {
        await route.fulfill({ json: { data: { ...packages[2], status: "archived" } } });
        return;
      }

      await route.fallback();
    });

    await page.goto("/packages");

    await expect(page.getByText("E2E Premium")).toBeVisible();
    await expect(page.getByLabel("Package revenue summary")).toContainText("$4,388");

    await page.getByRole("button", { name: "Create Package" }).click();
    await page.getByLabel("Package Name").fill("E2E Created Package");
    await page.getByLabel("Description").fill("Created through E2E");
    await page.getByLabel("Price").fill("299");
    await page.getByLabel("Features").fill("Checkout prep\nCoach messaging");
    await page.getByRole("button", { name: "Save Package" }).click();

    await expect(page.getByText("E2E Created Package")).toBeVisible();
    expect(createdPackageBody).toMatchObject({
      name: "E2E Created Package",
      description: "Created through E2E",
      priceAmount: 29900,
      currency: "usd",
      billingInterval: "monthly",
      features: ["Checkout prep", "Coach messaging"],
      color: "indigo"
    });

    const starterCard = page.locator("article").filter({ hasText: "E2E Starter" });
    await expect(starterCard).toContainText("Needs sync");
    await starterCard.getByRole("button", { name: "Sync Stripe" }).click();
    await expect(starterCard).toContainText("Synced");

    await page.getByRole("button", { name: "Archive E2E Created Package" }).click();
    await expect(page.getByText("E2E Created Package")).toHaveCount(0);
  });

  test("subscription checkout and Stripe webhook routes are reachable from the app", async ({ page }) => {
    let checkoutBody: Record<string, unknown> | null = null;
    let webhookBody: Record<string, unknown> | null = null;
    let webhookCalls = 0;

    await page.route("**/api/v1/client-subscriptions", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      checkoutBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        json: {
          data: {
            checkoutUrl: "https://checkout.stripe.test/e2e",
            subscription: {
              id: "subscription_e2e",
              status: "incomplete",
              stripeCheckoutSessionId: "cs_e2e"
            }
          }
        }
      });
    });

    await page.route("**/api/webhooks/stripe", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      webhookCalls += 1;
      webhookBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.fulfill({
        json: {
          data: {
            received: true,
            duplicate: webhookCalls > 1
          }
        }
      });
    });

    await page.goto("/packages");

    const checkoutStatus = await page.evaluate(async () => {
      const response = await fetch("/api/v1/client-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: "client_e2e",
          packageId: "package_e2e_premium",
          successUrl: "https://app.example.test/success",
          cancelUrl: "https://app.example.test/cancel"
        })
      });
      const payload = await response.json();

      return { status: response.status, checkoutUrl: payload.data.checkoutUrl };
    });

    expect(checkoutStatus).toEqual({
      status: 201,
      checkoutUrl: "https://checkout.stripe.test/e2e"
    });
    expect(checkoutBody).toMatchObject({
      clientId: "client_e2e",
      packageId: "package_e2e_premium"
    });

    const webhookResults = await page.evaluate(async () => {
      const body = JSON.stringify({
        id: "evt_e2e_checkout",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_e2e",
            subscription: "sub_e2e"
          }
        }
      });

      const first = await fetch("/api/webhooks/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "stripe-signature": "test_signature" },
        body
      });
      const second = await fetch("/api/webhooks/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "stripe-signature": "test_signature" },
        body
      });

      return {
        first: await first.json(),
        second: await second.json()
      };
    });

    expect(webhookBody).toMatchObject({
      id: "evt_e2e_checkout",
      type: "checkout.session.completed"
    });
    expect(webhookResults.first.data).toEqual({ received: true, duplicate: false });
    expect(webhookResults.second.data).toEqual({ received: true, duplicate: true });
  });
});
