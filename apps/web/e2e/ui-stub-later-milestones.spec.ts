import { configureAuthenticatedUiStub, expect, routeCases, test } from "./ui-stub.setup";

test.describe.configure({ mode: "serial" });

configureAuthenticatedUiStub(`test-results/.auth/ui-stub-later-milestones-user-${process.pid}.json`);

test.describe("M6 nutrition persistence smoke", () => {
  test("coach creates an API-backed food", async ({ page }) => {
    let createdFoodBody: Record<string, unknown> | null = null;

    await page.route("**/api/v1/foods**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET" && url.pathname === "/api/v1/foods") {
        await route.fulfill({ json: { data: [] } });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/foods") {
        createdFoodBody = request.postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 201,
          json: {
            data: {
              id: "food_e2e",
              scope: "private",
              name: "Coach Food 1",
              category: "Custom",
              servingSize: "100g",
              calories: 250,
              proteinGrams: 20,
              carbsGrams: 25,
              fatGrams: 8,
              fiberGrams: 0,
              metadata: {},
              createdAt: "2026-05-18T00:00:00.000Z",
              updatedAt: "2026-05-18T00:00:00.000Z"
            }
          }
        });
        return;
      }

      await route.fallback();
    });

    await page.goto("/nutrition/food-database");
    await expect(page.getByText("No persisted foods match the current filters.")).toBeVisible();
    await page.getByRole("button", { name: "Create New Food" }).click();

    await expect(page.getByText("Food saved to persistence API.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Food grid" })).toContainText("Coach Food 1");
    expect(createdFoodBody).toMatchObject({
      name: "Coach Food 1",
      category: "Custom",
      servingSize: "100g",
      calories: 250,
      proteinGrams: 20,
      carbsGrams: 25,
      fatGrams: 8
    });
  });

  test("coach creates a meal template and assigns it to a client", async ({ page }) => {
    const now = "2026-05-18T00:00:00.000Z";
    let createdTemplateBody: Record<string, unknown> | null = null;
    let createdAssignmentBody: Record<string, unknown> = {};

    const template = {
      id: "meal_template_e2e",
      name: "Performance Meal Template 1",
      phase: "Hypertrophy",
      targetCalories: 2800,
      proteinGrams: 210,
      carbsGrams: 280,
      fatGrams: 93,
      status: "draft",
      template: {
        days: [
          {
            name: "Day 1",
            meals: [
              {
                meal: "Breakfast",
                foods: [
                  {
                    foodName: "Coach-created protein oats",
                    servingSize: "1 bowl",
                    calories: 620,
                    proteinGrams: 42,
                    carbsGrams: 68,
                    fatGrams: 18
                  }
                ]
              }
            ]
          }
        ]
      },
      updatedAt: now
    };

    await page.route("**/api/v1/meal-plan-templates**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET" && url.pathname === "/api/v1/meal-plan-templates") {
        await route.fulfill({ json: { data: [] } });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/meal-plan-templates") {
        createdTemplateBody = request.postDataJSON() as Record<string, unknown>;
        await route.fulfill({ status: 201, json: { data: template } });
        return;
      }

      await route.fallback();
    });

    await page.route("**/api/v1/meal-plan-assignments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET" && url.pathname === "/api/v1/meal-plan-assignments") {
        await route.fulfill({ json: { data: [] } });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/meal-plan-assignments") {
        createdAssignmentBody = request.postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 201,
          json: {
            data: {
              id: "meal_assignment_e2e",
              clientId: "client_nutrition_e2e",
              clientName: "E2E Nutrition Client",
              templateId: "meal_template_e2e",
              name: "Performance Meal Template 1",
              phase: "Hypertrophy",
              targetCalories: 2800,
              proteinGrams: 210,
              carbsGrams: 280,
              fatGrams: 93,
              status: "active",
              snapshot: {
                targetCalories: 2800,
                proteinGrams: 210,
                carbsGrams: 280,
                fatGrams: 93,
                template: template.template
              },
              startsOn: "2026-05-18",
              endsOn: null,
              updatedAt: now
            }
          }
        });
        return;
      }

      await route.fallback();
    });

    await page.route("**/api/v1/clients?status=active&limit=100", async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: "client_nutrition_e2e",
              name: "E2E Nutrition Client",
              packageName: "Persisted Nutrition",
              compliance: 92,
              checkInDay: "Monday",
              latestCheckIn: "May 18, 2026",
              status: "active",
              startDate: "May 1, 2026",
              initials: "EN",
              avatarColor: "bg-green-700"
            }
          ]
        }
      });
    });

    await page.goto("/nutrition/meal-plans");
    await page.getByRole("button", { name: "Create Meal Template" }).click();

    await expect(page.getByText("Meal plan template saved to persistence API.")).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Master Nutrition Templates" })).toContainText(
      "Performance Meal Template 1"
    );
    expect(createdTemplateBody).toMatchObject({
      name: "Performance Meal Template 1",
      phase: "Hypertrophy",
      targetCalories: 2800,
      proteinGrams: 210,
      carbsGrams: 280,
      fatGrams: 93,
      status: "draft"
    });

    await page.getByRole("button", { name: "Use Template" }).click();
    const assignmentDialog = page.getByRole("dialog", { name: "Assign Meal Template" });
    await expect(assignmentDialog).toBeVisible();
    await assignmentDialog.getByLabel("Client").selectOption("client_nutrition_e2e");
    await page.getByRole("button", { name: "Assign Meal Plan" }).click();

    await expect(page.getByText("Meal plan assigned to client.")).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Active Client Assignments" })).toContainText(
      "E2E Nutrition Client"
    );
    await expect(page.getByRole("tabpanel", { name: "Active Client Assignments" })).toContainText(
      "Performance Meal Template 1"
    );
    expect(createdAssignmentBody).toMatchObject({
      clientId: "client_nutrition_e2e",
      templateId: "meal_template_e2e",
      name: "Performance Meal Template 1"
    });
    expect(createdAssignmentBody.startsOn).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });
});

