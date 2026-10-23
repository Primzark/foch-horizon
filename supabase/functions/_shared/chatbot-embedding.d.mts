export const CHATBOT_EMBEDDING_MODEL: "gemini-embedding-2";
export const CHATBOT_EMBEDDING_DIMENSION: 1536;
export function formatChatbotDocumentEmbeddingText(title: string | null | undefined, content: string): string;
export function formatChatbotQueryEmbeddingText(query: string): string;
export function isChatbotEmbeddingVector(values: unknown): values is number[];
