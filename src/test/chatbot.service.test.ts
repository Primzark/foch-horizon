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
    expect(reviewsReply.answer).toMatch(/Extraits|note Google|avis/i);
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

  it("keeps context on short follow-up questions", async () => {
    const firstQuestion = "Je cherche un appartement 2 chambres a Perret avec un budget de 260000 euros";
    const firstReply = await askAgencyChatbot({ question: firstQuestion });

    const followUpReply = await askAgencyChatbot({
      question: "Et en location ?",
      chatHistory: [
        { role: "user", content: firstQuestion },
        { role: "assistant", content: firstReply.answer },
        { role: "user", content: "Et en location ?" },
      ],
    });

    expect(followUpReply.answer.toLowerCase()).toContain("location");
    expect(followUpReply.suggestedPrompts.length).toBeGreaterThan(0);
  });

  it("answers prompts suggested by property replies", async () => {
    const seedReply = await askAgencyChatbot({ question: "Je cherche un appartement a vendre au Havre" });

    for (const prompt of seedReply.suggestedPrompts.slice(0, 3)) {
      const reply = await askAgencyChatbot({ question: prompt });
      expect(reply.answer.trim().length).toBeGreaterThan(20);
      expect(reply.suggestedPrompts.length).toBeGreaterThan(0);
    }
  });

  it("answers first-level prompts generated from example prompts", async () => {
    const generatedPrompts = new Set<string>();

    for (const prompt of chatbotExamplePrompts) {
      const reply = await askAgencyChatbot({ question: prompt });
      for (const generatedPrompt of reply.suggestedPrompts) {
        generatedPrompts.add(generatedPrompt);
      }
    }

    for (const prompt of generatedPrompts) {
      const reply = await askAgencyChatbot({ question: prompt });
      expect(reply.answer.trim().length).toBeGreaterThan(20);
      expect(reply.suggestedPrompts.length).toBeGreaterThan(0);
    }
  });

  it("handles greetings with a valid local answer", async () => {
    const reply = await askAgencyChatbot({ question: "Bonjour" });

    expect(reply.source).toBe("local");
    expect(reply.answer.toLowerCase()).toContain("je peux vous guider");
    expect(reply.suggestedPrompts.length).toBeGreaterThan(0);
  });

  it("routes legal questions to legal pages", async () => {
    const reply = await askAgencyChatbot({ question: "Ou puis-je lire votre politique de confidentialite ?" });

    expect(reply.answer).toContain("/confidentialite");
    expect(reply.suggestedPrompts.some((prompt) => prompt.includes("/confidentialite"))).toBe(true);
  });

  it("routes city market questions to city hub pages", async () => {
    const reply = await askAgencyChatbot({ question: "Je veux des infos immobilier a Montivilliers" });

    expect(reply.answer).toContain("/immobilier/montivilliers");
  });

  it("routes broad listing navigation to the listings page", async () => {
    const reply = await askAgencyChatbot({ question: "Ou voir toutes les annonces disponibles ?" });

    expect(reply.answer).toContain("/biens");
    expect(reply.propertySuggestions).toBeUndefined();
  });

  it("supports explicit internal path requests", async () => {
    const reply = await askAgencyChatbot({ question: "Ouvrir /plan-du-site" });

    expect(reply.answer).toContain("/plan-du-site");
    expect(reply.suggestedPrompts.some((prompt) => prompt.includes("/plan-du-site"))).toBe(true);
  });

  it("summarizes page content when a route is provided", async () => {
    const reply = await askAgencyChatbot({ question: "Peux-tu resumer la page /services ?" });

    expect(reply.answer).toContain("/services");
    expect(reply.answer.toLowerCase()).toContain("services");
    expect(reply.suggestedPrompts.length).toBeGreaterThan(0);
  });

  it("uses the most recent referenced path for follow-up navigation", async () => {
    const reply = await askAgencyChatbot({
      question: "Ouvre cette page",
      chatHistory: [
        { role: "assistant", content: "Pour vendre votre bien, utilisez /vendre." },
        { role: "assistant", content: "Pour lancer l'avis de valeur, la page dediee est /estimation." },
        { role: "user", content: "Ouvre cette page" },
      ],
    });

    expect(reply.answer).toContain("/estimation");
  });

  it("summarizes the latest referenced page on contextual follow-up", async () => {
    const reply = await askAgencyChatbot({
      question: "Peux-tu me resumer cette page ?",
      chatHistory: [
        { role: "assistant", content: "Les frais sont detailles ici: /honoraires" },
        { role: "user", content: "Peux-tu me resumer cette page ?" },
      ],
    });

    expect(reply.answer).toContain("/honoraires");
    expect(reply.answer.toLowerCase()).toContain("bareme");
  });

  it("answers city page content questions with dedicated city hubs", async () => {
    const reply = await askAgencyChatbot({
      question: "Que trouve-t-on sur la page immobilier montivilliers ?",
    });

    expect(reply.answer).toContain("/immobilier/montivilliers");
  });
});
