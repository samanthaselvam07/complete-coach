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
