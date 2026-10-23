import { describe, expect, it } from "vitest";
import {
  buildTavilySearchQuery,
  isTavilyResultRelevant,
} from "../../supabase/functions/_shared/chatbot-web-search-relevance";

describe("Tavily citation relevance", () => {
  it("removes a leading search command from the actual query", () => {
    expect(buildTavilySearchQuery(
      "Recherche sur le web : quelles sont les dernières informations météo au Havre aujourd’hui ?",
    )).toBe("quelles sont les dernières informations météo au Havre aujourd’hui ?");
    expect(buildTavilySearchQuery("Search the web for current Bitcoin prices")).toBe("current Bitcoin prices");
  });

  it("keeps a highly ranked result that matches the weather topic and city", () => {
    expect(isTavilyResultRelevant(
      "Recherche sur le web : quelles sont les dernières informations météo au Havre aujourd’hui ?",
      {
        title: "Prévisions météo pour Le Havre",
        content: "Forecast for Le Havre with temperatures and expected rainfall today.",
        score: 0.81,
      },
    )).toBe(true);
  });

  it("rejects a high-scoring SEO result that does not match the query topic", () => {
    expect(isTavilyResultRelevant("weather in Le Havre today", {
      title: "SEO market trends for Hartford tourism businesses",
      content: "Digital marketing advice and search optimization trends.",
      score: 0.94,
    })).toBe(false);
  });

  it("requires stronger ranking for one-term searches and rejects weak scores", () => {
    expect(isTavilyResultRelevant("Search the web for Bitcoin", {
      title: "Bitcoin price and market update",
      content: "Current Bitcoin market information.",
      score: 0.82,
    })).toBe(true);
    expect(isTavilyResultRelevant("weather in Le Havre", {
      title: "Le Havre weather forecast",
      content: "Weather forecast and temperatures for Le Havre.",
      score: 0.32,
    })).toBe(false);
  });

  it("fails closed when a result has no useful query terms or score", () => {
    expect(isTavilyResultRelevant("Search the web for latest information today", {
      title: "Latest updates",
      content: "Information available today.",
      score: 0.99,
    })).toBe(false);
    expect(isTavilyResultRelevant("weather in Le Havre", {
      title: "Le Havre weather forecast",
      content: "Forecast and temperatures.",
    })).toBe(false);
  });
});
