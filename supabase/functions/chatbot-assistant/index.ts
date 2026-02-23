import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const toolSearchParamsSchema = z.object({
  transaction: z.enum(["vente", "location"]).optional(),
  type: z.enum(["appartement", "maison_villa", "autre"]).optional(),
  city: z.string().min(1).max(80).optional(),
  q: z.string().min(1).max(120).optional(),
  bedroomsMin: z.number().int().min(0).max(12).optional(),
  priceMin: z.number().int().min(0).max(50_000_000).optional(),
  priceMax: z.number().int().min(0).max(50_000_000).optional(),
  page: z.number().int().min(1).max(100).optional(),
  pageSize: z.number().int().min(1).max(10).optional(),
});

const conversationStateSchema = z.object({
  recentSearch: z
    .object({
      params: toolSearchParamsSchema.optional(),
      resultIds: z.array(z.number().int().positive()).max(20),
      total: z.number().int().min(0).max(5000).optional(),
      generatedAt: z.string().min(1).max(80),
    })
    .optional(),
  selectedPropertyIds: z.array(z.number().int().positive()).max(3).optional(),
  recentPropertyIds: z.array(z.number().int().positive()).max(20).optional(),
  leadDraft: z
    .object({
      propertyId: z.number().int().positive().optional(),
      citySlug: z.string().min(1).max(80).optional(),
      criteriaSummary: z.string().min(1).max(500).optional(),
    })
    .optional(),
  preferences: z
    .object({
      transaction: z.enum(["vente", "location"]).optional(),
      type: z.enum(["appartement", "maison_villa", "autre"]).optional(),
      city: z.string().min(1).max(80).optional(),
      bedroomsMin: z.number().int().min(0).max(12).optional(),
      priceMax: z.number().int().min(0).max(50_000_000).optional(),
      priceMin: z.number().int().min(0).max(50_000_000).optional(),
    })
    .optional(),
});

