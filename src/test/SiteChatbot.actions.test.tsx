import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const {
  askAgencyChatbotMock,
  askAgencyChatbotStreamMock,
  queueTelemetryMock,
  flushTelemetryMock,
  trackEventMock,
} = vi.hoisted(() => ({
  askAgencyChatbotMock: vi.fn(),
  askAgencyChatbotStreamMock: vi.fn(),
  queueTelemetryMock: vi.fn(),
  flushTelemetryMock: vi.fn().mockResolvedValue(undefined),
  trackEventMock: vi.fn(),
}));

vi.mock("@/features/content/api/chatbot.service", async () => {
  const actual = await vi.importActual<typeof import("@/features/content/api/chatbot.service")>(
    "@/features/content/api/chatbot.service",
  );
  return {
    ...actual,
    askAgencyChatbot: (...args: unknown[]) => askAgencyChatbotMock(...args),
    askAgencyChatbotStream: (...args: unknown[]) => askAgencyChatbotStreamMock(...args),
    chatbotExamplePrompts: ["Prompt test A", "Prompt test B"],
  };
});

vi.mock("@/features/content/api/chatbotFeedback.service", () => ({
  queueChatbotTelemetryEvent: (...args: unknown[]) => queueTelemetryMock(...args),
  flushChatbotTelemetryQueue: (...args: unknown[]) => flushTelemetryMock(...args),
}));

