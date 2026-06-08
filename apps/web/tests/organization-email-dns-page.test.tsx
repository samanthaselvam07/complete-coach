import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";

import { OrganizationSettingsPage } from "@/components/organization/organization-settings-page";

const pendingDomain = {
  id: "sender_domain_1",
  domain: "mail.example.com",
  provider: "resend",
  status: "not_started",
  fromEmail: "coach@mail.example.com",
  fromLocalPart: "coach",
  senderName: "Example Coaching",
  dnsRecords: [
    {
      record: "SPF",
      name: "send",
      type: "TXT",
      value: "\"v=spf1 include:amazonses.com ~all\"",
      priority: 10,
      status: "not_started"
    }
  ],
  verifiedAt: null
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OrganizationSettingsPage email DNS panel", () => {
  it("loads existing sender domains and shows DNS records", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [pendingDomain] }), { status: 200 })
    );

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Email DNS" }));

    expect(await screen.findByRole("table", { name: "DNS records for mail.example.com" })).toBeInTheDocument();
    expect(screen.getByText("Emails will send from coach@mail.example.com once verified.")).toBeInTheDocument();
    expect(screen.queryByText("No sender domains configured yet.")).not.toBeInTheDocument();
  });

  it("refreshes sender domain status after DNS verification", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url === "/api/v1/organizations/current/email-domains" && !init) {
        return Promise.resolve(new Response(JSON.stringify({ data: [pendingDomain] }), { status: 200 }));
      }

      if (url.includes("/verify")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                ...pendingDomain,
                status: "verified",
                verifiedAt: "2026-06-09T00:00:00.000Z"
              }
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    });

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Email DNS" }));
    fireEvent.click(await screen.findByRole("button", { name: "Verify DNS records" }));

    expect(await screen.findByText("Sender domain verified.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/organizations/current/email-domains/sender_domain_1/verify",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows API errors when sender domains cannot be loaded or created", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      if (!init) {
        return Promise.resolve(new Response(JSON.stringify({ error: { message: "Unavailable" } }), { status: 503 }));
      }

      return Promise.resolve(
        new Response(JSON.stringify({ error: { message: "Resend domain management is not configured." } }), {
          status: 503
        })
      );
    });

    render(<OrganizationSettingsPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Email DNS" }));

    expect(await screen.findByText("Sender domains could not be loaded. Check Resend and database configuration.")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("mail.yourdomain.com"), {
      target: { value: "mail.example.com" }
    });
    await waitFor(() => expect(screen.getByPlaceholderText("mail.yourdomain.com")).toHaveValue("mail.example.com"));
    fireEvent.click(screen.getByRole("button", { name: "Create DNS records" }));

    expect(await screen.findByText("Resend domain management is not configured.")).toBeInTheDocument();
  });
});