const actionRequestSchema = z.object({
  type: z.enum([
    "search_refine",
    "compare_selected_properties",
    "open_path_confirmed",
    "prepare_handoff",
    "prefill_lead_form",
  ]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const payloadSchema = z.object({
  question: z.string().min(2).max(1200),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .optional(),
  conversationState: conversationStateSchema.optional(),
  actionRequest: actionRequestSchema.optional(),
});

const systemPrompt = `You are the assistant for Foch Immobilier in Le Havre, France.
Use concise French.
Focus on: properties for sale/rent, neighborhoods (Perret, Saint-Francois, Saint-Vincent, Sanvic, Graville, Eure-Docks), services (vente, location, gestion locative), and real-estate process (offre, compromis, notaire, acte).
If no perfect property match, invite the user to leave email + criteria so agency can follow up.
Do not invent exact legal claims. Keep answers practical.`;

interface OpenAIEmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

interface GeminiEmbedContentResponse {
  embedding?: {
    values?: number[];
  };
}

type AIProvider = "gemini" | "openai";
type RAGRetrievalMode = "none" | "vector" | "keyword" | "hybrid";
type AgentMode = "tool" | "rag" | "fallback";

interface ToolSearchParams {
  transaction?: "vente" | "location";
  type?: "appartement" | "maison_villa" | "autre";
  city?: string;
  q?: string;
  bedroomsMin?: number;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  pageSize?: number;
}

interface ToolRecentSearchState {
  params?: ToolSearchParams;
  resultIds: number[];
  total?: number;
  generatedAt: string;
}

interface ToolConversationState {
  recentSearch?: ToolRecentSearchState;
  selectedPropertyIds?: number[];
  recentPropertyIds?: number[];
  leadDraft?: {
    propertyId?: number;
    citySlug?: string;
    criteriaSummary?: string;
  };
  preferences?: {
    transaction?: "vente" | "location";
    type?: "appartement" | "maison_villa" | "autre";
    city?: string;
    bedroomsMin?: number;
    priceMin?: number;
    priceMax?: number;
  };
}

interface ToolActionRequest {
  type:
    | "search_refine"
    | "compare_selected_properties"
    | "open_path_confirmed"
    | "prepare_handoff"
    | "prefill_lead_form";
  payload?: Record<string, unknown>;
}

interface ToolSearchResultItem {
  id: number;
  title: string;
  priceAmount: number;
  currency: string;
  surfaceM2: number | null;
  bedrooms: number | null;
  cityName: string;
  citySlug: string;
  path: string;
  coverImageUrl: string;
  dpeLabel: string | null;
  transaction: string;
  type: string;
}

interface ToolCompareProperty {
  id: number;
  title: string;
  path: string;
  priceAmount: number;
  surfaceM2: number | null;
  bedrooms: number | null;
  cityName: string;
  dpeLabel: string | null;
  terrainM2?: number | null;
  garageCount?: number | null;
  bathrooms?: number | null;
}

interface ToolTraceItem {
  tool: "search_properties" | "get_properties" | "compare_properties" | "prepare_handoff";
  status: "ok" | "error" | "skipped";
  latencyMs: number;
  resultCount?: number;
  errorCode?: string;
}

interface ToolUiActionBase {
  id: string;
  title: string;
  description?: string;
  requiresConfirmation?: boolean;
}

interface ToolUiActionSearchResults extends ToolUiActionBase {
  kind: "search_results";
  data: {
    criteriaSummary: string;
    searchParams: ToolSearchParams;
    total: number;
    items: ToolSearchResultItem[];
    canCompare: boolean;
    compareSelectionLimit: number;
    nextSuggestedRefinements?: string[];
  };
}

interface ToolUiActionCompareSummary extends ToolUiActionBase {
  kind: "compare_summary";
  data: {
    propertyIds: number[];
    properties: ToolCompareProperty[];
    comparisonRows: Array<{ label: string; values: Array<string | null> }>;
    summary: string;
    recommendedPropertyId?: number;
    nextActions?: Array<"open_property" | "prefill_handoff">;
  };
}

interface ToolUiActionOpenPage extends ToolUiActionBase {
  kind: "open_page";
  data: { path: string; label: string; reason?: string };
}

interface ToolUiActionLeadHandoffDraft extends ToolUiActionBase {
  kind: "lead_handoff_draft";
  data: {
    draft: { source: "contact_page"; propertyId?: number; criteriaMessage: string };
    prefill: { criteria: string; firstName?: string; lastName?: string; email?: string };
    missingFields: Array<"firstName" | "lastName" | "email">;
    contextSummary: string;
  };
}

interface ToolUiActionNotice extends ToolUiActionBase {
  kind: "notice";
  data: { level?: "info" | "warning"; code?: string };
}

type ToolUiAction =
  | ToolUiActionSearchResults
  | ToolUiActionCompareSummary
  | ToolUiActionOpenPage
  | ToolUiActionLeadHandoffDraft
  | ToolUiActionNotice;

interface ToolOrchestrationResult {
  answer: string;
  suggestedPrompts: string[];
  actions: ToolUiAction[];
  conversationStatePatch?: Partial<ToolConversationState>;
  toolTrace: ToolTraceItem[];
  agentMode: AgentMode;
  planner?: PlannerMeta;
}

type PlannerToolName = "search_properties" | "compare_properties" | "prepare_handoff";
type PlannerDecisionType = "tool_call" | "clarify" | "none";
type PlannerMode = "disabled" | "gemini" | "deterministic_fallback";

interface PlannerMeta {
  provider: "gemini" | "fallback";
  mode: PlannerMode;
  decisionType: PlannerDecisionType;
  toolName?: PlannerToolName;
  reasonCode?: string;
  confidence?: number;
}

interface PlannerClarification {
  question: string;
  missingFields?: Array<"transaction" | "city" | "budget" | "type" | "bedrooms">;
  options?: string[];
}

type PlannerToolArgs =
  | ({ tool: "search_properties"; args: ToolSearchParams })
  | ({ tool: "compare_properties"; args?: { propertyIds?: number[] } })
  | ({ tool: "prepare_handoff"; args?: { propertyIds?: number[] } });

type PlannerDecision =
  | {
      version: 1;
      decisionType: "tool_call";
      confidence?: number;
      reasonCode?: string;
      toolCall: PlannerToolArgs;
    }
  | {
      version: 1;
      decisionType: "clarify";
      confidence?: number;
      reasonCode?: string;
      clarification: PlannerClarification;
    };

const plannerRawToolCallSchema = z.object({
  tool: z.string().min(1),
  args: z.unknown().optional(),
});

const plannerRawClarificationSchema = z.object({
  question: z.string().min(1),
  missingFields: z.array(z.string()).optional(),
  options: z.array(z.string()).optional(),
});

const plannerRawDecisionSchema = z.object({
  version: z.number().optional(),
  decisionType: z.string().min(1),
  confidence: z.number().optional(),
  reasonCode: z.string().optional(),
  toolCall: plannerRawToolCallSchema.optional(),
  clarification: plannerRawClarificationSchema.optional(),
});

interface RAGMatchRow {
  id?: string;
  document_key?: string;
  path?: string;
  source_url?: string;
  title?: string | null;
  section_heading?: string | null;
  content?: string;
  metadata?: Record<string, unknown> | null;
  similarity?: number | null;
  keyword_rank?: number | null;
}

interface SanitizedRAGMatchRow {
  id?: string;
  document_key?: string;
  path: string;
  source_url?: string;
  title: string | null;
  section_heading: string | null;
  content: string;
  similarity: number | null;
  keyword_rank: number | null;
  metadata?: Record<string, unknown> | null;
  rerank_score?: number;
}

interface RAGCitation {
  path: string;
  title?: string;
  sourceUrl?: string;
  similarity?: number;
}

interface RAGContextResult {
  contextBlock: string | null;
  citations: RAGCitation[];
  retrievalMode: RAGRetrievalMode;
}

function parseProviderEnv(name: string): AIProvider | null {
  const raw = (Deno.env.get(name) ?? "").trim().toLowerCase();
  if (raw === "gemini" || raw === "openai") return raw;
  return null;
}

function resolveGenerationProvider(): { provider: AIProvider; apiKey: string } | null {
  const explicit = parseProviderEnv("CHATBOT_LLM_PROVIDER");
  const geminiKey = (Deno.env.get("GEMINI_API_KEY") ?? "").trim();
  const openAiKey = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();

  if (explicit === "gemini") return geminiKey ? { provider: "gemini", apiKey: geminiKey } : null;
  if (explicit === "openai") return openAiKey ? { provider: "openai", apiKey: openAiKey } : null;

  if (geminiKey) return { provider: "gemini", apiKey: geminiKey };
  if (openAiKey) return { provider: "openai", apiKey: openAiKey };
  return null;
}

function resolveEmbeddingProvider(): { provider: AIProvider; apiKey: string } | null {
  const explicit = parseProviderEnv("CHATBOT_EMBEDDING_PROVIDER");
  const geminiKey = (Deno.env.get("GEMINI_API_KEY") ?? "").trim();
  const openAiKey = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();

  if (explicit === "gemini") return geminiKey ? { provider: "gemini", apiKey: geminiKey } : null;
  if (explicit === "openai") return openAiKey ? { provider: "openai", apiKey: openAiKey } : null;

  if (geminiKey) return { provider: "gemini", apiKey: geminiKey };
  if (openAiKey) return { provider: "openai", apiKey: openAiKey };
  return null;
}

function parseBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = Deno.env.get(name);
  if (raw == null) return fallback;

  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseNumberEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function vectorToPgLiteral(vector: number[]): string {
  return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function uniqueTokens(value: string): Set<string> {
  return new Set(tokenize(value));
}

function extractPathMentions(question: string): string[] {
  const matches = question.match(/\/[a-z0-9-]+(?:\/[a-z0-9-]+)*/gi) ?? [];
  return [...new Set(matches.map((value) => value.toLowerCase()))];
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function createRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // Ignore and fall back to a time-based id.
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeHistoryForModel(
  chatHistory: Array<{ role: "user" | "assistant"; content: string }> | undefined,
  question: string,
) {
  const trimmed = (chatHistory ?? []).slice(-6);

  if (trimmed.length === 0) {
    return trimmed;
  }

  const last = trimmed[trimmed.length - 1];
  if (last.role === "user" && last.content.trim() === question.trim()) {
    return trimmed.slice(0, -1);
  }

  return trimmed;
}

async function createOpenAIQueryEmbedding(question: string, apiKey: string): Promise<number[] | null> {
  const embeddingModel = Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small";

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: embeddingModel,
      input: question,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as OpenAIEmbeddingResponse;
  const embedding = payload.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.length === 0 || !embedding.every((item) => typeof item === "number")) {
    return null;
  }

  return embedding;
}

async function createGeminiQueryEmbedding(question: string, apiKey: string): Promise<number[] | null> {
  const embeddingModel = Deno.env.get("GEMINI_EMBEDDING_MODEL") ?? "gemini-embedding-001";
  const outputDimensionality = clamp(
    Math.floor(parseNumberEnv("CHATBOT_RAG_EMBEDDING_DIMENSION", 1536)),
    128,
    3072,
  );
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model: `models/${embeddingModel}`,
      content: {
        parts: [{ text: question }],
      },
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GeminiEmbedContentResponse;
  const embedding = payload.embedding?.values;

  if (!Array.isArray(embedding) || embedding.length === 0 || !embedding.every((item) => typeof item === "number")) {
    return null;
  }

  return embedding;
}

async function createQueryEmbedding(question: string): Promise<number[] | null> {
  const providerConfig = resolveEmbeddingProvider();
  if (!providerConfig) return null;

  if (providerConfig.provider === "gemini") {
    return await createGeminiQueryEmbedding(question, providerConfig.apiKey);
  }

  return await createOpenAIQueryEmbedding(question, providerConfig.apiKey);
}

function sanitizeRagRows(rawRows: unknown): SanitizedRAGMatchRow[] {
  if (!Array.isArray(rawRows)) return [];

  return rawRows
    .filter((row): row is RAGMatchRow => Boolean(row && typeof row === "object"))
    .filter((row) => typeof row.path === "string" && typeof row.content === "string")
    .map((row): SanitizedRAGMatchRow => ({
      id: typeof row.id === "string" ? row.id : undefined,
      document_key: typeof row.document_key === "string" ? row.document_key : undefined,
      path: row.path!.trim(),
      content: row.content!.trim(),
      title: typeof row.title === "string" ? row.title.trim() : null,
      section_heading: typeof row.section_heading === "string" ? row.section_heading.trim() : null,
      source_url: typeof row.source_url === "string" ? row.source_url.trim() : undefined,
      similarity: typeof row.similarity === "number" ? row.similarity : null,
      keyword_rank: typeof row.keyword_rank === "number" ? row.keyword_rank : null,
      metadata:
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? row.metadata
          : null,
    }))
    .filter((row) => row.path.length > 0 && row.content.length > 0);
}

function buildRagContextBlock(rows: SanitizedRAGMatchRow[], retrievalMode: RAGRetrievalMode): RAGContextResult {
  if (rows.length === 0) {
    return { contextBlock: null, citations: [], retrievalMode: "none" };
  }

  const maxContextChars = clamp(Math.floor(parseNumberEnv("CHATBOT_RAG_MAX_CONTEXT_CHARS", 5200)), 1200, 12000);
  const maxChunksFallback = clamp(Math.floor(parseNumberEnv("CHATBOT_RAG_MAX_CHUNKS", 5)), 1, 8);
  const maxChunks = clamp(Math.floor(parseNumberEnv("CHATBOT_RAG_CONTEXT_TOP_N", maxChunksFallback)), 1, 8);
  const seenPaths = new Set<string>();
  const blocks: string[] = [];
  const citations: RAGCitation[] = [];
  let totalChars = 0;

  for (const row of rows.slice(0, maxChunks)) {
    const similarityLabel = typeof row.similarity === "number" ? ` (sim=${row.similarity.toFixed(3)})` : "";
    const rankLabel = typeof row.rerank_score === "number" ? ` (rank=${row.rerank_score.toFixed(3)})` : "";
    const sectionLine = row.section_heading ? `\nsection: ${row.section_heading}` : "";
    const excerpt = truncateText(row.content, 1100);
    const block =
      `[source]\npath: ${row.path}${similarityLabel}${rankLabel}\n` +
      `title: ${row.title || "Sans titre"}${sectionLine}\n` +
      `excerpt: ${excerpt}`;

    if (totalChars + block.length > maxContextChars && blocks.length > 0) {
      break;
    }

    blocks.push(block);
    totalChars += block.length;

    if (!seenPaths.has(row.path)) {
      seenPaths.add(row.path);
      citations.push({
        path: row.path,
        title: row.title ?? undefined,
        sourceUrl: row.source_url,
        similarity: typeof row.similarity === "number" ? row.similarity : undefined,
      });
    }
  }

  if (blocks.length === 0) {
    return { contextBlock: null, citations: [], retrievalMode: "none" };
  }

  const contextBlock = [
    "WEBSITE_CONTEXT",
    "Use this context first for questions about pages, services, neighborhoods, legal pages, or site navigation.",
    "Cite internal paths like /services or /contact when relevant. If context is insufficient, say so briefly.",
    `retrieval_mode: ${retrievalMode}`,
    ...blocks,
  ].join("\n\n");

  return { contextBlock, citations, retrievalMode };
}

async function retrieveVectorCandidates(
  supabase: ReturnType<typeof createServiceClient>,
  embedding: number[],
  pathPrefix: string | null,
): Promise<SanitizedRAGMatchRow[]> {
  const matchCount = clamp(
    Math.floor(parseNumberEnv("CHATBOT_RAG_VECTOR_MATCH_COUNT", parseNumberEnv("CHATBOT_RAG_MATCH_COUNT", 6))),
    1,
    20,
  );
  const matchThreshold = clamp(parseNumberEnv("CHATBOT_RAG_MATCH_THRESHOLD", 0.7), 0, 1);
  const { data, error } = await supabase.rpc("match_chatbot_content_chunks", {
    query_embedding_text: vectorToPgLiteral(embedding),
    match_count: matchCount,
    match_threshold: matchThreshold,
    path_prefix: pathPrefix,
  });

  if (error) {
    return [];
  }

  return sanitizeRagRows(data);
}

async function retrieveKeywordCandidates(
  supabase: ReturnType<typeof createServiceClient>,
  question: string,
  pathPrefix: string | null,
): Promise<SanitizedRAGMatchRow[]> {
  const matchCount = clamp(Math.floor(parseNumberEnv("CHATBOT_RAG_KEYWORD_MATCH_COUNT", 12)), 1, 30);
  const { data, error } = await supabase.rpc("match_chatbot_content_chunks_keyword", {
    query_text: question,
    match_count: matchCount,
    path_prefix: pathPrefix,
  });

  if (error) {
    return [];
  }

  return sanitizeRagRows(data);
}

function tokenOverlapScore(queryTokens: Set<string>, text: string): number {
  if (queryTokens.size === 0) return 0;
  const candidateTokens = uniqueTokens(text);
  if (candidateTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) overlap += 1;
  }
  return clamp01(overlap / Math.max(1, Math.min(queryTokens.size, 8)));
}

const domainTerms = new Set([
  "honoraires",
  "confidentialite",
  "cookies",
  "mentions",
  "legales",
  "rgpd",
  "sanvic",
  "perret",
  "graville",
  "eure",
  "montivilliers",
  "harfleur",
  "gainneville",
]);

function domainTermBoost(questionTokens: Set<string>, row: SanitizedRAGMatchRow): number {
  const matchedQuestionTerms = [...questionTokens].filter((token) => domainTerms.has(token));
  if (matchedQuestionTerms.length === 0) return 0;
  const haystack = normalizeText(`${row.path} ${row.title ?? ""} ${row.section_heading ?? ""} ${row.content.slice(0, 300)}`);
  let hits = 0;
  for (const token of matchedQuestionTerms) {
    if (haystack.includes(token)) hits += 1;
  }
  return clamp01(hits / matchedQuestionTerms.length);
}

function mergeAndRerankCandidates(
  question: string,
  vectorRows: SanitizedRAGMatchRow[],
  keywordRows: SanitizedRAGMatchRow[],
): { rows: SanitizedRAGMatchRow[]; retrievalMode: RAGRetrievalMode } {
  const hasVector = vectorRows.length > 0;
  const hasKeyword = keywordRows.length > 0;
  const retrievalMode: RAGRetrievalMode = hasVector && hasKeyword ? "hybrid" : hasVector ? "vector" : hasKeyword ? "keyword" : "none";
  if (retrievalMode === "none") {
    return { rows: [], retrievalMode };
  }

  const byKey = new Map<string, SanitizedRAGMatchRow>();
  const keyForRow = (row: SanitizedRAGMatchRow) =>
    `${row.path}::${row.section_heading ?? ""}::${row.content.slice(0, 160)}`;

  for (const row of [...vectorRows, ...keywordRows]) {
    const key = keyForRow(row);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...row });
      continue;
    }
    byKey.set(key, {
      ...existing,
      similarity:
        typeof row.similarity === "number"
          ? Math.max(existing.similarity ?? 0, row.similarity)
          : existing.similarity,
      keyword_rank:
        typeof row.keyword_rank === "number"
          ? Math.max(existing.keyword_rank ?? 0, row.keyword_rank)
          : existing.keyword_rank,
      source_url: existing.source_url ?? row.source_url,
      title: existing.title ?? row.title,
      section_heading: existing.section_heading ?? row.section_heading,
    });
  }

  const allRows = [...byKey.values()];
  const maxKeywordRank = allRows.reduce((max, row) => Math.max(max, row.keyword_rank ?? 0), 0);
  const queryTokens = uniqueTokens(question);
  const pathMentions = extractPathMentions(question);
  const vectorWeight = clamp(parseNumberEnv("CHATBOT_RAG_HYBRID_VECTOR_WEIGHT", 0.55), 0, 1);
  const keywordWeight = clamp(parseNumberEnv("CHATBOT_RAG_HYBRID_KEYWORD_WEIGHT", 0.30), 0, 1);
  const rerankTopN = clamp(Math.floor(parseNumberEnv("CHATBOT_RAG_RERANK_TOP_N", 8)), 1, 20);

  const scored = allRows
    .map((row) => {
      const vectorScore = clamp01(row.similarity ?? 0);
      const keywordScore =
        maxKeywordRank > 0 && typeof row.keyword_rank === "number"
          ? clamp01(Math.log1p(Math.max(0, row.keyword_rank)) / Math.log1p(maxKeywordRank))
          : 0;
      const titleAndSection = `${row.title ?? ""} ${row.section_heading ?? ""}`;
      const titleTokenScore = tokenOverlapScore(queryTokens, titleAndSection);
      const exactPathBoost =
        pathMentions.length > 0 && pathMentions.some((path) => row.path.toLowerCase() === path || row.path.toLowerCase().startsWith(path))
          ? 1
          : 0;
      const titleSignal = clamp01(titleTokenScore + domainTermBoost(queryTokens, row) * 0.35);
      const rerankScore = clamp01(
        vectorWeight * vectorScore +
          keywordWeight * keywordScore +
          0.1 * titleSignal +
          0.05 * exactPathBoost,
      );
      return {
        ...row,
        rerank_score: rerankScore,
      } satisfies SanitizedRAGMatchRow;
    })
    .sort((a, b) => {
      const scoreDelta = (b.rerank_score ?? 0) - (a.rerank_score ?? 0);
      if (scoreDelta !== 0) return scoreDelta;
      const similarityDelta = (b.similarity ?? 0) - (a.similarity ?? 0);
      if (similarityDelta !== 0) return similarityDelta;
      return a.path.localeCompare(b.path);
    });

  const selected: SanitizedRAGMatchRow[] = [];
  const pool = [...scored];
  const pathCounts = new Map<string, number>();

  while (selected.length < rerankTopN && pool.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let index = 0; index < pool.length; index += 1) {
      const row = pool[index];
      const duplicatePenalty = 0.08 * (pathCounts.get(row.path) ?? 0);
      const penalizedScore = (row.rerank_score ?? 0) - duplicatePenalty;
      if (penalizedScore > bestScore) {
        bestScore = penalizedScore;
        bestIndex = index;
      }
    }
    const [bestRow] = pool.splice(bestIndex, 1);
    selected.push(bestRow);
    pathCounts.set(bestRow.path, (pathCounts.get(bestRow.path) ?? 0) + 1);
  }

  return { rows: selected, retrievalMode };
}

