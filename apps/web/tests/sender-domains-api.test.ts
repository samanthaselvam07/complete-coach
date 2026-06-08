import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as createSenderDomain, GET as listSenderDomains } from "@/app/api/v1/organizations/current/email-domains/route";
import { POST as verifySenderDomain } from "@/app/api/v1/organizations/current/email-domains/[senderDomainId]/verify/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    auditLog: {
      create: vi.fn()
    },
    organizationSenderDomain: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma
}));

const ownerSession = {
  user: { id: "user_1", email: "owner@example.com" },
  activeOrganization: {
    id: "org_1",
    slug: "complete-coach-demo",
    name: "Complete Coach Demo",
    role: "owner"
  }
};

const now = new Date("2026-06-09T00:00:00.000Z");
const dnsRecords = [
  {
    record: "SPF",
    name: "send",
    type: "TXT",
    value: "\"v=spf1 include:amazonses.com ~all\"",
    ttl: "Auto",
    status: "not_started"
  },
  {
    record: "DKIM",
    name: "resend._domainkey",
    type: "CNAME",
    value: "resend.dkim.amazonses.com.",
    ttl: "Auto",
    status: "not_started"
  }
];
const senderDomainRecord = {
  id: "sender_domain_1",
  organizationId: "org_1",
  domain: "mail.example.com",
  provider: "resend",
  providerDomainId: "resend_domain_1",
  status: "not_started",
  fromLocalPart: "coach",
  senderName: "Example Coaching",
  recordsJson: dnsRecords,
  verifiedAt: null,
  createdByUserId: "user_1",
  createdAt: now,
  updatedAt: now
};

