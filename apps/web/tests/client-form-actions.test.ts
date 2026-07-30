import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assignSelectedClientForms,
  fetchAssignedClientFormIds,
  fetchClientFormOptionsFromUrls
} from "@/components/clients/client-form-actions";
import { emptyClientForm } from "@/components/clients/client-form-dialog";

describe("client form actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
        "/api/v1/forms?type=intake&status=published&limit=100",
        "/api/v1/forms?type=application&status=published&limit=100"
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