async function retrieveWebsiteContext(question: string): Promise<RAGContextResult> {
  const ragEnabled = parseBooleanEnv("CHATBOT_RAG_ENABLED", true);
  if (!ragEnabled) {
    return { contextBlock: null, citations: [], retrievalMode: "none" };
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return { contextBlock: null, citations: [], retrievalMode: "none" };
  }

  const hybridEnabled = parseBooleanEnv("CHATBOT_RAG_HYBRID_ENABLED", true);
  const pathPrefixRaw = (Deno.env.get("CHATBOT_RAG_PATH_PREFIX") ?? "").trim();
  const pathPrefix = pathPrefixRaw.length > 0 ? pathPrefixRaw : null;

  const keywordPromise = hybridEnabled ? retrieveKeywordCandidates(supabase, question, pathPrefix) : Promise.resolve([]);
  const embeddingPromise = createQueryEmbedding(question);

  const [keywordRows, embedding] = await Promise.all([keywordPromise, embeddingPromise]);

  let vectorRows: SanitizedRAGMatchRow[] = [];
  if (embedding) {
    vectorRows = await retrieveVectorCandidates(supabase, embedding, pathPrefix);
  } else if (!hybridEnabled) {
    return { contextBlock: null, citations: [], retrievalMode: "none" };
  }

  const merged = mergeAndRerankCandidates(question, vectorRows, keywordRows);
  return buildRagContextBlock(merged.rows, merged.retrievalMode);
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Je peux vous aider sur les biens, quartiers et etapes de votre projet immobilier au Havre.";
  }

  const outputText = (payload as { output_text?: string }).output_text;
  if (typeof outputText === "string" && outputText.trim().length > 0) {
    return outputText.trim();
  }

  const output = (payload as { output?: unknown[] }).output;
  if (!Array.isArray(output)) {
    return "Je peux vous aider sur les biens, quartiers et etapes de votre projet immobilier au Havre.";
  }

  const fragments: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const text = (block as { text?: string }).text;
      if (typeof text === "string" && text.trim().length > 0) {
        fragments.push(text.trim());
      }
    }
  }

  return fragments.join("\n\n") || "Je peux vous aider sur les biens, quartiers et etapes de votre projet immobilier au Havre.";
}

function extractGeminiOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Je peux vous aider sur les biens, quartiers et etapes de votre projet immobilier au Havre.";
  }

  const candidates = (payload as GeminiGenerateContentResponse).candidates;
  if (!Array.isArray(candidates)) {
    return "Je peux vous aider sur les biens, quartiers et etapes de votre projet immobilier au Havre.";
  }

  const fragments: string[] = [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim().length > 0) {
        fragments.push(part.text.trim());
      }
    }
  }

  return fragments.join("\n\n") || "Je peux vous aider sur les biens, quartiers et etapes de votre projet immobilier au Havre.";
}

function buildGeminiContents(
  question: string,
  normalizedHistory: Array<{ role: "user" | "assistant"; content: string }>,
) {
  return [
    ...normalizedHistory.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    {
      role: "user",
      parts: [{ text: question }],
    },
  ];
}

async function generateAssistantAnswer(
  question: string,
  normalizedHistory: Array<{ role: "user" | "assistant"; content: string }>,
  ragContext: RAGContextResult,
): Promise<{ provider: AIProvider; answer: string } | null> {
  const providerConfig = resolveGenerationProvider();
  if (!providerConfig) return null;

  if (providerConfig.provider === "gemini") {
    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash-lite";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": providerConfig.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: [
                systemPrompt,
                ragContext.contextBlock ? `\n\n${ragContext.contextBlock}` : "",
              ].join(""),
            },
          ],
        },
        contents: buildGeminiContents(question, normalizedHistory),
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 420,
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      provider: "gemini",
      answer: extractGeminiOutputText(data),
    };
  }

  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerConfig.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_output_tokens: 420,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        ...(ragContext.contextBlock
          ? [
              {
                role: "system" as const,
                content: [{ type: "input_text", text: ragContext.contextBlock }],
              },
            ]
          : []),
        ...normalizedHistory.map((message) => ({
          role: message.role,
          content: [{ type: "input_text", text: message.content }],
        })),
        {
          role: "user",
          content: [{ type: "input_text", text: question }],
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return {
    provider: "openai",
    answer: extractOutputText(data),
  };
}

interface GeminiPlannerConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
  includeHistoryTurns: number;
  maxQuestionChars: number;
  temperature: number;
}

function resolveGeminiPlannerConfig(): GeminiPlannerConfig | null {
  const enabled = parseBooleanEnv("CHATBOT_GEMINI_PLANNER_ENABLED", false);
  if (!enabled) return null;

  const apiKey = (Deno.env.get("GEMINI_API_KEY") ?? "").trim();
  if (!apiKey) return null;

  const model = (Deno.env.get("CHATBOT_GEMINI_PLANNER_MODEL") ?? "gemini-2.5-flash-lite").trim() || "gemini-2.5-flash-lite";
  return {
    apiKey,
    model,
    timeoutMs: clamp(Math.floor(parseNumberEnv("CHATBOT_GEMINI_PLANNER_TIMEOUT_MS", 1800)), 600, 10_000),
    includeHistoryTurns: clamp(Math.floor(parseNumberEnv("CHATBOT_GEMINI_PLANNER_INCLUDE_HISTORY_TURNS", 4)), 0, 6),
    maxQuestionChars: clamp(Math.floor(parseNumberEnv("CHATBOT_GEMINI_PLANNER_MAX_QUESTION_CHARS", 700)), 80, 1200),
    temperature: clamp(parseNumberEnv("CHATBOT_GEMINI_PLANNER_TEMPERATURE", 0), 0, 1),
  };
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }
  return trimmed;
}

function parsePlannerNumber(value: unknown, min: number, max: number): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return undefined;
  return clamp(Math.floor(parsed), min, max);
}

function sanitizePlannerSearchArgs(rawArgs: unknown): ToolSearchParams {
  if (!rawArgs || typeof rawArgs !== "object") return {};
  const candidate = rawArgs as Record<string, unknown>;
  const parsed: ToolSearchParams = {};

  if (candidate.transaction === "vente" || candidate.transaction === "location") {
    parsed.transaction = candidate.transaction;
  }
  if (candidate.type === "appartement" || candidate.type === "maison_villa" || candidate.type === "autre") {
    parsed.type = candidate.type;
  }
  if (typeof candidate.city === "string" && candidate.city.trim().length > 0) {
    parsed.city = candidate.city.trim().slice(0, 80);
  }
  if (typeof candidate.q === "string" && candidate.q.trim().length > 0) {
    parsed.q = candidate.q.trim().slice(0, 120);
  }

  const bedroomsMin = parsePlannerNumber(candidate.bedroomsMin, 0, 12);
  if (typeof bedroomsMin === "number") parsed.bedroomsMin = bedroomsMin;
  const priceMin = parsePlannerNumber(candidate.priceMin, 0, 50_000_000);
  if (typeof priceMin === "number") parsed.priceMin = priceMin;
  const priceMax = parsePlannerNumber(candidate.priceMax, 0, 50_000_000);
  if (typeof priceMax === "number") parsed.priceMax = priceMax;
  const page = parsePlannerNumber(candidate.page, 1, 100);
  if (typeof page === "number") parsed.page = page;
  const pageSize = parsePlannerNumber(candidate.pageSize, 1, 10);
  if (typeof pageSize === "number") parsed.pageSize = pageSize;

  if (parsed.priceMin != null && parsed.priceMax != null && parsed.priceMin > parsed.priceMax) {
    [parsed.priceMin, parsed.priceMax] = [parsed.priceMax, parsed.priceMin];
  }

  return parsed;
}

function normalizePlannerRawInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const source = raw as Record<string, unknown>;
  const root =
    source.decision && typeof source.decision === "object" && !Array.isArray(source.decision)
      ? (source.decision as Record<string, unknown>)
      : source;

  const maybeParseJsonString = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return value;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  };

  const toolCallSource =
    (root.toolCall && typeof root.toolCall === "object" && !Array.isArray(root.toolCall)
      ? root.toolCall
      : root.tool_call && typeof root.tool_call === "object" && !Array.isArray(root.tool_call)
        ? root.tool_call
        : null) as Record<string, unknown> | null;
  const toolFunctionSource =
    (toolCallSource?.function && typeof toolCallSource.function === "object" && !Array.isArray(toolCallSource.function)
      ? (toolCallSource.function as Record<string, unknown>)
      : null);
  const rootToolCallSource =
    (!toolCallSource &&
      (typeof root.tool === "string" ||
        typeof root.name === "string" ||
        typeof root.toolName === "string" ||
        typeof root.tool_name === "string"))
      ? root
      : null;

  const clarificationSource =
    (root.clarification && typeof root.clarification === "object" && !Array.isArray(root.clarification)
      ? root.clarification
      : root.clarify && typeof root.clarify === "object" && !Array.isArray(root.clarify)
        ? root.clarify
        : null) as Record<string, unknown> | null;

  const normalizeDecisionType = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const v = value.trim().toLowerCase();
    if (v === "tool_call" || v === "toolcall" || v === "tool" || v === "call_tool") return "tool_call";
    if (v === "clarify" || v === "clarification" || v === "ask_clarification" || v === "question") return "clarify";
    return value;
  };
  const normalizeToolName = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const v = value.trim().toLowerCase();
    if (v === "search_properties" || v === "search" || v === "property_search") return "search_properties";
    if (v === "compare_properties" || v === "compare" || v === "comparison") return "compare_properties";
    if (v === "prepare_handoff" || v === "handoff" || v === "contact" || v === "prepare_contact") return "prepare_handoff";
    return value;
  };

  const normalized: Record<string, unknown> = {
    version: root.version === 1 ? 1 : 1,
    decisionType: normalizeDecisionType(root.decisionType ?? root.decision_type ?? root.type),
    confidence:
      typeof root.confidence === "number"
        ? root.confidence
        : typeof root.confidence === "string"
          ? Number(root.confidence)
          : undefined,
    reasonCode: root.reasonCode ?? root.reason_code,
  };

  if (toolCallSource) {
    normalized.toolCall = {
      tool: normalizeToolName(
        toolFunctionSource?.name ??
          toolCallSource.tool ??
          toolCallSource.name ??
          toolCallSource.toolName ??
          toolCallSource.tool_name,
      ),
      args: maybeParseJsonString(
        toolFunctionSource?.args ??
          toolFunctionSource?.arguments ??
          toolCallSource.args ??
          toolCallSource.arguments ??
          toolCallSource.parameters,
      ),
    };
  } else if (rootToolCallSource) {
    normalized.toolCall = {
      tool: normalizeToolName(
        rootToolCallSource.tool ??
          rootToolCallSource.name ??
          rootToolCallSource.toolName ??
          rootToolCallSource.tool_name,
      ),
      args: maybeParseJsonString(rootToolCallSource.args ?? rootToolCallSource.arguments ?? rootToolCallSource.parameters),
    };
  }

  if (clarificationSource) {
    normalized.clarification = {
      question:
        clarificationSource.question ??
        clarificationSource.prompt ??
        clarificationSource.message,
      missingFields:
        clarificationSource.missingFields ??
        clarificationSource.missing_fields,
      options:
        clarificationSource.options ??
        clarificationSource.suggestions ??
        clarificationSource.choices,
    };
  }

  if (!normalized.decisionType) {
    if (normalized.toolCall) normalized.decisionType = "tool_call";
    else if (normalized.clarification) normalized.decisionType = "clarify";
  }

  return normalized;
}

function sanitizePlannerDecision(raw: unknown): PlannerDecision | null {
  const parsed = plannerRawDecisionSchema.safeParse(normalizePlannerRawInput(raw));
  if (!parsed.success) return null;

  const candidate = parsed.data;
  const decisionType = String(candidate.decisionType).trim().toLowerCase();
  if (decisionType !== "tool_call" && decisionType !== "clarify") return null;
  const confidence = typeof candidate.confidence === "number" ? clamp01(candidate.confidence) : undefined;
  const reasonCode = typeof candidate.reasonCode === "string" ? candidate.reasonCode.trim().slice(0, 80) : undefined;

  if (decisionType === "clarify") {
    if (!candidate.clarification) return null;
    const missingFields = Array.isArray(candidate.clarification.missingFields)
      ? candidate.clarification.missingFields
          .map((field) => String(field).trim().toLowerCase())
          .map((field) => {
            if (field === "transaction" || field === "city" || field === "budget" || field === "type" || field === "bedrooms") return field;
            if (field === "price" || field === "price_max" || field === "budgetmax") return "budget";
            if (field === "bedroom" || field === "rooms" || field === "chambres") return "bedrooms";
            return null;
          })
          .filter(
            (field): field is "transaction" | "city" | "budget" | "type" | "bedrooms" => field != null,
          )
          .slice(0, 5)
      : undefined;
    return {
      version: 1,
      decisionType: "clarify",
      confidence,
      reasonCode,
      clarification: {
        question: candidate.clarification.question.trim().slice(0, 280),
        missingFields,
        options: candidate.clarification.options?.map((option) => option.trim().slice(0, 120)).filter(Boolean).slice(0, 4),
      },
    };
  }

  if (!candidate.toolCall) return null;
  const tool = String(candidate.toolCall.tool).trim();

  if (tool === "search_properties") {
    return {
      version: 1,
      decisionType: "tool_call",
      confidence,
      reasonCode,
      toolCall: {
        tool,
        args: sanitizePlannerSearchArgs(candidate.toolCall.args),
      },
    };
  }

  if (tool === "compare_properties") {
    const propertyIds = uniqueNumberList(
      Array.isArray((candidate.toolCall.args as { propertyIds?: unknown[] } | undefined)?.propertyIds)
        ? ((candidate.toolCall.args as { propertyIds?: unknown[] }).propertyIds ?? []).map((value) =>
            typeof value === "number" ? value : Number(value)
          )
        : [],
      3,
    );
    return {
      version: 1,
      decisionType: "tool_call",
      confidence,
      reasonCode,
      toolCall: {
        tool,
        args: propertyIds.length > 0 ? { propertyIds } : {},
      },
    };
  }

  if (tool === "prepare_handoff") {
    const propertyIds = uniqueNumberList(
      Array.isArray((candidate.toolCall.args as { propertyIds?: unknown[] } | undefined)?.propertyIds)
        ? ((candidate.toolCall.args as { propertyIds?: unknown[] }).propertyIds ?? []).map((value) =>
            typeof value === "number" ? value : Number(value)
          )
        : [],
      3,
    );
    return {
      version: 1,
      decisionType: "tool_call",
      confidence,
      reasonCode,
      toolCall: {
        tool,
        args: propertyIds.length > 0 ? { propertyIds } : {},
      },
    };
  }

  return null;
}

function plannerDecisionToActionRequest(decision: Extract<PlannerDecision, { decisionType: "tool_call" }>): ToolActionRequest | null {
  const toolCall = decision.toolCall;
  if (toolCall.tool === "search_properties") {
    return {
      type: "search_refine",
      payload: {
        searchParams: toolCall.args ?? {},
      },
    };
  }

  if (toolCall.tool === "compare_properties") {
    return {
      type: "compare_selected_properties",
      payload: toolCall.args?.propertyIds?.length ? { propertyIds: toolCall.args.propertyIds } : {},
    };
  }

  if (toolCall.tool === "prepare_handoff") {
    return {
      type: "prepare_handoff",
      payload: toolCall.args?.propertyIds?.length ? { propertyIds: toolCall.args.propertyIds } : {},
    };
  }

  return null;
}

function buildGeminiPlannerPrompt(input: {
  question: string;
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  conversationState?: ToolConversationState;
  includeHistoryTurns: number;
  maxQuestionChars: number;
}) {
  const normalizedHistory = normalizeHistoryForModel(input.chatHistory, input.question)
    .slice(-input.includeHistoryTurns)
    .map((turn) => ({
      role: turn.role,
      content: truncateText(turn.content.trim(), 300),
    }));

  const stateSummary = input.conversationState
    ? {
        selectedPropertyIds: (input.conversationState.selectedPropertyIds ?? []).slice(0, 3),
        recentPropertyIds: (input.conversationState.recentPropertyIds ?? []).slice(0, 10),
        recentSearch: input.conversationState.recentSearch
          ? {
              params: input.conversationState.recentSearch.params ?? {},
              total: input.conversationState.recentSearch.total,
              resultIds: input.conversationState.recentSearch.resultIds.slice(0, 10),
            }
          : undefined,
        preferences: input.conversationState.preferences ?? undefined,
        leadDraft: input.conversationState.leadDraft
          ? {
              propertyId: input.conversationState.leadDraft.propertyId,
              citySlug: input.conversationState.leadDraft.citySlug,
              criteriaSummary: truncateText(input.conversationState.leadDraft.criteriaSummary ?? "", 240),
            }
          : undefined,
      }
    : undefined;

  const promptPayload = {
    question: truncateText(input.question.trim(), input.maxQuestionChars),
    recentHistory: normalizedHistory,
    conversationState: stateSummary,
    heuristics: {
      likelyCompare: isLikelyCompareQuestion(input.question),
      likelyHandoff: isLikelyHandoffQuestion(input.question),
      likelyPropertySearch: isLikelyPropertyToolQuestion(input.question),
    },
    allowedTools: {
      search_properties: {
        args: {
          transaction: ["vente", "location"],
          type: ["appartement", "maison_villa", "autre"],
          city: "slug ville ex: le-havre",
          bedroomsMin: "number",
          priceMin: "number",
          priceMax: "number",
          q: "string",
          page: "number",
          pageSize: "number <= 10",
        },
      },
      compare_properties: {
        args: {
          propertyIds: "optional number[] (2-3 ids if known)",
        },
      },
      prepare_handoff: {
        args: {
          propertyIds: "optional number[] (focused properties)",
        },
      },
    },
  };

  const systemInstruction = [
    "You are a strict property-tool planner for a French real-estate chatbot (Foch Immobilier, Le Havre).",
    "You are planning only for PROPERTY flows (search / compare / handoff).",
    "Return JSON only. No markdown. No prose outside JSON.",
    "Allowed decision types: tool_call or clarify.",
    "Choose at most one tool call.",
    "If request is vague or key criteria are missing, ask ONE clarification question instead of guessing.",
    "Never produce side effects. Never claim a tool result.",
    "Prefer clarify for ambiguous investment requests without city or transaction.",
    "Use French for clarification.question and options.",
    "Use exact tool names: search_properties, compare_properties, prepare_handoff.",
    "For compare, use compare_properties only when the user clearly asks to compare or a selection exists.",
    "Output schema version must be 1.",
  ].join(" ");

  return {
    systemInstruction,
    userPrompt: JSON.stringify(promptPayload),
  };
}

