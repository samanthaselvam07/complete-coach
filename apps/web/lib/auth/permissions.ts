export const ALL_CAPABILITIES = [
  "clients:read",
  "clients:write",
  "clients:pii:read",
  "forms:read",
  "forms:write",
  "forms:publish",
  "submissions:read",
  "submissions:review",
  "metrics:read",
  "training:read",
  "training:write",
  "training:assign",
  "nutrition:read",
  "nutrition:write",
  "nutrition:assign",
  "education:read",
  "education:write",
  "education:assign",
  "supplements:read",
  "supplements:write",
  "supplements:assign",
  "messages:read",
  "messages:write",
  "notifications:read",
  "tasks:read",
  "tasks:write",
  "ai:read",
  "ai:generate",
  "ai:approve",
  "social:read",
  "social:manage",
  "payments:read",
  "payments:manage",
  "team:read",
  "team:manage",
  "api_keys:manage",
  "exports:read",
  "audit:read"
] as const;

export type Capability = (typeof ALL_CAPABILITIES)[number];
export type MembershipRole = "owner" | "admin" | "coach" | "assistant" | "client";

const roleCapabilities: Record<MembershipRole, readonly Capability[]> = {
  owner: ALL_CAPABILITIES,
  admin: ALL_CAPABILITIES.filter((capability) => capability !== "payments:manage"),
  coach: [
    "clients:read",
    "clients:write",
    "clients:pii:read",
    "forms:read",
    "forms:write",
    "forms:publish",
    "submissions:read",
    "submissions:review",
    "metrics:read",
    "training:read",
    "training:write",
    "training:assign",
    "nutrition:read",
    "nutrition:write",
    "nutrition:assign",
    "education:read",
    "education:write",
    "education:assign",
    "supplements:read",
    "supplements:write",
    "supplements:assign",
    "messages:read",
    "messages:write",
    "notifications:read",
    "tasks:read",
    "tasks:write",
    "ai:read",
    "ai:generate",
    "ai:approve",
    "social:read",
    "social:manage",
    "payments:read",
    "team:read",
    "exports:read"
  ],
  assistant: [
    "clients:read",
    "forms:read",
    "submissions:read",
    "metrics:read",
    "training:read",
    "nutrition:read",
    "education:read",
    "supplements:read",
    "messages:read",
    "messages:write",
    "notifications:read",
    "tasks:read",
    "tasks:write",
    "ai:read",
    "social:read"
  ],
  client: [
    "forms:read",
    "submissions:read",
    "metrics:read",
    "training:read",
    "nutrition:read",
    "education:read",
    "supplements:read",
    "messages:read",
    "messages:write",
    "notifications:read"
  ]
};

export class ForbiddenError extends Error {
  constructor(role: MembershipRole, capability: Capability) {
    super(`Forbidden: ${role} does not have ${capability}`);
    this.name = "ForbiddenError";
  }
}

export function getCapabilitiesForRole(role: MembershipRole) {
  return roleCapabilities[role];
}

export function hasCapability(role: MembershipRole, capability: Capability) {
  return getCapabilitiesForRole(role).includes(capability);
}

export function assertCapability(role: MembershipRole, capability: Capability) {
  if (!hasCapability(role, capability)) {
    throw new ForbiddenError(role, capability);
  }
}
