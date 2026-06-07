import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { PackagesPage } from "@/components/packages/packages-page";

afterEach(() => {
  vi.restoreAllMocks();
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
    stripeProductId: "prod_123",
    stripePriceId: "price_123",
    status: "active",
    features: ["Custom training", "Weekly reviews"],
    color: "indigo",
    activeSubscriptions: 3,
    projectedMonthlyRevenue: 179700,
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
    stripeProductId: null,
    stripePriceId: null,
    status: "active",
    features: ["12-week program"],
    color: "purple",
    activeSubscriptions: 1,
    projectedMonthlyRevenue: 0,
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z"
  }
];

describe("PackagesPage", () => {
  it("loads packages and revenue stats from the persistence API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: persistedPackages }), { status: 200 })
    );

    render(createElement(PackagesPage));

    expect(screen.getByRole("heading", { level: 1, name: "Package Ecosystem" })).toBeInTheDocument();
    expect(await screen.findAllByText("API Platinum")).toHaveLength(2);
    expect(screen.queryByText("Platinum Elite")).not.toBeInTheDocument();
    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(screen.getByText("Needs sync")).toBeInTheDocument();

    const stats = screen.getByLabelText("Package revenue summary");
    expect(within(stats).getByText("Active Subscriptions")).toBeInTheDocument();
    expect(within(stats).getByText("4")).toBeInTheDocument();
    expect(within(stats).getByText("Portfolio Value")).toBeInTheDocument();
    expect(within(stats).getByText("$1,797")).toBeInTheDocument();
    expect(within(stats).getByText("Top Performer")).toBeInTheDocument();
    expect(within(stats).getByText("API Platinum")).toBeInTheDocument();
    expect(within(stats).getByText("Retention Rate")).toBeInTheDocument();
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
                projectedMonthlyRevenue: 0,
                activeSubscriptions: 0
              }
            }),
            { status: 201 }
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
    fireEvent.change(screen.getByLabelText("Features"), { target: { value: "Weekly reviews\nMessaging" } });
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
            features: ["Weekly reviews", "Messaging"],
            color: "indigo"
          })
        })
      )
    );
    expect(await screen.findAllByText("Created Package")).toHaveLength(2);
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
            features: ["Custom training", "Weekly reviews"],
            color: "indigo"
          })
        })
      )
    );
    expect(await screen.findAllByText("Updated Platinum")).toHaveLength(2);
    expect(screen.queryByText("API Platinum")).not.toBeInTheDocument();
  });

  it("starts Stripe sync for unsynced persisted packages", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/packages?status=active&limit=100" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: persistedPackages }), { status: 200 }));
      }

      if (String(input) === "/api/v1/packages/package_api_2/stripe-sync" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                ...persistedPackages[1],
                stripeProductId: "prod_synced",
                stripePriceId: "price_synced"
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(PackagesPage));

    expect(await screen.findByText("API Launch")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sync Stripe" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/packages/package_api_2/stripe-sync", { method: "POST" })
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Sync Stripe" })).not.toBeInTheDocument());
    expect(screen.getAllByText("Synced")).toHaveLength(2);
  });

  it("keeps fixture fallback package management when the API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(createElement(PackagesPage));

    expect(await screen.findAllByText("Platinum Elite")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Create New Package" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Package" }));

    expect(screen.getByText("Enter a package name and a valid price.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Package Name"), { target: { value: "Local Package" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "99" } });
    fireEvent.change(screen.getByLabelText("Features"), { target: { value: "Local support" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Package" }));

    expect(screen.queryByRole("dialog", { name: "Create Package" })).not.toBeInTheDocument();
    expect(screen.getByText("Local Package")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Duplicate Local Package" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Package" }));

    expect(screen.getByText("Local Package Copy")).toBeInTheDocument();
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