async function generateGeminiPlannerDecision(
  config: GeminiPlannerConfig,
  input: {
    question: string;
    chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    conversationState?: ToolConversationState;
  },
): Promise<{ decision: PlannerDecision | null; failureCode?: string }> {
  const prompt = buildGeminiPlannerPrompt({
    question: input.question,
    chatHistory: input.chatHistory,
    conversationState: input.conversationState,
    includeHistoryTurns: config.includeHistoryTurns,
    maxQuestionChars: config.maxQuestionChars,
  });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: prompt.systemInstruction }],
        },
        contents: [{ role: "user", parts: [{ text: prompt.userPrompt }] }],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: 220,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      return { decision: null, failureCode: `planner_http_${response.status}` };
    }

    const data = await response.json();
    const rawText = stripJsonFence(extractGeminiOutputText(data));
    if (!rawText) {
      return { decision: null, failureCode: "planner_empty" };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return { decision: null, failureCode: "planner_invalid_json" };
    }

    const decision = sanitizePlannerDecision(parsed);
    if (!decision) {
      return { decision: null, failureCode: "planner_invalid_schema" };
    }

    return { decision };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { decision: null, failureCode: "planner_timeout" };
    }
    return { decision: null, failureCode: "planner_request_failed" };
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildFallback(question: string) {
  const q = question.toLowerCase();

  if (/compromis|notaire|acte|signature/.test(q)) {
    return {
      answer:
        "Etapes classiques: offre acceptee, verification du financement, signature du compromis, delai legal/conditions suspensives, puis acte authentique chez le notaire. L'agence suit le dossier de bout en bout.",
      suggestedPrompts: [
        "Quel delai entre compromis et acte ?",
        "Quels documents dois-je fournir pour vendre ?",
        "Pouvez-vous m'accompagner sur le financement ?",
      ],
    };
  }

  if (/service|gestion|location|vente|estimation/.test(q)) {
    return {
      answer:
        "Foch Immobilier accompagne la vente, l'achat, la location et la gestion locative au Havre. Vous pouvez aussi demander une estimation argumentee de votre bien.",
      suggestedPrompts: [
        "Je veux une estimation de mon appartement",
        "Quels services de gestion locative proposez-vous ?",
        "Je cherche un bien a acheter au Havre",
      ],
    };
  }

  return {
    answer:
      "Je peux vous aider sur les biens disponibles, les quartiers du Havre et les etapes de vente/achat. Si vous ne trouvez pas le bon bien, laissez votre email et vos criteres pour un rappel agence.",
    suggestedPrompts: [
      "Je cherche un appartement a vendre quartier Perret",
      "Quel quartier viser pour un investissement locatif ?",
      "Comment se passe un compromis de vente ?",
    ],
  };
}

function buildSuggestedPromptsFromCitations(citations: RAGCitation[]): string[] {
  const prompts: string[] = [];
  const seen = new Set<string>();

  for (const citation of citations) {
    if (prompts.length >= 3) break;
    const prompt = `Ouvrir ${citation.path}`;
    if (seen.has(prompt)) continue;
    seen.add(prompt);
    prompts.push(prompt);
  }

  return prompts;
}

interface PropertySearchQueryRow {
  id: number;
  title: string;
  slug: string;
  transaction_type: string;
  property_type: string;
  status: string;
  price_amount: number;
  price_currency: string;
  surface_m2: number | null;
  terrain_m2?: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garage_count: number | null;
  dpe_label: string | null;
  city?: { name?: string | null; slug?: string | null } | null;
  images?: Array<{ source_url?: string | null; sort_order?: number | null }> | null;
}

const toolPropertyIntentPattern =
  /appartement|maison|villa|studio|t[1-9]\b|bien(?:s)?|acheter|achat|louer|location|vente|budget|chambre|surface|m2|annonce/;
const toolCompareIntentPattern = /compar|compare|lequel est mieux|laquelle est mieux|entre les deux|entre ces biens/;
const toolHandoffIntentPattern = /contact|conseiller|rappel|rappeler|etre contacte|etre rappele|mail|email/;
const toolWebsiteIntentPattern =
  /honoraires|mentions legales|confidentialite|cookies|plan du site|ou trouver|histoire|avis|services?\b|page\b|rubrique/;

const toolCityAliases: Array<{ slug: string; aliases: string[] }> = [
  { slug: "le-havre", aliases: ["le havre", "havre"] },
  { slug: "sainte-adresse", aliases: ["sainte adresse", "sainte-adresse"] },
  { slug: "montivilliers", aliases: ["montivilliers"] },
  { slug: "maneglise", aliases: ["maneglise", "maneglise"] },
  { slug: "gainneville", aliases: ["gainneville"] },
];

function parseToolSearchParamsFromState(rawState: ToolConversationState | undefined): ToolSearchParams {
  return {
    ...rawState?.preferences,
    ...(rawState?.recentSearch?.params ?? {}),
  };
}

function formatPriceValue(amount: number | null | undefined, currency = "EUR"): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

