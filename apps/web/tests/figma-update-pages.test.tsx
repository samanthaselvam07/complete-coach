import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { CoachProfilePage } from "@/components/coach/coach-profile-page";
import { NewClientIntakePage } from "@/components/clients/new-client-intake-page";
import { CreatePackagePage } from "@/components/packages/create-package-page";
import { SchedulingPage } from "@/components/scheduling/scheduling-page";
import { SettingsPage } from "@/components/settings/settings-page";
import { CreatePostPage } from "@/components/social/create-post-page";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

describe("Figma update pages", () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
  });

  it("creates a client from the new intake page", async () => {
    fetchMock.mockReset();
    mockNewClientIntakeLookups(new Response(JSON.stringify({ data: { id: "client_created_1" } }), { status: 201 }));

    render(<NewClientIntakePage />);

    expect(await screen.findByRole("option", { name: "Transformation Intake" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ava" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Stone" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ava@example.com" } });
    fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "1992-06-14" } });
    fireEvent.change(screen.getByLabelText("Payment plan/package"), { target: { value: "package_elite" } });
    fireEvent.click(screen.getByRole("button", { name: "Yes, this client needs to pay" }));
    fireEvent.change(screen.getByLabelText("Plan start date"), { target: { value: "2026-07-08" } });
    fireEvent.change(screen.getByLabelText("Weight Measurement"), { target: { value: "kg" } });
    fireEvent.change(screen.getByLabelText("Initial Q/A"), { target: { value: "form_intake" } });
    fireEvent.change(screen.getByLabelText("Daily habit form"), { target: { value: "form_habits" } });
    fireEvent.change(screen.getByLabelText("Check in form"), { target: { value: "form_checkin" } });
    fireEvent.change(screen.getByLabelText("Check-in Frequency"), { target: { value: "Weekly" } });
    fireEvent.click(screen.getByRole("button", { name: "Wednesday" }));
    fireEvent.click(screen.getByRole("button", { name: "Create client" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/clients", expect.objectContaining({ method: "POST" }));
    });
    const clientCreateCall = fetchMock.mock.calls.find(([url, init]) => url === "/api/v1/clients" && init?.method === "POST");
    const createBody = JSON.parse(String(clientCreateCall?.[1]?.body));

    expect(createBody).toEqual({
      firstName: "Ava",
      lastName: "Stone",
      email: "ava@example.com",
      packageId: "package_elite",
      packageName: "Elite Physique",
      checkInDay: "Wednesday",
      status: "new",
      startDate: "2026-07-08",
      onboarding: {
        dateOfBirth: "1992-06-14",
        needsPayment: true,
        paymentMode: "payment-link",
        weightMeasurement: "kg",
        initialQuestionnaire: "form_intake",
        dailyHabitForm: "form_habits",
        checkInForm: "form_checkin",
        checkInFrequency: "Weekly",
        checkInDays: ["Wednesday"]
      }
    });

    expect(await screen.findByText("Client created.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("link", { name: "Open client profile" })).toHaveAttribute(
      "href",
      "/clients/client_created_1",
    );
  });

  it("renders the new client onboarding controls without removed options", async () => {
    mockNewClientIntakeLookups();
    render(<NewClientIntakePage />);

    expect(await screen.findByRole("option", { name: "Transformation Intake" })).toBeInTheDocument();
    expect(screen.getByLabelText("Date of birth")).toBeInTheDocument();
    expect(screen.getByLabelText("Payment plan/package")).toBeInTheDocument();
    expect(screen.getByText("Does this client need to pay?")).toBeInTheDocument();
    expect(screen.getByLabelText("Plan start date")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight Measurement")).toBeInTheDocument();
    expect(screen.getByLabelText("Initial Q/A")).toBeInTheDocument();
    expect(screen.getByLabelText("Daily habit form")).toBeInTheDocument();
    expect(screen.getByLabelText("Check in form")).toBeInTheDocument();
    expect(screen.getByLabelText("Check-in Frequency")).toBeInTheDocument();
    expect(screen.getByLabelText("Set default exercise metric measurement unit")).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: "Select" }).length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByRole("option", { name: "kg" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("option", { name: "lbs" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Upload a welcome pack.")).not.toBeInTheDocument();
    expect(screen.queryByText("Do you want this client to add a goal/competition?")).not.toBeInTheDocument();
    expect(screen.queryByText("Do you want your client to access all your exercise library videos?")).not.toBeInTheDocument();
    expect(screen.queryByText("Can this client pay with apple pay")).not.toBeInTheDocument();
  });

  it("prefills new client intake details from CRM conversion", () => {
    render(
      <NewClientIntakePage
        initialForm={{
          firstName: "Ava",
          lastName: "Stone",
          email: "ava@example.com",
          phone: "+61 400",
          dateOfBirth: "1992-06-14"
        }}
      />
    );

    expect(screen.getByLabelText("First name")).toHaveValue("Ava");
    expect(screen.getByLabelText("Last name")).toHaveValue("Stone");
    expect(screen.getByLabelText("Email")).toHaveValue("ava@example.com");
    expect(screen.getByLabelText("Phone")).toHaveValue("+61 400");
    expect(screen.getByLabelText("Date of birth")).toHaveValue("1992-06-14");
  });

  it("uses offline payment mode when the client does not need to pay", async () => {
    fetchMock.mockReset();
    mockNewClientIntakeLookups(new Response(JSON.stringify({ data: { id: "client_created_2" } }), { status: 201 }));

    render(<NewClientIntakePage />);

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ben" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Taylor" } });
    fireEvent.click(screen.getByRole("button", { name: "No, set up offline payment" }));
    fireEvent.click(screen.getByRole("button", { name: "Create client" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/clients",
        expect.objectContaining({
          body: expect.stringContaining('"paymentMode":"offline"')
        })
      );
    });
  });

  it("creates a client without optional setup forms or check-in scheduling", async () => {
    fetchMock.mockReset();
    mockNewClientIntakeLookups(new Response(JSON.stringify({ data: { id: "client_created_minimal" } }), { status: 201 }));

    render(<NewClientIntakePage />);

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Mia" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Reed" } });
    fireEvent.click(screen.getByRole("button", { name: "Create client" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/clients", expect.objectContaining({ method: "POST" }));
    });

    const clientCreateCall = fetchMock.mock.calls.find(([url, init]) => url === "/api/v1/clients" && init?.method === "POST");
    const createBody = JSON.parse(String(clientCreateCall?.[1]?.body));

    expect(createBody).toEqual(
      expect.objectContaining({
        firstName: "Mia",
        lastName: "Reed",
        status: "new",
        onboarding: expect.objectContaining({
          needsPayment: false,
          paymentMode: "offline"
        })
      })
    );
    expect(createBody).not.toHaveProperty("checkInDay");
    expect(createBody.onboarding).not.toHaveProperty("initialQuestionnaire");
    expect(createBody.onboarding).not.toHaveProperty("dailyHabitForm");
    expect(createBody.onboarding).not.toHaveProperty("checkInForm");
    expect(createBody.onboarding).not.toHaveProperty("checkInFrequency");
    expect(createBody.onboarding).not.toHaveProperty("checkInDays");
  });

  it("validates the new client intake form before submitting", () => {
    mockNewClientIntakeLookups();
    render(<NewClientIntakePage />);

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: " " } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: "Create client" }));

    expect(screen.getByText("Enter the client's first and last name.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/v1/clients", expect.objectContaining({ method: "POST" }));
  });

  it("creates a package from the dedicated package builder page", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "package_created_1" }), { status: 201 }),
    );

    render(<CreatePackagePage />);

    fireEvent.change(screen.getByLabelText("Package name"), { target: { value: "Elite Physique" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "599" } });
    fireEvent.change(screen.getByLabelText("Package term"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Feature 1"), { target: { value: "Weekly check-ins" } });
    fireEvent.click(screen.getByRole("button", { name: "Add feature" }));
    fireEvent.change(screen.getByLabelText("Feature 2"), { target: { value: "Training reviews" } });
    fireEvent.click(screen.getByRole("button", { name: "Create package" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/packages",
        expect.objectContaining({
          body: JSON.stringify({
            name: "Elite Physique",
            description: undefined,
            priceAmount: 59900,
            currency: "usd",
            billingInterval: "monthly",
            termWeeks: 12,
            features: ["Weekly check-ins", "Training reviews"],
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );
    });

    expect(await screen.findByText("Package created.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("link", { name: "Back to packages" })).toHaveAttribute("href", "/packages");
  });

  it("validates package builder input before submitting", () => {
    render(<CreatePackagePage />);

    fireEvent.change(screen.getByLabelText("Package name"), { target: { value: "Elite Physique" } });
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "not a price" } });
    fireEvent.click(screen.getByRole("button", { name: "Create package" }));

    expect(screen.getByText("Enter a package name and a valid price.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("schedules a social post from the create post page", async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            connections: [
              { id: "connection_1", provider: "x", accountName: "Coach X", status: "connected" },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "post_1" }), { status: 201 }));

    render(<CreatePostPage />);

    expect(await screen.findByLabelText("Coach X")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Caption"), { target: { value: "New transformation story" } });
    fireEvent.change(screen.getByLabelText("Schedule date"), { target: { value: "2026-06-09T10:30" } });
    fireEvent.click(screen.getByLabelText("Coach X"));
    fireEvent.click(screen.getByRole("button", { name: "Schedule post" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/v1/social/posts",
        expect.objectContaining({
          body: JSON.stringify({
            caption: "New transformation story",
            scheduledFor: "2026-06-09T10:30:00.000Z",
            targetConnectionIds: ["connection_1"],
            media: [],
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );
    });

    expect(await screen.findByText("Post scheduled.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("handles social post connection loading failures", async () => {
    fetchMock.mockReset();
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    render(<CreatePostPage />);

    expect(await screen.findByText("Social connections could not be loaded.")).toBeInTheDocument();
    expect(screen.getByText("Connect a social account before scheduling posts.")).toBeInTheDocument();
  });

  it("validates social post requirements before submitting", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: "connection_2", provider: "instagram", accountName: "Coach IG", status: "connected" }],
        }),
        { status: 200 },
      ),
    );

    render(<CreatePostPage />);

    expect(await screen.findByLabelText("Coach IG")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Schedule post" }));

    expect(screen.getByText("Add a caption, schedule date, and at least one account.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renders the new shell pages from the Figma update", () => {
    const { rerender } = render(<CoachProfilePage />);
    expect(screen.getByRole("heading", { name: "Marcus Chen-Patterson" })).toBeInTheDocument();
    expect(screen.getByText("Professional Bio")).toBeInTheDocument();
    expect(screen.getByText("Coaching Philosophy")).toBeInTheDocument();

    rerender(<SchedulingPage />);
    expect(screen.getByRole("heading", { name: "Scheduling & Events" })).toBeInTheDocument();
    expect(screen.getByText("Schedule Coaching Call")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Events")).toBeInTheDocument();

    rerender(<SettingsPage />);
    expect(screen.getByRole("heading", { name: "Account Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByText("Platform Customization")).toBeInTheDocument();
    expect(screen.getByText("Coach Calendar Connections")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect Google Calendar" })).toHaveAttribute(
      "href",
      "/api/v1/calendar/connections/oauth/start?provider=google&scope=coach&redirectTo=/settings"
    );
  });
});

function mockNewClientIntakeLookups(clientCreateResponse = new Response(JSON.stringify({ data: { id: "client_created" } }), { status: 201 })) {
  fetchMock.mockImplementation((input, init) => {
    const url = String(input);

    if (url === "/api/v1/packages?status=active&limit=100") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [{ id: "package_elite", name: "Elite Physique", status: "active" }]
          }),
          { status: 200 }
        )
      );
    }

    if (url === "/api/v1/forms?type=intake&status=published&limit=100") {
      return Promise.resolve(
        new Response(JSON.stringify({ data: [{ id: "form_intake", name: "Transformation Intake" }] }), { status: 200 })
      );
    }

    if (url === "/api/v1/forms?type=habit-tracker&status=published&limit=100") {
      return Promise.resolve(
        new Response(JSON.stringify({ data: [{ id: "form_habits", name: "Daily Basics" }] }), { status: 200 })
      );
    }

    if (url === "/api/v1/forms?type=check-in&status=published&limit=100") {
      return Promise.resolve(
        new Response(JSON.stringify({ data: [{ id: "form_checkin", name: "Weekly Review" }] }), { status: 200 })
      );
    }

    if (url === "/api/v1/clients" && init?.method === "POST") {
      return Promise.resolve(clientCreateResponse.clone());
    }

    return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
  });
}
