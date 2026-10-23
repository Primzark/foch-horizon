import { describe, expect, it } from "vitest";
import { removeUnsolicitedAgencyPromotion } from "../../supabase/functions/_shared/chatbot-live-web-answer";

describe("generic live-web answer cleanup", () => {
  it("removes an unsolicited agency greeting and promotional call to action", () => {
    const answer = "Bonjour, ici Foch Immobilier au Havre. D'après les prévisions, il fera 14 °C. Pour tout projet immobilier, n'hésitez pas à nous contacter.";

    expect(removeUnsolicitedAgencyPromotion(answer, "Quelle météo aujourd’hui au Havre ?", "fr"))
      .toBe("D'après les prévisions, il fera 14 °C.");
  });

  it("keeps agency information when the user asked about the agency", () => {
    const answer = "Foch Immobilier does not offer rental management.";

    expect(removeUnsolicitedAgencyPromotion(answer, "Does Foch Immobilier offer rental management?", "en"))
      .toBe(answer);
  });

  it("uses a localized evidence fallback if every sentence was promotional", () => {
    expect(removeUnsolicitedAgencyPromotion("Foch Immobilier at your service.", "Weather tomorrow?", "en"))
      .toBe("I found live sources for this question. Please consult the source cards for the available evidence.");
  });
});
