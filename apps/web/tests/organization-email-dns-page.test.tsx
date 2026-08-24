import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OrganizationSettingsPage } from "@/components/organization/organization-settings-page";

describe("OrganizationSettingsPage email DNS panel", () => {
  it("temporarily hides email DNS from organization settings", () => {
    render(<OrganizationSettingsPage />);

    expect(screen.queryByRole("tab", { name: "Email DNS" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create DNS records" })).not.toBeInTheDocument();
  });
});

describe("OrganizationSettingsPage automations panel", () => {
  it("saves edited email automation copy and does not show push notification controls", async () => {
    const automation = {
      id: "new-client-created",
      name: "New client created",
      enabled: true,
      subject: "Welcome",
      template: "Hi [FIRST_NAME]",
      delay: 1,
      interval: "Minutes"
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (String(input) === "/api/v1/organizations/current/automations" && init?.method === "PUT") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  ...automation,
                  subject: "Custom welcome",
                  template: "Custom email body"
                }
              ]
            }),
            { status: 200 }
          )
        );
      }

      if (String(input) === "/api/v1/organizations/current/automations") {
        return Promise.resolve(new Response(JSON.stringify({ data: [automation] }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Automations" }));

    expect(await screen.findByText("New client created")).toBeInTheDocument();
    expect(screen.queryByText("Push")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Actions for New client created"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Custom welcome" }
    });
    fireEvent.change(screen.getByLabelText("Email automation message"), {
      target: { value: "Custom email body" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Automation" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/organizations/current/automations",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("Custom email body")
        })
      )
    );
  });
});
