import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    initials: "JM",
    callLink: "",
    applicationResponses: [
      { question: "Primary goal", answer: "Lose 8kg and build strength" },
      { question: "Training history", answer: "Beginner returning after time away" }
    ]
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
    initials: "MC",
    callLink: "https://meet.example.com/michael",
    applicationResponses: []
  }
];

const apiStages = [
  { id: "initial-contact", title: "Initial Contact", color: "gray" },
  { id: "consultation", title: "Consultation Scheduled", color: "blue" },
  { id: "proposal", title: "Proposal Sent", color: "purple" },
  { id: "negotiation", title: "In Negotiation", color: "yellow" },
  { id: "closed-won", title: "Closed - Won", color: "green" }
];

function mockLeadsApi(leads = apiLeads, stages = apiStages) {
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);

    if (url === "/api/v1/crm/stages" && init?.method === "PUT") {
      const body = JSON.parse(String(init.body ?? "{}")) as { stages: typeof stages };
      return Promise.resolve(new Response(JSON.stringify({ data: body.stages }), { status: 200 }));
    }

    if (url === "/api/v1/crm/stages") {
      return Promise.resolve(new Response(JSON.stringify({ data: stages }), { status: 200 }));
    }

    if (url.startsWith("/api/v1/leads/") && init?.method === "PATCH") {
      const id = url.split("/").at(-1);
      const body = JSON.parse(String(init.body ?? "{}")) as Partial<(typeof leads)[number]>;
      const lead = leads.find((candidate) => candidate.id === id) ?? leads[0];
      return Promise.resolve(
        new Response(JSON.stringify({ data: { ...lead, ...body, stage: body.stage ?? lead.stage } }), { status: 200 })
      );
    }

    if (url === "/api/v1/leads" && init?.method === "POST") {
      const body = JSON.parse(String(init.body ?? "{}")) as Partial<(typeof leads)[number]>;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              id: "lead_created_1",
              name: body.name,
              email: body.email,
              phone: body.phone,
              source: body.source,
              lastContact: "Today",
              notes: body.notes,
              location: body.location ?? "Unknown",
              status: body.status,
              stage: body.stage,
              daysInStage: 0,
              initials: "CL",
              applicationResponses: []
            }
          }),
          { status: 201 }
        )
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
    mockLeadsApi([
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
        initials: "AL",
        callLink: "",
        applicationResponses: []
      }
    ]);

    render(createElement(CRMPage));

    expect(await screen.findByText("API Lead")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Consultation Scheduled" })).toHaveTextContent(
      "API Lead"
    );
  });

  it("filters the board when hot, warm, or cold lead cards are clicked", async () => {
    mockLeadsApi();
    render(createElement(CRMPage));

    expect(await screen.findByText("Jessica Martinez")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Filter Hot Leads" }));

    expect(screen.getByText("Michael Chen")).toBeInTheDocument();
    expect(screen.queryByText("Jessica Martinez")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Filter Warm Leads" }));

    expect(screen.getByText("Jessica Martinez")).toBeInTheDocument();
    expect(screen.queryByText("Michael Chen")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear lead status filter" }));

    expect(screen.getByText("Jessica Martinez")).toBeInTheDocument();
    expect(screen.getByText("Michael Chen")).toBeInTheDocument();
  });

  it("customises CRM stages with add, delete, and colour controls", async () => {
    mockLeadsApi();
    render(createElement(CRMPage));

    expect(await screen.findByText("Jessica Martinez")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Customize CRM stages" }));
    fireEvent.change(screen.getByLabelText("Stage 1 name"), {
      target: { value: "New Applications" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Set New Applications stage colour to orange" }));
    fireEvent.click(screen.getByRole("button", { name: "Add stage" }));
    fireEvent.change(screen.getByLabelText("Stage 6 name"), {
      target: { value: "Follow Up" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete Follow Up stage" }));
    fireEvent.click(screen.getByRole("button", { name: "Save stages" }));

    expect(await screen.findByRole("region", { name: "New Applications" })).toHaveTextContent("Jessica Martinez");
    expect(screen.queryByRole("region", { name: "Follow Up" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Initial Contact" })).not.toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/v1/crm/stages",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("\"color\":\"orange\"")
      })
    );
  });

  it("creates and searches persisted leads", async () => {
    mockLeadsApi([]);
    const fetchMock = vi.mocked(globalThis.fetch);

    render(createElement(CRMPage));

    await screen.findByRole("region", { name: "Initial Contact" });
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

  it("views lead details, application responses, editable contact details, call link, and stage", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/crm/stages") {
        return Promise.resolve(new Response(JSON.stringify({ data: apiStages }), { status: 200 }));
      }

      if (url === "/api/v1/leads/lead_api_1" && init?.method === "PATCH") {
        return Promise.resolve(
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
                initials: "UL",
                callLink: "https://meet.example.com/updated",
                applicationResponses: [
                  { question: "Goal", answer: "Build consistency" },
                  { question: "Biggest obstacle", answer: "Work travel" }
                ]
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(
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
                initials: "AL",
                callLink: "",
                applicationResponses: [
                  { question: "Goal", answer: "Build consistency" },
                  { question: "Biggest obstacle", answer: "Work travel" }
                ]
              }
            ]
          }),
          { status: 200 }
        )
      );
    });

    render(createElement(CRMPage));

    expect(await screen.findByText("API Lead")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /view API Lead/i }));

    const dialog = screen.getByRole("dialog", { name: "API Lead lead profile" });
    expect(within(dialog).getByRole("table", { name: "Application form responses" })).toHaveTextContent("Work travel");
    expect(within(dialog).getByLabelText("Lead email")).toHaveValue("api@example.com");
    expect(within(dialog).getByLabelText("Call link")).toHaveValue("");

    fireEvent.change(within(dialog).getByLabelText("Lead name"), { target: { value: "Updated Lead" } });
    fireEvent.change(within(dialog).getByLabelText("Lead email"), { target: { value: "updated@example.com" } });
    fireEvent.change(within(dialog).getByLabelText("Lead stage"), { target: { value: "proposal" } });
    fireEvent.change(within(dialog).getByLabelText("Call link"), { target: { value: "https://meet.example.com/updated" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save lead profile" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "API Lead lead profile" })).not.toBeInTheDocument());
    expect(await screen.findByText("Updated Lead")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Proposal Sent" })).toHaveTextContent("Updated Lead");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/leads/lead_api_1",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("https://meet.example.com/updated")
      })
    );
  });

  it("opens the new client intake page with lead details when converting from CRM", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/crm/stages") {
        return Promise.resolve(new Response(JSON.stringify({ data: apiStages }), { status: 200 }));
      }

      return Promise.resolve(
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
                initials: "AL",
                applicationResponses: [{ question: "Date of birth", answer: "1992-06-14" }]
              }
            ]
          }),
          { status: 200 }
        )
      );
    });

    render(createElement(CRMPage));

    expect(await screen.findByText("API Lead")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /view API Lead/i }));

    const convertLink = screen.getByRole("link", { name: "Convert to client" });

    expect(convertLink).toHaveAttribute(
      "href",
      "/clients/new?source=crm&leadId=lead_api_1&firstName=API&lastName=Lead&email=api%40example.com&phone=%2B1+555&dateOfBirth=1992-06-14"
    );
    expect(fetchMock).not.toHaveBeenCalledWith("/api/v1/clients", expect.anything());
  });
});
