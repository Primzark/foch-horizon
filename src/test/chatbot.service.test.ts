import { describe, expect, it } from "vitest";
import { askAgencyChatbot } from "@/features/content/api/chatbot.service";

describe("chatbot service", () => {
  it("returns process guidance for compromis questions", async () => {
    const reply = await askAgencyChatbot({ question: "Comment se passe un compromis de vente ?" });

    expect(reply.answer.toLowerCase()).toContain("compromis");
    expect(reply.suggestedPrompts.length).toBeGreaterThan(0);
  });

  it("returns listing suggestions when the request is broad", async () => {
    const reply = await askAgencyChatbot({ question: "Je cherche un appartement a vendre au Havre" });

    expect(reply.propertySuggestions?.length ?? 0).toBeGreaterThan(0);
    expect(reply.needsLeadCapture).not.toBe(true);
  });

  it("requests lead capture when no suitable property is found", async () => {
    const reply = await askAgencyChatbot({
      question: "Je cherche une maison 8 chambres a sanvic avec un budget de 150000 euros",
    });

    expect(reply.needsLeadCapture).toBe(true);
    expect(reply.propertySuggestions).toBeUndefined();
  });
});
