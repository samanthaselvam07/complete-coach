"use client";

const CLIENT_ME_URL = "/api/v1/client/me";
const CLIENT_ME_CACHE_TTL_MS = 30_000;

let cachedClientMe: { expiresAt: number; payload: unknown } | null = null;
let inFlightClientMe: Promise<unknown> | null = null;

export function getClientMe<T>({ force = false }: { force?: boolean } = {}) {
  const now = Date.now();

  if (!force && cachedClientMe && cachedClientMe.expiresAt > now) {
    return Promise.resolve(cachedClientMe.payload as T);
  }

  if (!force && inFlightClientMe) {
    return inFlightClientMe as Promise<T>;
  }

  inFlightClientMe = fetch(CLIENT_ME_URL)
    .then(async (response) => {
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message = getPayloadErrorMessage(payload) ?? "Your client account could not be loaded.";
        throw new Error(message);
      }

      cachedClientMe = {
        expiresAt: Date.now() + CLIENT_ME_CACHE_TTL_MS,
        payload
      };

      return payload;
    })
    .finally(() => {
      inFlightClientMe = null;
    });

  return inFlightClientMe as Promise<T>;
}

export function preloadClientMe() {
  void getClientMe().catch(() => undefined);
}

export function clearClientMeCache() {
  cachedClientMe = null;
  inFlightClientMe = null;
}

function getPayloadErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }

  const error = (payload as { error?: { message?: unknown } }).error;

  return typeof error?.message === "string" ? error.message : null;
}
