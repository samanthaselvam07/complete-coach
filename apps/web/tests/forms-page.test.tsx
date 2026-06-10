import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormsPage } from "@/components/forms/forms-page";

describe("FormsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the builder from a template", () => {
    render(createElement(FormsPage));

    expect(screen.getByRole("heading", { level: 1, name: "Create a New Form" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /use check-in forms template/i }));

    expect(screen.getByRole("heading", { level: 1, name: "Form Builder" })).toBeInTheDocument();
    expect(screen.getByText("Check-in Forms")).toBeInTheDocument();
  });

  it("adds, removes, and reorders form fields locally", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));

    const preview = screen.getByRole("region", { name: "Form preview" });
    expect(within(preview).getByText("Full Legal Name")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Email field" }));
    expect(within(preview).getByText("New email field")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Move New email field up" }));
    const fieldsAfterMove = within(preview).getAllByTestId("form-field");
    expect(within(fieldsAfterMove[1]).getByText("New email field")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove New email field" }));
    expect(within(preview).queryByText("New email field")).not.toBeInTheDocument();
  });

  it("edits appended form field labels, placeholders, required state, and options", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add Multiple Choice field" }));

    const preview = screen.getByRole("region", { name: "Form preview" });
    const fields = within(preview).getAllByTestId("form-field");
    const appendedField = fields.at(-1);

    expect(appendedField).toBeDefined();

    fireEvent.change(within(appendedField!).getByLabelText("Field label"), {
      target: { value: "Training goal" }
    });
    fireEvent.click(within(appendedField!).getByLabelText("Required field"));
    fireEvent.change(within(appendedField!).getByLabelText("Option 1"), {
      target: { value: "Build muscle" }
    });
    fireEvent.click(within(appendedField!).getByRole("button", { name: "Add option for Training goal" }));
    fireEvent.change(within(appendedField!).getByLabelText("Option 2"), {
      target: { value: "Improve conditioning" }
    });

    expect(within(appendedField!).getByText("Training goal")).toBeInTheDocument();
    expect(within(appendedField!).getByDisplayValue("Build muscle")).toBeInTheDocument();
    expect(within(appendedField!).getByDisplayValue("Improve conditioning")).toBeInTheDocument();
    expect(within(appendedField!).getByLabelText("Required field")).toBeChecked();
  });

  it("opens a live preview for the current form fields", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));
    fireEvent.change(screen.getByLabelText("Form title"), { target: { value: "Preview Intake" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Email field" }));

    const preview = screen.getByRole("region", { name: "Form preview" });
    const appendedField = within(preview).getAllByTestId("form-field").at(-1);

    expect(appendedField).toBeDefined();

    fireEvent.change(within(appendedField!).getByLabelText("Field label"), {
      target: { value: "Contact email" }
    });
    fireEvent.change(within(appendedField!).getByLabelText("Placeholder"), {
      target: { value: "you@example.com" }
    });

    fireEvent.click(screen.getByRole("button", { name: "Preview Form" }));

    const dialog = screen.getByRole("dialog", { name: "Preview Intake preview" });
    expect(within(dialog).getByRole("heading", { level: 2, name: "Preview Intake" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Contact email")).toHaveAttribute("placeholder", "you@example.com");

    fireEvent.click(within(dialog).getByRole("button", { name: "Close preview" }));
    expect(screen.queryByRole("dialog", { name: "Preview Intake preview" })).not.toBeInTheDocument();
  });

  it("previews choice, dropdown, checkbox, long text, photo, phone, and date fields", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));
    fireEvent.change(screen.getByLabelText("Form title"), { target: { value: "Field Type Preview" } });

    fireEvent.click(screen.getByRole("button", { name: "Add Long Text field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Dropdown field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Checkbox field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Phone Number field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Date of Birth field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Photo Upload field" }));

    const preview = screen.getByRole("region", { name: "Form preview" });
    const fields = within(preview).getAllByTestId("form-field");
    const longTextField = fields.at(-6);
    const dropdownField = fields.at(-5);
    const checkboxField = fields.at(-4);
    const phoneField = fields.at(-3);
    const dateField = fields.at(-2);
    const photoField = fields.at(-1);

    expect(longTextField).toBeDefined();
    expect(dropdownField).toBeDefined();
    expect(checkboxField).toBeDefined();
    expect(phoneField).toBeDefined();
    expect(dateField).toBeDefined();
    expect(photoField).toBeDefined();

    fireEvent.change(within(longTextField!).getByLabelText("Field label"), { target: { value: "Training notes" } });
    fireEvent.change(within(dropdownField!).getByLabelText("Field label"), { target: { value: "Primary goal" } });
    fireEvent.change(within(dropdownField!).getByLabelText("Option 1"), { target: { value: "Strength" } });
    fireEvent.change(within(checkboxField!).getByLabelText("Field label"), { target: { value: "Completed habits" } });
    fireEvent.click(within(checkboxField!).getByRole("button", { name: /remove option 1 from completed habits/i }));
    fireEvent.change(within(checkboxField!).getByLabelText("Option 1"), { target: { value: "Steps target" } });
    fireEvent.change(within(phoneField!).getByLabelText("Field label"), { target: { value: "Phone" } });
    fireEvent.change(within(dateField!).getByLabelText("Field label"), { target: { value: "Birth date" } });
    fireEvent.change(within(photoField!).getByLabelText("Field label"), { target: { value: "Progress photo" } });

    fireEvent.click(screen.getByRole("button", { name: "Preview Form" }));

    const dialog = screen.getByRole("dialog", { name: "Field Type Preview preview" });
    expect(within(dialog).getByLabelText("Training notes")).toHaveProperty("tagName", "TEXTAREA");
    expect(within(dialog).getByLabelText("Primary goal")).toHaveProperty("tagName", "SELECT");
    expect(within(dialog).getByText("Completed habits")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Steps target")).toHaveAttribute("type", "checkbox");
    expect(within(dialog).getByLabelText("Phone")).toHaveAttribute("type", "tel");
    expect(within(dialog).getByLabelText("Birth date")).toHaveAttribute("type", "date");
    expect(within(dialog).getByLabelText("Progress photo")).toHaveAttribute("type", "file");
  });

  it("returns from builder to management", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));
    fireEvent.click(screen.getByRole("button", { name: "Back to forms" }));

    expect(screen.getByRole("heading", { level: 1, name: "Create a New Form" })).toBeInTheDocument();
  });

  it("loads API-backed forms when the persistence API is available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "form_api_1",
              name: "Persisted Weekly Check-In",
              description: "Persisted description",
              type: "check-in",
              status: "published",
              currentVersionId: "version_1",
              updatedAt: "2026-05-14T00:00:00.000Z",
              createdAt: "2026-05-14T00:00:00.000Z"
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(FormsPage));

    expect(await screen.findByText("Persisted Weekly Check-In")).toBeInTheDocument();
    expect(screen.queryByText("Weekly Performance Log")).not.toBeInTheDocument();
  });

  it("keeps fixture forms when the persistence API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: {} }), { status: 503 }));

    render(createElement(FormsPage));

    expect(await screen.findByText("Weekly Performance Log")).toBeInTheDocument();
    expect(screen.getByText(/showing local sample forms/i)).toBeInTheDocument();
  });

  it("shows an empty persisted state when the forms API is available without records", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(FormsPage));

    expect(await screen.findByText(/no persisted forms yet/i)).toBeInTheDocument();
    expect(screen.queryByText("Weekly Performance Log")).not.toBeInTheDocument();
  });

  it("saves a draft form and immutable version through the persistence API", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "form_created_1",
              name: "Custom Intake",
              description: "Custom description",
              type: "intake",
              status: "draft",
              currentVersionId: null,
              createdAt: "2026-05-14T00:00:00.000Z",
              updatedAt: "2026-05-14T00:00:00.000Z"
            }
          }),
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "version_1",
              formId: "form_created_1",
              versionNumber: 1,
              schema: { title: "Custom Intake", description: "Custom description", fields: [] },
              ui: { primaryColor: "#6366f1" },
              publishedAt: null,
              createdAt: "2026-05-14T00:00:00.000Z"
            }
          }),
          { status: 201 }
        )
      );

    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));
    fireEvent.change(screen.getByLabelText("Form title"), { target: { value: "Custom Intake" } });
    fireEvent.change(screen.getByLabelText("Form description"), { target: { value: "Custom description" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Draft saved.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Custom Intake")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms/form_created_1/versions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Full Legal Name")
      })
    );
  });

  it("updates an existing persisted form before saving a new version", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "form_api_1",
                name: "Persisted Weekly Check-In",
                description: "Persisted description",
                type: "check-in",
                status: "draft",
                currentVersionId: null,
                updatedAt: "not-a-date",
                createdAt: "2026-05-14T00:00:00.000Z"
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "form_api_1",
              name: "Persisted Weekly Check-In",
              description: "Persisted description",
              type: "check-in",
              status: "draft",
              currentVersionId: null,
              updatedAt: "not-a-date",
              createdAt: "2026-05-14T00:00:00.000Z",
              versions: [
                {
                  id: "version_existing",
                  formId: "form_api_1",
                  versionNumber: 1,
                  schema: {
                    title: "Persisted Weekly Check-In",
                    description: "Persisted description",
                    fields: [
                      {
                        id: "saved-field-1",
                        type: "short-text",
                        label: "Saved field",
                        placeholder: "Saved placeholder",
                        required: true
                      }
                    ]
                  },
                  ui: { primaryColor: "#10b981", successMessage: "Saved success message" },
                  publishedAt: null,
                  createdAt: "2026-05-14T00:00:00.000Z"
                }
              ]
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "form_api_1",
              name: "Updated Persisted Form",
              description: "Persisted description",
              type: "check-in",
              status: "draft",
              currentVersionId: null,
              updatedAt: "2026-05-14T00:00:00.000Z",
              createdAt: "2026-05-14T00:00:00.000Z"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "version_2",
              formId: "form_api_1",
              versionNumber: 2,
              schema: { title: "Updated Persisted Form", fields: [] },
              ui: {},
              publishedAt: null,
              createdAt: "2026-05-14T00:00:00.000Z"
            }
          }),
          { status: 201 }
        )
      );

    render(createElement(FormsPage));

    expect(await screen.findByText("Persisted Weekly Check-In")).toBeInTheDocument();
    expect(screen.getByText(/recently/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Persisted Weekly Check-In"));
    expect(await screen.findByDisplayValue("Saved field")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Form title"), { target: { value: "Updated Persisted Form" } });
    fireEvent.change(screen.getByLabelText("Field label"), { target: { value: "Updated saved field" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Draft saved.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms/form_api_1",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("Updated Persisted Form")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms/form_api_1/versions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Updated saved field")
      })
    );
  });

  it("loads saved form fields and preview settings when editing a persisted form", async () => {
    vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "form_api_2",
                name: "Saved Intake",
                description: "Saved metadata description",
                type: "intake",
                status: "draft",
                currentVersionId: null,
                updatedAt: "2026-05-14T00:00:00.000Z",
                createdAt: "2026-05-14T00:00:00.000Z"
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "form_api_2",
              name: "Saved Intake",
              description: "Saved metadata description",
              type: "intake",
              status: "draft",
              currentVersionId: null,
              updatedAt: "2026-05-14T00:00:00.000Z",
              createdAt: "2026-05-14T00:00:00.000Z",
              versions: [
                {
                  id: "version_saved_2",
                  formId: "form_api_2",
                  versionNumber: 3,
                  schema: {
                    title: "Saved Intake Version",
                    description: "Saved version description",
                    fields: [
                      {
                        id: "saved-email",
                        type: "email",
                        label: "Saved email",
                        placeholder: "saved@example.com",
                        required: true
                      }
                    ]
                  },
                  ui: { primaryColor: "#f97316", successMessage: "Saved version success" },
                  publishedAt: null,
                  createdAt: "2026-05-14T00:00:00.000Z"
                }
              ]
            }
          }),
          { status: 200 }
        )
      );

    render(createElement(FormsPage));

    expect(await screen.findByText("Saved Intake")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Saved Intake"));

    expect(await screen.findByDisplayValue("Saved Intake Version")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Saved email")).toBeInTheDocument();
    expect(screen.getByDisplayValue("saved@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText("Required field")).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Preview Form" }));

    const dialog = screen.getByRole("dialog", { name: "Saved Intake Version preview" });
    expect(within(dialog).getByText("Saved version description")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Saved email *")).toHaveAttribute("placeholder", "saved@example.com");
    expect(within(dialog).getByText("Saved version success")).toBeInTheDocument();
  });

  it("shows a save error when form persistence fails", async () => {
    vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: {} }), { status: 503 }));

    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Form could not be saved");
  });

  it("publishes and assigns a form to a client", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "client_1",
                name: "API Client",
                packageName: "Coaching",
                compliance: 90,
                checkInDay: "Monday",
                latestCheckIn: "May 1, 2026",
                status: "active",
                startDate: "May 1, 2026",
                initials: "AC",
                avatarColor: "bg-slate-900"
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
              id: "form_created_1",
              name: "Custom Intake",
              description: "Custom description",
              type: "intake",
              status: "draft",
              currentVersionId: null,
              createdAt: "2026-05-14T00:00:00.000Z",
              updatedAt: "2026-05-14T00:00:00.000Z"
            }
          }),
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "version_1",
              formId: "form_created_1",
              versionNumber: 1,
              schema: { title: "Custom Intake", fields: [] },
              ui: {},
              publishedAt: null,
              createdAt: "2026-05-14T00:00:00.000Z"
            }
          }),
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "form_created_1",
              name: "Custom Intake",
              description: "Custom description",
              type: "intake",
              status: "published",
              currentVersionId: "version_1",
              createdAt: "2026-05-14T00:00:00.000Z",
              updatedAt: "2026-05-14T00:00:00.000Z"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "assignment_1",
              formId: "form_created_1",
              formVersionId: "version_1",
              clientId: "client_1",
              status: "assigned",
              dueAt: null,
              completedAt: null,
              createdAt: "2026-05-14T00:00:00.000Z"
            }
          }),
          { status: 201 }
        )
      );

    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));
    fireEvent.change(screen.getByLabelText("Form title"), { target: { value: "Custom Intake" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish Form" }));

    expect(await screen.findByText("Form published and ready for assignment.")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByLabelText("Assign to client")).toHaveValue("client_1"));
    fireEvent.click(screen.getByRole("button", { name: "Assign Form" }));

    expect(await screen.findByText("Form assigned to selected client.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms/form_created_1/publish",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms/form_created_1/assignments",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("client_1")
      })
    );
  });
});
