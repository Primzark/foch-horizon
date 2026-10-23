import { describe, expect, it } from "vitest";
import {
  CHATBOT_EMBEDDING_DIMENSION,
  CHATBOT_EMBEDDING_MODEL,
  formatChatbotDocumentEmbeddingText,
  formatChatbotQueryEmbeddingText,
  isChatbotEmbeddingVector,
} from "../../supabase/functions/_shared/chatbot-embedding.mjs";

describe("chatbot embeddings", () => {
  it("uses the same stable Gemini model and database dimension", () => {
    expect(CHATBOT_EMBEDDING_MODEL).toBe("gemini-embedding-2");
    expect(CHATBOT_EMBEDDING_DIMENSION).toBe(1536);
  });

  it("uses Google's question-answering and document input formats", () => {
    expect(formatChatbotQueryEmbeddingText("  Comment vendre au Havre ? "))
      .toBe("task: question answering | query: Comment vendre au Havre ?");
    expect(formatChatbotDocumentEmbeddingText("  Guide immobilier  ", "  Conseils de vente.  "))
      .toBe("title: Guide immobilier | text: Conseils de vente.");
    expect(formatChatbotDocumentEmbeddingText("", "Contenu"))
      .toBe("title: none | text: Contenu");
  });

  it("rejects vectors with the wrong size or non-finite values", () => {
    expect(isChatbotEmbeddingVector(Array(CHATBOT_EMBEDDING_DIMENSION).fill(0.1))).toBe(true);
    expect(isChatbotEmbeddingVector(Array(768).fill(0.1))).toBe(false);
    const invalidVector = Array(CHATBOT_EMBEDDING_DIMENSION).fill(0.1);
    invalidVector[12] = Number.NaN;
    expect(isChatbotEmbeddingVector(invalidVector)).toBe(false);
  });
});
