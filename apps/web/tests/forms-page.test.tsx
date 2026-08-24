import { fireEvent, render, screen, within } from "@testing-library/react";
import { act, createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormsPage } from "@/components/forms/forms-page";

describe("FormsPage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mockClipboard() {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });

    return writeText;
  }

  it("opens the builder from a template", () => {
    render(createElement(FormsPage));

    expect(screen.getByRole("heading", { level: 1, name: "Create a New Form" })).toBeInTheDocument();
    expect(screen.queryByText("WEIGHT TRACKING")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /use check-in forms template/i }));

    const dialog = screen.getByRole("dialog", { name: /check-in forms preset checklist/i });
    expect(within(dialog).getByText("Training performance this week")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Continue to builder" }));

    expect(screen.getByRole("heading", { level: 1, name: "Form Builder" })).toBeInTheDocument();
    expect(screen.getByText("Check-in Forms")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Training performance this week")).toBeInTheDocument();
  });

  it("opens the initial questionnaire preset and lets coaches choose included questions", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /use initial client questionnaire template/i }));

    const dialog = screen.getByRole("dialog", { name: /initial client questionnaire preset checklist/i });
    expect(within(dialog).getByRole("region", { name: "Personal Details" })).toBeInTheDocument();
    expect(within(dialog).getByText("What is your primary health or fitness goal?")).toBeInTheDocument();
    expect(within(dialog).getByText("How many days per week can you realistically train?")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByText("List any foods you strongly dislike."));
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue to builder" }));

    const preview = screen.getByRole("region", { name: "Form preview" });

    expect(screen.getByDisplayValue("Initial Client Questionnaire")).toBeInTheDocument();
    expect(within(preview).getByText("What is your primary health or fitness goal?")).toBeInTheDocument();
    expect(within(preview).getByText("How many days per week can you realistically train?")).toBeInTheDocument();
    expect(within(preview).queryByText("List any foods you strongly dislike.")).not.toBeInTheDocument();
  });

  it("opens the terms and conditions builder from the template card", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /use terms and conditions template/i }));

    const dialog = screen.getByRole("dialog", { name: /terms and conditions preset checklist/i });
    expect(within(dialog).getByText("Online Coaching Agreement and Terms of Service")).toBeInTheDocument();
    expect(within(dialog).getByText("Terms confirmation")).toBeInTheDocument();
    expect(within(dialog).queryByText("I agree to the Privacy Policy")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue to builder" }));

    expect(screen.getByRole("heading", { level: 1, name: "Form Builder" })).toBeInTheDocument();
    expect(screen.getByText("Terms and Conditions")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Online Coaching Agreement and Terms of Service")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Coach \/ Business: \[BUSINESS NAME\]/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Terms confirmation")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("I confirm I have read and agree to the Terms of Service and Coaching Agreement above")
    ).toBeInTheDocument();
    expect(screen.queryByDisplayValue("I agree to the Privacy Policy")).not.toBeInTheDocument();
  });

  it("lets coaches choose preset fields before customizing a template form", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /use contact forms template/i }));

    const dialog = screen.getByRole("dialog", { name: /contact forms preset checklist/i });
    expect(within(dialog).getByText("Email address")).toBeInTheDocument();
    expect(within(dialog).getByText("Phone number")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByLabelText(/phone number/i));
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue to builder" }));

    expect(screen.getByRole("heading", { level: 1, name: "Form Builder" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Email address")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Phone number")).not.toBeInTheDocument();
  });

  it("opens the initial questionnaire preset and lets coaches choose included questions", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /use initial client questionnaire template/i }));

    const preview = screen.getByRole("region", { name: "Form preview" });

    expect(screen.getByDisplayValue("Initial Client Questionnaire")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Initial questionnaire questions" })).toBeInTheDocument();
    expect(within(preview).getByText("What is your primary health or fitness goal?")).toBeInTheDocument();
    expect(within(preview).getByText("How many days per week can you realistically train?")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("List any foods you strongly dislike."));

    expect(within(preview).queryByText("List any foods you strongly dislike.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("List any foods you strongly dislike."));

    expect(within(preview).getByText("List any foods you strongly dislike.")).toBeInTheDocument();
  });

  it("adds, removes, and reorders form fields locally", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));

    expect(screen.getByLabelText("Form title")).toHaveValue("New form");

    const preview = screen.getByRole("region", { name: "Form preview" });
    expect(within(preview).queryByTestId("form-field")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Short Text field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Email field" }));
    expect(within(preview).getByText("New short text field")).toBeInTheDocument();
    expect(within(preview).getByText("New email field")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Move New email field up" }));
    const fieldsAfterMove = within(preview).getAllByTestId("form-field");
    expect(within(fieldsAfterMove[0]).getByText("New email field")).toBeInTheDocument();

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
    fireEvent.click(within(appendedField!).getByRole("button", { name: "Add option" }));
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

  it("previews choice, dropdown, checkbox, long text, photo, phone, date, number, and time fields", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));
    fireEvent.change(screen.getByLabelText("Form title"), { target: { value: "Field Type Preview" } });

    fireEvent.click(screen.getByRole("button", { name: "Add Long Text field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Dropdown field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Checkbox field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Phone Number field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Date of Birth field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Number field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Time field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Photo Upload field" }));

    const preview = screen.getByRole("region", { name: "Form preview" });
    const fields = within(preview).getAllByTestId("form-field");
    const longTextField = fields.at(-8);
    const dropdownField = fields.at(-7);
    const checkboxField = fields.at(-6);
    const phoneField = fields.at(-5);
    const dateField = fields.at(-4);
    const numberField = fields.at(-3);
    const timeField = fields.at(-2);
    const photoField = fields.at(-1);

    expect(longTextField).toBeDefined();
    expect(dropdownField).toBeDefined();
    expect(checkboxField).toBeDefined();
    expect(phoneField).toBeDefined();
    expect(dateField).toBeDefined();
    expect(numberField).toBeDefined();
    expect(timeField).toBeDefined();
    expect(photoField).toBeDefined();

    fireEvent.change(within(longTextField!).getByLabelText("Field label"), { target: { value: "Training notes" } });
    fireEvent.change(within(dropdownField!).getByLabelText("Field label"), { target: { value: "Primary goal" } });
    fireEvent.change(within(dropdownField!).getByLabelText("Option 1"), { target: { value: "Strength" } });
    fireEvent.change(within(checkboxField!).getByLabelText("Field label"), { target: { value: "Completed habits" } });
    fireEvent.click(within(checkboxField!).getByRole("button", { name: /remove option 1 from completed habits/i }));
    fireEvent.change(within(checkboxField!).getByLabelText("Option 1"), { target: { value: "Steps target" } });
    fireEvent.change(within(phoneField!).getByLabelText("Field label"), { target: { value: "Phone" } });
    fireEvent.change(within(dateField!).getByLabelText("Field label"), { target: { value: "Birth date" } });
    fireEvent.change(within(numberField!).getByLabelText("Field label"), { target: { value: "Sleep hours" } });
    fireEvent.change(within(timeField!).getByLabelText("Field label"), { target: { value: "Bedtime" } });
    fireEvent.change(within(photoField!).getByLabelText("Field label"), { target: { value: "Progress photo" } });

    fireEvent.click(screen.getByRole("button", { name: "Preview Form" }));

    const dialog = screen.getByRole("dialog", { name: "Field Type Preview preview" });
    expect(within(dialog).getByLabelText("Training notes")).toHaveProperty("tagName", "TEXTAREA");
    expect(within(dialog).getByLabelText("Primary goal")).toHaveProperty("tagName", "SELECT");
    expect(within(dialog).getByText("Completed habits")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Steps target")).toHaveAttribute("type", "checkbox");
    expect(within(dialog).getByLabelText("Phone")).toHaveAttribute("type", "tel");
    expect(within(dialog).getByLabelText("Birth date")).toHaveAttribute("type", "date");
    expect(within(dialog).getByLabelText("Sleep hours")).toHaveAttribute("type", "number");
    expect(within(dialog).getByLabelText("Bedtime")).toHaveAttribute("type", "time");
    expect(within(dialog).getByLabelText("Progress photo")).toHaveAttribute("type", "file");
  });

  it("adds radio button and rating fields", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));
    fireEvent.click(screen.getByRole("button", { name: "Add Radio Buttons field" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Rating out of 10 field" }));

    const preview = screen.getByRole("region", { name: "Form preview" });

    expect(within(preview).getByText("New radio buttons field")).toBeInTheDocument();
    expect(within(preview).getByText("New rating 10 field")).toBeInTheDocument();
  });

  it("drags form elements into the builder canvas", () => {
    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));

    const dragData = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: "copy",
      setData: (type: string, value: string) => dragData.set(type, value),
      getData: (type: string) => dragData.get(type) ?? ""
    };

    fireEvent.dragStart(screen.getByRole("button", { name: "Add Email field" }), { dataTransfer });
    fireEvent.drop(screen.getByRole("region", { name: "Form preview" }), { dataTransfer });

    expect(screen.getByDisplayValue("New email field")).toBeInTheDocument();
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

  it("filters persisted forms by form type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "form_check_in",
              name: "Persisted Weekly Check-In",
              description: null,
              type: "check-in",
              status: "published",
              currentVersionId: "version_check_in",
              updatedAt: "2026-05-14T00:00:00.000Z",
              createdAt: "2026-05-14T00:00:00.000Z"
            },
            {
              id: "form_habit",
              name: "Morning Habit Tracker",
              description: null,
              type: "habit-tracker",
              status: "published",
              currentVersionId: null,
              updatedAt: "2026-05-15T00:00:00.000Z",
              createdAt: "2026-05-15T00:00:00.000Z"
            },
            {
              id: "form_application",
              name: "Coaching Application",
              description: null,
              type: "application",
              status: "published",
              currentVersionId: null,
              updatedAt: "2026-05-16T00:00:00.000Z",
              createdAt: "2026-05-16T00:00:00.000Z"
            },
            {
              id: "form_contact",
              name: "Website Contact Form",
              description: null,
              type: "contact",
              status: "published",
              currentVersionId: null,
              updatedAt: "2026-05-17T00:00:00.000Z",
              createdAt: "2026-05-17T00:00:00.000Z"
            },
            {
              id: "form_terms",
              name: "Client Terms and Conditions",
              description: null,
              type: "terms-and-conditions",
              status: "published",
              currentVersionId: "version_terms",
              updatedAt: "2026-05-18T00:00:00.000Z",
              createdAt: "2026-05-18T00:00:00.000Z"
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(FormsPage));

    expect(await screen.findByText("Persisted Weekly Check-In")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Filter Contact Forms" }));

    expect(screen.getByText("Website Contact Form")).toBeInTheDocument();
    expect(screen.queryByText("Persisted Weekly Check-In")).not.toBeInTheDocument();
    expect(screen.queryByText("Client Terms and Conditions")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Filter Terms and Conditions" }));

    expect(screen.getByText("Client Terms and Conditions")).toBeInTheDocument();
    expect(screen.queryByText("Website Contact Form")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Filter All Forms" }));

    expect(screen.getByText("Persisted Weekly Check-In")).toBeInTheDocument();
    expect(screen.getByText("Website Contact Form")).toBeInTheDocument();
    expect(screen.getByText("Client Terms and Conditions")).toBeInTheDocument();
  });

  it("shows row quick actions for editing and copying the org form link", async () => {
    const writeText = mockClipboard();

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "form_application",
              name: "Coaching Application",
              description: "Application form",
              type: "application",
              status: "published",
              currentVersionId: "version_application",
              shareSlug: "application-share",
              shareUrlPath: "/forms/respond/application-share",
              updatedAt: "2026-05-18T00:00:00.000Z",
              createdAt: "2026-05-18T00:00:00.000Z"
            }
          ]
        }),
        { status: 200 }
      )
    );

    render(createElement(FormsPage));

    expect(await screen.findByText("Coaching Application")).toBeInTheDocument();
    expect(screen.getByText(/last edited/i)).toBeInTheDocument();
    expect(screen.queryByText(/published/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/draft/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open actions for Coaching Application" }));

    const menu = screen.getByRole("menu", { name: "Actions for Coaching Application" });
    expect(within(menu).getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Get link" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith("http://localhost:3000/forms/respond/application-share");
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
    expect(screen.getByText("Form link copied.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an empty persisted state when the forms API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: {} }), { status: 503 }));

    render(createElement(FormsPage));

    expect(await screen.findByText(/no persisted forms yet/i)).toBeInTheDocument();
    expect(screen.queryByText("Weekly Performance Log")).not.toBeInTheDocument();
    expect(screen.queryByText(/showing local sample forms/i)).not.toBeInTheDocument();
  });

  it("shows an empty persisted state when the forms API is available without records", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    render(createElement(FormsPage));

    expect(await screen.findByText(/no persisted forms yet/i)).toBeInTheDocument();
    expect(screen.queryByText("Weekly Performance Log")).not.toBeInTheDocument();
  });

  it("saves a published form and immutable version through the persistence API", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "form_created_1",
              name: "Custom Intake",
              description: "Custom description",
              type: "intake",
              status: "published",
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
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Form saved.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("heading", { level: 1, name: "Form Builder" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Create a New Form" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"status\":\"published\"")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms",
      expect.objectContaining({
        method: "POST",
        body: expect.not.stringContaining("\"status\":\"draft\"")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms/form_created_1/versions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"fields":[]')
      })
    );
  });

  it("omits blank option rows when saving new choice fields", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "form_choice_1",
              name: "Choice Intake",
              description: "Choice description",
              type: "intake",
              status: "published",
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
              id: "version_choice_1",
              formId: "form_choice_1",
              versionNumber: 1,
              schema: { title: "Choice Intake", description: "Choice description", fields: [] },
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
    fireEvent.change(screen.getByLabelText("Form title"), { target: { value: "Choice Intake" } });
    fireEvent.change(screen.getByLabelText("Form description"), { target: { value: "Choice description" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Multiple Choice field" }));
    fireEvent.change(screen.getByLabelText("Option 1"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Form saved.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms/form_choice_1/versions",
      expect.objectContaining({
        method: "POST",
        body: expect.not.stringContaining("\"options\"")
      })
    );
  });

  it("normalizes blank field labels before saving form fields", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "form_blank_label_1",
              name: "Blank Label Intake",
              description: null,
              type: "intake",
              status: "published",
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
              id: "version_blank_label_1",
              formId: "form_blank_label_1",
              versionNumber: 1,
              schema: { title: "Blank Label Intake", fields: [] },
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
    fireEvent.change(screen.getByLabelText("Form title"), { target: { value: "Blank Label Intake" } });
    fireEvent.change(screen.getByLabelText("Form description"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Add Short Text field" }));
    fireEvent.change(screen.getByLabelText("Field label"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Form saved.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms/form_blank_label_1/versions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"label\":\"Question 1\"")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms/form_blank_label_1/versions",
      expect.objectContaining({
        body: expect.not.stringContaining("\"description\"")
      })
    );
  });

  it("saves a form and returns to the form library when save and close is used", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "form_saved_close_1",
              name: "Application Form",
              description: "Application description",
              type: "application",
              status: "published",
              shareSlug: "application-form",
              shareUrlPath: "/forms/respond/application-form",
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
              id: "version_saved_close_1",
              formId: "form_saved_close_1",
              versionNumber: 1,
              schema: { title: "Application Form", description: "Application description", fields: [] },
              ui: { primaryColor: "#6366f1" },
              publishedAt: null,
              createdAt: "2026-05-14T00:00:00.000Z"
            }
          }),
          { status: 201 }
        )
      );

    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /use application forms template/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to builder" }));
    fireEvent.change(screen.getByLabelText("Form title"), { target: { value: "Application Form" } });
    fireEvent.change(screen.getByLabelText("Form description"), { target: { value: "Application description" } });
    fireEvent.click(screen.getByRole("button", { name: "Save and Close" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Create a New Form" })).toBeInTheDocument();
    expect(screen.getByText("Application Form")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Form Builder" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Application Form")
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/forms/form_saved_close_1/versions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Application description")
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
                status: "published",
                currentVersionId: null,
                updatedAt: "not-a-date",
                createdAt: "2026-05-14T00:00:00.000Z"
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
              id: "form_api_1",
              name: "Persisted Weekly Check-In",
              description: "Persisted description",
              type: "check-in",
              status: "published",
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
              status: "published",
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
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Form saved.")).toBeInTheDocument();
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
                status: "published",
                currentVersionId: null,
                updatedAt: "2026-05-14T00:00:00.000Z",
                createdAt: "2026-05-14T00:00:00.000Z"
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
              id: "form_api_2",
              name: "Saved Intake",
              description: "Saved metadata description",
              type: "intake",
              status: "published",
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
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Database is temporarily unavailable." } }), { status: 503 })
      );

    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Form details could not be saved. Database is temporarily unavailable."
    );
  });

  it("shows a specific save error when form fields cannot be persisted", async () => {
    vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "form_created_1",
              name: "Custom Intake",
              description: "Custom description",
              type: "intake",
              status: "published",
              currentVersionId: null,
              createdAt: "2026-05-14T00:00:00.000Z",
              updatedAt: "2026-05-14T00:00:00.000Z"
            }
          }),
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Request validation failed." } }), { status: 422 })
      );

    render(createElement(FormsPage));

    fireEvent.click(screen.getByRole("button", { name: /start from scratch/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Form fields could not be saved. Request validation failed."
    );
    expect(screen.getByRole("heading", { level: 1, name: "Form Builder" })).toBeInTheDocument();
  });

});
