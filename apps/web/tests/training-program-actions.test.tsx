import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrainingProgramsPage } from "@/components/training/training-programs-page";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TrainingProgramsPage quick actions", () => {
  it("renames tabs, searches custom programs, copies programs, deletes programs, and closes menus by clicking away", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(createElement(TrainingProgramsPage));

    expect(await screen.findByRole("tab", { name: "Custom programs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Program templates" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /filters/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search custom programs" }), {
      target: { value: "functional" }
    });

    expect(screen.getByText("Functional Power")).toBeInTheDocument();
    expect(screen.queryByText("Hypertrophy Phase II")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search custom programs" }), {
      target: { value: "" }
    });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Hypertrophy Phase II" }));

    expect(screen.getByRole("menu", { name: "Actions for Hypertrophy Phase II" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close training program actions" }));

    expect(screen.queryByRole("menu", { name: "Actions for Hypertrophy Phase II" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More actions for Hypertrophy Phase II" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "Actions for Hypertrophy Phase II" })).getByRole("menuitem", { name: "Copy" }));

    expect(screen.getByText("Hypertrophy Phase II (copy)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More actions for Hypertrophy Phase II" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "Actions for Hypertrophy Phase II" })).getByRole("menuitem", { name: "Delete" }));

    expect(screen.queryByText("Hypertrophy Phase II")).not.toBeInTheDocument();
    expect(screen.getByText("Hypertrophy Phase II deleted from the training library.")).toBeInTheDocument();
  });

  it("assigns a custom program from a searchable client roster with a duration", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(createElement(TrainingProgramsPage));

    fireEvent.click(await screen.findByRole("button", { name: "More actions for Functional Power" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "Actions for Functional Power" })).getByRole("menuitem", { name: "Assign to" }));

    expect(screen.getByRole("dialog", { name: "Assign Training Program" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search clients"), { target: { value: "Emma" } });

    expect(screen.getByRole("option", { name: /Emma Thompson/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Marcus Rodriguez/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: /Emma Thompson/i }));
    fireEvent.change(screen.getByLabelText(/Program duration/i), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign Program" }));

    expect(screen.getByText("Functional Power assigned to Emma Thompson.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Assign Training Program" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Functional Power").length).toBeGreaterThan(0);
  });

  it("loads API clients in the assignment dialog and closes without assigning", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input) === "/api/v1/clients?status=active&limit=100") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "client_api",
                  name: "API Client",
                  packageName: "Elite Package",
                  compliance: 91,
                  checkInDay: "Monday",
                  latestCheckIn: "Today",
                  status: "active",
                  startDate: "May 1, 2026",
                  initials: "AC",
                  avatarColor: "bg-indigo-600"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.reject(new Error("API unavailable"));
    });

    render(createElement(TrainingProgramsPage));

    fireEvent.click(await screen.findByRole("button", { name: "More actions for Functional Power" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "Actions for Functional Power" })).getByRole("menuitem", { name: "Assign to" }));

    expect(await screen.findByRole("option", { name: /API Client/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Assign Training Program" })).not.toBeInTheDocument();
  });

  it("applies quick actions to program templates and deletes persisted templates through the API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.startsWith("/api/v1/training-program-templates/template_api") && init?.method === "DELETE") {
        return Promise.resolve(new Response(JSON.stringify({ data: { id: "template_api", deleted: true } }), { status: 200 }));
      }

      if (url.startsWith("/api/v1/training-program-templates")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: "template_api",
                  name: "Persisted Strength Foundation",
                  description: "API-backed training template",
                  goal: "strength",
                  durationWeeks: 8,
                  status: "published",
                  template: {
                    days: [
                      {
                        name: "Upper Strength",
                        exercises: [
                          {
                            exerciseId: "bench_press",
                            exerciseName: "Bench Press",
                            sets: 3,
                            reps: "5",
                            restSeconds: 180,
                            rpe: "8",
                            rir: "2",
                            section: "workout"
                          }
                        ]
                      }
                    ],
                    instructions: "Keep one rep in reserve."
                  },
                  updatedAt: "2026-05-14T00:00:00.000Z"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(TrainingProgramsPage));

    fireEvent.click(await screen.findByRole("tab", { name: "Program templates" }));
    fireEvent.click(screen.getByRole("button", { name: "More actions for Persisted Strength Foundation" }));

    const menu = screen.getByRole("menu", { name: "Actions for Persisted Strength Foundation" });
    expect(within(menu).getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Assign to" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();

    fireEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/training-program-templates/template_api", {
        method: "DELETE"
      })
    );
    expect(screen.queryByText("Persisted Strength Foundation")).not.toBeInTheDocument();
  });

  it("copies and edits program templates from quick actions", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));

    render(createElement(TrainingProgramsPage));

    fireEvent.click(await screen.findByRole("tab", { name: "Program templates" }));
    fireEvent.click(screen.getByRole("button", { name: "More actions for Body Recomp v3" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "Actions for Body Recomp v3" })).getByRole("menuitem", { name: "Copy" }));

    expect(screen.getByText("Body Recomp v3 (copy)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More actions for Body Recomp v3" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "Actions for Body Recomp v3" })).getByRole("menuitem", { name: "Edit" }));

    expect(screen.getByRole("heading", { level: 1, name: "Create a Program" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Body Recomp v3")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12")).toBeInTheDocument();
  });

  it("saves builder duration and exposes a save-as-template action", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/training-program-templates" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: "template_created",
                name: "Duration Test Build",
                description: "Coach-created template from the program library.",
                goal: "custom",
                durationWeeks: 16,
                status: "draft",
                template: { days: [] },
                updatedAt: "2026-05-14T00:00:00.000Z"
              }
            }),
            { status: 201 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(createElement(TrainingProgramsPage));

    fireEvent.click(screen.getByRole("button", { name: "Create New Program" }));
    fireEvent.click(screen.getByRole("button", { name: "Start From Scratch" }));
    fireEvent.change(screen.getByLabelText(/Program Title/i), { target: { value: "Duration Test Build" } });
    fireEvent.change(screen.getByLabelText(/Program Duration/i), { target: { value: "16" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as Template" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/training-program-templates",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"durationWeeks\":16")
        })
      )
    );
    expect(await screen.findByText("Program template saved.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
});
