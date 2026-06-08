import type { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";

export interface SenderDomainDnsRecord {
  record: string;
  name: string;
  type: "MX" | "TXT" | "CNAME" | string;
  value: string;
  ttl?: string;
  status?: string;
  priority?: number;
}

interface ResendDomainResponse {
  id: string;
  name: string;
  status: string;
  records?: SenderDomainDnsRecord[];
}

interface SenderDomainRecord {
  id: string;
  domain: string;
  provider: string;
  providerDomainId: string | null;
  status: string;
  fromLocalPart: string;
  senderName: string;
  recordsJson: unknown;
  verifiedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export const createSenderDomainSchema = z.object({
  domain: z.string().min(3).max(253).transform(normalizeDomain).pipe(
    z.string().regex(/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/u, "Enter a valid domain or subdomain.")
  ),
  fromLocalPart: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9](?:[a-z0-9._+-]*[a-z0-9])?$/u, "Enter a valid email username."),
  senderName: z.string().trim().min(1).max(80)
});

export function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//u, "")
    .replace(/^www\./u, "")
    .replace(/\/.*$/u, "")
    .replace(/\.$/u, "");
}

export function serializeSenderDomain(record: SenderDomainRecord) {
  return {
    id: record.id,
    domain: record.domain,
    provider: record.provider,
    providerDomainId: record.providerDomainId,
    status: record.status,
    fromEmail: `${record.fromLocalPart}@${record.domain}`,
    fromLocalPart: record.fromLocalPart,
    senderName: record.senderName,
    dnsRecords: parseDnsRecords(record.recordsJson),
    verifiedAt: record.verifiedAt ? toIsoString(record.verifiedAt) : null,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

export function buildSenderFromAddress(record: Pick<SenderDomainRecord, "domain" | "fromLocalPart" | "senderName">) {
  return `${formatSenderName(record.senderName)} <${record.fromLocalPart}@${record.domain}>`;
}

export async function createResendDomain(domain: string) {
  return requestResendDomain("/domains", {
    method: "POST",
    body: JSON.stringify({
      name: domain,
      capabilities: { sending: "enabled", receiving: "disabled" }
    })
  });
}

export async function getResendDomain(providerDomainId: string) {
  return requestResendDomain(`/domains/${encodeURIComponent(providerDomainId)}`, { method: "GET" });
}

export async function verifyResendDomain(providerDomainId: string) {
  await requestResendDomain(`/domains/${encodeURIComponent(providerDomainId)}/verify`, { method: "POST" });
  return getResendDomain(providerDomainId);
}

export function mapResendDomainToUpdate(domain: ResendDomainResponse) {
  return {
    providerDomainId: domain.id,
    status: domain.status,
    recordsJson: (domain.records ?? []) as unknown as Prisma.InputJsonValue,
    verifiedAt: domain.status === "verified" ? new Date() : null
  };
}

export class ResendConfigurationError extends Error {
  constructor() {
    super("Resend domain management is not configured.");
    this.name = "ResendConfigurationError";
  }
}

function parseDnsRecords(value: unknown): SenderDomainDnsRecord[] {
  return Array.isArray(value)
    ? value.filter((record): record is SenderDomainDnsRecord => isDnsRecord(record))
    : [];
}

function isDnsRecord(value: unknown): value is SenderDomainDnsRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "type" in value &&
    "value" in value &&
    typeof (value as { name: unknown }).name === "string" &&
    typeof (value as { type: unknown }).type === "string" &&
    typeof (value as { value: unknown }).value === "string"
  );
}

async function requestResendDomain(path: string, init: RequestInit) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new ResendConfigurationError();
  }

  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init.headers
    }
  });

  if (!response.ok) {
    throw new Error(`Resend domain request failed with status ${response.status}.`);
  }

  return (await response.json()) as ResendDomainResponse;
}

function formatSenderName(value: string) {
  return value.replace(/["<>]/gu, "").trim() || "Complete Coach";
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
