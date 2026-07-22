import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { buildPackageStats, formatCents, formStateToPayload, packageToFormState, PackagesPage } from "@/components/packages/packages-page";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const persistedPackages = [
  {
    id: "package_api_1",
    organizationId: "org_1",
    name: "API Platinum",
    description: "Persisted premium coaching",
    priceAmount: 59900,
    currency: "usd",
    billingInterval: "monthly",
    customBillingIntervalCount: null,
    customBillingIntervalUnit: null,
    termWeeks: 16,
    scheduledPriceAmount: 69900,
    scheduledPriceCurrency: "usd",
    scheduledPriceStartsAt: "2026-08-01T00:00:00.000Z",
    stripeProductId: "prod_123",
    stripePriceId: "price_123",
    status: "active",
    features: ["Custom training", "Weekly reviews"],
    color: "indigo",
    activeSubscriptions: 3,
    projectedMonthlyRevenue: 179700,
    customerLtv: 119800,
    ltvCustomerCount: 3,
    customerMetrics: {
      monthly: {
        arpu: 59900,
        grossMarginPercent: 100,
        churnRate: 1 / 3,
        retentionRate: 2 / 3,
        newCustomers: 0,
        endingCustomers: 2,
        lostCustomers: 1,
        customersAtStart: 3,
        revenue: 179700,
        customerLtv: 179700
      },
      quarterly: {
        arpu: 179700,
        grossMarginPercent: 100,
        churnRate: 1 / 3,
        retentionRate: 2 / 3,
        newCustomers: 0,
        endingCustomers: 2,
        lostCustomers: 1,
        customersAtStart: 3,
        revenue: 539100,
        customerLtv: 539100
      },
      annually: {
        arpu: 718800,
        grossMarginPercent: 100,
        churnRate: 1 / 3,
        retentionRate: 2 / 3,
        newCustomers: 0,
        endingCustomers: 2,
        lostCustomers: 1,
        customersAtStart: 3,
        revenue: 2156400,
        customerLtv: 2156400
      }
    },
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z"
  },
  {
    id: "package_api_2",
    organizationId: "org_1",
    name: "API Launch",
    description: "Persisted one-time package",
    priceAmount: 149900,
    currency: "usd",
    billingInterval: "one-time",
    customBillingIntervalCount: null,
    customBillingIntervalUnit: null,
    termWeeks: 12,
    scheduledPriceAmount: null,
    scheduledPriceCurrency: null,
    scheduledPriceStartsAt: null,
    stripeProductId: null,
    stripePriceId: null,
    status: "active",
    features: ["12-week program"],
    color: "purple",
    activeSubscriptions: 1,
    projectedMonthlyRevenue: 0,
    customerLtv: 149900,
    ltvCustomerCount: 1,
    customerMetrics: {
      monthly: {
        arpu: 149900,
        grossMarginPercent: 100,
        churnRate: 0,
        retentionRate: 1,
        newCustomers: 0,
        endingCustomers: 1,
        lostCustomers: 0,
        customersAtStart: 1,
        revenue: 149900,
        customerLtv: 0
      },
      quarterly: {
        arpu: 149900,
        grossMarginPercent: 100,
        churnRate: 0,
        retentionRate: 1,
        newCustomers: 0,
        endingCustomers: 1,
        lostCustomers: 0,
        customersAtStart: 1,
        revenue: 149900,
        customerLtv: 0
      },
      annually: {
        arpu: 149900,
        grossMarginPercent: 100,
        churnRate: 0,
        retentionRate: 1,
        newCustomers: 0,
        endingCustomers: 1,
        lostCustomers: 0,
        customersAtStart: 1,
        revenue: 149900,
        customerLtv: 0
      }
    },
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z"
  }
];

