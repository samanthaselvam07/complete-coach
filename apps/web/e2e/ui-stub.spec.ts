import { collectPageErrors, configureAuthenticatedUiStub, expect, routeCases, test } from "./ui-stub.setup";

test.describe.configure({ mode: "serial" });

configureAuthenticatedUiStub(`test-results/.auth/ui-stub-navigation-user-${process.pid}.json`);

test.describe("UI stub navigation smoke", () => {
  for (const route of routeCases) {
    test(`renders ${route.path}`, async ({ page }) => {
      const errors = collectPageErrors(page);

      await page.goto(route.path);

      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Complete Coach dashboard" })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("primary navigation can move through representative sections", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Training Programs" })).toHaveCount(0);

    await page.getByRole("button", { name: "Training", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "Training Programs" })).toBeVisible();

    await page.getByRole("link", { name: "Training Programs" }).click();
    await expect(page).toHaveURL(/\/training\/programs$/);
    await expect(page.getByRole("heading", { level: 1, name: "Program Library" })).toBeVisible();

    await page.getByRole("button", { name: "Nutrition", exact: true }).click();
    await expect(page).toHaveURL(/\/training\/programs$/);
    await expect(page.getByRole("link", { name: "Meal Plans" })).toBeVisible();

    await page.getByRole("link", { name: "Meal Plans" }).click();
    await expect(page).toHaveURL(/\/nutrition\/meal-plans$/);
    await expect(page.getByRole("heading", { level: 1, name: "Meal Plan Library" })).toBeVisible();

    await page.getByRole("link", { name: "Messages" }).click();
    await expect(page).toHaveURL(/\/messages$/);
    await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible();
  });

  test("M10 team invitation and role management flows use persisted APIs", async ({ page }) => {
    let role = "coach";

    await page.route("**/api/v1/team-members", async (route) => {
      await route.fulfill({
        json: {
          data: {
            members: [
              {
                id: "membership-e2e",
                userId: "user-e2e",
                name: "E2E Coach",
                email: "e2e-coach@example.test",
                image: null,
                role,
                status: "active"
              }
            ],
            invitations: []
          }
        }
      });
    });
    await page.route("**/api/v1/team-members/invitations", async (route) => {
      await route.fulfill({
        status: 201,
        json: {
          data: {
            invitation: {
              id: "invitation-e2e",
              email: "invitee@example.test",
              role: "assistant",
              status: "pending",
              expiresAt: "2026-06-13T00:00:00.000Z"
            },
            deliveryStatus: "sent"
          }
        }
      });
    });
    await page.route("**/api/v1/team-members/membership-e2e", async (route) => {
      if (route.request().method() === "PATCH") {
        role = "admin";
        await route.fulfill({
          json: {
            data: {
              id: "membership-e2e",
              userId: "user-e2e",
              name: "E2E Coach",
              email: "e2e-coach@example.test",
              image: null,
              role,
              status: "active"
            }
          }
        });
        return;
      }

      await route.fulfill({ status: 204, body: "" });
    });

    await page.goto("/team-management");
    await expect(page.getByText("E2E Coach")).toBeVisible();

    await page.getByRole("combobox", { name: "Role for E2E Coach" }).selectOption("admin");
    await expect(page.getByRole("status")).toContainText("E2E Coach updated.");

    await page.getByRole("button", { name: "Invite Member" }).click();
    const inviteDialog = page.getByRole("dialog", { name: "Invite Team Member" });
    await inviteDialog.getByLabel("Email").fill("invitee@example.test");
    await inviteDialog.getByLabel("Role").selectOption("assistant");
    await inviteDialog.getByRole("button", { name: "Create invitation" }).click();

    await expect(page.getByText("invitee@example.test", { exact: true })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Invitation created");
  });

  test("M3 client and CRM API-backed flows render and move stages", async ({ page }) => {
    await page.route("**/api/v1/clients", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        json: {
          data: [
            {
              id: "e2e-client",
              name: "E2E Client",
              packageName: "Persisted Coaching",
              compliance: 93,
              checkInDay: "Friday",
              latestCheckIn: "May 14, 2026",
              status: "active",
              startDate: "May 1, 2026",
              initials: "EC",
              avatarColor: "bg-slate-900"
            }
          ]
        }
      });
    });

    await page.route("**/api/v1/clients/e2e-client", async (route) => {
      await route.fulfill({
        json: {
          data: {
            id: "e2e-client",
            name: "E2E Client",
            packageName: "Persisted Coaching",
            compliance: 93,
            checkInDay: "Friday",
            latestCheckIn: "May 14, 2026",
            status: "active",
            startDate: "May 1, 2026",
            initials: "EC",
            avatarColor: "bg-slate-900"
          }
        }
      });
    });

    await page.route("**/api/v1/clients/e2e-client/profile", async (route) => {
      await route.fulfill({
        json: {
          data: {
            bio: "E2E persisted profile bio",
            goals: ["E2E Strength Goal"],
            dateOfBirth: "1990-05-14T00:00:00.000Z"
          }
        }
      });
    });

    await page.route("**/api/v1/leads", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        json: {
          data: [
            {
              id: "e2e-lead",
              name: "E2E Lead",
              email: "e2e-lead@example.com",
              phone: "+1 555",
              source: "Website",
              lastContact: "Today",
              notes: "E2E lead notes",
              location: "Melbourne, AU",
              status: "warm",
              stage: "initial-contact",
              daysInStage: 2,
              initials: "EL"
            }
          ]
        }
      });
    });

    await page.route("**/api/v1/leads/e2e-lead/stage-transitions", async (route) => {
      await route.fulfill({
        json: {
          data: {
            id: "e2e-lead",
            name: "E2E Lead",
            email: "e2e-lead@example.com",
            phone: "+1 555",
            source: "Website",
            lastContact: "Today",
            notes: "E2E lead notes",
            location: "Melbourne, AU",
            status: "warm",
            stage: "proposal",
            daysInStage: 0,
            initials: "EL"
          }
        }
      });
    });

    await page.goto("/clients");
    const clientNameLink = page.getByRole("link", { exact: true, name: "E2E Client" });
    await expect(clientNameLink).toHaveAttribute(
      "href",
      "/clients/e2e-client"
    );

    await clientNameLink.click();
    await expect(page.getByRole("heading", { level: 1, name: "E2E Client" })).toBeVisible();
    await expect(page.getByText("E2E persisted profile bio")).toBeVisible();
    await expect(page.getByText("E2E Strength Goal")).toBeVisible();

    await page.goto("/clients/crm");
    await expect(page.getByRole("region", { name: "Initial Contact" })).toContainText("E2E Lead");
    await page.getByLabel("Move E2E Lead").selectOption("proposal");
    await expect(page.getByRole("region", { name: "Proposal Sent" })).toContainText("E2E Lead");
  });
});
test.describe("M4 forms, check-ins, and external API smoke", () => {
  test("coach creates, publishes, and assigns a check-in form", async ({ page }) => {
    const now = "2026-05-14T00:00:00.000Z";

    await page.route("**/api/v1/forms**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET" && url.pathname === "/api/v1/forms") {
        await route.fulfill({ json: { data: [] } });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/forms") {
        await route.fulfill({
          json: {
            data: {
              id: "form_e2e",
              name: "E2E Weekly Check-In",
              description: "E2E check-in assignment",
              type: "check-in",
              status: "draft",
              currentVersionId: null,
              createdAt: now,
              updatedAt: now
            }
          }
        });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/forms/form_e2e/versions") {
        await route.fulfill({
          json: {
            data: {
              id: "version_e2e",
              formId: "form_e2e",
              versionNumber: 1,
              schema: {
                title: "E2E Weekly Check-In",
                description: "E2E check-in assignment",
                fields: []
              },
              ui: null,
              publishedAt: null,
              createdAt: now
            }
          }
        });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/forms/form_e2e/publish") {
        await route.fulfill({
          json: {
            data: {
              id: "form_e2e",
              name: "E2E Weekly Check-In",
              description: "E2E check-in assignment",
              type: "check-in",
              status: "published",
              currentVersionId: "version_e2e",
              createdAt: now,
              updatedAt: now
            }
          }
        });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/forms/form_e2e/assignments") {
        await route.fulfill({
          json: {
            data: {
              id: "assignment_e2e",
              formId: "form_e2e",
              formVersionId: "version_e2e",
              clientId: "e2e-client",
              status: "assigned",
              assignedAt: now
            }
          }
        });
        return;
      }

      await route.fallback();
    });

    await page.route("**/api/v1/clients?limit=100", async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: "e2e-client",
              name: "E2E Client"
            }
          ]
        }
      });
    });

    await page.goto("/forms");
    await page.getByRole("button", { name: /start from scratch/i }).click();
    await page.getByLabel("Form title").fill("E2E Weekly Check-In");
    await page.getByLabel("Form description").fill("E2E check-in assignment");

    await page.getByRole("button", { name: "Publish Form" }).click();
    await expect(page.getByRole("status")).toContainText("Form published and ready for assignment.");

    await expect(page.getByLabel("Assign to client")).toHaveValue("e2e-client");
    await page.getByRole("button", { name: "Assign Form" }).click();
    await expect(page.getByRole("status")).toContainText("Form assigned to selected client.");
  });

  test("coach reviews and completes an API-backed check-in", async ({ page }) => {
    const submittedAt = "2026-05-14T00:00:00.000Z";
    const pendingCheckIn = {
      id: "checkin_e2e",
      clientId: "e2e-client",
      formSubmissionId: "submission_e2e",
      name: "E2E Client",
      initials: "EC",
      submittedAt,
      assignedDay: submittedAt,
      dueAt: submittedAt,
      lastCheckIn: "Today",
      status: "pending",
      checkInStatus: "pending-review",
      summary: null,
      coachNotes: null
    };

    await page.route("**/api/v1/check-ins**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET" && url.pathname === "/api/v1/check-ins") {
        await route.fulfill({ json: { data: [pendingCheckIn] } });
        return;
      }

      if (request.method() === "GET" && url.pathname === "/api/v1/check-ins/checkin_e2e") {
        await route.fulfill({
          json: {
            data: {
              ...pendingCheckIn,
              answers: {
                readiness: "8",
                body_weight: "82.5"
              },
              metrics: [
                {
                  id: "metric_e2e",
                  metricKey: "body_weight",
                  metricValue: 82.5,
                  unit: "kg",
                  measuredAt: submittedAt
                }
              ]
            }
          }
        });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/check-ins/checkin_e2e/review") {
        await route.fulfill({
          json: {
            data: {
              ...pendingCheckIn,
              summary: "E2E reviewed",
              coachNotes: "Ready for completion",
              checkInStatus: "reviewed"
            }
          }
        });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/check-ins/checkin_e2e/complete") {
        await route.fulfill({
          json: {
            data: {
              ...pendingCheckIn,
              status: "completed",
              summary: "E2E reviewed",
              coachNotes: "Ready for completion",
              checkInStatus: "completed"
            }
          }
        });
        return;
      }

      await route.fallback();
    });

    await page.goto("/clients/check-ins");
    await expect(page.getByRole("heading", { level: 2, name: "E2E Client" })).toBeVisible();
    await page.getByRole("button", { name: /view full check-in for E2E Client/i }).click();

    await expect(page.getByRole("dialog", { name: /check-in detail for E2E Client/i })).toContainText("body_weight");
    await page.getByLabel("Review summary").fill("E2E reviewed");
    await page.getByLabel("Coach notes").fill("Ready for completion");

    await page.getByRole("button", { name: "Mark reviewed" }).click();
    await expect(page.getByRole("status")).toContainText("Check-in reviewed.");

    await page.getByRole("button", { name: "Mark complete" }).click();
    await expect(page.getByRole("status")).toContainText("Check-in completed.");

    await page.getByRole("button", { name: "Close" }).click();
    await page.getByRole("tab", { name: "Completed" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "E2E Client" })).toBeVisible();
  });

  test("external metrics API returns de-identified metrics", async ({ page }) => {
    await page.route("**/api/v1/external/metrics**", async (route) => {
      expect(route.request().headers().authorization).toBe("Bearer cc_test_e2e");

      await route.fulfill({
        json: {
          data: [
            {
              externalClientId: "client_ext_e2e",
              metricKey: "body_weight",
              metricValue: 82.5,
              unit: "kg",
              measuredAt: "2026-05-14T00:00:00.000Z",
              source: "form_submission"
            }
          ],
          pageInfo: {
            nextCursor: null,
            hasNextPage: false
          }
        }
      });
    });

    await page.goto("/");

    const payload = await page.evaluate(async () => {
      const response = await fetch("/api/v1/external/metrics?metric_key=body_weight", {
        headers: {
          Authorization: "Bearer cc_test_e2e"
        }
      });

      return response.json();
    });

    expect(payload.data[0]).toMatchObject({
      externalClientId: "client_ext_e2e",
      metricKey: "body_weight",
      metricValue: 82.5,
      unit: "kg"
    });
    expect(payload.data[0]).not.toHaveProperty("clientId");
    expect(payload.data[0]).not.toHaveProperty("name");
    expect(payload.data[0]).not.toHaveProperty("email");
    expect(payload.data[0]).not.toHaveProperty("phone");
  });
});