test.describe("M7 operations persistence smoke", () => {
  test("coach sends an API-backed message", async ({ page }) => {
    let createdMessageBody: Record<string, unknown> | null = null;

    await page.route("**/api/v1/conversations**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET" && url.pathname === "/api/v1/conversations") {
        await route.fulfill({
          json: {
            data: [
              {
                id: "conversation_e2e",
                clientId: "client_e2e",
                clientName: "E2E Messaging Client",
                title: "E2E Messaging Client",
                latestMessage: {
                  id: "message_latest",
                  senderType: "client",
                  body: "Can you review my latest check-in?",
                  createdAt: "2026-05-18T00:00:00.000Z"
                },
                createdAt: "2026-05-18T00:00:00.000Z",
                updatedAt: "2026-05-18T00:00:00.000Z"
              }
            ]
          }
        });
        return;
      }

      if (request.method() === "GET" && url.pathname === "/api/v1/conversations/conversation_e2e/messages") {
        await route.fulfill({
          json: {
            data: [
              {
                id: "message_e2e_1",
                conversationId: "conversation_e2e",
                senderType: "client",
                senderUserId: null,
                senderClientId: "client_e2e",
                body: "Can you review my latest check-in?",
                attachments: [],
                receipts: [],
                createdAt: "2026-05-18T00:00:00.000Z",
                editedAt: null
              }
            ]
          }
        });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/conversations/conversation_e2e/messages") {
        createdMessageBody = request.postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 201,
          json: {
            data: {
              id: "message_e2e_2",
              conversationId: "conversation_e2e",
              senderType: "user",
              senderUserId: "user_e2e",
              senderClientId: null,
              body: "Your check-in looks good. I added the next task.",
              attachments: [],
              receipts: [],
              createdAt: "2026-05-18T00:05:00.000Z",
              editedAt: null
            }
          }
        });
        return;
      }

      await route.fallback();
    });

    await page.goto("/messages");

    const thread = page.getByRole("log", { name: "Conversation with E2E Messaging Client" });

    await expect(page.getByRole("heading", { name: "E2E Messaging Client" })).toBeVisible();
    await expect(thread.getByText("Can you review my latest check-in?")).toBeVisible();

    await page.getByRole("textbox", { name: /type a message/i }).fill("Your check-in looks good. I added the next task.");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(thread.getByText("Your check-in looks good. I added the next task.")).toBeVisible();
    expect(createdMessageBody).toMatchObject({ body: "Your check-in looks good. I added the next task." });
  });

  test("dashboard uses API-backed tasks and summary counts", async ({ page }) => {
    const tasks = [
      {
        id: "task_e2e",
        title: "E2E dashboard task",
        category: "current-client-care",
        priority: "high",
        status: "open"
      }
    ];
    let createdTaskBody: Record<string, unknown> | null = null;

    await page.route("**/api/v1/tasks**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET" && url.pathname === "/api/v1/tasks") {
        await route.fulfill({ json: { data: tasks } });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/tasks") {
        createdTaskBody = request.postDataJSON() as Record<string, unknown>;
        const createdTask = {
          id: "task_created_e2e",
          title: String(createdTaskBody.title),
          category: String(createdTaskBody.category),
          priority: String(createdTaskBody.priority),
          status: "open"
        };
        tasks.push(createdTask);
        await route.fulfill({ status: 201, json: { data: createdTask } });
        return;
      }

      if (request.method() === "POST" && url.pathname === "/api/v1/tasks/task_e2e/complete") {
        tasks[0] = { ...tasks[0], status: "completed" };
        await route.fulfill({ json: { data: tasks[0] } });
        return;
      }

      await route.fallback();
    });

    await page.route("**/api/v1/clients?status=active&limit=100", async (route) => {
      await route.fulfill({
        json: {
          data: [{ id: "client_1" }, { id: "client_2" }, { id: "client_3" }, { id: "client_4" }]
        }
      });
    });

    await page.route("**/api/v1/check-ins?status=pending-review&limit=100", async (route) => {
      await route.fulfill({ json: { data: [{ id: "checkin_1" }, { id: "checkin_2" }] } });
    });

    await page.route("**/api/v1/notifications?limit=20", async (route) => {
      await route.fulfill({ json: { data: [] } });
    });

    await page.goto("/");

    await expect(page.getByText("E2E dashboard task")).toBeVisible();
    await expect(page.getByText("5% LOAD")).toBeVisible();
    await expect(page.getByText("Room for 80 more premium athletes")).toBeVisible();
    await expect(page.getByText("Pending")).toBeVisible();

    await page.getByRole("button", { name: /mark e2e dashboard task complete/i }).click();
    await expect(page.getByRole("button", { name: /mark e2e dashboard task incomplete/i })).toBeVisible();

    await page.getByRole("button", { name: "Add Task" }).click();
    await page.getByLabel("Task Description").fill("E2E created dashboard task");
    await page.getByRole("radio", { name: "Current Client Care" }).click();
    await page.getByRole("radio", { name: "High" }).click();
    await page.getByRole("button", { name: "Create Task" }).click();

    await expect(page.getByText("E2E created dashboard task")).toBeVisible();
    expect(createdTaskBody).toMatchObject({
      title: "E2E created dashboard task",
      category: "current-client-care",
      priority: "high"
    });
  });

  test("notifications menu and Resend webhook route are reachable", async ({ page }) => {
    await page.route("**/api/v1/notifications?limit=20", async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: "notification_e2e",
              type: "message",
              title: "E2E Notification",
              message: "Persisted notification from API",
              unread: true,
              createdAt: "2026-05-18T00:00:00.000Z"
            }
          ]
        }
      });
    });

    await page.route("**/api/v1/notifications/read", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ json: { data: { updatedCount: 1 } } });
        return;
      }

      await route.fallback();
    });

    await page.route("**/api/webhooks/resend", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          json: {
            data: {
              id: "email_delivery_e2e",
              status: "delivered",
              eventType: "email.delivered"
            }
          }
        });
        return;
      }

      await route.fallback();
    });

    await page.goto("/");

    const notificationButton = page.getByRole("button", { name: /notifications/i });
    await expect(notificationButton).toHaveText("1");
    await notificationButton.click();
    await expect(page.getByRole("region", { name: "Notifications" })).toContainText("E2E Notification");

    await page.getByRole("button", { name: /mark all as read/i }).click();
    await expect(notificationButton).toHaveText("0");

    const webhookStatus = await page.evaluate(async () => {
      const response = await fetch("/api/webhooks/resend", {
        method: "POST",
        body: JSON.stringify({
          type: "email.delivered",
          data: {
            email_id: "resend_e2e",
            tags: [{ name: "email_delivery_id", value: "email_delivery_e2e" }]
          }
        })
      });

      return response.status;
    });

    expect(webhookStatus).toBe(200);
  });
});

