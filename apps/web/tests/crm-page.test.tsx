import { fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CRMPage } from "@/components/crm/crm-page";

const apiLeads = [
  {
    id: "lead_1",
    name: "Jessica Martinez",
    email: "jessica@example.com",
    phone: "+1 555",
    source: "Website",
    lastContact: "Today",
    notes: "Interested in coaching",
    location: "Austin, TX",
    status: "warm",
    stage: "initial-contact",
    daysInStage: 1,
    initials: "JM"
  },
  {
    id: "lead_2",
    name: "Michael Chen",
    email: "michael@example.com",
    phone: "+1 555",
    source: "Referral",
    lastContact: "Today",
    notes: "Consultation booked",
    location: "Melbourne, AU",
    status: "hot",
    stage: "consultation",
    daysInStage: 0,
    initials: "MC"
  }
];

function mockLeadsApi(leads = apiLeads) {
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);

    if (url.startsWith("/api/v1/leads/") && init?.method === "PATCH") {
      const id = url.split("/").at(-1);
      const body = JSON.parse(String(init.body ?? "{}")) as { stage?: string };
      const lead = leads.find((candidate) => candidate.id === id) ?? leads[0];
      return Promise.resolve(
        new Response(JSON.stringify({ data: { ...lead, stage: body.stage ?? lead.stage } }), { status: 200 })
      );
    }

    return Promise.resolve(new Response(JSON.stringify({ data: leads }), { status: 200 }));
  });
}

describe("CRMPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders CRM pipeline stages and API-backed lead cards", async () => {
    mockLeadsApi();
    render(createElement(CRMPage));

    expect(
      screen.getByRole("heading", { level: 1, name: "Client Relationship Management" })
    ).toBeInTheDocument();
    expect(await screen.findByText("Jessica Martinez")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Initial Contact" })).toHaveTextContent("Jessica Martinez");
    expect(screen.getByRole("region", { name: "Consultation Scheduled" })).toHaveTextContent("Michael Chen");
  });

  it("moves a lead to another stage through the accessible stage action", async () => {
    mockLeadsApi();
    render(createElement(CRMPage));

    await screen.findByText("Jessica Martinez");

    const initialContact = screen.getByRole("region", { name: "Initial Contact" });
    const proposal = screen.getByRole("region", { name: "Proposal Sent" });

    expect(within(initialContact).getByText("Jessica Martinez")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Move Jessica Martinez to Proposal Sent" }));

    expect(within(proposal).getByText("Jessica Martinez")).toBeInTheDocument();
    expect(within(initialContact).queryByText("Jessica Martinez")).not.toBeInTheDocument();
  });

  it("loads API-backed leads when the persistence API is available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "lead_api_1",
              name: "API Lead",
              email: "api@example.com",
              phone: "+1 555",
              source: "Website",
              lastContact: "Today",
              notes: "Persisted lead",
              location: "Melbourne, AU",
              status: "warm",
              stage: "consultation",
              daysInStage: 0,
              initials: "AL"
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(CRMPage));

    expect(await screen.findByText("API Lead")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Consultation Scheduled" })).toHaveTextContent(
      "API Lead"
    );
  });

  it("creates and searches persisted leads", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "lead_created_1",
              name: "Created Lead",
              email: "created@example.com",
              phone: "+1 555",
              source: "Website",
              lastContact: "Today",
              notes: "New persisted lead",
              location: "Austin, TX",
              status: "hot",
              stage: "initial-contact",
              daysInStage: 0,
              initials: "CL"
            }
          }),
          { status: 201 }
        )
      );

    render(createElement(CRMPage));

    fireEvent.click(screen.getByRole("button", { name: "Add New Lead" }));
    fireEvent.change(screen.getByLabelText("Lead name"), { target: { value: "Created Lead" } });
    fireEvent.change(screen.getByLabelText("Lead email"), { target: { value: "created@example.com" } });
    fireEvent.change(screen.getByLabelText("Lead phone"), { target: { value: "+1 555" } });
    fireEvent.change(screen.getByLabelText("Lead source"), { target: { value: "Website" } });
    fireEvent.change(screen.getByLabelText("Lead status"), { target: { value: "hot" } });
    fireEvent.change(screen.getByLabelText("Lead notes"), { target: { value: "New persisted lead" } });
    fireEvent.click(screen.getByRole("button", { name: "Save lead" }));

    expect(await screen.findByText("Created Lead")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: /search leads/i }), {
      target: { value: "created" }
    });

    expect(screen.getByText("Created Lead")).toBeInTheDocument();
    expect(screen.queryByText("Jessica Martinez")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/leads",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("created@example.com")
      })
    );
  });

  it("edits a lead and persists stage transitions", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "lead_api_1",
                name: "API Lead",
                email: "api@example.com",
                phone: "+1 555",
                source: "Website",
                lastContact: "Today",
                notes: "Persisted lead",
                location: "Melbourne, AU",
                status: "warm",
                stage: "consultation",
                daysInStage: 0,
                initials: "AL"
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "lead_api_1",
              name: "Updated Lead",
              email: "updated@example.com",
              phone: "+1 999",
              source: "Referral",
              lastContact: "Today",
              notes: "Updated notes",
              location: "Melbourne, AU",
              status: "hot",
              stage: "consultation",
              daysInStage: 0,
              initials: "UL"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "lead_api_1",
              name: "Updated Lead",
              email: "updated@example.com",
              phone: "+1 999",
              source: "Referral",
              lastContact: "Today",
              notes: "Updated notes",
              location: "Melbourne, AU",
              status: "hot",
              stage: "proposal",
              daysInStage: 0,
              initials: "UL"
            }
          }),
          { status: 200 }
        )
      );

    render(createElement(CRMPage));

    expect(await screen.findByText("API Lead")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit API Lead/i }));
    fireEvent.change(screen.getByLabelText("Lead name"), { target: { value: "Updated Lead" } });
    fireEvent.change(screen.getByLabelText("Lead email"), { target: { value: "updated@example.com" } });
    fireEvent.change(screen.getByLabelText("Lead source"), { target: { value: "Referral" } });
    fireEvent.change(screen.getByLabelText("Lead status"), { target: { value: "hot" } });
    fireEvent.change(screen.getByLabelText("Lead notes"), { target: { value: "Updated notes" } });
    fireEvent.click(screen.getByRole("button", { name: "Save lead" }));

    expect(await screen.findByText("Updated Lead")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Move Updated Lead to Proposal Sent" }));

    expect(await within(screen.getByRole("region", { name: "Proposal Sent" })).findByText("Updated Lead")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/leads/lead_api_1/stage-transitions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("proposal")
      })
    );
  });
});
