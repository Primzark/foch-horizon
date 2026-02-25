import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadApiClientModule() {
  vi.resetModules();
  return import("@/lib/api/client");
}

describe("api client edge auth helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("apiJson attaches Supabase anon auth headers in edge mode", async () => {
    vi.stubEnv("VITE_API_MODE", "edge");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("VITE_API_BASE_URL", "");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { apiJson } = await loadApiClientModule();
    await apiJson<{ ok: boolean }>("/api/leads", {
      method: "POST",
      body: JSON.stringify({ hello: "world" }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/leads");
    const headers = new Headers(init?.headers as HeadersInit | undefined);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("apikey")).toBe("test-anon-key");
    expect(headers.get("Authorization")).toBe("Bearer test-anon-key");
  });

  it("edgeApiFetch preserves caller headers while adding auth headers", async () => {
    vi.stubEnv("VITE_API_MODE", "edge");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("VITE_API_BASE_URL", "");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", {
        status: 200,
      }),
    );

    const { edgeApiFetch, isEdgeApiAuthHeadersEnabled } = await loadApiClientModule();
    expect(isEdgeApiAuthHeadersEnabled()).toBe(true);

    await edgeApiFetch("/api/chatbot-assistant-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Test": "1",
      },
      body: "{}",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers as HeadersInit | undefined);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Test")).toBe("1");
    expect(headers.get("apikey")).toBe("test-anon-key");
    expect(headers.get("Authorization")).toBe("Bearer test-anon-key");
  });

  it("apiJson rejects when edge mode is disabled", async () => {
    vi.stubEnv("VITE_API_MODE", "mock");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { apiJson, isEdgeApiAuthHeadersEnabled } = await loadApiClientModule();

    await expect(apiJson("/api/cities")).rejects.toThrow("Edge API mode is disabled.");
    expect(isEdgeApiAuthHeadersEnabled()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
