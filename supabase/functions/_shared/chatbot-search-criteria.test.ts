import { parseBedroomsMin, parsePriceHints } from "./chatbot-search-criteria.ts";

Deno.test("chatbot parses spelled-out French bedroom counts", () => {
  if (parseBedroomsMin("Je cherche un appartement avec deux chambres") !== 2) {
    throw new Error("Expected deux chambres to require at least two bedrooms.");
  }
});

Deno.test("chatbot keeps T-number bedroom mapping", () => {
  if (parseBedroomsMin("Appartement T3 au Havre") !== 2) {
    throw new Error("Expected T3 to map to at least two bedrooms.");
  }
});

Deno.test("chatbot parses a maximum budget with a French de preposition", () => {
  const priceHints = parsePriceHints("pour un budget maximum de 300 000 €");
  if (priceHints.priceMax !== 300_000) {
    throw new Error(`Expected a 300000 EUR maximum, got ${JSON.stringify(priceHints)}.`);
  }
});

Deno.test("chatbot applies both criteria from the tested natural-language query", () => {
  const question = "Appartement à vendre au Havre avec deux chambres, budget maximum de 300 000 €";
  const priceHints = parsePriceHints(question);
  if (parseBedroomsMin(question) !== 2 || priceHints.priceMax !== 300_000) {
    throw new Error(`Expected 2 bedrooms and a 300000 EUR maximum, got ${JSON.stringify({ bedroomsMin: parseBedroomsMin(question), ...priceHints })}.`);
  }
});