test.describe("UI stub accessibility smoke", () => {
  for (const route of routeCases) {
    test(`${route.path} has named interactive controls and a usable heading structure`, async ({ page }) => {
      await page.goto(route.path);

      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();

      const unnamedControls = await page.locator("a[href], button, input, textarea, select").evaluateAll((elements) =>
        elements
          .map((element) => {
            const tagName = element.tagName.toLowerCase();
            const label = [
              element.getAttribute("aria-label"),
              element.getAttribute("title"),
              element.textContent,
              element.getAttribute("placeholder"),
              element.getAttribute("alt")
            ]
              .filter(Boolean)
              .join(" ")
              .trim();

            return {
              tagName,
              label,
              html: element.outerHTML.slice(0, 180)
            };
          })
          .filter((control) => control.label.length === 0)
      );

      expect(unnamedControls).toEqual([]);
    });
  }

  test("keyboard focus reaches global navigation and page controls", async ({ page }) => {
    await page.goto("/supplementation/database");

    const dashboardLink = page.getByRole("link", { name: "Complete Coach dashboard" });
    await expect(dashboardLink).toBeVisible();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const dashboardLinkFocused = await dashboardLink.evaluate(
        (element) => element === document.activeElement
      );

      if (dashboardLinkFocused) {
        break;
      }

      await page.keyboard.press("Tab");
    }

    await expect(dashboardLink).toBeFocused();

    await page.getByRole("button", { name: "New Entry" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "New Protocol" })).toBeVisible();
    await page.getByRole("button", { name: "Close new protocol panel" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "New Protocol" })).toBeHidden();
  });
});
