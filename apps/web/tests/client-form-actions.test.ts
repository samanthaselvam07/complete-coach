import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assignSelectedClientForms,
  fetchAssignedClientFormIds,
  fetchClientFormsByType,
  fetchClientFormOptionsFromUrls,
} from "@/components/clients/client-form-actions";
import { createClientMutationBody, emptyClientForm } from "@/components/clients/client-form-dialog";

describe("client form actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("omits coach assignment from normal edit payloads unless explicitly allowed", () => {
    const form = {
      ...emptyClientForm,
      firstName: "Marcus",
      lastName: "Rodriguez",
      primaryCoachUserId: "coach_1"
    };

    expect(createClientMutationBody(form, "active", true, true)).not.toHaveProperty("primaryCoachUserId");
    expect(createClientMutationBody(form, "active", true, true, true)).toMatchObject({
      primaryCoachUserId: "coach_1"
    });
  });

  it("merges unique published form options from several lookup URLs", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.includes("type=intake")) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [{ id: "form_intake", name: "Initial Q/A" }] }), { status: 200 })
        );
      }

      if (url.includes("type=application")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                { id: "form_application", name: "Application" },
                { id: "form_intake", name: "Initial Q/A" }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    await expect(
      fetchClientFormOptionsFromUrls([
        "/api/v1/forms?type=intake&limit=100",
        "/api/v1/forms?type=application&limit=100"
      ])
    ).resolves.toEqual([
      { value: "form_intake", label: "Initial Q/A", currency: undefined },
      { value: "form_application", label: "Application", currency: undefined }
    ]);
  });

  it("loads assigned form ids by form type for the edit dialog", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { formId: "form_intake", formType: "intake", status: "assigned" },
            { formId: "form_habit", formType: "habit-tracker", status: "assigned" },
            { formId: "form_checkin", formType: "check-in", status: "submitted" },
            { formId: "form_cancelled", formType: "intake", status: "cancelled" }
          ]
        }),
        { status: 200 }
      )
    );

    await expect(fetchAssignedClientFormIds("client_1")).resolves.toEqual({
      initialQuestionnaire: "form_intake",
      dailyHabitForm: "form_habit",
      checkInForm: "form_checkin"
    });
  });

  it("loads saved edit form options with explicit per-type lookups", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url === "/api/v1/forms?type=intake&limit=100") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [{ id: "form_initial_qa", name: "Initial Q&A Form", type: "intake" }] }), {
            status: 200
          })
        );
      }

      if (url === "/api/v1/forms?type=application&limit=100") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [{ id: "form_application", name: "Application Form", type: "application" }] }), {
            status: 200
          })
        );
      }

      if (url === "/api/v1/forms?type=contact&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/forms?type=terms-and-conditions&limit=100") {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      if (url === "/api/v1/forms?type=habit-tracker&limit=100") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [{ id: "form_daily", name: "Daily Check In", type: "habit-tracker" }] }), {
            status: 200
          })
        );
      }

      if (url === "/api/v1/forms?type=check-in&limit=100") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [{ id: "form_weekly", name: "Weekly Check In", type: "check-in" }] }), {
            status: 200
          })
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    await expect(fetchClientFormsByType()).resolves.toEqual({
      initialQuestionnaireOptions: [
        { value: "form_initial_qa", label: "Initial Q&A Form", currency: undefined },
        { value: "form_application", label: "Application Form", currency: undefined }
      ],
      dailyHabitFormOptions: [{ value: "form_daily", label: "Daily Check In", currency: undefined }],
      checkInFormOptions: [{ value: "form_weekly", label: "Weekly Check In", currency: undefined }]
    });

    expect(fetchMock).not.toHaveBeenCalledWith("/api/v1/forms?status=published&limit=100");
  });

  it("assigns selected forms without duplicating active assignments", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.startsWith("/api/v1/form-assignments")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ formId: "form_habit", formType: "habit-tracker", status: "assigned" }]
            }),
            { status: 200 }
          )
        );
      }

      if (init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({ data: { id: "assignment_1" } }), { status: 201 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    await assignSelectedClientForms("client_1", {
      ...emptyClientForm,
      initialQuestionnaire: "form_intake",
      dailyHabitForm: "form_habit",
      checkInForm: "form_checkin"
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/forms/form_intake/assignments", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/forms/form_checkin/assignments", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/v1/forms/form_habit/assignments", expect.anything());
  });
});
