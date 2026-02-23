import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SiteChatbot } from "@/features/content/components/SiteChatbot";

const askAgencyChatbotMock = vi.fn();
const queueTelemetryMock = vi.fn();
const flushTelemetryMock = vi.fn().mockResolvedValue(undefined);
const trackEventMock = vi.fn();

vi.mock("@/features/content/api/chatbot.service", async () => {
  const actual = await vi.importActual<typeof import("@/features/content/api/chatbot.service")>(
    "@/features/content/api/chatbot.service",
  );
  return {
    ...actual,
    askAgencyChatbot: (...args: unknown[]) => askAgencyChatbotMock(...args),
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

function renderChatbot() {
  return render(
    <MemoryRouter>
      <SiteChatbot />
    </MemoryRouter>,
  );
}

describe("SiteChatbot feedback and telemetry hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders thumbs feedback on assistant replies and submits downvote with reason", async () => {
    renderChatbot();

    fireEvent.click(screen.getByRole("button", { name: /assistant/i }));
    const input = screen.getByPlaceholderText(/posez une question/i);
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
  });

  it("emits citation click telemetry and does not include raw question text in telemetry payloads", async () => {
    renderChatbot();

    fireEvent.click(screen.getByRole("button", { name: /assistant/i }));
    const input = screen.getByPlaceholderText(/posez une question/i);
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