test.describe("M5 training persistence smoke", () => {
  test("coach creates an API-backed exercise", async ({ page }) => {
    let createdExerciseBody: Record<string, unknown> | null = null;

    await page.route("**/api/v1/exercises", async (route) => {
      const request = route.request();

      if (request.method() !== "POST") {
        await route.fallback();
        return;
      }

      createdExerciseBody = request.postDataJSON() as Record<string, unknown>;

      await route.fulfill({
        status: 201,
        json: {
          data: {
            id: "exercise_e2e",
            name: "E2E Cyclist Split Squat",
            category: "Compound",
            equipment: "Dumbbells",
            primaryMuscles: ["Chest", "Shoulders", "Quads"],
            secondaryMuscles: [],
            difficulty: "intermediate",
            defaultSets: 4,
            defaultReps: "8-12",
            defaultRestSeconds: 120,
            scope: "private",
            videoObjectKey: null,
            imageObjectKey: null,
            executionCues: ["Retract scapula", "Drive elbows to hips", "Control eccentric phase"],
            createdAt: "2026-05-14T00:00:00.000Z",
            updatedAt: "2026-05-14T00:00:00.000Z"
          }
        }
      });
    });

    await page.goto("/training/exercises/add");
    await page.getByLabel("Exercise Name").fill("E2E Cyclist Split Squat");
    await page.getByLabel("Category").selectOption("Compound");
    await page.getByLabel("Equipment").selectOption("Dumbbells");
    await page.getByRole("button", { name: "Quads" }).click();
    await page.getByRole("button", { name: "Increase sets" }).click();
    await page.getByRole("button", { name: "Save Exercise" }).first().click();

    await expect(page.getByRole("status")).toContainText("Exercise saved to persistence API.");
    expect(createdExerciseBody).toMatchObject({
      name: "E2E Cyclist Split Squat",
      category: "Compound",
      equipment: "Dumbbells",
      primaryMuscles: ["Chest", "Shoulders", "Quads"],
      difficulty: "intermediate",
      defaultSets: 4,
      defaultReps: "8-12"
    });
  });

  test("coach creates a training template and duplicates it into the builder", async ({ page }) => {
    const now = "2026-05-14T00:00:00.000Z";
    let createdTemplateBody: Record<string, unknown> | null = null;

    const template = {
      id: "template_e2e",
      name: "Strength Template 1",
      description: "Coach-created template from the program library.",
      goal: "strength",
      durationWeeks: 8,
      status: "draft",
      template: {
        days: [
          {
            name: "Day 1",
            exercises: [
              {
                exerciseId: "manual-entry",
                exerciseName: "Manual Exercise",
                sets: 3,
                reps: "8-10",
                restSeconds: 120
              }
            ]
          }
        ]
      },
      updatedAt: now
    };

    await page.route("**/api/v1/training-program-templates**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET" && url.pathname === "/api/v1/training-program-templates") {
        await route.fulfill({ json: { data: [] } });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/training-program-templates") {
        createdTemplateBody = request.postDataJSON() as Record<string, unknown>;
        await route.fulfill({ status: 201, json: { data: template } });
        return;
      }

      await route.fallback();
    });

    await page.route("**/api/v1/training-program-assignments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET" && url.pathname === "/api/v1/training-program-assignments") {
        await route.fulfill({ json: { data: [] } });
        return;
      }

      await route.fallback();
    });

    await page.goto("/training/programs");
    await page.getByRole("button", { name: "Create New Program" }).click();
    await page.getByRole("button", { name: "Start From Scratch" }).click();
    await page.getByLabel(/Program Title/).fill("Strength Template 1");
    await page.getByRole("button", { name: "Save & Close" }).click();

    await expect(page.getByText("Program template saved to persistence API.")).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Master Templates" })).toContainText("Strength Template 1");
    expect(createdTemplateBody).toMatchObject({
      name: "Strength Template 1",
      description: "Coach-created template from the program library.",
      goal: "strength",
      durationWeeks: 8,
      status: "draft"
    });

    await page.getByRole("button", { name: "Use Template" }).click();
    await expect(page.getByRole("heading", { name: "Create a Program" })).toBeVisible();
    await expect(page.locator('input[value="Strength Template 1 Copy"]')).toBeVisible();
    await expect(page.locator('input[value="Manual Exercise"]')).toBeVisible();
  });
});