function formatMetricValue(value: number | null | undefined, suffix: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toString().replace(".", ",")} ${suffix}`;
}

function sanitizePropertySlugForPath(slug: string): string {
  return slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function toPropertyPath(id: number, slug: string): string {
  return `/biens/${id}-${sanitizePropertySlugForPath(slug || `bien-${id}`)}`;
}

function uniqueNumberList(values: Array<number | null | undefined>, maxSize: number): number[] {
  const result: number[] = [];
  const seen = new Set<number>();
  for (const value of values) {
    if (!Number.isInteger(value) || (value as number) <= 0) continue;
    if (seen.has(value as number)) continue;
    seen.add(value as number);
    result.push(value as number);
    if (result.length >= maxSize) break;
  }
  return result;
}

function detectTransaction(question: string): "vente" | "location" | undefined {
  const normalized = normalizeText(question);
  const hasLocation = /\blocation\b|\blouer\b|\bloyer\b|\ba louer\b/.test(normalized);
  const hasSale = /\bvente\b|\bvendre\b|\bacheter\b|\bachat\b|\ba vendre\b/.test(normalized);
  if (hasLocation && !hasSale) return "location";
  if (hasSale && !hasLocation) return "vente";
  return undefined;
}

function detectPropertyType(question: string): "appartement" | "maison_villa" | "autre" | undefined {
  const normalized = normalizeText(question);
  if (/\bmaison\b|\bvilla\b/.test(normalized)) return "maison_villa";
  if (/\bappartement\b|\bstudio\b|\bt[1-9]\b/.test(normalized)) return "appartement";
  return undefined;
}

function detectCitySlug(question: string): string | undefined {
  const normalized = normalizeText(question);
  for (const city of toolCityAliases) {
    if (city.aliases.some((alias) => normalized.includes(alias))) {
      return city.slug;
    }
  }
  return undefined;
}

function parseBedroomsMin(question: string): number | undefined {
  const normalized = normalizeText(question);
  const tMatch = normalized.match(/\bt([1-9])\b/);
  if (tMatch) {
    const rooms = Number(tMatch[1]);
    return clamp(Math.max(0, rooms - 1), 0, 8);
  }
  const bedroomMatch = normalized.match(/(\d{1,2})\s*chamb/);
  if (bedroomMatch) {
    return clamp(Number(bedroomMatch[1]), 0, 12);
  }
  return undefined;
}

function parsePriceHints(question: string): Pick<ToolSearchParams, "priceMin" | "priceMax"> {
  const normalized = normalizeText(question);
  const extract = (value: string) => Number(value.replace(/\s+/g, ""));
  const compactQuestion = question.replace(/\u00a0/g, " ");

  const betweenMatch = compactQuestion.match(
    /entre\s+([0-9][0-9\s.,]{2,})\s*(?:€|eur|euros)?\s+et\s+([0-9][0-9\s.,]{2,})/i,
  );
  if (betweenMatch) {
    const a = extract(betweenMatch[1].replace(/[^\d]/g, ""));
    const b = extract(betweenMatch[2].replace(/[^\d]/g, ""));
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    return {
      priceMin: Number.isFinite(min) ? min : undefined,
      priceMax: Number.isFinite(max) ? max : undefined,
    };
  }

  const maxMatch = compactQuestion.match(
    /(budget|max(?:imum)?|moins de|jusqu(?:e|')?a)\s*[:\-]?\s*([0-9][0-9\s.,]{2,})/i,
  );
  if (maxMatch) {
    const max = extract(maxMatch[2].replace(/[^\d]/g, ""));
    return { priceMax: Number.isFinite(max) ? max : undefined };
  }

  const minMatch = compactQuestion.match(/(min(?:imum)?|au moins|a partir de|plus de)\s*[:\-]?\s*([0-9][0-9\s.,]{2,})/i);
  if (minMatch) {
    const min = extract(minMatch[2].replace(/[^\d]/g, ""));
    return { priceMin: Number.isFinite(min) ? min : undefined };
  }

  const euroMatches = [...compactQuestion.matchAll(/([0-9][0-9\s.,]{2,})\s*(?:€|eur|euros)\b/gi)];
  if (euroMatches.length > 0) {
    const parsed = euroMatches
      .map((match) => extract(match[1].replace(/[^\d]/g, "")))
      .filter((value) => Number.isFinite(value) && value >= 1000);
    if (parsed.length >= 2) {
      return { priceMin: Math.min(...parsed), priceMax: Math.max(...parsed) };
    }
    if (parsed.length === 1) {
      if (/\bentre\b/.test(normalized)) return { priceMin: parsed[0] };
      return { priceMax: parsed[0] };
    }
  }

  return {};
}

function mergeSearchParams(
  base: ToolSearchParams,
  overrides: ToolSearchParams,
  pageFallback: number,
  pageSizeFallback: number,
): ToolSearchParams {
  const merged: ToolSearchParams = {
    ...base,
    ...overrides,
  };
  if (merged.priceMin && merged.priceMax && merged.priceMin > merged.priceMax) {
    [merged.priceMin, merged.priceMax] = [merged.priceMax, merged.priceMin];
  }
  merged.page = clamp(Math.floor(merged.page ?? pageFallback), 1, 100);
  merged.pageSize = clamp(Math.floor(merged.pageSize ?? pageSizeFallback), 1, 10);
  return merged;
}

function extractSearchParamsFromQuestion(
  question: string,
  state: ToolConversationState | undefined,
  actionRequest: ToolActionRequest | undefined,
): ToolSearchParams {
  const fallbackPageSize = clamp(Math.floor(parseNumberEnv("CHATBOT_AGENT_TOOLS_MAX_RESULTS", 5)), 1, 10);
  const stateParams = parseToolSearchParamsFromState(state);
  const inferredParams: ToolSearchParams = {
    transaction: detectTransaction(question),
    type: detectPropertyType(question),
    city: detectCitySlug(question),
    bedroomsMin: parseBedroomsMin(question),
    ...parsePriceHints(question),
  };

  let actionParams: ToolSearchParams = {};
  if (actionRequest?.type === "search_refine") {
    const payload = actionRequest.payload ?? {};
    const rawSearchParams = payload.searchParams;
    if (rawSearchParams && typeof rawSearchParams === "object") {
      const parsed = toolSearchParamsSchema.safeParse(rawSearchParams);
      if (parsed.success) {
        actionParams = { ...parsed.data };
      }
    }
    const page = typeof payload.page === "number" ? payload.page : Number(payload.page);
    if (Number.isFinite(page)) {
      actionParams.page = Math.floor(page);
    }
    const pageSize = typeof payload.pageSize === "number" ? payload.pageSize : Number(payload.pageSize);
    if (Number.isFinite(pageSize)) {
      actionParams.pageSize = Math.floor(pageSize);
    }
  }

  return mergeSearchParams(stateParams, { ...inferredParams, ...actionParams }, 1, fallbackPageSize);
}

function buildCriteriaSummary(params: ToolSearchParams): string {
  const parts: string[] = [];
  const transactionLabel =
    params.transaction === "vente" ? "à vendre" : params.transaction === "location" ? "à louer" : undefined;
  const typeLabel =
    params.type === "appartement" ? "appartement" : params.type === "maison_villa" ? "maison" : params.type;

  if (typeLabel && transactionLabel) {
    parts.push(`${typeLabel} ${transactionLabel}`);
  } else if (typeLabel) {
    parts.push(typeLabel);
  } else if (transactionLabel) {
    parts.push(`biens ${transactionLabel}`);
  } else {
    parts.push("biens immobiliers");
  }

  if (params.city) parts.push(`sur ${params.city.replace(/-/g, " ")}`);
  if (typeof params.bedroomsMin === "number" && params.bedroomsMin > 0) {
    parts.push(`min. ${params.bedroomsMin} chambre${params.bedroomsMin > 1 ? "s" : ""}`);
  }
  if (typeof params.priceMax === "number") {
    parts.push(`budget max ${formatPriceValue(params.priceMax)}`);
  }
  if (typeof params.priceMin === "number") {
    parts.push(`budget min ${formatPriceValue(params.priceMin)}`);
  }

  return parts.join(" · ");
}

function buildToolActionId(prefix: string): string {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
}

function isLikelyWebsiteContentQuestion(question: string): boolean {
  return toolWebsiteIntentPattern.test(normalizeText(question));
}

function isLikelyPropertyToolQuestion(question: string): boolean {
  return toolPropertyIntentPattern.test(normalizeText(question));
}

function isLikelyCompareQuestion(question: string): boolean {
  return toolCompareIntentPattern.test(normalizeText(question));
}

function isLikelyHandoffQuestion(question: string): boolean {
  return toolHandoffIntentPattern.test(normalizeText(question));
}

function detectAgentMode(
  question: string,
  actionRequest: ToolActionRequest | undefined,
  conversationState: ToolConversationState | undefined,
): AgentMode {
  if (actionRequest) return "tool";
  if (isLikelyWebsiteContentQuestion(question)) return "rag";
  if (
    isLikelyCompareQuestion(question) &&
    Array.isArray(conversationState?.selectedPropertyIds) &&
    conversationState.selectedPropertyIds.length >= 2
  ) {
    return "tool";
  }
  if (isLikelyHandoffQuestion(question) && (conversationState?.recentSearch || conversationState?.selectedPropertyIds?.length)) {
    return "tool";
  }
  if (isLikelyPropertyToolQuestion(question)) return "tool";
  return "rag";
}

function mapSearchRowToToolItem(row: PropertySearchQueryRow): ToolSearchResultItem {
  const sortedImages = [...(row.images ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const cityName = (row.city?.name ?? "").trim();
  const citySlug = (row.city?.slug ?? "").trim();
  return {
    id: row.id,
    title: row.title,
    priceAmount: row.price_amount,
    currency: row.price_currency || "EUR",
    surfaceM2: row.surface_m2 ?? null,
    bedrooms: row.bedrooms ?? null,
    cityName,
    citySlug,
    path: toPropertyPath(row.id, row.slug),
    coverImageUrl: sortedImages[0]?.source_url?.trim() ?? "",
    dpeLabel: row.dpe_label ?? null,
    transaction: row.transaction_type,
    type: row.property_type,
  };
}

async function executeSearchPropertiesTool(
  supabase: ReturnType<typeof createServiceClient>,
  params: ToolSearchParams,
): Promise<{ items: ToolSearchResultItem[]; total: number; searchParams: ToolSearchParams }> {
  const page = clamp(Math.floor(params.page ?? 1), 1, 100);
  const pageSize = clamp(Math.floor(params.pageSize ?? parseNumberEnv("CHATBOT_AGENT_TOOLS_MAX_RESULTS", 5)), 1, 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("properties")
    .select(
      "id,title,slug,transaction_type,property_type,status,price_amount,price_currency,surface_m2,terrain_m2,bedrooms,bathrooms,garage_count,dpe_label,city:cities(name,slug),images:property_images(source_url,sort_order)",
      { count: "exact" },
    )
    .neq("status", "off_market")
    .order("published_at", { ascending: false })
    .range(from, to);

  if (params.transaction) query = query.eq("transaction_type", params.transaction);
  if (params.type) query = query.eq("property_type", params.type);
  if (params.city) query = query.eq("city.slug", params.city);
  if (typeof params.priceMin === "number") query = query.gte("price_amount", params.priceMin);
  if (typeof params.priceMax === "number") query = query.lte("price_amount", params.priceMax);
  if (typeof params.bedroomsMin === "number") query = query.gte("bedrooms", params.bedroomsMin);
  if (params.q) query = query.ilike("title", `%${params.q.replace(/[%_]/g, "")}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = ((data as PropertySearchQueryRow[] | null) ?? []).filter((row) => row && typeof row.id === "number");
  return {
    items: rows.map(mapSearchRowToToolItem),
    total: count ?? rows.length,
    searchParams: { ...params, page, pageSize },
  };
}

async function executeGetPropertiesTool(
  supabase: ReturnType<typeof createServiceClient>,
  ids: number[],
): Promise<ToolCompareProperty[]> {
  const uniqueIds = uniqueNumberList(ids, 3);
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from("properties")
    .select(
      "id,title,slug,price_amount,price_currency,surface_m2,terrain_m2,bedrooms,bathrooms,garage_count,dpe_label,transaction_type,property_type,city:cities(name,slug)",
    )
    .in("id", uniqueIds)
    .neq("status", "off_market");

  if (error) throw error;

  const rows = ((data as PropertySearchQueryRow[] | null) ?? []).filter((row) => row && typeof row.id === "number");
  const byId = new Map(rows.map((row) => [row.id, row]));

  return uniqueIds
    .map((id) => byId.get(id))
    .filter((row): row is PropertySearchQueryRow => Boolean(row))
    .map((row) => ({
      id: row.id,
      title: row.title,
      path: toPropertyPath(row.id, row.slug),
      priceAmount: row.price_amount,
      surfaceM2: row.surface_m2 ?? null,
      bedrooms: row.bedrooms ?? null,
      cityName: (row.city?.name ?? "").trim(),
      dpeLabel: row.dpe_label ?? null,
      terrainM2: row.terrain_m2 ?? null,
      garageCount: row.garage_count ?? null,
      bathrooms: row.bathrooms ?? null,
    }));
}

function buildCompareRows(properties: ToolCompareProperty[]): Array<{ label: string; values: Array<string | null> }> {
  const rows: Array<{ label: string; values: Array<string | null> }> = [
    { label: "Prix", values: properties.map((property) => formatPriceValue(property.priceAmount)) },
    { label: "Surface", values: properties.map((property) => formatMetricValue(property.surfaceM2, "m²")) },
    { label: "Chambres", values: properties.map((property) => (property.bedrooms != null ? String(property.bedrooms) : "—")) },
    { label: "Ville", values: properties.map((property) => property.cityName || "—") },
    { label: "DPE", values: properties.map((property) => property.dpeLabel || "—") },
  ];

  if (properties.some((property) => property.terrainM2 != null)) {
    rows.push({ label: "Terrain", values: properties.map((property) => formatMetricValue(property.terrainM2, "m²")) });
  }
  if (properties.some((property) => property.garageCount != null)) {
    rows.push({
      label: "Garages",
      values: properties.map((property) => (property.garageCount != null ? String(property.garageCount) : "—")),
    });
  }
  if (properties.some((property) => property.bathrooms != null)) {
    rows.push({
      label: "Salle(s) de bain",
      values: properties.map((property) => (property.bathrooms != null ? String(property.bathrooms) : "—")),
    });
  }

  return rows;
}

function buildCompareSummaryText(
  properties: ToolCompareProperty[],
  state: ToolConversationState | undefined,
): { summary: string; recommendedPropertyId?: number } {
  const prices = properties.map((property) => property.priceAmount).filter((value) => Number.isFinite(value));
  const surfaces = properties
    .map((property) => property.surfaceM2)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
  const minSurface = surfaces.length > 0 ? Math.min(...surfaces) : null;
  const maxSurface = surfaces.length > 0 ? Math.max(...surfaces) : null;

  const budget = state?.preferences?.priceMax;
  const bedroomsMin = state?.preferences?.bedroomsMin;
  const cityPreference = state?.preferences?.city;
  let recommendedPropertyId: number | undefined;

  const ranked = [...properties]
    .map((property) => {
      let score = 0;
      if (typeof budget === "number") {
        score += property.priceAmount <= budget ? 2 : -2;
        score -= Math.abs(property.priceAmount - budget) / Math.max(1, budget) * 0.5;
      }
      if (typeof bedroomsMin === "number") {
        score += (property.bedrooms ?? 0) >= bedroomsMin ? 1.5 : -1;
      }
      if (cityPreference && property.cityName) {
        const normalizedCity = normalizeText(property.cityName);
        if (normalizedCity.includes(normalizeText(cityPreference))) score += 1;
      }
      if (property.surfaceM2 && property.priceAmount > 0) {
        score += Math.min(1, property.surfaceM2 / 200);
      }
      return { property, score };
    })
    .sort((a, b) => b.score - a.score);

  if (ranked.length > 0 && (ranked[0].score > 0.5 || properties.length === 2)) {
    recommendedPropertyId = ranked[0].property.id;
  }

  const summaryParts = [`Comparaison de ${properties.length} biens.`];
  if (minPrice != null && maxPrice != null) {
    summaryParts.push(`Prix de ${formatPriceValue(minPrice)} à ${formatPriceValue(maxPrice)}.`);
  }
  if (minSurface != null && maxSurface != null) {
    summaryParts.push(`Surface de ${formatMetricValue(minSurface, "m²")} à ${formatMetricValue(maxSurface, "m²")}.`);
  }
  if (recommendedPropertyId) {
    const recommended = properties.find((property) => property.id === recommendedPropertyId);
    if (recommended) {
      summaryParts.push(`À première vue, ${recommended.title} semble le plus aligné avec vos critères.`);
    }
  }

  return { summary: summaryParts.join(" "), recommendedPropertyId };
}

