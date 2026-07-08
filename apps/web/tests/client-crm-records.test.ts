import { describe, expect, it } from "vitest";

import { ClientStatus, LeadStage, LeadStatus } from "@/app/generated/prisma/enums";
import {
  buildClientWhere,
  getClientCreateData,
  serializeClient
} from "@/lib/clients/client-records";
import {
  buildLeadWhere,
  getLeadCreateData,
  serializeLead,
  toPrismaLeadStage
} from "@/lib/crm/lead-records";

describe("client persistence mappers", () => {
  it("always scopes client list filters to the active organization", () => {
    expect(
      buildClientWhere("org_1", {
        status: "active",
        search: "marcus",
        checkInDay: "Monday",
        limit: 50
      })
    ).toMatchObject({
      organizationId: "org_1",
      deletedAt: null,
      status: ClientStatus.ACTIVE,
      checkInDay: "Monday"
    });
  });

  it("serializes Prisma client rows into roster view models", () => {
    expect(
      serializeClient({
        id: "client_1",
        firstName: "Marcus",
        lastName: "Rodriguez",
        email: "marcus@example.com",
        status: ClientStatus.ACTIVE,
        packageName: "Elite Performance",
        checkInDay: "Monday",
        startDate: new Date("2026-01-15T00:00:00.000Z"),
        latestCheckInAt: new Date("2026-04-14T00:00:00.000Z"),
        compliance: 96
      })
    ).toMatchObject({
      id: "client_1",
      name: "Marcus Rodriguez",
      packageName: "Elite Performance",
      checkInDay: "Monday",
      status: "active",
      initials: "MR"
    });
  });

  it("serializes client fallback labels when optional fields are absent", () => {
    expect(
      serializeClient({
        id: "client_2",
        firstName: "",
        lastName: "",
        email: null,
        status: ClientStatus.NEW,
        packageName: null,
        checkInDay: null,
        startDate: null,
        latestCheckInAt: null,
        compliance: 0
      })
    ).toMatchObject({
      name: "",
      packageName: "Unassigned",
      checkInDay: "Unscheduled",
      latestCheckIn: "Not recorded",
      initials: "CC"
    });
  });

  it("normalizes client create data without trusting client-provided organization ids", () => {
    expect(
      getClientCreateData("org_1", {
        firstName: " Emma ",
        lastName: "Thompson",
        email: "EMMA@example.com",
        status: "new",
        timezone: "UTC"
      })
    ).toMatchObject({
      organizationId: "org_1",
      firstName: " Emma ",
      email: "emma@example.com",
      status: ClientStatus.NEW
    });
  });
});

describe("lead persistence mappers", () => {
  it("maps public lead stage ids to Prisma enums", () => {
    expect(toPrismaLeadStage("initial-contact")).toBe(LeadStage.INITIAL_CONTACT);
    expect(toPrismaLeadStage("closed-won")).toBe(LeadStage.CLOSED_WON);
  });

  it("always scopes lead list filters to the active organization", () => {
    expect(
      buildLeadWhere("org_1", {
        status: "hot",
        stage: "proposal",
        search: "jessica",
        limit: 100
      })
    ).toMatchObject({
      organizationId: "org_1",
      deletedAt: null,
      status: LeadStatus.HOT,
      stage: LeadStage.PROPOSAL
    });
  });

  it("serializes Prisma lead rows into CRM cards", () => {
    expect(
      serializeLead({
        id: "lead_1",
        name: "Jessica Martinez",
        email: "jessica@example.com",
        phone: "+1 555",
        source: "Instagram",
        status: LeadStatus.HOT,
        stage: LeadStage.INITIAL_CONTACT,
        location: "Los Angeles, CA",
        notes: "Interested in premium package",
        lastContactAt: null,
        daysInStage: 2
      })
    ).toMatchObject({
      id: "lead_1",
      name: "Jessica Martinez",
      status: "hot",
      stage: "initial-contact",
      initials: "JM",
      applicationResponses: [{ question: "Interested in premium package", answer: "" }]
    });
  });

  it("extracts application response table rows from public form notes", () => {
    expect(
      serializeLead({
        id: "lead_application",
        name: "Application Lead",
        email: "lead@example.com",
        phone: "+1 555",
        source: "Public form: Coaching Application",
        status: LeadStatus.WARM,
        stage: LeadStage.INITIAL_CONTACT,
        location: "Austin, TX",
        notes: "Primary goal: Lose 8kg and build strength\nTraining history: Beginner returning after time away",
        lastContactAt: null,
        daysInStage: 0
      }).applicationResponses
    ).toEqual([
      { question: "Primary goal", answer: "Lose 8kg and build strength" },
      { question: "Training history", answer: "Beginner returning after time away" }
    ]);
  });

  it("serializes lead relative contact states", () => {
    expect(
      serializeLead({
        id: "lead_today",
        name: "Today Lead",
        email: null,
        phone: null,
        source: null,
        status: LeadStatus.WARM,
        stage: LeadStage.CONSULTATION,
        location: null,
        notes: null,
        lastContactAt: new Date(),
        daysInStage: 0
      })
    ).toMatchObject({
      email: "",
      source: "Unknown",
      lastContact: "Today",
      location: "Unknown"
    });

    expect(
      serializeLead({
        id: "lead_yesterday",
        name: "Yesterday Lead",
        email: null,
        phone: null,
        source: null,
        status: LeadStatus.COLD,
        stage: LeadStage.NEGOTIATION,
        location: null,
        notes: null,
        lastContactAt: new Date(Date.now() - 86_400_000),
        daysInStage: 1
      }).lastContact
    ).toBe("1 day ago");
  });

  it("normalizes lead create data without trusting client-provided organization ids", () => {
    expect(
      getLeadCreateData("org_1", {
        name: "Michael Chen",
        email: "MICHAEL@example.com",
        status: "warm",
        stage: "consultation"
      })
    ).toMatchObject({
      organizationId: "org_1",
      email: "michael@example.com",
      status: LeadStatus.WARM,
      stage: LeadStage.CONSULTATION,
      daysInStage: 0
    });
  });
});