describe("organization sender domain API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.RESEND_API_KEY;
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue(ownerSession);
    mocks.prisma.auditLog.create.mockReset();
    mocks.prisma.organizationSenderDomain.create.mockReset();
    mocks.prisma.organizationSenderDomain.findFirst.mockReset();
    mocks.prisma.organizationSenderDomain.findMany.mockReset();
    mocks.prisma.organizationSenderDomain.findUnique.mockReset();
    mocks.prisma.organizationSenderDomain.update.mockReset();
  });

  it("lists organization-scoped sender domains with DNS records", async () => {
    mocks.prisma.organizationSenderDomain.findMany.mockResolvedValue([senderDomainRecord]);

    const response = await listSenderDomains();
    const payload = (await response.json()) as { data: Array<{ fromEmail: string; dnsRecords: unknown[] }> };

    expect(response.status).toBe(200);
    expect(payload.data[0]).toMatchObject({
      fromEmail: "coach@mail.example.com",
      dnsRecords
    });
    expect(mocks.prisma.organizationSenderDomain.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org_1" } })
    );
  });

  it("creates a Resend domain, stores DNS records, and audits the action", async () => {
    process.env.RESEND_API_KEY = "test_resend_key";
    mocks.prisma.organizationSenderDomain.findUnique.mockResolvedValue(null);
    mocks.prisma.organizationSenderDomain.create.mockResolvedValue(senderDomainRecord);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "resend_domain_1",
          name: "mail.example.com",
          status: "not_started",
          records: dnsRecords
        }),
        { status: 200 }
      )
    );

    const response = await createSenderDomain(
      new Request("http://test.local/api/v1/organizations/current/email-domains", {
        method: "POST",
        body: JSON.stringify({
          domain: "https://mail.example.com/path",
          fromLocalPart: "coach",
          senderName: "Example Coaching"
        })
      })
    );
    const payload = (await response.json()) as { data: { domain: string; dnsRecords: unknown[] } };

    expect(response.status).toBe(201);
    expect(payload.data).toMatchObject({ domain: "mail.example.com", dnsRecords });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/domains",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test_resend_key" })
      })
    );
    expect(mocks.prisma.organizationSenderDomain.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          domain: "mail.example.com",
          providerDomainId: "resend_domain_1",
          recordsJson: dnsRecords
        })
      })
    );
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "organization.sender_domain.created" })
      })
    );
  });

  it("rejects duplicate sender domains before calling Resend", async () => {
    process.env.RESEND_API_KEY = "test_resend_key";
    mocks.prisma.organizationSenderDomain.findUnique.mockResolvedValue(senderDomainRecord);
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const response = await createSenderDomain(
      new Request("http://test.local/api/v1/organizations/current/email-domains", {
        method: "POST",
        body: JSON.stringify({
          domain: "mail.example.com",
          fromLocalPart: "coach",
          senderName: "Example Coaching"
        })
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("sender_domain_exists");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("verifies a scoped sender domain through Resend and refreshes DNS status", async () => {
    process.env.RESEND_API_KEY = "test_resend_key";
    mocks.prisma.organizationSenderDomain.findFirst.mockResolvedValue(senderDomainRecord);
    mocks.prisma.organizationSenderDomain.update.mockResolvedValue({
      ...senderDomainRecord,
      status: "verified",
      verifiedAt: now
    });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ object: "domain", id: "resend_domain_1" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "resend_domain_1",
            name: "mail.example.com",
            status: "verified",
            records: dnsRecords
          }),
          { status: 200 }
        )
      );

    const response = await verifySenderDomain(
      new Request("http://test.local/api/v1/organizations/current/email-domains/sender_domain_1/verify", { method: "POST" }),
      { params: Promise.resolve({ senderDomainId: "sender_domain_1" }) }
    );
    const payload = (await response.json()) as { data: { status: string; verifiedAt: string | null } };

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("verified");
    expect(payload.data.verifiedAt).toBe(now.toISOString());
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      "https://api.resend.com/domains/resend_domain_1/verify",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("rejects sender domain verification when the domain is not scoped to the organization", async () => {
    mocks.prisma.organizationSenderDomain.findFirst.mockResolvedValue(null);

    const response = await verifySenderDomain(
      new Request("http://test.local/api/v1/organizations/current/email-domains/missing/verify", { method: "POST" }),
      { params: Promise.resolve({ senderDomainId: "missing" }) }
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("not_found");
    expect(mocks.prisma.organizationSenderDomain.update).not.toHaveBeenCalled();
  });

  it("rejects sender domain verification when the provider id is missing", async () => {
    mocks.prisma.organizationSenderDomain.findFirst.mockResolvedValue({
      ...senderDomainRecord,
      providerDomainId: null
    });

    const response = await verifySenderDomain(
      new Request("http://test.local/api/v1/organizations/current/email-domains/sender_domain_1/verify", { method: "POST" }),
      { params: Promise.resolve({ senderDomainId: "sender_domain_1" }) }
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("provider_domain_missing");
    expect(mocks.prisma.organizationSenderDomain.update).not.toHaveBeenCalled();
  });

  it("returns a setup error when sender domain verification lacks Resend configuration", async () => {
    mocks.prisma.organizationSenderDomain.findFirst.mockResolvedValue(senderDomainRecord);

    const response = await verifySenderDomain(
      new Request("http://test.local/api/v1/organizations/current/email-domains/sender_domain_1/verify", { method: "POST" }),
      { params: Promise.resolve({ senderDomainId: "sender_domain_1" }) }
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("resend_not_configured");
    expect(mocks.prisma.organizationSenderDomain.update).not.toHaveBeenCalled();
  });

  it("returns a setup error when Resend domain management is not configured", async () => {
    const response = await createSenderDomain(
      new Request("http://test.local/api/v1/organizations/current/email-domains", {
        method: "POST",
        body: JSON.stringify({
          domain: "mail.example.com",
          fromLocalPart: "coach",
          senderName: "Example Coaching"
        })
      })
    );
    const payload = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("resend_not_configured");
    expect(mocks.prisma.organizationSenderDomain.create).not.toHaveBeenCalled();
  });
});