describe("PackagesPage", () => {
  it("normalizes package stats, forms, payloads, and currency helpers", () => {
    const emptyStats = buildPackageStats([]);
    const packageStats = buildPackageStats(persistedPackages as never);
    const quarterlyStats = buildPackageStats(persistedPackages as never, "quarterly");

    expect(emptyStats.map((stat) => stat.value)).toEqual([0, "No packages", "0%", "0%", "$0"]);
    expect(packageStats.map((stat) => stat.value)).toEqual([4, "API Platinum", "75%", "25%", "$3,296"]);
    expect(quarterlyStats.map((stat) => stat.value)).toEqual([4, "API Platinum", "75%", "25%", "$6,890"]);
    expect(packageToFormState({ ...persistedPackages[0], description: null, color: null } as never)).toEqual({
      name: "API Platinum",
      description: "",
      price: "599",
      currency: "usd",
      billingInterval: "monthly",
      customBillingIntervalCount: "",
      customBillingIntervalUnit: "month",
      termWeeks: "16",
      scheduledPrice: "699",
      scheduledPriceCurrency: "usd",
      scheduledPriceStartsAt: "2026-08-01",
      features: ["Custom training", "Weekly reviews"]
    });
    expect(
      formStateToPayload({
        name: "  Builder Package  ",
        description: "  ",
        price: "199.995",
        currency: "aud",
        billingInterval: "custom",
        customBillingIntervalCount: "2",
        customBillingIntervalUnit: "week",
        termWeeks: "12",
        scheduledPrice: "249",
        scheduledPriceCurrency: "aud",
        scheduledPriceStartsAt: "2026-08-01",
        features: [" Coaching review ", "", " Meal plan "]
      })
    ).toEqual({
      name: "Builder Package",
      description: undefined,
      priceAmount: 20000,
      currency: "aud",
      billingInterval: "custom",
      customBillingIntervalCount: 2,
      customBillingIntervalUnit: "week",
      termWeeks: 12,
      scheduledPriceAmount: 24900,
      scheduledPriceCurrency: "aud",
      scheduledPriceStartsAt: "2026-08-01T00:00:00.000Z",
      features: ["Coaching review", "Meal plan"]
    });
    expect(
      formStateToPayload({
        name: " ",
        description: "",
        price: "10",
        currency: "usd",
        billingInterval: "monthly",
        customBillingIntervalCount: "",
        customBillingIntervalUnit: "month",
        termWeeks: "",
        scheduledPrice: "",
        scheduledPriceCurrency: "usd",
        scheduledPriceStartsAt: "",
        features: [""]
      })
    ).toBeNull();
    expect(
      formStateToPayload({
        name: "Bad",
        description: "",
        price: "bad",
        currency: "usd",
        billingInterval: "monthly",
        customBillingIntervalCount: "",
        customBillingIntervalUnit: "month",
        termWeeks: "",
        scheduledPrice: "",
        scheduledPriceCurrency: "usd",
        scheduledPriceStartsAt: "",
        features: [""]
      })
    ).toBeNull();
    expect(
      formStateToPayload({
        name: "Bad",
        description: "",
        price: "-1",
        currency: "usd",
        billingInterval: "monthly",
        customBillingIntervalCount: "",
        customBillingIntervalUnit: "month",
        termWeeks: "",
        scheduledPrice: "",
        scheduledPriceCurrency: "usd",
        scheduledPriceStartsAt: "",
        features: [""]
      })
    ).toBeNull();
    expect(formatCents(12000)).toBe("$120");
    expect(formatCents(12345)).toBe("$123.45");
    expect(formatCents(12000, "aud")).toBe("A$120");
  });

  it("loads packages and revenue stats from the persistence API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: persistedPackages }), { status: 200 })
    );

    render(createElement(PackagesPage));

    expect(screen.getByRole("heading", { level: 1, name: "Package Ecosystem" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active Packages" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Active Inventory" })).not.toBeInTheDocument();
    expect(await screen.findAllByText("API Platinum")).toHaveLength(2);
    expect(screen.queryByText("Elite Hypertrophy")).not.toBeInTheDocument();
    expect(screen.queryByText("Platinum Elite")).not.toBeInTheDocument();
    expect(screen.getByText("3 clients assigned")).toBeInTheDocument();
    expect(screen.getByText("1 client assigned")).toBeInTheDocument();
    expect(screen.getAllByText("Assigned Clients")).toHaveLength(2);
    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(screen.getByText("Needs sync")).toBeInTheDocument();

    const stats = screen.getByLabelText("Package revenue summary");
    expect(within(stats).getByText("Active Subscriptions")).toBeInTheDocument();
    expect(within(stats).getByText("4")).toBeInTheDocument();
    expect(within(stats).queryByText("Portfolio Value")).not.toBeInTheDocument();
    expect(within(stats).getByText("Top Performer")).toBeInTheDocument();
    expect(within(stats).getByText("API Platinum")).toBeInTheDocument();
    expect(within(stats).getByText("Retention Rate")).toBeInTheDocument();
    expect(within(stats).getByText("75%")).toBeInTheDocument();
    expect(within(stats).getByText("Churn")).toBeInTheDocument();
    expect(within(stats).getByText("25%")).toBeInTheDocument();
    expect(within(stats).getByText("Customer LTV")).toBeInTheDocument();
    expect(within(stats).getByText("$3,296")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Quarterly" }));
    expect(within(stats).getByText("$6,890")).toBeInTheDocument();
  });

  it("creates packages through the persistence API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/packages?status=active&limit=100" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (String(input) === "/api/v1/packages" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                ...persistedPackages[0],
                id: "package_created",
                name: "Created Package",
                priceAmount: 24900,
                stripeProductId: null,
                stripePriceId: null,
                projectedMonthlyRevenue: 0,
                activeSubscriptions: 0,
                customerLtv: 0,
                ltvCustomerCount: 0
              }
            }),
            { status: 201 }
          )
        );
      }

      if (String(input) === "/api/v1/packages/package_created/stripe-sync" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                ...persistedPackages[0],
                id: "package_created",
                name: "Created Package",
                priceAmount: 24900,
                stripeProductId: "prod_created",
                stripePriceId: "price_created",
                projectedMonthlyRevenue: 0,
                activeSubscriptions: 0,
                customerLtv: 0,
                ltvCustomerCount: 0
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(PackagesPage));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/packages?status=active&limit=100"));

    fireEvent.click(screen.getByRole("button", { name: "Create New Package" }));
    fireEvent.change(screen.getByLabelText("Package Name"), { target: { value: "Created Package" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "New coaching offer" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "249" } });
    fireEvent.change(screen.getByLabelText("Package term"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Feature 1"), { target: { value: "Weekly reviews" } });
    fireEvent.click(screen.getByRole("button", { name: "Add feature" }));
    fireEvent.change(screen.getByLabelText("Feature 2"), { target: { value: "Messaging" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Package" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/packages",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Created Package",
            description: "New coaching offer",
            priceAmount: 24900,
            currency: "usd",
            billingInterval: "monthly",
            termWeeks: 8,
            features: ["Weekly reviews", "Messaging"]
          })
        })
      )
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/packages/package_created/stripe-sync", { method: "POST" })
    );
    expect(await screen.findAllByText("Created Package")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Open Stripe account" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Create Package" })).not.toBeInTheDocument();
  });

  it("archives persisted packages from the package card", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/packages?status=active&limit=100" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: persistedPackages }), { status: 200 }));
      }

      if (String(input) === "/api/v1/packages/package_api_1" && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { ...persistedPackages[0], status: "archived" } }), { status: 200 })
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(PackagesPage));

    expect(await screen.findAllByText("API Platinum")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Archive API Platinum" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/packages/package_api_1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "archived" })
        })
      )
    );
    await waitFor(() => expect(screen.queryByText("API Platinum")).not.toBeInTheDocument());
  });

  it("keeps a package visible when archive confirmation is cancelled", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/packages?status=active&limit=100" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: persistedPackages }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(PackagesPage));

    expect(await screen.findAllByText("API Platinum")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Archive API Platinum" }));

    expect(screen.getAllByText("API Platinum")).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v1/packages/package_api_1",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("updates packages through the persistence API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/packages?status=active&limit=100" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: persistedPackages }), { status: 200 }));
      }

      if (String(input) === "/api/v1/packages/package_api_1" && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                ...persistedPackages[0],
                name: "Updated Platinum",
                priceAmount: 69900,
                stripePriceId: null,
                projectedMonthlyRevenue: 209700
              }
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "/api/v1/packages/package_api_1/stripe-sync" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                ...persistedPackages[0],
                name: "Updated Platinum",
                priceAmount: 69900,
                stripeProductId: "prod_123",
                stripePriceId: "price_updated",
                projectedMonthlyRevenue: 209700
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(PackagesPage));

    expect(await screen.findAllByText("API Platinum")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Edit API Platinum" }));
    fireEvent.change(screen.getByLabelText("Package Name"), { target: { value: "Updated Platinum" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "699" } });
    fireEvent.change(screen.getByLabelText("Scheduled price"), { target: { value: "799" } });
    fireEvent.change(screen.getByLabelText("Starts on"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Package" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/packages/package_api_1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "Updated Platinum",
            description: "Persisted premium coaching",
            priceAmount: 69900,
            currency: "usd",
            billingInterval: "monthly",
            termWeeks: 16,
            scheduledPriceAmount: 79900,
            scheduledPriceCurrency: "usd",
            scheduledPriceStartsAt: "2026-09-01T00:00:00.000Z",
            features: ["Custom training", "Weekly reviews"]
          })
        })
      )
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/packages/package_api_1/stripe-sync", { method: "POST" })
    );
    expect(await screen.findAllByText("Updated Platinum")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Open Stripe account" })).toBeInTheDocument();
    expect(screen.queryByText("API Platinum")).not.toBeInTheDocument();
  });

  it("shows unsynced packages without a manual Stripe sync button", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/packages?status=active&limit=100" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: persistedPackages }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(PackagesPage));

    expect(await screen.findByText("API Launch")).toBeInTheDocument();
    expect(screen.getByText("Needs sync")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sync Stripe" })).not.toBeInTheDocument();
  });

  it("opens the connected Stripe account from synced packages", async () => {
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/packages?status=active&limit=100" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: [persistedPackages[0]] }), { status: 200 }));
      }

      if (url === "/api/v1/stripe/connect/dashboard-link" && init?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { dashboardUrl: "https://connect.stripe.test/acct_1" } }), {
            status: 200
          })
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(PackagesPage));

    expect(await screen.findAllByText("API Platinum")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Open Stripe account" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/stripe/connect/dashboard-link", { method: "POST" })
    );
    expect(openMock).toHaveBeenCalledWith("https://connect.stripe.test/acct_1", "_blank", "noopener,noreferrer");
  });

  it("creates a client Checkout payment link from a synced monthly package", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/packages?status=active&limit=100" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: [persistedPackages[0]] }), { status: 200 }));
      }

      if (url === "/api/v1/clients?status=active&limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "client_1",
                  name: "Sarah Johnson",
                  packageName: "Unassigned",
                  status: "active"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/client-subscriptions" && init?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { checkoutUrl: "https://checkout.stripe.test/session_1" } }), {
            status: 201
          })
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(PackagesPage));

    expect(await screen.findAllByText("API Platinum")).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Assign to Client" }).at(-1)!);

    expect(await screen.findByRole("dialog", { name: "Assign Package Payment" })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /Sarah Johnson/i }));
    fireEvent.click(screen.getByRole("button", { name: "Create payment link" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/client-subscriptions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            clientId: "client_1",
            packageId: "package_api_1",
            successUrl: "http://localhost:3000/packages?payment=success",
            cancelUrl: "http://localhost:3000/packages?payment=cancelled"
          })
        })
      )
    );
    expect(await screen.findByRole("link", { name: "Open Checkout" })).toHaveAttribute(
      "href",
      "https://checkout.stripe.test/session_1"
    );
  });

  it("shows an empty persisted package inventory when the API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(createElement(PackagesPage));

    expect(await screen.findByText("No packages")).toBeInTheDocument();
    expect(screen.queryByText("Platinum Elite")).not.toBeInTheDocument();
  });

  it("shows package write errors without adding local fallback data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/packages?status=active&limit=100" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: [persistedPackages[1]] }), { status: 200 }));
      }

      if (url === "/api/v1/packages" && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ error: "unavailable" }), { status: 503 }));
      }

      if (url === "/api/v1/packages/package_api_2" && init?.method === "PATCH") {
        return Promise.resolve(new Response(JSON.stringify({ error: "unavailable" }), { status: 503 }));
      }

      if (url === "/api/v1/packages/package_api_2/stripe-sync" && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ error: "connect_required" }), { status: 503 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(PackagesPage));

    expect(await screen.findAllByText("API Launch")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Create New Package" }));
    fireEvent.change(screen.getByLabelText("Package Name"), { target: { value: "Failed Package" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "99" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Package" }));
    expect(await screen.findByText("Package could not be saved. Try again.")).toBeInTheDocument();
    expect(screen.queryByText("Failed Package")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Needs sync")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sync Stripe" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archive API Launch" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/packages/package_api_2",
        expect.objectContaining({ method: "PATCH" })
      )
    );
    expect(screen.getAllByText("API Launch")).toHaveLength(2);
  });

  it("handles package assignment roster and checkout failures", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/packages?status=active&limit=100" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: [persistedPackages[0]] }), { status: 200 }));
      }

      if (url === "/api/v1/clients?status=active&limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "client_1",
                  name: "Sarah Johnson",
                  packageName: "Unassigned",
                  status: "active"
                },
                {
                  id: "client_2",
                  name: "Marcus Rodriguez",
                  packageName: "Unassigned",
                  status: "active"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (url === "/api/v1/client-subscriptions" && init?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Stripe Connect account is not ready." } }), {
            status: 400
          })
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(PackagesPage));

    expect(await screen.findAllByText("API Platinum")).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Assign to Client" }).at(-1)!);
    expect(await screen.findByRole("dialog", { name: "Assign Package Payment" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Create payment link" })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Search active clients..."), {
      target: { value: "marcus" }
    });
    expect(screen.getByRole("button", { name: /Marcus Rodriguez/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sarah Johnson/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Marcus Rodriguez/i }));
    fireEvent.click(screen.getByRole("button", { name: "Create payment link" }));

    expect(await screen.findByText("Stripe Connect account is not ready.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/client-subscriptions",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("DashboardPage payment revenue", () => {
  it("loads monthly revenue from the Stripe financial reporting API", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/dashboard/financial-reporting?period=monthly") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                period: "monthly",
                label: "Monthly Revenue",
                amount: 179700,
                currency: "usd",
                change: "Stripe reported",
                bars: [30, 42, 55, 70]
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(DashboardPage));

    expect(await screen.findByText("$1,797")).toBeInTheDocument();
    expect(screen.getByText("Monthly Revenue")).toBeInTheDocument();
    expect(screen.getByText("Stripe reported")).toBeInTheDocument();
  });
});
