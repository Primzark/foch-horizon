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

describe("SiteChatbot feedback and telemetry hooks", () => {
  beforeAll(async () => {
    ({ SiteChatbot: SiteChatbotComponent } = await import("@/features/content/components/SiteChatbot"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.stubEnv("VITE_CHATBOT_STREAMING_ENABLED", "false");
    vi.stubEnv("VITE_API_MODE", "edge");
    vi.stubEnv("VITE_CHATBOT_ENABLE_EDGE_RAG", "true");

    let current = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      current += 1600;
      return current;
    });

    askAgencyChatbotMock.mockResolvedValue({
      source: "edge",
      edgeProvider: "gemini",
      retrievalMode: "hybrid",
      ragUsed: true,
      routeCategory: "edge_rag",
      routeDecision: "website_content_rag",
      requestId: "req-test-1",
      answer: "Les honoraires sont sur /honoraires.",
      citations: [{ path: "/honoraires", title: "Honoraires" }],
      suggestedPrompts: ["Ouvrir /honoraires"],
    });
    askAgencyChatbotStreamMock.mockResolvedValue({
      source: "edge",
      edgeProvider: "gemini",
      retrievalMode: "hybrid",
      ragUsed: true,
      routeCategory: "edge_rag",
      routeDecision: "website_content_rag",
      requestId: "req-test-1",
      answer: "Les honoraires sont sur /honoraires.",
      citations: [{ path: "/honoraires", title: "Honoraires" }],
      suggestedPrompts: ["Ouvrir /honoraires"],
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("/api/chatbot-assistant-stream")) {
        const replyPayload = {
          source: "gemini",
          edgeProvider: "gemini",
          retrievalMode: "hybrid",
          ragUsed: true,
          routeCategory: "edge_rag",
          routeDecision: "website_content_rag",
          requestId: "req-test-1",
          answer: "Les honoraires sont sur /honoraires.",
          citations: [{ path: "/honoraires", title: "Honoraires" }],
          suggestedPrompts: ["Ouvrir /honoraires"],
        };
        const sseBody = [
          `event: status\ndata: ${JSON.stringify({ phase: "parsing" })}\n\n`,
          `event: status\ndata: ${JSON.stringify({ phase: "searching" })}\n\n`,
          `event: status\ndata: ${JSON.stringify({ phase: "building_response" })}\n\n`,
          `event: text_delta\ndata: ${JSON.stringify({ delta: "Les honoraires sont sur /honoraires." })}\n\n`,
          `event: citation\ndata: ${JSON.stringify({ citations: replyPayload.citations })}\n\n`,
          `event: done\ndata: ${JSON.stringify({ reply: replyPayload })}\n\n`,
        ].join("");
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseBody));
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }

      if (url.includes("/api/chatbot-assistant")) {
        return new Response(
          JSON.stringify({
            source: "gemini",
            edgeProvider: "gemini",
            retrievalMode: "hybrid",
            ragUsed: true,
            routeCategory: "edge_rag",
            routeDecision: "website_content_rag",
            requestId: "req-test-1",
            answer: "Les honoraires sont sur /honoraires.",
            citations: [{ path: "/honoraires", title: "Honoraires" }],
            suggestedPrompts: ["Ouvrir /honoraires"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

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

  it(
    "renders thumbs feedback on assistant replies and submits downvote with reason",
    async () => {
      const view = await renderChatbot();
      const ui = within(view.container);

      fireEvent.click(ui.getByRole("button", { name: /assistant/i }));
      const input = ui.getByPlaceholderText(/posez une question/i);
      fireEvent.change(input, { target: { value: "Ou trouver les honoraires ?" } });
      fireEvent.submit(input.closest("form")!);

      await screen.findByText(/Les honoraires sont sur/i);

      const downvoteButton = screen.getByRole("button", { name: /réponse peu utile/i });
      fireEvent.click(downvoteButton);

      expect(screen.getByRole("button", { name: /hors sujet/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /source\/lien incorrect/i }));

      await waitFor(() => {
        expect(trackEventMock).toHaveBeenCalledWith(
          "chatbot_feedback_submitted",
          expect.objectContaining({ feedbackValue: -1, feedbackReason: "Source/lien incorrect" }),
        );
      });

      expect(queueTelemetryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "feedback_submitted",
          feedbackValue: -1,
          feedbackReason: "Source/lien incorrect",
        }),
      );
    },
    15000,
  );

  it("emits citation click telemetry and does not include raw question text in telemetry payloads", async () => {
    const view = await renderChatbot();
    const ui = within(view.container);

    fireEvent.click(ui.getByRole("button", { name: /assistant/i }));
    const input = ui.getByPlaceholderText(/posez une question/i);
    fireEvent.change(input, { target: { value: "Ou trouver les honoraires ?" } });
    fireEvent.submit(input.closest("form")!);

    const citationTitle = await screen.findByText("Honoraires");
    fireEvent.click(citationTitle.closest("a")!);

    expect(trackEventMock).toHaveBeenCalledWith(
      "chatbot_citation_clicked",
      expect.objectContaining({ citationPath: "/honoraires" }),
    );
    expect(queueTelemetryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "citation_clicked",
        citationPath: "/honoraires",
      }),
    );

    for (const [payload] of queueTelemetryMock.mock.calls) {
      expect(payload).not.toHaveProperty("question");
      expect(payload).not.toHaveProperty("content");
    }
  });
});