vi.mock("@/lib/analytics/events", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

vi.mock("@/features/leads/api/leads.service", () => ({
  submitLead: vi.fn(),
}));

let SiteChatbotComponent: (typeof import("@/features/content/components/SiteChatbot"))["SiteChatbot"];

async function renderChatbot() {
  return render(
    <MemoryRouter>
      <SiteChatbotComponent />
    </MemoryRouter>,
  );
}

describe("SiteChatbot tool action cards", () => {
  beforeAll(async () => {
    vi.stubEnv("VITE_CHATBOT_STREAMING_ENABLED", "false");
    vi.stubEnv("VITE_API_MODE", "edge");
    vi.stubEnv("VITE_CHATBOT_ENABLE_EDGE_RAG", "true");
    vi.stubEnv("VITE_CHATBOT_PERSISTENT_MEMORY_ENABLED", "true");
    ({ SiteChatbot: SiteChatbotComponent } = await import("@/features/content/components/SiteChatbot"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.stubEnv("VITE_CHATBOT_STREAMING_ENABLED", "false");
    vi.stubEnv("VITE_API_MODE", "edge");
    vi.stubEnv("VITE_CHATBOT_ENABLE_EDGE_RAG", "true");
    vi.stubEnv("VITE_CHATBOT_PERSISTENT_MEMORY_ENABLED", "true");

    askAgencyChatbotStreamMock.mockResolvedValue({
      source: "edge",
      answer: "ok",
      suggestedPrompts: ["Prompt test A"],
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/api/chatbot-memory/reset")) {
        return new Response(JSON.stringify({ ok: true, cleared: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends aggregate_properties when clicking 'Voir les stats' from search results", async () => {
    askAgencyChatbotMock
      .mockResolvedValueOnce({
        source: "edge",
        edgeProvider: "gemini",
        routeCategory: "edge_tools",
        routeDecision: "tool_action_request",
        requestId: "req-search-1",
        answer: "Voici les résultats.",
        suggestedPrompts: ["Prompt test A"],
        actions: [
          {
            id: "search-1",
            kind: "search_results",
            title: "Résultats",
            data: {
              criteriaSummary: "Appartements à vendre",
              searchParams: { transaction: "vente", city: "Le Havre", page: 1, pageSize: 5 },
              total: 2,
              items: [
                {
                  id: 101,
                  title: "Appartement centre",
                  priceAmount: 250000,
                  currency: "EUR",
                  surfaceM2: 78,
                  bedrooms: 2,
                  cityName: "Le Havre",
                  citySlug: "le-havre",
                  path: "/biens/appartement-centre-101",
                  coverImageUrl: "",
                  dpeLabel: null,
                  transaction: "vente",
                  type: "appartement",
                },
              ],
              canCompare: true,
              compareSelectionLimit: 3,
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        source: "edge",
        edgeProvider: "gemini",
        routeCategory: "edge_tools",
        requestId: "req-stats-1",
        answer: "Surface moyenne 78 m².",
        suggestedPrompts: ["Prompt test A"],
        actions: [],
      });

    const view = await renderChatbot();
    const ui = within(view.container);

    fireEvent.click(ui.getByRole("button", { name: /assistant/i }));
    const input = ui.getByPlaceholderText(/posez une question/i);
    fireEvent.change(input, { target: { value: "Je cherche un appartement" } });
    fireEvent.submit(input.closest("form")!);

    await screen.findByText(/Voici les résultats/i);
    fireEvent.click(screen.getByRole("button", { name: /Voir les stats/i }));

    await waitFor(() => {
      expect(askAgencyChatbotMock).toHaveBeenCalledTimes(2);
      const secondCall = askAgencyChatbotMock.mock.calls[1]?.[0] as Record<string, unknown>;
      expect(secondCall.actionRequest).toMatchObject({ type: "aggregate_properties" });
    });
  });

  it("applies facet_refine suggestion as search_refine action", async () => {
    askAgencyChatbotMock
      .mockResolvedValueOnce({
        source: "edge",
        edgeProvider: "gemini",
        routeCategory: "edge_tools",
        requestId: "req-facet-1",
        answer: "Vous pouvez affiner.",
        suggestedPrompts: ["Prompt test A"],
        actions: [
          {
            id: "facet-1",
            kind: "facet_refine",
            title: "Affiner",
            data: {
              searchParams: { transaction: "vente", city: "Le Havre", surfaceMin: 60, page: 1 },
              suggestions: [{ label: "+10 m²", patch: { surfaceMin: 70 }, removeKeys: ["page"] }],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        source: "edge",
        edgeProvider: "gemini",
        routeCategory: "edge_tools",
        requestId: "req-facet-2",
        answer: "C'est affiné.",
        suggestedPrompts: ["Prompt test A"],
      });

    const view = await renderChatbot();
    const ui = within(view.container);

    fireEvent.click(ui.getByRole("button", { name: /assistant/i }));
    const input = ui.getByPlaceholderText(/posez une question/i);
    fireEvent.change(input, { target: { value: "Affiner ma recherche" } });
    fireEvent.submit(input.closest("form")!);

    await screen.findByText(/Vous pouvez affiner/i);
    fireEvent.click(screen.getByRole("button", { name: /\+10 m²/i }));

    await waitFor(() => {
      expect(askAgencyChatbotMock).toHaveBeenCalledTimes(2);
      const secondCall = askAgencyChatbotMock.mock.calls[1]?.[0] as Record<string, unknown>;
      expect(secondCall.actionRequest).toMatchObject({
        type: "search_refine",
        payload: {
          searchParams: expect.objectContaining({
            surfaceMin: 70,
          }),
        },
      });
    });
  });

  it("renders persistent memory chips for surface, bathrooms and features", async () => {
    window.localStorage.setItem(
      "foch_chatbot_state_v1",
      JSON.stringify({
        preferences: {
          transaction: "vente",
          city: "Le Havre",
          bathroomsMin: 2,
          surfaceMin: 70,
          features: ["balcon", "ascenseur"],
        },
      }),
    );

    askAgencyChatbotMock.mockResolvedValue({
      source: "edge",
      edgeProvider: "gemini",
      routeCategory: "edge_rag",
      requestId: "req-memory",
      answer: "Bonjour",
      suggestedPrompts: ["Prompt test A"],
    });

    const view = await renderChatbot();
    const ui = within(view.container);
    fireEvent.click(ui.getByRole("button", { name: /assistant/i }));

    expect(await screen.findByText(/Contexte mémorisé/i)).toBeInTheDocument();
    expect(screen.getByText(/2\+ sdb/i)).toBeInTheDocument();
    expect(screen.getByText(/Surface min 70 m²/i)).toBeInTheDocument();
    expect(screen.getByText("balcon")).toBeInTheDocument();
  });
});
