import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "evt-1",
    eventType: "reply_received" as const,
    sessionId: "session-1",
    conversationId: "conversation-1",
    source: "edge" as const,
    edgeProvider: "gemini" as const,
    routeCategory: "edge_rag" as const,
    ...overrides,
  };
}

async function loadService() {
  vi.resetModules();
  return await import("@/features/content/api/chatbotFeedback.service");
}

describe("chatbotFeedback.service", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("batches and flushes telemetry events", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = await loadService();

    service.queueChatbotTelemetryEvent(makeEvent());
    await service.flushChatbotTelemetryQueue();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { events: Array<{ eventId: string }> };
    expect(body.events).toHaveLength(1);
    expect(body.events[0].eventId).toBe("evt-1");
  });

  it("dedupes duplicate event ids", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = await loadService();

    const event = makeEvent();
    service.queueChatbotTelemetryEvent(event);
    service.queueChatbotTelemetryEvent(event);
    await service.flushChatbotTelemetryQueue();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { events: Array<{ eventId: string }> };
    expect(body.events).toHaveLength(1);
  });

  it("does not throw when network requests fail", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const service = await loadService();

    service.queueChatbotTelemetryEvent(makeEvent());
    await expect(service.flushChatbotTelemetryQueue()).resolves.toBeUndefined();
  });

  it("detects unsuccessful HTTP responses", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));
    const service = await loadService();

    service.queueChatbotTelemetryEvent(makeEvent());
    await service.flushChatbotTelemetryQueue();

    expect(warn).toHaveBeenCalledWith(
      "Chatbot telemetry could not be saved.",
      expect.objectContaining({ message: "Chatbot telemetry request failed with HTTP 400." }),
    );
  });

  it("uses sendBeacon on visibility hidden when available", async () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const service = await loadService();

    service.queueChatbotTelemetryEvent(makeEvent());

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