function buildNoticeAction(title: string, description: string, code?: string): ToolUiActionNotice {
  return {
    id: buildToolActionId("notice"),
    kind: "notice",
    title,
    description,
    data: { level: "info", code },
  };
}

function normalizePropertyIdsFromAction(actionRequest: ToolActionRequest | undefined): number[] {
  if (!actionRequest?.payload) return [];
  const raw = actionRequest.payload.propertyIds;
  if (!Array.isArray(raw)) return [];
  return uniqueNumberList(raw.map((value) => (typeof value === "number" ? value : Number(value))), 3);
}

function buildLeadCriteriaFromState(
  question: string,
  state: ToolConversationState | undefined,
  selectedProperties: ToolCompareProperty[] = [],
): { criteriaMessage: string; propertyId?: number; contextSummary: string } {
  const recent = state?.recentSearch;
  const criteriaSummary = recent?.params ? buildCriteriaSummary(recent.params) : undefined;
  const selectedTitles = selectedProperties.map((property) => property.title).slice(0, 3);
  const propertyId = selectedProperties[0]?.id ?? state?.leadDraft?.propertyId;

  const parts: string[] = [];
  if (selectedTitles.length > 0) {
    parts.push(`Biens suivis: ${selectedTitles.join(" / ")}`);
  }
  if (criteriaSummary) {
    parts.push(`Critères: ${criteriaSummary}`);
  } else if (state?.leadDraft?.criteriaSummary) {
    parts.push(`Critères: ${state.leadDraft.criteriaSummary}`);
  } else {
    parts.push(`Demande: ${truncateText(question.trim(), 240)}`);
  }

  return {
    propertyId,
    criteriaMessage: parts.join("\n"),
    contextSummary: criteriaSummary ?? "Demande de contact depuis le chatbot",
  };
}

