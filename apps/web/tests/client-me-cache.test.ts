import { afterEach, describe, expect, it, vi } from "vitest";

import { clearClientMeCache, getClientMe } from "@/components/client-app/client-me-cache";

describe("client me cache", () => {
  afterEach(() => {
    clearClientMeCache();
    vi.unstubAllGlobals();
  });

  it("dedupes simultaneous client profile requests", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: {
          client: { id: "client_1", name: "Client One" }
        }
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    const [firstPayload, secondPayload] = await Promise.all([
      getClientMe(),
      getClientMe()
    ]);

    expect(firstPayload).toEqual(secondPayload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/client/me");
  });

  it("refreshes the cached payload when forced", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: { client: { id: "client_1", name: "Client One" } } }))
      .mockResolvedValueOnce(Response.json({ data: { client: { id: "client_1", name: "Client Updated" } } }));

    vi.stubGlobal("fetch", fetchMock);

    const cachedPayload = await getClientMe<{ data: { client: { name: string } } }>();
    const refreshedPayload = await getClientMe<{ data: { client: { name: string } } }>({ force: true });

    expect(cachedPayload.data.client.name).toBe("Client One");
    expect(refreshedPayload.data.client.name).toBe("Client Updated");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
