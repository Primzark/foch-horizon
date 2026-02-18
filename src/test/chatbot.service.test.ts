import { describe, expect, it } from "vitest";
import { askAgencyChatbot, chatbotExamplePrompts } from "@/features/content/api/chatbot.service";

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

  it("answers every built-in example prompt", async () => {
    for (const prompt of chatbotExamplePrompts) {
      const reply = await askAgencyChatbot({ question: prompt });
      expect(reply.answer.trim().length).toBeGreaterThan(20);
      expect(reply.suggestedPrompts.length).toBeGreaterThan(0);
    }
  });

  it("supports contact questions from site content", async () => {
    const reply = await askAgencyChatbot({ question: "Quels sont vos horaires et votre adresse ?" });

    expect(reply.answer).toMatch(/109 Av\. Foch/i);
    expect(reply.answer).toMatch(/09:30-12:00/i);
  });

  it("supports reviews and fees pages from site content", async () => {
    const reviewsReply = await askAgencyChatbot({ question: "Ou puis-je lire vos avis clients ?" });
    const feesReply = await askAgencyChatbot({ question: "Ou trouver les honoraires ?" });

    expect(reviewsReply.answer).toContain("/avis");
    expect(feesReply.answer).toContain("/honoraires");
  });

  it("forces lead capture for callback example prompt", async () => {
    const reply = await askAgencyChatbot({
      question: "Je ne trouve pas de bien adapte, pouvez-vous me rappeler ?",
    });

    expect(reply.needsLeadCapture).toBe(true);
  });

  it("returns district guidance for investment prompt", async () => {
    const reply = await askAgencyChatbot({
      question: "Quel quartier du Havre est le plus adapte pour un investissement locatif ?",
    });

    expect(reply.answer).toMatch(/Saint-Francois|Eure|Perret/i);
  });
});