async function orchestrateToolRequest(input: {
  question: string;
  actionRequest?: ToolActionRequest;
  conversationState?: ToolConversationState;
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<ToolOrchestrationResult | null> {
  const toolsEnabled = parseBooleanEnv("CHATBOT_AGENT_TOOLS_ENABLED", false);
  if (!toolsEnabled) return null;

  const agentMode = detectAgentMode(input.question, input.actionRequest, input.conversationState);
  if (agentMode !== "tool") return null;

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return null;
  }

  const toolTrace: ToolTraceItem[] = [];
  const compareLimit = clamp(Math.floor(parseNumberEnv("CHATBOT_AGENT_TOOLS_COMPARE_LIMIT", 3)), 2, 3);
  const plannerFeatureEnabled = parseBooleanEnv("CHATBOT_GEMINI_PLANNER_ENABLED", false);
  let effectiveActionRequest = input.actionRequest;
  let plannerMeta: PlannerMeta | undefined;
  const applyPlannerMeta = (result: ToolOrchestrationResult): ToolOrchestrationResult => ({
    ...result,
    planner: result.planner ?? plannerMeta,
  });

  const runSearch = async (): Promise<ToolOrchestrationResult> => {
    const startedAt = Date.now();
    try {
      const params = extractSearchParamsFromQuestion(input.question, input.conversationState, effectiveActionRequest);
      const result = await executeSearchPropertiesTool(supabase, params);
      toolTrace.push({
        tool: "search_properties",
        status: "ok",
        latencyMs: Date.now() - startedAt,
        resultCount: result.items.length,
      });

      const criteriaSummary = buildCriteriaSummary(result.searchParams);
      const nextPage = (result.searchParams.page ?? 1) + 1;
      const actions: ToolUiAction[] = [
        {
          id: buildToolActionId("search"),
          kind: "search_results",
          title: result.total > 0 ? `${result.total} bien${result.total > 1 ? "s" : ""} trouvés` : "Aucun bien trouvé",
          description:
            result.total > 0
              ? `Voici une sélection correspondant à votre demande (${Math.min(result.items.length, result.total)} affichés).`
              : "Je peux affiner la recherche avec un budget, une ville ou un type de bien.",
          data: {
            criteriaSummary,
            searchParams: result.searchParams,
            total: result.total,
            items: result.items,
            canCompare: result.items.length >= 2,
            compareSelectionLimit: compareLimit,
            nextSuggestedRefinements:
              result.total > result.items.length
                ? [`Voir la page ${nextPage}`, "Préciser un budget", "Préciser un quartier"]
                : ["Préciser un budget", "Changer de ville", "Comparer 2 biens"],
          },
        },
      ];

      if (result.items.length === 0) {
        actions.push(
          {
            id: buildToolActionId("handoff"),
            kind: "lead_handoff_draft",
            title: "Préparer une demande à l’agence",
            description: "Je peux préremplir le formulaire avec vos critères pour qu’un conseiller vous recontacte.",
            requiresConfirmation: true,
            data: {
              draft: {
                source: "contact_page",
                criteriaMessage: `Critères: ${criteriaSummary}`,
              },
              prefill: {
                criteria: criteriaSummary,
              },
              missingFields: ["firstName", "lastName", "email"],
              contextSummary: criteriaSummary,
            },
          } satisfies ToolUiActionLeadHandoffDraft,
        );
      }

      return {
        answer:
          result.total > 0
            ? "J’ai trouvé des biens en direct dans votre base. Vous pouvez ouvrir un bien, sélectionner 2 à 3 biens pour les comparer, ou préparer un contact."
            : "Je n’ai pas trouvé de bien avec ces critères pour le moment. Je peux élargir la recherche ou préparer une demande à l’agence.",
        suggestedPrompts:
          result.total > 0
            ? ["Comparer la sélection", "Voir plus de résultats", "Préremplir le formulaire de contact"]
            : ["Élargir le budget", "Changer de ville", "Je veux être rappelé"],
        actions,
        conversationStatePatch: {
          recentSearch: {
            params: result.searchParams,
            resultIds: result.items.map((item) => item.id).slice(0, 20),
            total: result.total,
            generatedAt: new Date().toISOString(),
          },
          recentPropertyIds: uniqueNumberList(
            [...result.items.map((item) => item.id), ...(input.conversationState?.recentPropertyIds ?? [])],
            20,
          ),
          preferences: {
            ...input.conversationState?.preferences,
            transaction: result.searchParams.transaction ?? input.conversationState?.preferences?.transaction,
            type: result.searchParams.type ?? input.conversationState?.preferences?.type,
            city: result.searchParams.city ?? input.conversationState?.preferences?.city,
            bedroomsMin:
              result.searchParams.bedroomsMin ?? input.conversationState?.preferences?.bedroomsMin,
            priceMin: result.searchParams.priceMin ?? input.conversationState?.preferences?.priceMin,
            priceMax: result.searchParams.priceMax ?? input.conversationState?.preferences?.priceMax,
          },
        },
        toolTrace,
        agentMode: "tool",
      };
    } catch {
      toolTrace.push({
        tool: "search_properties",
        status: "error",
        latencyMs: Date.now() - startedAt,
        errorCode: "search_failed",
      });
      return {
        answer: "Je n’ai pas pu interroger les biens en direct pour le moment. Je peux quand même vous aider à reformuler votre recherche.",
        suggestedPrompts: ["Je cherche un appartement au Havre", "Préciser budget et chambres", "Je veux être rappelé"],
        actions: [buildNoticeAction("Recherche indisponible", "La recherche live est temporairement indisponible.", "search_failed")],
        toolTrace,
        agentMode: "tool",
      };
    }
  };

  const runCompare = async (propertyIds: number[]): Promise<ToolOrchestrationResult> => {
    const normalizedIds = uniqueNumberList(propertyIds, compareLimit);
    if (normalizedIds.length < 2) {
      return {
        answer: "Sélectionnez au moins 2 biens pour lancer la comparaison.",
        suggestedPrompts: ["Comparer la sélection", "Montrer plus de biens", "Je veux être conseillé"],
        actions: [buildNoticeAction("Comparaison", "Sélectionnez 2 à 3 biens dans la liste avant de comparer.", "compare_min_2")],
        toolTrace,
        agentMode: "tool",
      };
    }

    const startedAt = Date.now();
    try {
      const properties = await executeGetPropertiesTool(supabase, normalizedIds);
      toolTrace.push({
        tool: "get_properties",
        status: "ok",
        latencyMs: Date.now() - startedAt,
        resultCount: properties.length,
      });
      toolTrace.push({
        tool: "compare_properties",
        status: properties.length >= 2 ? "ok" : "error",
        latencyMs: 0,
        resultCount: properties.length,
        errorCode: properties.length >= 2 ? undefined : "compare_not_enough_found",
      });

      if (properties.length < 2) {
        return {
          answer: "Je n’ai pas retrouvé suffisamment de biens pour comparer la sélection.",
          suggestedPrompts: ["Relancer la recherche", "Comparer une autre sélection"],
          actions: [buildNoticeAction("Comparaison impossible", "Au moins 2 biens valides sont nécessaires.", "compare_not_found")],
          toolTrace,
          agentMode: "tool",
        };
      }

      const { summary, recommendedPropertyId } = buildCompareSummaryText(properties, input.conversationState);
      const comparisonRows = buildCompareRows(properties);
      const action: ToolUiActionCompareSummary = {
        id: buildToolActionId("compare"),
        kind: "compare_summary",
        title: `Comparaison (${properties.length} biens)`,
        description: "Résumé comparatif basé sur les données des annonces.",
        data: {
          propertyIds: properties.map((property) => property.id),
          properties,
          comparisonRows,
          summary,
          recommendedPropertyId,
          nextActions: ["open_property", "prefill_handoff"],
        },
      };

      return {
        answer: summary,
        suggestedPrompts: ["Ouvrir le bien recommandé", "Préremplir le formulaire de contact", "Voir plus de résultats"],
        actions: [action],
        conversationStatePatch: {
          selectedPropertyIds: properties.map((property) => property.id).slice(0, compareLimit),
          recentPropertyIds: uniqueNumberList(
            [...properties.map((property) => property.id), ...(input.conversationState?.recentPropertyIds ?? [])],
            20,
          ),
        },
        toolTrace,
        agentMode: "tool",
      };
    } catch {
      toolTrace.push({
        tool: "get_properties",
        status: "error",
        latencyMs: Date.now() - startedAt,
        errorCode: "compare_fetch_failed",
      });
      return {
        answer: "Je n’ai pas pu récupérer les annonces pour la comparaison.",
        suggestedPrompts: ["Relancer la recherche", "Réessayer la comparaison"],
        actions: [buildNoticeAction("Comparaison indisponible", "La récupération des biens a échoué.", "compare_fetch_failed")],
        toolTrace,
        agentMode: "tool",
      };
    }
  };

  const runPrepareHandoff = async (propertyIds?: number[]): Promise<ToolOrchestrationResult> => {
    const selectedIds = uniqueNumberList(
      [
        ...(propertyIds ?? []),
        ...normalizePropertyIdsFromAction(effectiveActionRequest),
        ...(input.conversationState?.selectedPropertyIds ?? []),
      ],
      compareLimit,
    );
    let selectedProperties: ToolCompareProperty[] = [];
    if (selectedIds.length > 0) {
      const startedAt = Date.now();
      try {
        selectedProperties = await executeGetPropertiesTool(supabase, selectedIds);
        toolTrace.push({
          tool: "get_properties",
          status: "ok",
          latencyMs: Date.now() - startedAt,
          resultCount: selectedProperties.length,
        });
      } catch {
        toolTrace.push({
          tool: "get_properties",
          status: "error",
          latencyMs: Date.now() - startedAt,
          errorCode: "handoff_property_fetch_failed",
        });
      }
    }

    const startedAt = Date.now();
    const lead = buildLeadCriteriaFromState(input.question, input.conversationState, selectedProperties);
    toolTrace.push({
      tool: "prepare_handoff",
      status: "ok",
      latencyMs: Date.now() - startedAt,
      resultCount: selectedProperties.length,
    });

    const action: ToolUiActionLeadHandoffDraft = {
      id: buildToolActionId("lead"),
      kind: "lead_handoff_draft",
      title: "Préremplir le formulaire de contact",
      description: "Je prépare vos critères pour un conseiller. Vous gardez la validation finale.",
      requiresConfirmation: true,
      data: {
        draft: {
          source: "contact_page",
          propertyId: lead.propertyId,
          criteriaMessage: lead.criteriaMessage,
        },
        prefill: {
          criteria: lead.criteriaMessage,
        },
        missingFields: ["firstName", "lastName", "email"],
        contextSummary: lead.contextSummary,
      },
    };

    return {
      answer:
        "Je peux préremplir le formulaire avec votre sélection et vos critères. Vérifiez les informations puis envoyez la demande quand vous êtes prêt.",
      suggestedPrompts: ["Préremplir le formulaire", "Ajouter un budget", "Comparer d’autres biens"],
      actions: [action],
      conversationStatePatch: {
        leadDraft: {
          propertyId: lead.propertyId,
          citySlug: input.conversationState?.preferences?.city,
          criteriaSummary: lead.contextSummary,
        },
      },
      toolTrace,
      agentMode: "tool",
    };
  };

  if (!input.actionRequest && plannerFeatureEnabled) {
    const plannerConfig = resolveGeminiPlannerConfig();
    if (!plannerConfig) {
      plannerMeta = {
        provider: "fallback",
        mode: "disabled",
        decisionType: "none",
        reasonCode: "planner_unavailable",
      };
    } else {
      const plannerResult = await generateGeminiPlannerDecision(plannerConfig, {
        question: input.question,
        chatHistory: input.chatHistory,
        conversationState: input.conversationState,
      });

      if (plannerResult.decision?.decisionType === "clarify") {
        const clarifier = plannerResult.decision.clarification;
        plannerMeta = {
          provider: "gemini",
          mode: "gemini",
          decisionType: "clarify",
          reasonCode: plannerResult.decision.reasonCode,
          confidence: plannerResult.decision.confidence,
        };
        const missingFieldsLabel =
          clarifier.missingFields && clarifier.missingFields.length > 0
            ? `Informations à préciser: ${clarifier.missingFields.join(", ")}.`
            : "J’ai besoin d’une précision pour lancer la bonne action.";
        return applyPlannerMeta({
          answer: clarifier.question,
          suggestedPrompts: (clarifier.options ?? []).slice(0, 4),
          actions: [buildNoticeAction("Précision nécessaire", missingFieldsLabel, "planner_clarify")],
          toolTrace,
          agentMode: "tool",
        });
      }

      if (plannerResult.decision?.decisionType === "tool_call") {
        const mappedAction = plannerDecisionToActionRequest(plannerResult.decision);
        if (mappedAction) {
          effectiveActionRequest = mappedAction;
          plannerMeta = {
            provider: "gemini",
            mode: "gemini",
            decisionType: "tool_call",
            toolName: plannerResult.decision.toolCall.tool,
            reasonCode: plannerResult.decision.reasonCode,
            confidence: plannerResult.decision.confidence,
          };
        } else {
          plannerMeta = {
            provider: "fallback",
            mode: "deterministic_fallback",
            decisionType: "none",
            reasonCode: "planner_tool_unsupported",
          };
        }
      } else if (!plannerResult.decision) {
        plannerMeta = {
          provider: "fallback",
          mode: "deterministic_fallback",
          decisionType: "none",
          reasonCode: plannerResult.failureCode ?? "planner_no_decision",
        };
      }
    }
  } else {
    plannerMeta = {
      provider: "fallback",
      mode: "disabled",
      decisionType: "none",
      reasonCode: plannerFeatureEnabled && input.actionRequest ? "explicit_action_request" : "planner_disabled",
    };
  }

  if (effectiveActionRequest) {
    switch (effectiveActionRequest.type) {
      case "compare_selected_properties": {
        const ids = normalizePropertyIdsFromAction(effectiveActionRequest);
        return applyPlannerMeta(await runCompare(ids));
      }
      case "prepare_handoff":
      case "prefill_lead_form":
        return applyPlannerMeta(await runPrepareHandoff());
      case "search_refine":
        return applyPlannerMeta(await runSearch());
      case "open_path_confirmed": {
        const rawPath = typeof effectiveActionRequest.payload?.path === "string" ? effectiveActionRequest.payload.path.trim() : "";
        const safePath = /^\/[a-z0-9/_-]+(?:\?[a-z0-9=&_-]+)?$/i.test(rawPath) ? rawPath : null;
        if (!safePath) {
          return applyPlannerMeta({
            answer: "Je n’ai pas reçu de lien interne valide à ouvrir.",
            suggestedPrompts: ["Ouvrir /biens", "Ouvrir /contact"],
            actions: [buildNoticeAction("Lien invalide", "Le lien demandé n’est pas valide.", "open_path_invalid")],
            toolTrace,
            agentMode: "tool",
          });
        }
        return applyPlannerMeta({
          answer: `Lien prêt: ${safePath}. Cliquez sur le bouton pour ouvrir la page.`,
          suggestedPrompts: ["Ouvrir la page", "Revenir aux résultats"],
          actions: [
            {
              id: buildToolActionId("open"),
              kind: "open_page",
              title: "Ouvrir la page",
              requiresConfirmation: true,
              data: {
                path: safePath,
                label: safePath,
                reason: "navigation_confirmee",
              },
            } satisfies ToolUiActionOpenPage,
          ],
          toolTrace,
          agentMode: "tool",
        });
      }
    }
  }

  if (isLikelyCompareQuestion(input.question) && (input.conversationState?.selectedPropertyIds?.length ?? 0) >= 2) {
    return applyPlannerMeta(await runCompare(input.conversationState?.selectedPropertyIds ?? []));
  }

  if (isLikelyHandoffQuestion(input.question) && (input.conversationState?.recentSearch || input.conversationState?.selectedPropertyIds?.length)) {
    return applyPlannerMeta(await runPrepareHandoff());
  }

  if (isLikelyPropertyToolQuestion(input.question)) {
    return applyPlannerMeta(await runSearch());
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const rawPayload = await request.json();
    const payload = payloadSchema.parse(rawPayload);
    const requestId = createRequestId();

    let toolResult: ToolOrchestrationResult | null = null;
    try {
      toolResult = await orchestrateToolRequest({
        question: payload.question,
        actionRequest: payload.actionRequest as ToolActionRequest | undefined,
        conversationState: payload.conversationState as ToolConversationState | undefined,
        chatHistory: payload.chatHistory,
      });
    } catch {
      toolResult = null;
    }

    if (toolResult) {
      return jsonResponse({
        source: "fallback",
        edgeProvider: "fallback",
        retrievalMode: "none",
        requestId,
        ragUsed: false,
        agentMode: toolResult.agentMode,
        answer: toolResult.answer,
        suggestedPrompts: toolResult.suggestedPrompts,
        actions: toolResult.actions,
        conversationStatePatch: toolResult.conversationStatePatch,
        toolTrace: toolResult.toolTrace,
        planner: toolResult.planner,
      });
    }

    if (!resolveGenerationProvider()) {
      return jsonResponse({
        source: "fallback",
        edgeProvider: "fallback",
        retrievalMode: "none",
        requestId,
        agentMode: "fallback",
        ...buildFallback(payload.question),
      });
    }

    let ragContext: RAGContextResult = { contextBlock: null, citations: [], retrievalMode: "none" };
    try {
      ragContext = await retrieveWebsiteContext(payload.question);
    } catch {
      ragContext = { contextBlock: null, citations: [], retrievalMode: "none" };
    }

    const normalizedHistory = normalizeHistoryForModel(payload.chatHistory, payload.question);
    const generationResult = await generateAssistantAnswer(payload.question, normalizedHistory, ragContext);

    if (!generationResult) {
      const fallback = buildFallback(payload.question);
      return jsonResponse({
        source: "fallback",
        edgeProvider: "fallback",
        retrievalMode: ragContext.retrievalMode,
        requestId,
        agentMode: "fallback",
        ...fallback,
      });
    }
    const citationPrompts = buildSuggestedPromptsFromCitations(ragContext.citations);

    return jsonResponse({
      source: generationResult.provider,
      edgeProvider: generationResult.provider,
      answer: generationResult.answer,
      suggestedPrompts:
        citationPrompts.length > 0
          ? [
              ...citationPrompts,
              "Pouvez-vous proposer des biens similaires ?",
              "Je souhaite une estimation de mon bien",
            ].slice(0, 6)
          : [
              "Pouvez-vous proposer des biens similaires ?",
              "Je souhaite une estimation de mon bien",
              "Je ne trouve pas de bien, je veux laisser mon email",
            ],
      citations: ragContext.citations,
      ragUsed: Boolean(ragContext.contextBlock),
      retrievalMode: ragContext.retrievalMode,
      agentMode: "rag",
      requestId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 400);
  }
});
