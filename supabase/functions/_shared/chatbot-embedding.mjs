export const CHATBOT_EMBEDDING_MODEL = "gemini-embedding-2";
export const CHATBOT_EMBEDDING_DIMENSION = 1536;

export function formatChatbotDocumentEmbeddingText(title, content) {
  const normalizedTitle = String(title ?? "").replace(/\s+/g, " ").trim() || "none";
  const normalizedContent = String(content ?? "").trim();
  return `title: ${normalizedTitle} | text: ${normalizedContent}`;
}

export function formatChatbotQueryEmbeddingText(query) {
  return `task: question answering | query: ${String(query ?? "").trim()}`;
}

export function isChatbotEmbeddingVector(values) {
  return Array.isArray(values) &&
    values.length === CHATBOT_EMBEDDING_DIMENSION &&
    values.every((value) => typeof value === "number" && Number.isFinite(value));
}
