import { describe, expect, it } from "vitest";
import { isStandaloneInternalPath, splitChatbotMessageContent } from "../features/content/utils/chatbotMessageLinks";

describe("chatbot message internal links", () => {
  it("does not turn slash units into internal navigation", () => {
    const segments = splitChatbotMessageContent("Des rafales à 60 km/h aujourd'hui.");

    expect(segments).toEqual(["Des rafales à 60 km/h aujourd'hui."]);
    expect(segments.some(isStandaloneInternalPath)).toBe(false);
  });

  it("still recognizes standalone internal routes", () => {
    const segments = splitChatbotMessageContent("Consultez /biens et /immobilier/le-havre.");

    expect(segments).toEqual(["Consultez ", "/biens", " et ", "/immobilier/le-havre", "."]);
    expect(segments.filter(isStandaloneInternalPath)).toEqual(["/biens", "/immobilier/le-havre"]);
  });

  it("does not reinterpret a URL path as an internal route", () => {
    const segments = splitChatbotMessageContent("Source : https://example.com/biens");

    expect(segments).toEqual(["Source : https://example.com/biens"]);
    expect(segments.some(isStandaloneInternalPath)).toBe(false);
  });
});
