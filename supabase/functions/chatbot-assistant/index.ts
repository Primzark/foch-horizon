import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  computeSharedPropertyAggregateMetrics,
  fetchAggregateRowsByIds,
  fetchAggregateRowsForSearchFilters,
  runSharedPropertySearchQuery,
  type SharedPropertyAggregateBucket,
  type SharedPropertyAggregateMetrics,
  type SharedPropertySearchQueryParams,
  type SharedPropertySearchRow,
} from "../_shared/property-search.ts";

const toolSearchParamsSchema = z.object({
  transaction: z.enum(["vente", "location"]).optional(),
  type: z.enum(["appartement", "maison_villa", "autre"]).optional(),
  city: z.string().min(1).max(80).optional(),
  q: z.string().min(1).max(120).optional(),
  bedroomsMin: z.number().int().min(0).max(12).optional(),
  bathroomsMin: z.number().int().min(0).max(12).optional(),
  garagesMin: z.number().int().min(0).max(12).optional(),
  priceMin: z.number().int().min(0).max(50_000_000).optional(),
  priceMax: z.number().int().min(0).max(50_000_000).optional(),
  surfaceMin: z.number().min(0).max(100_000).optional(),
  surfaceMax: z.number().min(0).max(100_000).optional(),
  terrainMin: z.number().min(0).max(10_000_000).optional(),
  terrainMax: z.number().min(0).max(10_000_000).optional(),
  features: z.array(z.string().min(1).max(80)).max(12).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "surface_desc"]).optional(),
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
      bathroomsMin: z.number().int().min(0).max(12).optional(),
      garagesMin: z.number().int().min(0).max(12).optional(),
      priceMax: z.number().int().min(0).max(50_000_000).optional(),
      priceMin: z.number().int().min(0).max(50_000_000).optional(),
      surfaceMin: z.number().min(0).max(100_000).optional(),
      surfaceMax: z.number().min(0).max(100_000).optional(),
      terrainMin: z.number().min(0).max(10_000_000).optional(),
      terrainMax: z.number().min(0).max(10_000_000).optional(),
      features: z.array(z.string().min(1).max(80)).max(12).optional(),
      sort: z.enum(["newest", "price_asc", "price_desc", "surface_desc"]).optional(),
    })
    .optional(),
});

const actionRequestSchema = z.object({
  type: z.enum([
    "search_refine",
    "aggregate_properties",
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
  sessionId: z.string().min(1).max(120).optional(),
  capabilities: z
    .object({
      stream: z.boolean().optional(),
      multimodalCards: z.boolean().optional(),
    })
    .optional(),
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
    groundingMetadata?: {
      webSearchQueries?: Array<string | { searchQuery?: string }>;
      groundingChunks?: Array<{
        web?: {
          uri?: string;
          title?: string;
        };
      }>;
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
  bathroomsMin?: number;
  garagesMin?: number;
  priceMin?: number;
  priceMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  terrainMin?: number;
  terrainMax?: number;
  features?: string[];
  sort?: "newest" | "price_asc" | "price_desc" | "surface_desc";
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
    bathroomsMin?: number;
    garagesMin?: number;
    priceMin?: number;
    priceMax?: number;
    surfaceMin?: number;
    surfaceMax?: number;
    terrainMin?: number;
    terrainMax?: number;
    features?: string[];
    sort?: "newest" | "price_asc" | "price_desc" | "surface_desc";
  };
}

interface ToolActionRequest {
  type:
    | "search_refine"
    | "aggregate_properties"
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
  tool:
    | "search_properties"
    | "aggregate_properties"
    | "get_properties"
    | "compare_properties"
    | "prepare_handoff"
    | "get_property_media_context"
    | "get_property_document_context"
    | "retrieve_site_context";
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

type PropertyAggregationScope = "current_filtered" | "global_active_inventory" | "selected_properties";

interface PropertyAggregateMetrics {
  count: number;
  excludedSurfaceCount?: number;
  excludedPricePerM2Count?: number;
  avgSurfaceM2?: number | null;
  medianSurfaceM2?: number | null;
  minSurfaceM2?: number | null;
  maxSurfaceM2?: number | null;
  avgPrice?: number | null;
  medianPrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  avgPricePerM2?: number | null;
}

interface PropertyAggregateBreakdownBucket {
  key: string;
  label: string;
  count: number;
  avgPrice?: number | null;
  avgSurfaceM2?: number | null;
}

interface ToolUiActionStatsSummary extends ToolUiActionBase {
  kind: "stats_summary";
  data: {
    scope: PropertyAggregationScope;
    scopeLabel: string;
    criteriaSummary: string;
    searchParams?: ToolSearchParams;
    selectedPropertyIds?: number[];
    metrics: PropertyAggregateMetrics;
    breakdowns?: {
      byTransaction?: PropertyAggregateBreakdownBucket[];
      byType?: PropertyAggregateBreakdownBucket[];
      topCities?: PropertyAggregateBreakdownBucket[];
    };
    sampleSizeLabel: string;
    lowSampleWarning?: string;
  };
}

interface ToolUiActionFacetRefine extends ToolUiActionBase {
  kind: "facet_refine";
  data: {
    searchParams: ToolSearchParams;
    suggestions: Array<{
      label: string;
      patch: Partial<ToolSearchParams>;
      removeKeys?: Array<keyof ToolSearchParams>;
    }>;
  };
}

interface ToolUiActionApplyFilterPatch extends ToolUiActionBase {
  kind: "apply_filter_patch";
  data: {
    searchParamsPatch: Partial<ToolSearchParams>;
    removeKeys?: Array<keyof ToolSearchParams>;
    label: string;
    syntheticPrompt?: string;
  };
}

interface ToolUiActionClarifyScope extends ToolUiActionBase {
  kind: "clarify_scope";
  data: {
    options: Array<{
      scope: PropertyAggregationScope;
      label: string;
      description?: string;
      searchParams?: ToolSearchParams;
    }>;
    defaultScope?: PropertyAggregationScope;
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
  | ToolUiActionStatsSummary
  | ToolUiActionFacetRefine
  | ToolUiActionApplyFilterPatch
  | ToolUiActionClarifyScope
  | ToolUiActionCompareSummary
  | ToolUiActionOpenPage
  | ToolUiActionLeadHandoffDraft
  | ToolUiActionNotice;

type AnalysisCardKind =
  | "property_photo_insights"
  | "property_plan_insights"
  | "property_document_summary"
  | "property_risks_notice";

interface AnalysisCardEvidenceItem {
  sourceUrl?: string;
  thumbnailUrl?: string;
  page?: number;
  label?: string;
  kind?: string;
}

interface AnalysisCard {
  id: string;
  kind: AnalysisCardKind;
  propertyId: number;
  title: string;
  summary: string;
  confidence?: number;
  stale?: boolean;
  cacheHit?: boolean;
  sourceKind?: "image" | "document";
  documentKind?: "dpe_pdf" | "diagnostic_pdf" | "floor_plan_pdf" | "brochure_pdf" | "other";
  evidence?: AnalysisCardEvidenceItem[];
}

interface MemoryResponseMeta {
  updated: boolean;
  preferenceKeys?: string[];
  summary?: string;
  source?: "state_merge" | "gemini_extractor" | "none";
  ttlDays?: number;
  updatedKeys?: string[];
  confidence?: number;
  cleared?: boolean;
}

interface CostHints {
  route: string;
  multimodalUsed?: boolean;
  estimatedClass?: "low" | "medium" | "high";
}

interface ToolOrchestrationResult {
  answer: string;
  suggestedPrompts: string[];
  actions: ToolUiAction[];
  conversationStatePatch?: Partial<ToolConversationState>;
  toolTrace: ToolTraceItem[];
  agentMode: AgentMode;
  planner?: PlannerMeta;
  analysisCards?: AnalysisCard[];
  memory?: MemoryResponseMeta;
  costHints?: CostHints;
}

type PlannerToolName =
  | "search_properties"
  | "aggregate_properties"
  | "get_properties"
  | "compare_properties"
  | "prepare_handoff"
  | "get_property_media_context"
  | "get_property_document_context"
  | "retrieve_site_context";
type PlannerDecisionType = "tool_call" | "clarify" | "plan" | "none";
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
  missingFields?: Array<"transaction" | "city" | "budget" | "type" | "bedrooms" | "surface">;
  options?: string[];
}

interface PlannerStep {
  tool: PlannerToolName;
  args?: Record<string, unknown>;
  purpose?: string;
}

type PlannerToolArgs =
  | ({ tool: "search_properties"; args: ToolSearchParams })
  | ({
      tool: "aggregate_properties";
      args?: {
        scope?: PropertyAggregationScope;
        searchParams?: ToolSearchParams;
        propertyIds?: number[];
      };
    })
  | ({ tool: "get_properties"; args?: { propertyIds?: number[] } })
  | ({ tool: "compare_properties"; args?: { propertyIds?: number[] } })
  | ({ tool: "prepare_handoff"; args?: { propertyIds?: number[] } })
  | ({ tool: "get_property_media_context"; args?: { propertyIds?: number[] } })
  | ({ tool: "get_property_document_context"; args?: { propertyIds?: number[] } })
  | ({ tool: "retrieve_site_context"; args?: { query?: string } });

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
    }
  | {
      version: 2;
      decisionType: "plan";
      confidence?: number;
      reasonCode?: string;
      steps: PlannerStep[];
      finalResponseMode?: "tool_summary" | "tool_plus_multimodal_summary";
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
  steps: z
    .array(
      z.object({
        tool: z.string().min(1),
        args: z.unknown().optional(),
        purpose: z.string().optional(),
      }),
    )
    .optional(),
  finalResponseMode: z.string().optional(),
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
  kind?: "site" | "web";
  path: string;
  title?: string;
  sourceUrl?: string;
  similarity?: number;
}

interface GeminiGroundingExtractionResult {
  used: boolean;
  citations: RAGCitation[];
  queries: string[];
}

interface AssistantGenerationResult {
  provider: AIProvider;
  answer: string;
  webSearch?: GeminiGroundingExtractionResult;
}

interface PageContextMeta {
  used: boolean;
  fetchMode?: "http" | "headless";
  cacheHit?: boolean;
  route?: string;
  source?: "http" | "headless";
}

interface RAGContextResult {
  contextBlock: string | null;
  citations: RAGCitation[];
  retrievalMode: RAGRetrievalMode;
  pageContextMeta?: PageContextMeta;
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

function sanitizeJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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

const pageFallbackQuestionPattern =
  /(^|\s)(resume|résume|explique|expliquer|ou trouver|où trouver|page|rubrique|mentions legales|mentions légales|confidentialite|confidentialité|cookies|histoire|services?)(\s|$)/i;

interface PageHtmlFetchResult {
  html: string;
  status: number;
  url: string;
}

interface ExtractedPageText {
  title: string | null;
  text: string;
  headings: string[];
  isThin: boolean;
  hints: string[];
}

interface PageSnapshotCacheRow {
  path: string;
  source_url: string;
  fetch_mode: "http" | "headless";
  status: "ready" | "error" | "thin" | "skipped";
  title?: string | null;
  content_text?: string | null;
  word_count?: number | null;
  last_error?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface OnDemandPageContextResult {
  contextBlock: string | null;
  citations: RAGCitation[];
  meta?: PageContextMeta;
}

function parseDurationSecondsEnv(name: string, fallbackSeconds: number, minSeconds: number, maxSeconds: number): number {
  return clamp(Math.floor(parseNumberEnv(name, fallbackSeconds)), minSeconds, maxSeconds);
}

function normalizeRoutePath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (!/^\/[a-z0-9/_-]+(?:\?[a-z0-9=&_-]+)?$/i.test(trimmed)) return null;
  if (/^\/(?:api|admin|functions)\b/i.test(trimmed)) return null;
  return trimmed.split("#")[0];
}

function extractRequestedRoute(question: string): string | null {
  const pathMentions = extractPathMentions(question);
  for (const path of pathMentions) {
    const normalized = normalizeRoutePath(path);
    if (normalized) return normalized;
  }
  return null;
}

function resolvePageFallbackCandidate(question: string, ragCitations: RAGCitation[]): { path: string; reason: string } | null {
  const explicit = extractRequestedRoute(question);
  if (explicit) return { path: explicit, reason: "explicit_route" };
  if (!pageFallbackQuestionPattern.test(question)) return null;
  if (ragCitations.length === 1 && normalizeRoutePath(ragCitations[0].path)) {
    return { path: ragCitations[0].path, reason: "single_rag_citation" };
  }
  return null;
}

function resolvePageFetchBaseUrl(): string | null {
  const explicit = (Deno.env.get("CHATBOT_PAGE_FETCH_BASE_URL") ?? "").trim();
  const fallback = (Deno.env.get("RAG_INDEX_BASE_URL") ?? "").trim();
  const base = explicit || fallback;
  if (!base) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}

function buildPageUrl(path: string): URL | null {
  const baseUrl = resolvePageFetchBaseUrl();
  if (!baseUrl) return null;
  try {
    const url = new URL(path, baseUrl);
    const baseOrigin = new URL(baseUrl).origin;
    if (url.origin !== baseOrigin) return null;
    return url;
  } catch {
    return null;
  }
}

function looksLikePublicPagePath(path: string): boolean {
  const normalized = normalizeRoutePath(path);
  if (!normalized) return false;
  if (/\.(?:pdf|xml|json|txt|png|jpe?g|webp|svg)$/i.test(normalized)) return false;
  return true;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntitiesBasic(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    });
}

function extractReadableTextFromHtml(html: string, path: string): ExtractedPageText {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntitiesBasic(titleMatch[1]).replace(/\s+/g, " ").trim().slice(0, 200) : null;
  const headingMatches = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((m) => decodeHtmlEntitiesBasic(stripHtmlTags(m[1])).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 8);
  const text = decodeHtmlEntitiesBasic(stripHtmlTags(html)).replace(/\s+/g, " ").trim();
  const hints: string[] = [];
  if (text.length < clamp(Math.floor(parseNumberEnv("CHATBOT_PAGE_FETCH_MIN_TEXT_CHARS", 500)), 120, 4000)) {
    hints.push("too_short");
  }
  const lower = text.toLowerCase();
  if (/edit with ai|vite|react app|loading/.test(lower)) hints.push("spa_shell_marker");
  const repeatedBoilerplate =
    ["mentions légales", "confidentialité", "cookies", "contact", "accueil"].filter((token) => lower.includes(token)).length;
  if (repeatedBoilerplate >= 4 && text.length < 2000) hints.push("boilerplate_heavy");
  if (headingMatches.length === 0) hints.push("no_headings");
  return {
    title,
    text: truncateText(text, 12000),
    headings: headingMatches,
    isThin: hints.length > 0,
    hints,
  };
}

async function sha256HexText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchPageHtmlSameOrigin(path: string): Promise<PageHtmlFetchResult | null> {
  const url = buildPageUrl(path);
  if (!url) return null;
  const timeoutMs = clamp(Math.floor(parseNumberEnv("CHATBOT_PAGE_FETCH_TIMEOUT_MS", 3000)), 500, 12000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "FochChatbotPageFallback/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (contentType && !contentType.includes("text/html")) return null;
    const html = await response.text();
    return { html, status: response.status, url: response.url };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface RenderedPageResponse {
  ok: boolean;
  path?: string;
  finalUrl?: string;
  title?: string;
  text?: string;
  headings?: string[];
  error?: string;
  code?: string;
}

async function fetchRenderedPageViaRenderer(path: string): Promise<RenderedPageResponse | null> {
  const rendererUrl = (Deno.env.get("CHATBOT_PAGE_RENDERER_URL") ?? "").trim();
  if (!rendererUrl) return null;
  const baseUrl = resolvePageFetchBaseUrl();
  if (!baseUrl) return null;
  const timeoutMs = clamp(Math.floor(parseNumberEnv("CHATBOT_PAGE_RENDERER_TIMEOUT_MS", 4000)), 800, 15000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(rendererUrl.replace(/\/$/, "") + "/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, baseUrl, timeoutMs }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data && typeof data === "object" ? (data as RenderedPageResponse) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildPageContextBlock(snapshot: {
  path: string;
  title?: string | null;
  text: string;
  fetchMode: "http" | "headless";
  sourceUrl?: string;
}): { contextBlock: string | null; citations: RAGCitation[] } {
  const text = truncateText(snapshot.text.trim(), 5000);
  if (!text) return { contextBlock: null, citations: [] };
  const contextBlock = [
    "WEBSITE_PAGE_FALLBACK_CONTEXT",
    "Use this fallback page context when indexed website context is weak or missing.",
    `path: ${snapshot.path}`,
    `fetch_mode: ${snapshot.fetchMode}`,
    `title: ${snapshot.title?.trim() || "Sans titre"}`,
    `excerpt: ${text}`,
  ].join("\n");
  return {
    contextBlock,
    citations: [{
      path: snapshot.path,
      title: snapshot.title ?? undefined,
      sourceUrl: snapshot.sourceUrl,
    }],
  };
}

async function readCachedPageSnapshot(
  supabase: ReturnType<typeof createServiceClient>,
  path: string,
): Promise<PageSnapshotCacheRow | null> {
  try {
    const { data, error } = await supabase
      .from("chatbot_page_snapshot_cache")
      .select("path,source_url,fetch_mode,status,title,content_text,word_count,last_error,metadata,expires_at")
      .eq("path", path)
      .maybeSingle();
    if (error || !data) return null;
    const expiresAt = typeof (data as Record<string, unknown>).expires_at === "string"
      ? Date.parse((data as Record<string, unknown>).expires_at as string)
      : NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return {
      path: String((data as Record<string, unknown>).path),
      source_url: String((data as Record<string, unknown>).source_url),
      fetch_mode: (((data as Record<string, unknown>).fetch_mode === "headless") ? "headless" : "http"),
      status: (((data as Record<string, unknown>).status === "ready" ||
        (data as Record<string, unknown>).status === "error" ||
        (data as Record<string, unknown>).status === "thin" ||
        (data as Record<string, unknown>).status === "skipped")
        ? (data as Record<string, unknown>).status
        : "error") as PageSnapshotCacheRow["status"],
      title: typeof (data as Record<string, unknown>).title === "string" ? (data as Record<string, unknown>).title as string : null,
      content_text: typeof (data as Record<string, unknown>).content_text === "string"
        ? (data as Record<string, unknown>).content_text as string
        : null,
      word_count: typeof (data as Record<string, unknown>).word_count === "number"
        ? (data as Record<string, unknown>).word_count as number
        : null,
      last_error: typeof (data as Record<string, unknown>).last_error === "string"
        ? (data as Record<string, unknown>).last_error as string
        : null,
      metadata: (data as Record<string, unknown>).metadata && typeof (data as Record<string, unknown>).metadata === "object"
        ? ((data as Record<string, unknown>).metadata as Record<string, unknown>)
        : null,
    };
  } catch {
    return null;
  }
}

async function upsertPageSnapshotCache(
  supabase: ReturnType<typeof createServiceClient>,
  row: {
    path: string;
    sourceUrl: string;
    fetchMode: "http" | "headless";
    status: "ready" | "error" | "thin" | "skipped";
    title?: string | null;
    contentText?: string | null;
    lastError?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const readyTtlSeconds = parseDurationSecondsEnv("CHATBOT_PAGE_FETCH_CACHE_TTL_SECONDS", 86_400, 60, 604_800);
  const errorTtlSeconds = parseDurationSecondsEnv("CHATBOT_PAGE_FETCH_ERROR_TTL_SECONDS", 900, 60, 86_400);
  const ttlSeconds = row.status === "ready" ? readyTtlSeconds : errorTtlSeconds;
  const contentText = row.contentText?.trim() ?? null;
  const wordCount = contentText ? contentText.split(/\s+/).filter(Boolean).length : 0;
  const contentHash = contentText ? await sha256HexText(contentText) : null;
  try {
    await supabase.from("chatbot_page_snapshot_cache").upsert({
      path: row.path,
      source_url: row.sourceUrl,
      fetch_mode: row.fetchMode,
      status: row.status,
      title: row.title ?? null,
      content_text: contentText,
      content_hash: contentHash,
      word_count: wordCount,
      last_fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      last_error: row.lastError ?? null,
      metadata: row.metadata ?? {},
      updated_at: new Date().toISOString(),
    }, { onConflict: "path" });
  } catch {
    // Ignore cache persistence failures.
  }
}

function mergeRagContexts(base: RAGContextResult, page: OnDemandPageContextResult | null): RAGContextResult {
  if (!page || !page.contextBlock) return base;
  const mergedCitations = [...base.citations];
  for (const citation of page.citations) {
    if (!mergedCitations.some((existing) => existing.path === citation.path)) {
      mergedCitations.push(citation);
    }
  }
  const contextBlock = [base.contextBlock, page.contextBlock].filter(Boolean).join("\n\n");
  return {
    contextBlock: contextBlock || null,
    citations: mergedCitations,
    retrievalMode: base.retrievalMode,
    pageContextMeta: page.meta ?? { used: true },
  };
}

function shouldAttemptPageFallback(question: string, rag: RAGContextResult): boolean {
  if (!parseBooleanEnv("CHATBOT_PAGE_FALLBACK_ENABLED", true)) return false;
  const explicitRoute = extractRequestedRoute(question);
  if (explicitRoute) return true;
  const pageLike = pageFallbackQuestionPattern.test(normalizeText(question));
  if (!pageLike) return false;
  if (!rag.contextBlock || rag.retrievalMode === "none") return true;
  const weakThreshold = clamp(Math.floor(parseNumberEnv("CHATBOT_PAGE_FALLBACK_WEAK_CONTEXT_CHARS", 1200)), 200, 6000);
  return rag.contextBlock.length < weakThreshold || rag.citations.length === 0;
}

async function retrieveOnDemandPageContext(question: string, ragContext: RAGContextResult): Promise<OnDemandPageContextResult | null> {
  if (!shouldAttemptPageFallback(question, ragContext)) return null;
  const candidate = resolvePageFallbackCandidate(question, ragContext.citations);
  if (!candidate || !looksLikePublicPagePath(candidate.path)) return null;
  const path = candidate.path;

  let supabase: ReturnType<typeof createServiceClient> | null = null;
  try {
    supabase = createServiceClient();
  } catch {
    supabase = null;
  }

  if (supabase) {
    const cached = await readCachedPageSnapshot(supabase, path);
    if (cached && cached.status !== "ready") {
      return null;
    }
    if (cached?.status === "ready" && typeof cached.content_text === "string" && cached.content_text.trim().length > 0) {
      const built = buildPageContextBlock({
        path,
        title: cached.title ?? undefined,
        text: cached.content_text,
        fetchMode: cached.fetch_mode,
        sourceUrl: cached.source_url,
      });
      if (built.contextBlock) {
        return {
          ...built,
          meta: {
            used: true,
            fetchMode: cached.fetch_mode,
            source: cached.fetch_mode,
            cacheHit: true,
            route: path,
          },
        };
      }
    }
  }

  const htmlFetch = await fetchPageHtmlSameOrigin(path);
  if (!htmlFetch) {
    if (supabase) {
      await upsertPageSnapshotCache(supabase, {
        path,
        sourceUrl: buildPageUrl(path)?.toString() ?? path,
        fetchMode: "http",
        status: "error",
        lastError: "http_fetch_failed",
        metadata: { reason: candidate.reason },
      });
    }
    return null;
  }

  const extracted = extractReadableTextFromHtml(htmlFetch.html, path);
  let snapshotText = extracted.text;
  let snapshotTitle = extracted.title;
  let fetchMode: "http" | "headless" = "http";
  let status: "ready" | "thin" = extracted.isThin ? "thin" : "ready";
  let metadata: Record<string, unknown> = { hints: extracted.hints, reason: candidate.reason };

  if (extracted.isThin) {
    const rendered = await fetchRenderedPageViaRenderer(path);
    if (rendered?.ok && typeof rendered.text === "string" && rendered.text.trim().length > 0) {
      snapshotText = truncateText(rendered.text.replace(/\s+/g, " ").trim(), 12000);
      snapshotTitle = typeof rendered.title === "string" ? rendered.title.trim().slice(0, 200) : snapshotTitle;
      fetchMode = "headless";
      status = "ready";
      metadata = {
        ...metadata,
        rendererUsed: true,
        renderHeadings: Array.isArray(rendered.headings) ? rendered.headings.slice(0, 8) : undefined,
      };
    }
  }

  if (supabase) {
    await upsertPageSnapshotCache(supabase, {
      path,
      sourceUrl: htmlFetch.url,
      fetchMode,
      status,
      title: snapshotTitle,
      contentText: snapshotText,
      metadata,
      lastError: status === "ready" ? null : "thin_page_content",
    });
  }

  if (!snapshotText || status !== "ready") return null;
  const built = buildPageContextBlock({
    path,
    title: snapshotTitle,
    text: snapshotText,
    fetchMode,
    sourceUrl: htmlFetch.url,
  });
  if (!built.contextBlock) return null;
  return {
    ...built,
    meta: {
      used: true,
      fetchMode,
      source: fetchMode,
      cacheHit: false,
      route: path,
    },
  };
}

async function retrieveWebsiteContextWithPageFallback(question: string): Promise<RAGContextResult> {
  const rag = await retrieveWebsiteContext(question);
  const page = await retrieveOnDemandPageContext(question, rag);
  return mergeRagContexts(rag, page);
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

function sanitizeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function shouldUseGeminiWebSearchGrounding(question: string, ragContext: RAGContextResult): boolean {
  if (!parseBooleanEnv("CHATBOT_WEB_SEARCH_ENABLED", false)) return false;
  const minChars = clamp(Math.floor(parseNumberEnv("CHATBOT_WEB_SEARCH_MIN_QUESTION_CHARS", 8)), 1, 200);
  const trimmedQuestion = question.trim();
  if (trimmedQuestion.length < minChars) return false;

  if (extractRequestedRoute(trimmedQuestion)) return false;

  const normalizedQuestion = normalizeText(trimmedQuestion);
  if (
    toolPropertyIntentPattern.test(normalizedQuestion) ||
    toolCompareIntentPattern.test(normalizedQuestion) ||
    toolHandoffIntentPattern.test(normalizedQuestion)
  ) {
    return false;
  }

  const ragWeak =
    !ragContext.contextBlock ||
    ragContext.retrievalMode === "none" ||
    ragContext.citations.length === 0 ||
    ragContext.contextBlock.length < 1200;

  if (!ragContext.contextBlock || ragContext.retrievalMode === "none") {
    return true;
  }

  const explicitWebSearchPattern =
    /\b(search|recherche|chercher|google|web|internet|online|en ligne)\b|\b(a jour|a journee|up to date|current info|info actuelle|actualisee?)\b/;
  if (explicitWebSearchPattern.test(normalizedQuestion)) {
    return true;
  }

  const currentnessPattern =
    /\b(today|todays|now|current|latest|recent|news|update|updated|actualite|actu|aujourd hui|maintenant|actuel|actuelle|actuelles|tendance|tendances|meteo|weather|taux|rate|prix|price|bourse|crypto|bitcoin|btc|eur|usd)\b/;
  if (ragWeak && currentnessPattern.test(normalizedQuestion)) {
    return true;
  }

  return false;
}

function extractGeminiGroundingMetadata(payload: unknown): GeminiGroundingExtractionResult {
  const maxCitations = clamp(Math.floor(parseNumberEnv("CHATBOT_WEB_SEARCH_MAX_CITATIONS", 4)), 1, 8);
  const queries: string[] = [];
  const citations: RAGCitation[] = [];
  const seenUrls = new Set<string>();
  let sawGroundingMetadata = false;

  const candidates = (payload as GeminiGenerateContentResponse | null)?.candidates;
  if (!Array.isArray(candidates)) {
    return { used: false, citations: [], queries: [] };
  }

  for (const candidate of candidates) {
    const groundingMetadata = candidate?.groundingMetadata;
    if (!groundingMetadata || typeof groundingMetadata !== "object") continue;
    sawGroundingMetadata = true;

    if (Array.isArray(groundingMetadata.webSearchQueries)) {
      for (const entry of groundingMetadata.webSearchQueries) {
        const query =
          typeof entry === "string"
            ? entry.trim()
            : typeof entry?.searchQuery === "string"
              ? entry.searchQuery.trim()
              : "";
        if (!query || queries.includes(query)) continue;
        queries.push(query.slice(0, 240));
        if (queries.length >= 3) break;
      }
    }

    if (Array.isArray(groundingMetadata.groundingChunks)) {
      for (const chunk of groundingMetadata.groundingChunks) {
        const url = sanitizeHttpUrl(chunk?.web?.uri);
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);
        const title = typeof chunk?.web?.title === "string" ? chunk.web.title.trim().slice(0, 240) : undefined;
        citations.push({
          kind: "web",
          path: url,
          sourceUrl: url,
          title: title || undefined,
        });
        if (citations.length >= maxCitations) break;
      }
    }
  }

  return {
    used: sawGroundingMetadata || citations.length > 0,
    citations,
    queries,
  };
}

function mergeChatbotResponseCitations(siteCitations: RAGCitation[], webCitations: RAGCitation[] = []): RAGCitation[] {
  const merged: RAGCitation[] = [];
  const seen = new Set<string>();

  for (const citation of siteCitations) {
    if (merged.length >= 3) break;
    const path = typeof citation.path === "string" ? citation.path.trim() : "";
    if (!path || !path.startsWith("/")) continue;
    const key = `site:${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      kind: "site",
      path,
      title: citation.title,
      sourceUrl: citation.sourceUrl,
      similarity: citation.similarity,
    });
  }

  for (const citation of webCitations) {
    if (merged.length >= 6) break;
    const url = sanitizeHttpUrl(citation.sourceUrl ?? citation.path);
    if (!url) continue;
    const key = `web:${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      kind: "web",
      path: url,
      sourceUrl: url,
      title: typeof citation.title === "string" ? citation.title.trim().slice(0, 240) : undefined,
    });
  }

  return merged;
}

async function generateAssistantAnswer(
  question: string,
  normalizedHistory: Array<{ role: "user" | "assistant"; content: string }>,
  ragContext: RAGContextResult,
): Promise<AssistantGenerationResult | null> {
  const providerConfig = resolveGenerationProvider();
  if (!providerConfig) return null;

  if (providerConfig.provider === "gemini") {
    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash-lite";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const useWebSearchGrounding = shouldUseGeminiWebSearchGrounding(question, ragContext);

    const requestBody: Record<string, unknown> = {
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
    };
    if (useWebSearchGrounding) {
      requestBody.tools = [{ google_search: {} }];
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": providerConfig.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const webSearch = useWebSearchGrounding ? extractGeminiGroundingMetadata(data) : undefined;
    return {
      provider: "gemini",
      answer: extractGeminiOutputText(data),
      webSearch,
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
  v2Enabled: boolean;
  maxSteps: number;
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
    v2Enabled: parseBooleanEnv("CHATBOT_GEMINI_PLANNER_V2_ENABLED", false),
    maxSteps: clamp(Math.floor(parseNumberEnv("CHATBOT_GEMINI_PLANNER_MAX_STEPS", 3)), 1, 3),
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
  if (
    candidate.sort === "newest" ||
    candidate.sort === "price_asc" ||
    candidate.sort === "price_desc" ||
    candidate.sort === "surface_desc"
  ) {
    parsed.sort = candidate.sort;
  }
  if (Array.isArray(candidate.features)) {
    const features = candidate.features
      .map((value) => (typeof value === "string" ? value.trim().slice(0, 80) : ""))
      .filter(Boolean)
      .slice(0, 12);
    if (features.length > 0) parsed.features = [...new Set(features)];
  }

  const bedroomsMin = parsePlannerNumber(candidate.bedroomsMin, 0, 12);
  if (typeof bedroomsMin === "number") parsed.bedroomsMin = bedroomsMin;
  const bathroomsMin = parsePlannerNumber(candidate.bathroomsMin, 0, 12);
  if (typeof bathroomsMin === "number") parsed.bathroomsMin = bathroomsMin;
  const garagesMin = parsePlannerNumber(candidate.garagesMin, 0, 12);
  if (typeof garagesMin === "number") parsed.garagesMin = garagesMin;
  const priceMin = parsePlannerNumber(candidate.priceMin, 0, 50_000_000);
  if (typeof priceMin === "number") parsed.priceMin = priceMin;
  const priceMax = parsePlannerNumber(candidate.priceMax, 0, 50_000_000);
  if (typeof priceMax === "number") parsed.priceMax = priceMax;
  const surfaceMin = parsePlannerNumber(candidate.surfaceMin, 0, 100_000);
  if (typeof surfaceMin === "number") parsed.surfaceMin = surfaceMin;
  const surfaceMax = parsePlannerNumber(candidate.surfaceMax, 0, 100_000);
  if (typeof surfaceMax === "number") parsed.surfaceMax = surfaceMax;
  const terrainMin = parsePlannerNumber(candidate.terrainMin, 0, 10_000_000);
  if (typeof terrainMin === "number") parsed.terrainMin = terrainMin;
  const terrainMax = parsePlannerNumber(candidate.terrainMax, 0, 10_000_000);
  if (typeof terrainMax === "number") parsed.terrainMax = terrainMax;
  const page = parsePlannerNumber(candidate.page, 1, 100);
  if (typeof page === "number") parsed.page = page;
  const pageSize = parsePlannerNumber(candidate.pageSize, 1, 10);
  if (typeof pageSize === "number") parsed.pageSize = pageSize;

  if (parsed.priceMin != null && parsed.priceMax != null && parsed.priceMin > parsed.priceMax) {
    [parsed.priceMin, parsed.priceMax] = [parsed.priceMax, parsed.priceMin];
  }
  if (parsed.surfaceMin != null && parsed.surfaceMax != null && parsed.surfaceMin > parsed.surfaceMax) {
    [parsed.surfaceMin, parsed.surfaceMax] = [parsed.surfaceMax, parsed.surfaceMin];
  }
  if (parsed.terrainMin != null && parsed.terrainMax != null && parsed.terrainMin > parsed.terrainMax) {
    [parsed.terrainMin, parsed.terrainMax] = [parsed.terrainMax, parsed.terrainMin];
  }

  return parsed;
}

function sanitizePlannerAggregateArgs(rawArgs: unknown): {
  scope?: PropertyAggregationScope;
  searchParams?: ToolSearchParams;
  propertyIds?: number[];
} {
  if (!rawArgs || typeof rawArgs !== "object") return {};
  const candidate = rawArgs as Record<string, unknown>;
  const args: {
    scope?: PropertyAggregationScope;
    searchParams?: ToolSearchParams;
    propertyIds?: number[];
  } = {};

  if (
    candidate.scope === "current_filtered" ||
    candidate.scope === "global_active_inventory" ||
    candidate.scope === "selected_properties"
  ) {
    args.scope = candidate.scope;
  }
  if (candidate.searchParams && typeof candidate.searchParams === "object" && !Array.isArray(candidate.searchParams)) {
    args.searchParams = sanitizePlannerSearchArgs(candidate.searchParams);
  } else {
    const directSearchParams = sanitizePlannerSearchArgs(candidate);
    if (Object.keys(directSearchParams).length > 0) args.searchParams = directSearchParams;
  }
  if (Array.isArray(candidate.propertyIds)) {
    const ids = candidate.propertyIds
      .map((value) => (typeof value === "number" ? value : Number(value)))
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(0, 50);
    if (ids.length > 0) args.propertyIds = ids;
  }
  return args;
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
    if (v === "plan" || v === "tool_plan" || v === "multi_step_plan") return "plan";
    return value;
  };
  const normalizeToolName = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const v = value.trim().toLowerCase();
    if (v === "search_properties" || v === "search" || v === "property_search") return "search_properties";
    if (v === "aggregate_properties" || v === "aggregate" || v === "stats" || v === "property_stats") return "aggregate_properties";
    if (v === "get_properties" || v === "get_property" || v === "fetch_properties") return "get_properties";
    if (v === "compare_properties" || v === "compare" || v === "comparison") return "compare_properties";
    if (v === "prepare_handoff" || v === "handoff" || v === "contact" || v === "prepare_contact") return "prepare_handoff";
    if (v === "get_property_media_context" || v === "property_media" || v === "media_context") return "get_property_media_context";
    if (v === "get_property_document_context" || v === "property_documents" || v === "document_context") return "get_property_document_context";
    if (v === "retrieve_site_context" || v === "site_context") return "retrieve_site_context";
    return value;
  };

  const normalized: Record<string, unknown> = {
    version: root.version === 2 ? 2 : 1,
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

  const stepArray = Array.isArray(root.steps)
    ? root.steps
    : Array.isArray(root.plan)
      ? root.plan
      : Array.isArray((root as Record<string, unknown>).toolPlan)
        ? ((root as Record<string, unknown>).toolPlan as unknown[])
        : null;
  if (stepArray) {
    normalized.steps = stepArray
      .filter((step) => step && typeof step === "object")
      .map((step) => {
        const candidate = step as Record<string, unknown>;
        const functionObj =
          candidate.function && typeof candidate.function === "object" && !Array.isArray(candidate.function)
            ? (candidate.function as Record<string, unknown>)
            : null;
        return {
          tool: normalizeToolName(
            candidate.tool ?? candidate.name ?? candidate.toolName ?? candidate.tool_name ?? functionObj?.name,
          ),
          args: maybeParseJsonString(
            candidate.args ?? candidate.arguments ?? candidate.parameters ?? functionObj?.args ?? functionObj?.arguments,
          ),
          purpose: typeof candidate.purpose === "string" ? candidate.purpose : undefined,
        };
      });
  }

  if (root.finalResponseMode || (root as Record<string, unknown>).final_response_mode) {
    normalized.finalResponseMode = root.finalResponseMode ?? (root as Record<string, unknown>).final_response_mode;
  }

  if (!normalized.decisionType) {
    if (normalized.toolCall) normalized.decisionType = "tool_call";
    else if (normalized.clarification) normalized.decisionType = "clarify";
    else if (Array.isArray(normalized.steps)) normalized.decisionType = "plan";
  }

  return normalized;
}

function sanitizePlannerDecision(raw: unknown): PlannerDecision | null {
  const parsed = plannerRawDecisionSchema.safeParse(normalizePlannerRawInput(raw));
  if (!parsed.success) return null;

  const candidate = parsed.data;
  const decisionType = String(candidate.decisionType).trim().toLowerCase();
  if (decisionType !== "tool_call" && decisionType !== "clarify" && decisionType !== "plan") return null;
  const confidence = typeof candidate.confidence === "number" ? clamp01(candidate.confidence) : undefined;
  const reasonCode = typeof candidate.reasonCode === "string" ? candidate.reasonCode.trim().slice(0, 80) : undefined;

  if (decisionType === "clarify") {
    if (!candidate.clarification) return null;
    const missingFields = Array.isArray(candidate.clarification.missingFields)
      ? candidate.clarification.missingFields
          .map((field) => String(field).trim().toLowerCase())
          .map((field) => {
            if (
              field === "transaction" ||
              field === "city" ||
              field === "budget" ||
              field === "type" ||
              field === "bedrooms" ||
              field === "surface"
            ) return field;
            if (field === "price" || field === "price_max" || field === "budgetmax") return "budget";
            if (field === "bedroom" || field === "rooms" || field === "chambres") return "bedrooms";
            if (field === "m2" || field === "surface_m2" || field === "surfacemin" || field === "surfacemax") return "surface";
            return null;
          })
          .filter(
            (field): field is "transaction" | "city" | "budget" | "type" | "bedrooms" | "surface" => field != null,
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

  if (decisionType === "plan") {
    const allowedTools = new Set<PlannerToolName>([
      "search_properties",
      "aggregate_properties",
      "get_properties",
      "compare_properties",
      "prepare_handoff",
      "get_property_media_context",
      "get_property_document_context",
      "retrieve_site_context",
    ]);
    const steps: PlannerStep[] = (candidate.steps ?? [])
      .map((step): PlannerStep | null => {
        const tool = typeof step.tool === "string" ? step.tool.trim() : "";
        if (!allowedTools.has(tool as PlannerToolName)) return null;
        const argsRaw =
          step.args && typeof step.args === "object" && !Array.isArray(step.args)
            ? (step.args as Record<string, unknown>)
            : {};
        let args: Record<string, unknown> = {};
        if (tool === "search_properties") {
          args = sanitizePlannerSearchArgs(argsRaw) as unknown as Record<string, unknown>;
        } else if (tool === "aggregate_properties") {
          args = sanitizePlannerAggregateArgs(argsRaw) as unknown as Record<string, unknown>;
        } else if (
          tool === "compare_properties" ||
          tool === "prepare_handoff" ||
          tool === "get_properties" ||
          tool === "get_property_media_context" ||
          tool === "get_property_document_context"
        ) {
          const propertyIds = uniqueNumberList(
            Array.isArray(argsRaw.propertyIds)
              ? (argsRaw.propertyIds as unknown[]).map((value) => (typeof value === "number" ? value : Number(value)))
              : [],
            3,
          );
          args = propertyIds.length > 0 ? { propertyIds } : {};
        } else if (tool === "retrieve_site_context") {
          const query = typeof argsRaw.query === "string" ? argsRaw.query.trim().slice(0, 240) : "";
          args = query ? { query } : {};
        }
        const purpose = typeof step.purpose === "string" ? step.purpose.trim().slice(0, 120) : undefined;
        return {
          tool: tool as PlannerToolName,
          args: Object.keys(args).length > 0 ? args : undefined,
          purpose,
        };
      })
      .filter((step): step is PlannerStep => step !== null)
      .slice(0, 3);
    if (steps.length === 0) return null;
    return {
      version: 2,
      decisionType: "plan",
      confidence,
      reasonCode,
      steps,
      finalResponseMode:
        candidate.finalResponseMode === "tool_plus_multimodal_summary" ? "tool_plus_multimodal_summary" : "tool_summary",
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

  if (tool === "aggregate_properties") {
    return {
      version: 1,
      decisionType: "tool_call",
      confidence,
      reasonCode,
      toolCall: {
        tool,
        args: sanitizePlannerAggregateArgs(candidate.toolCall.args),
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
  if (toolCall.tool === "aggregate_properties") {
    return {
      type: "aggregate_properties",
      payload: {
        ...(toolCall.args?.scope ? { scope: toolCall.args.scope } : {}),
        ...(toolCall.args?.searchParams ? { searchParams: toolCall.args.searchParams } : {}),
        ...(toolCall.args?.propertyIds?.length ? { propertyIds: toolCall.args.propertyIds } : {}),
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
  v2Enabled?: boolean;
  maxSteps?: number;
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
          bathroomsMin: "number",
          garagesMin: "number",
          priceMin: "number",
          priceMax: "number",
          surfaceMin: "number",
          surfaceMax: "number",
          terrainMin: "number",
          terrainMax: "number",
          features: "optional string[]",
          sort: ["newest", "price_asc", "price_desc", "surface_desc"],
          q: "string",
          page: "number",
          pageSize: "number <= 10",
        },
      },
      aggregate_properties: {
        args: {
          scope: ["current_filtered", "global_active_inventory", "selected_properties"],
          searchParams: "optional object same shape as search_properties args",
          propertyIds: "optional number[] (for selected_properties)",
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
      get_properties: {
        args: {
          propertyIds: "optional number[] (for compare/handoff context)",
        },
      },
      get_property_media_context: {
        args: {
          propertyIds: "optional number[] (top 1-3)",
        },
      },
      get_property_document_context: {
        args: {
          propertyIds: "optional number[] (top 1-3)",
        },
      },
    },
  };

  const v2Enabled = Boolean(input.v2Enabled);
  const systemInstruction = [
    "You are a strict property-tool planner for a French real-estate chatbot (Foch Immobilier, Le Havre).",
    "You are planning only for PROPERTY flows (search / aggregate stats / compare / handoff).",
    "Return JSON only. No markdown. No prose outside JSON.",
    v2Enabled ? "Allowed decision types: plan or clarify." : "Allowed decision types: tool_call or clarify.",
    v2Enabled
      ? `If tool execution is needed, return a plan with 1 to ${Math.max(1, Math.min(3, input.maxSteps ?? 3))} steps.`
      : "Choose at most one tool call.",
    "If request is vague or key criteria are missing, ask ONE clarification question instead of guessing.",
    "Never produce side effects. Never claim a tool result.",
    "Prefer clarify for ambiguous investment requests without city or transaction.",
    "Use French for clarification.question and options.",
    v2Enabled
      ? "Use exact tool names from the allowed tools and keep steps minimal."
      : "Use exact tool names: search_properties, aggregate_properties, compare_properties, prepare_handoff.",
    "For compare, use compare_properties only when the user clearly asks to compare or a selection exists.",
    v2Enabled ? "Output schema version must be 2." : "Output schema version must be 1.",
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
    v2Enabled: config.v2Enabled,
    maxSteps: config.maxSteps,
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

function buildRagFallbackWithoutGeneration(ragContext: RAGContextResult): { answer: string; suggestedPrompts: string[] } | null {
  if (!ragContext.contextBlock || ragContext.citations.length === 0) return null;

  const siteCitation = ragContext.citations.find((citation) => citation.kind !== "web") ?? ragContext.citations[0];
  const citationLabel = siteCitation?.path || "la page demandée";
  const prompts = [
    ...buildSuggestedPromptsFromCitations(ragContext.citations),
    "Résumer les points clés",
    "Ouvrir la page source",
  ].slice(0, 6);

  return {
    answer:
      `J’ai retrouvé des informations pertinentes sur ${citationLabel}. Souhaitez-vous un résumé rapide ou l’ouverture de la page ?`,
    suggestedPrompts: prompts,
  };
}

function buildSuggestedPromptsFromCitations(citations: RAGCitation[]): string[] {
  const prompts: string[] = [];
  const seen = new Set<string>();

  for (const citation of citations) {
    if (prompts.length >= 3) break;
    if (citation.kind === "web") continue;
    if (!citation.path.startsWith("/")) continue;
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
const toolAggregateIntentPattern =
  /moyenn|average|mediane|median|stat(?:s|istiques)?|prix\s*(?:au|\/)\s*m2|m2\s*(?:moyen|moyenne)|surface\s*(?:moyenne|moyen)/;
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

const toolSearchKeywordStopWords = new Set([
  "avec",
  "sans",
  "dans",
  "pour",
  "sur",
  "sous",
  "chez",
  "le",
  "la",
  "les",
  "un",
  "une",
  "des",
  "de",
  "du",
  "au",
  "aux",
  "et",
  "ou",
]);

function sanitizeToolSearchKeywordFragment(value: string): string {
  return value
    .replace(/[%_(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function buildKeywordPhraseOrFilter(rawKeyword: string): string | null {
  const keyword = sanitizeToolSearchKeywordFragment(rawKeyword);
  if (!keyword) return null;
  const pattern = `%${keyword}%`;
  return `title.ilike.${pattern},description.ilike.${pattern}`;
}

function buildKeywordTokenOrFilter(rawKeyword: string): string | null {
  const tokens = [...new Set(
    tokenize(rawKeyword)
      .filter((token) => token.length >= 3)
      .filter((token) => !toolSearchKeywordStopWords.has(token)),
  )]
    .slice(0, 4)
    .map((token) => sanitizeToolSearchKeywordFragment(token))
    .filter((token) => token.length > 0);

  if (tokens.length < 2) return null;

  const clauses = tokens.flatMap((token) => {
    const pattern = `%${token}%`;
    return [`title.ilike.${pattern}`, `description.ilike.${pattern}`];
  });

  return clauses.length > 0 ? clauses.join(",") : null;
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

function parseBathroomsMin(question: string): number | undefined {
  const normalized = normalizeText(question);
  const match = normalized.match(/(\d{1,2})\s*(?:sdb|salle(?:s)? de bain|salles? de bains?)/);
  if (!match) return undefined;
  return clamp(Number(match[1]), 0, 12);
}

function parseGaragesMin(question: string): number | undefined {
  const normalized = normalizeText(question);
  const match = normalized.match(/(\d{1,2})\s*garage/);
  if (!match) return undefined;
  return clamp(Number(match[1]), 0, 12);
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
    /(budget|max(?:imum)?|moins de|jusqu(?:e|')?a)\s*[:-]?\s*([0-9][0-9\s.,]{2,})/i,
  );
  if (maxMatch) {
    const max = extract(maxMatch[2].replace(/[^\d]/g, ""));
    return { priceMax: Number.isFinite(max) ? max : undefined };
  }

  const minMatch = compactQuestion.match(/(min(?:imum)?|au moins|a partir de|plus de)\s*[:-]?\s*([0-9][0-9\s.,]{2,})/i);
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

function parseMetricRangeHints(
  question: string,
  config: { unitPattern: string; minKey: "surfaceMin" | "terrainMin"; maxKey: "surfaceMax" | "terrainMax" },
): Partial<ToolSearchParams> {
  const compactQuestion = question.replace(/\u00a0/g, " ");
  const unitPattern = config.unitPattern;
  const result: Partial<ToolSearchParams> = {};
  const extract = (value: string) => Number(value.replace(/[^\d.,]/g, "").replace(",", "."));

  const between = compactQuestion.match(
    new RegExp(`entre\\s+([0-9][0-9\\s.,]{0,7})\\s*(?:${unitPattern})\\s+et\\s+([0-9][0-9\\s.,]{0,7})\\s*(?:${unitPattern})?`, "i"),
  );
  if (between) {
    const a = extract(between[1]);
    const b = extract(between[2]);
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    if (Number.isFinite(min)) result[config.minKey] = min;
    if (Number.isFinite(max)) result[config.maxKey] = max;
    return result;
  }

  const maxMatch = compactQuestion.match(
    new RegExp(`(?:moins de|max(?:imum)?|jusqu(?:e|')?a)\\s*[:-]?\\s*([0-9][0-9\\s.,]{0,7})\\s*(?:${unitPattern})`, "i"),
  );
  if (maxMatch) {
    const max = extract(maxMatch[1]);
    if (Number.isFinite(max)) result[config.maxKey] = max;
  }

  const minMatch = compactQuestion.match(
    new RegExp(`(?:au moins|min(?:imum)?|a partir de|plus de)\\s*[:-]?\\s*([0-9][0-9\\s.,]{0,7})\\s*(?:${unitPattern})`, "i"),
  );
  if (minMatch) {
    const min = extract(minMatch[1]);
    if (Number.isFinite(min)) result[config.minKey] = min;
  }

  return result;
}

function parseSurfaceHints(question: string): Pick<ToolSearchParams, "surfaceMin" | "surfaceMax"> {
  const parsed = parseMetricRangeHints(question, {
    unitPattern: "m2|m\\^2|m²",
    minKey: "surfaceMin",
    maxKey: "surfaceMax",
  });
  return {
    surfaceMin: typeof parsed.surfaceMin === "number" && Number.isFinite(parsed.surfaceMin) ? parsed.surfaceMin : undefined,
    surfaceMax: typeof parsed.surfaceMax === "number" && Number.isFinite(parsed.surfaceMax) ? parsed.surfaceMax : undefined,
  };
}

function parseTerrainHints(question: string): Pick<ToolSearchParams, "terrainMin" | "terrainMax"> {
  const terrainQuestion = question;
  const parsed = parseMetricRangeHints(terrainQuestion, {
    unitPattern: "m2|m\\^2|m²",
    minKey: "terrainMin",
    maxKey: "terrainMax",
  });
  // Only keep terrain ranges when "terrain" appears to avoid confusing with habitable surface.
  if (!/\bterrain\b/i.test(terrainQuestion)) return {};
  return {
    terrainMin: typeof parsed.terrainMin === "number" && Number.isFinite(parsed.terrainMin) ? parsed.terrainMin : undefined,
    terrainMax: typeof parsed.terrainMax === "number" && Number.isFinite(parsed.terrainMax) ? parsed.terrainMax : undefined,
  };
}

function detectFeatureFilters(question: string): string[] | undefined {
  const normalized = normalizeText(question);
  const rules: Array<{ key: string; patterns: RegExp[] }> = [
    { key: "balcon", patterns: [/\bbalcon\b/] },
    { key: "terrasse", patterns: [/\bterrasse\b/] },
    { key: "ascenseur", patterns: [/\bascenseur\b/] },
    { key: "garage", patterns: [/\bgarage\b/] },
    { key: "parking", patterns: [/\bparking\b/, /\bstationnement\b/] },
    { key: "jardin", patterns: [/\bjardin\b/] },
    { key: "vue mer", patterns: [/\bvue mer\b/, /\bmer\b/] },
  ];
  const features = rules
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(normalized)))
    .map((rule) => rule.key);
  return features.length > 0 ? features.slice(0, 6) : undefined;
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
  if (merged.surfaceMin && merged.surfaceMax && merged.surfaceMin > merged.surfaceMax) {
    [merged.surfaceMin, merged.surfaceMax] = [merged.surfaceMax, merged.surfaceMin];
  }
  if (merged.terrainMin && merged.terrainMax && merged.terrainMin > merged.terrainMax) {
    [merged.terrainMin, merged.terrainMax] = [merged.terrainMax, merged.terrainMin];
  }
  if (Array.isArray(merged.features)) {
    merged.features = [...new Set(merged.features.map((value) => value.trim()).filter(Boolean))].slice(0, 12);
    if (merged.features.length === 0) delete merged.features;
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
    bathroomsMin: parseBathroomsMin(question),
    garagesMin: parseGaragesMin(question),
    ...parsePriceHints(question),
    ...parseSurfaceHints(question),
    ...parseTerrainHints(question),
    features: detectFeatureFilters(question),
  };

  let actionParams: ToolSearchParams = {};
  if (actionRequest?.type === "search_refine" || actionRequest?.type === "aggregate_properties") {
    const payload = actionRequest.payload ?? {};
    const rawSearchParams = payload.searchParams;
    if (rawSearchParams && typeof rawSearchParams === "object") {
      const parsed = toolSearchParamsSchema.safeParse(rawSearchParams);
      if (parsed.success) {
        actionParams = { ...parsed.data };
      }
    }
    if (actionRequest.type === "search_refine") {
      const page = typeof payload.page === "number" ? payload.page : Number(payload.page);
      if (Number.isFinite(page)) {
        actionParams.page = Math.floor(page);
      }
      const pageSize = typeof payload.pageSize === "number" ? payload.pageSize : Number(payload.pageSize);
      if (Number.isFinite(pageSize)) {
        actionParams.pageSize = Math.floor(pageSize);
      }
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
  if (typeof params.bathroomsMin === "number" && params.bathroomsMin > 0) {
    parts.push(`min. ${params.bathroomsMin} sdb`);
  }
  if (typeof params.garagesMin === "number" && params.garagesMin > 0) {
    parts.push(`min. ${params.garagesMin} garage${params.garagesMin > 1 ? "s" : ""}`);
  }
  if (typeof params.priceMax === "number") {
    parts.push(`budget max ${formatPriceValue(params.priceMax)}`);
  }
  if (typeof params.priceMin === "number") {
    parts.push(`budget min ${formatPriceValue(params.priceMin)}`);
  }
  if (typeof params.surfaceMin === "number") {
    parts.push(`surface min ${formatMetricValue(params.surfaceMin, "m²")}`);
  }
  if (typeof params.surfaceMax === "number") {
    parts.push(`surface max ${formatMetricValue(params.surfaceMax, "m²")}`);
  }
  if (typeof params.terrainMin === "number") {
    parts.push(`terrain min ${formatMetricValue(params.terrainMin, "m²")}`);
  }
  if (typeof params.terrainMax === "number") {
    parts.push(`terrain max ${formatMetricValue(params.terrainMax, "m²")}`);
  }
  if (Array.isArray(params.features) && params.features.length > 0) {
    parts.push(`options ${params.features.slice(0, 3).join(", ")}`);
  }
  if (typeof params.q === "string" && params.q.trim().length > 0) {
    parts.push(`mot-clé "${truncateText(params.q.trim(), 40)}"`);
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

function isLikelyAggregateQuestion(question: string): boolean {
  return toolAggregateIntentPattern.test(normalizeText(question));
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
  if (isLikelyAggregateQuestion(question)) return "tool";
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
  const sharedResult = await runSharedPropertySearchQuery(
    supabase,
    {
      ...(params as SharedPropertySearchQueryParams),
      page,
      pageSize,
    },
    {
      defaultPageSize: pageSize,
      minPageSizeWithoutSlug: 1,
      maxPageSize: 10,
    },
  );
  return {
    items: sharedResult.rows.map((row) => mapSearchRowToToolItem(row as unknown as PropertySearchQueryRow)),
    total: sharedResult.total,
    searchParams: { ...params, page: sharedResult.page, pageSize: sharedResult.pageSize },
  };
}

function roundMetricValue(value: number | null | undefined, decimals = 1): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizeAggregateMetrics(metrics: SharedPropertyAggregateMetrics): PropertyAggregateMetrics {
  return {
    count: Math.max(0, Math.floor(metrics.count)),
    excludedSurfaceCount: Math.max(0, Math.floor(metrics.excludedSurfaceCount ?? 0)),
    excludedPricePerM2Count: Math.max(0, Math.floor(metrics.excludedPricePerM2Count ?? 0)),
    avgSurfaceM2: roundMetricValue(metrics.avgSurfaceM2, 1),
    medianSurfaceM2: roundMetricValue(metrics.medianSurfaceM2, 1),
    minSurfaceM2: roundMetricValue(metrics.minSurfaceM2, 1),
    maxSurfaceM2: roundMetricValue(metrics.maxSurfaceM2, 1),
    avgPrice: roundMetricValue(metrics.avgPrice, 0),
    medianPrice: roundMetricValue(metrics.medianPrice, 0),
    minPrice: roundMetricValue(metrics.minPrice, 0),
    maxPrice: roundMetricValue(metrics.maxPrice, 0),
    avgPricePerM2: roundMetricValue(metrics.avgPricePerM2, 0),
  };
}

function formatAggregateScopeLabel(scope: PropertyAggregationScope): string {
  if (scope === "current_filtered") return "Résultats filtrés";
  if (scope === "selected_properties") return "Biens sélectionnés";
  return "Stock actif global";
}

function normalizeAggregateBreakdownBuckets(
  buckets: SharedPropertyAggregateBucket[],
  labelMap?: Record<string, string>,
): PropertyAggregateBreakdownBucket[] {
  return buckets.map((bucket) => ({
    key: bucket.key,
    label: labelMap?.[bucket.key] ?? bucket.label,
    count: bucket.count,
    avgPrice: roundMetricValue(bucket.avgPrice, 0),
    avgSurfaceM2: roundMetricValue(bucket.avgSurfaceM2, 1),
  }));
}

function buildStatsSummaryAction(input: {
  scope: PropertyAggregationScope;
  criteriaSummary: string;
  metrics: SharedPropertyAggregateMetrics;
  breakdowns: {
    byTransaction: SharedPropertyAggregateBucket[];
    byType: SharedPropertyAggregateBucket[];
    topCities: SharedPropertyAggregateBucket[];
  };
  searchParams?: ToolSearchParams;
  selectedPropertyIds?: number[];
}): ToolUiActionStatsSummary {
  const normalizedMetrics = normalizeAggregateMetrics(input.metrics);
  const count = normalizedMetrics.count;
  const lowSampleWarning = count > 0 && count < 5
    ? "Échantillon réduit: interprétez ces moyennes avec prudence."
    : undefined;
  return {
    id: buildToolActionId("stats"),
    kind: "stats_summary",
    title: count > 0 ? `Statistiques (${count} bien${count > 1 ? "s" : ""})` : "Aucune statistique disponible",
    description:
      count > 0
        ? "Métriques calculées sur les biens actuellement pris en compte par la recherche."
        : "Aucun bien ne correspond aux critères actuels.",
    data: {
      scope: input.scope,
      scopeLabel: formatAggregateScopeLabel(input.scope),
      criteriaSummary: input.criteriaSummary,
      searchParams: input.searchParams,
      selectedPropertyIds: input.selectedPropertyIds,
      metrics: normalizedMetrics,
      breakdowns: count > 0
        ? {
            byTransaction: normalizeAggregateBreakdownBuckets(input.breakdowns.byTransaction, {
              vente: "Vente",
              location: "Location",
            }),
            byType: normalizeAggregateBreakdownBuckets(input.breakdowns.byType, {
              appartement: "Appartement",
              maison_villa: "Maison / Villa",
              autre: "Autre",
            }),
            topCities: normalizeAggregateBreakdownBuckets(input.breakdowns.topCities),
          }
        : undefined,
      sampleSizeLabel: `${count} bien${count > 1 ? "s" : ""}`,
      lowSampleWarning,
    },
  };
}

function buildAggregateClarifyScopeAction(searchParams: ToolSearchParams): ToolUiActionClarifyScope {
  return {
    id: buildToolActionId("clarify-scope"),
    kind: "clarify_scope",
    title: "Préciser le périmètre des statistiques",
    description: "Voulez-vous les statistiques sur vos résultats filtrés ou sur tout le stock actif ?",
    data: {
      defaultScope: "current_filtered",
      options: [
        {
          scope: "current_filtered",
          label: "Mes résultats filtrés",
          description: "Calculer la moyenne et les stats sur la recherche actuelle.",
          searchParams,
        },
        {
          scope: "global_active_inventory",
          label: "Tout le stock actif",
          description: "Comparer avec les statistiques globales actuelles.",
        },
      ],
    },
  };
}

function buildAggregateQuickRefineFacetAction(searchParams: ToolSearchParams): ToolUiActionFacetRefine | null {
  const suggestions: ToolUiActionFacetRefine["data"]["suggestions"] = [];
  if (typeof searchParams.surfaceMin === "number") {
    suggestions.push({
      label: `+10 m² min`,
      patch: { surfaceMin: searchParams.surfaceMin + 10, page: 1 },
      removeKeys: ["page"],
    });
  } else {
    suggestions.push({ label: "Min 70 m²", patch: { surfaceMin: 70, page: 1 }, removeKeys: ["page"] });
  }
  if (typeof searchParams.priceMax === "number") {
    suggestions.push({
      label: "Budget +10%",
      patch: { priceMax: Math.round(searchParams.priceMax * 1.1), page: 1 },
      removeKeys: ["page"],
    });
  }
  if (searchParams.type !== "appartement") {
    suggestions.push({ label: "Appartement", patch: { type: "appartement", page: 1 }, removeKeys: ["page"] });
  }
  if (searchParams.type !== "maison_villa") {
    suggestions.push({ label: "Maison", patch: { type: "maison_villa", page: 1 }, removeKeys: ["page"] });
  }
  if (suggestions.length === 0) return null;
  return {
    id: buildToolActionId("facet"),
    kind: "facet_refine",
    title: "Affinages rapides",
    description: "Appliquez un ajustement en un clic, puis relancez la recherche.",
    data: {
      searchParams,
      suggestions: suggestions.slice(0, 5),
    },
  };
}

function parseAggregateScopeFromAction(actionRequest: ToolActionRequest | undefined): PropertyAggregationScope | undefined {
  if (actionRequest?.type !== "aggregate_properties") return undefined;
  const scope = actionRequest.payload?.scope;
  if (scope === "current_filtered" || scope === "global_active_inventory" || scope === "selected_properties") return scope;
  return undefined;
}

function normalizeAggregatePropertyIdsFromAction(actionRequest: ToolActionRequest | undefined): number[] {
  if (actionRequest?.type !== "aggregate_properties") return [];
  const raw = actionRequest.payload?.propertyIds;
  if (!Array.isArray(raw)) return [];
  return uniqueNumberList(raw.map((value) => (typeof value === "number" ? value : Number(value))), 50);
}

async function executeAggregatePropertiesTool(
  supabase: ReturnType<typeof createServiceClient>,
  input: {
    scope: PropertyAggregationScope;
    searchParams?: ToolSearchParams;
    propertyIds?: number[];
  },
): Promise<{
  scope: PropertyAggregationScope;
  criteriaSummary: string;
  metrics: SharedPropertyAggregateMetrics;
  breakdowns: {
    byTransaction: SharedPropertyAggregateBucket[];
    byType: SharedPropertyAggregateBucket[];
    topCities: SharedPropertyAggregateBucket[];
  };
  searchParams?: ToolSearchParams;
  selectedPropertyIds?: number[];
}> {
  const scope = input.scope;
  const searchParams = input.searchParams;
  const selectedPropertyIds = uniqueNumberList(input.propertyIds ?? [], 50);
  const rows = scope === "selected_properties"
    ? await fetchAggregateRowsByIds(supabase, selectedPropertyIds)
    : await fetchAggregateRowsForSearchFilters(supabase, (searchParams ?? {}) as SharedPropertySearchQueryParams);
  const { metrics, breakdowns } = computeSharedPropertyAggregateMetrics(rows);
  const criteriaSummary =
    scope === "selected_properties"
      ? `Sélection de ${selectedPropertyIds.length} bien${selectedPropertyIds.length > 1 ? "s" : ""}`
      : buildCriteriaSummary(searchParams ?? {});
  return {
    scope,
    criteriaSummary,
    metrics,
    breakdowns,
    searchParams,
    selectedPropertyIds: scope === "selected_properties" ? selectedPropertyIds : undefined,
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
      "id,title,slug,status,price_amount,price_currency,surface_m2,terrain_m2,bedrooms,bathrooms,garage_count,dpe_label,transaction_type,property_type,city:cities(name,slug)",
    )
    .in("id", uniqueIds)
    .neq("status", "off_market");

  if (error) throw error;

  const rows = ((data as unknown as PropertySearchQueryRow[] | null) ?? []).filter((row) => row && typeof row.id === "number");
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

interface PersistentMemoryRecord {
  sessionId: string;
  preferences?: ToolConversationState["preferences"];
  qualification?: Record<string, unknown>;
  selectedPropertyIds?: number[];
  summary?: string;
}

function mergeConversationStateWithPersistentMemory(
  state: ToolConversationState | undefined,
  memory: PersistentMemoryRecord | null,
): ToolConversationState | undefined {
  if (!memory) return state;
  return {
    ...state,
    preferences: {
      ...(memory.preferences ?? {}),
      ...(state?.preferences ?? {}),
    },
    selectedPropertyIds:
      state?.selectedPropertyIds && state.selectedPropertyIds.length > 0
        ? state.selectedPropertyIds.slice(0, 3)
        : (memory.selectedPropertyIds ?? []).slice(0, 3),
    leadDraft: {
      ...(state?.leadDraft ?? {}),
      criteriaSummary: state?.leadDraft?.criteriaSummary ?? memory.summary,
    },
  };
}

async function loadPersistentMemoryRecord(sessionId: string | undefined): Promise<PersistentMemoryRecord | null> {
  if (!parseBooleanEnv("CHATBOT_MEMORY_ENABLED", false)) return null;
  const sid = typeof sessionId === "string" ? sessionId.trim() : "";
  if (!sid) return null;

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("chatbot_memory_sessions")
      .select("session_id,preferences,qualification,selected_property_ids,summary,expires_at")
      .eq("session_id", sid)
      .maybeSingle();
    if (error || !data) return null;
    const expiresAtMs = typeof (data as Record<string, unknown>).expires_at === "string"
      ? Date.parse((data as Record<string, unknown>).expires_at as string)
      : NaN;
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) return null;

    const selectedPropertyIds = uniqueNumberList(
      Array.isArray((data as Record<string, unknown>).selected_property_ids)
        ? ((data as Record<string, unknown>).selected_property_ids as unknown[]).map((value) =>
            typeof value === "number" ? value : Number(value)
          )
        : [],
      3,
    );
    const preferences =
      (data as Record<string, unknown>).preferences &&
        typeof (data as Record<string, unknown>).preferences === "object" &&
        !Array.isArray((data as Record<string, unknown>).preferences)
        ? (sanitizePlannerSearchArgs((data as Record<string, unknown>).preferences) as ToolConversationState["preferences"])
        : undefined;
    const summary =
      typeof (data as Record<string, unknown>).summary === "string"
        ? truncateText(((data as Record<string, unknown>).summary as string).trim(), 500)
        : undefined;
    const qualification =
      (data as Record<string, unknown>).qualification &&
        typeof (data as Record<string, unknown>).qualification === "object" &&
        !Array.isArray((data as Record<string, unknown>).qualification)
        ? sanitizeJsonObject((data as Record<string, unknown>).qualification)
        : undefined;
    return { sessionId: sid, preferences, qualification, selectedPropertyIds, summary };
  } catch {
    return null;
  }
}

const memoryExtractorSchema = z.object({
  preferences: z.object({
    transaction: z.enum(["vente", "location"]).optional(),
    type: z.enum(["appartement", "maison_villa", "autre"]).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    bedroomsMin: z.number().int().min(0).max(12).optional(),
    bathroomsMin: z.number().int().min(0).max(12).optional(),
    garagesMin: z.number().int().min(0).max(12).optional(),
    priceMin: z.number().int().min(0).max(50_000_000).optional(),
    priceMax: z.number().int().min(0).max(50_000_000).optional(),
    surfaceMin: z.number().min(0).max(100_000).optional(),
    surfaceMax: z.number().min(0).max(100_000).optional(),
    terrainMin: z.number().min(0).max(10_000_000).optional(),
    terrainMax: z.number().min(0).max(10_000_000).optional(),
    features: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
    sort: z.enum(["newest", "price_asc", "price_desc", "surface_desc"]).optional(),
  }).partial().optional(),
  qualification: z.object({
    district: z.string().trim().min(1).max(80).optional(),
    timeline: z.string().trim().min(1).max(120).optional(),
    project: z.string().trim().min(1).max(120).optional(),
    financingStatus: z.string().trim().min(1).max(120).optional(),
    urgency: z.string().trim().min(1).max(120).optional(),
    occupancyPurpose: z.string().trim().min(1).max(120).optional(),
    amenities: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  }).partial().optional(),
  selectedPropertyIds: z.array(z.number().int().positive()).max(3).optional(),
  summary: z.string().trim().min(1).max(500).optional(),
  updatedKeys: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  confidence: z.number().min(0).max(1).optional(),
}).strict();

interface GeminiMemoryExtractorConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
  confidenceThreshold: number;
  retentionDays: number;
}

function resolveGeminiMemoryExtractorConfig(): GeminiMemoryExtractorConfig | null {
  if (!parseBooleanEnv("CHATBOT_MEMORY_ENABLED", false)) return null;
  if (!parseBooleanEnv("CHATBOT_MEMORY_EXTRACTOR_ENABLED", false)) return null;
  const apiKey = (Deno.env.get("GEMINI_API_KEY") ?? "").trim();
  if (!apiKey) return null;
  return {
    apiKey,
    model: (Deno.env.get("CHATBOT_MEMORY_MODEL") ?? "gemini-2.5-flash-lite").trim() || "gemini-2.5-flash-lite",
    timeoutMs: clamp(Math.floor(parseNumberEnv("CHATBOT_MEMORY_EXTRACTOR_TIMEOUT_MS", 1500)), 500, 8000),
    confidenceThreshold: clamp(parseNumberEnv("CHATBOT_MEMORY_EXTRACTOR_CONFIDENCE_THRESHOLD", 0.65), 0, 1),
    retentionDays: clamp(Math.floor(parseNumberEnv("CHATBOT_MEMORY_RETENTION_DAYS", 90)), 1, 3650),
  };
}

function stripJsonCodeFence(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]+?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

function extractGeminiTextPayload(payload: unknown): string | null {
  const data = payload as Record<string, unknown> | null;
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  for (const candidate of candidates) {
    const content = candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>).content : null;
    const parts = content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).parts)
      ? ((content as Record<string, unknown>).parts as unknown[])
      : [];
    for (const part of parts) {
      if (part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string") {
        const text = ((part as Record<string, unknown>).text as string).trim();
        if (text) return text;
      }
    }
  }
  return null;
}

function memoryFieldExplicitlyMentioned(question: string, field: string): boolean {
  const q = normalizeText(question);
  if (field === "transaction") return /\b(vente|vendre|achat|acheter|location|louer)\b/.test(q);
  if (field === "type") return /\b(appartement|maison|villa|studio)\b/.test(q);
  if (field === "city") return /\b(havre|sainte adresse|montivilliers|gainneville|harfleur)\b/.test(q);
  if (field === "bedroomsMin") return /\b(t[1-9]|chambre|chambres|pieces|pi[eè]ces?)\b/.test(q);
  if (field === "bathroomsMin") return /\b(sdb|salle de bain|salles de bain)\b/.test(q);
  if (field === "garagesMin") return /\bgarage|garages\b/.test(q);
  if (field === "priceMin" || field === "priceMax") return /\b(eur|euro|€|budget|\d{4,})\b/.test(q);
  if (field === "surfaceMin" || field === "surfaceMax") return /\b(surface|m2|m²)\b/.test(q);
  if (field === "terrainMin" || field === "terrainMax") return /\bterrain\b/.test(q);
  if (field === "features") return /\b(balcon|terrasse|ascenseur|garage|parking|jardin|vue mer)\b/.test(q);
  return false;
}

async function extractStructuredMemoryWithGemini(input: {
  config: GeminiMemoryExtractorConfig;
  question: string;
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  currentPreferences?: ToolConversationState["preferences"];
  currentSummary?: string;
}): Promise<z.infer<typeof memoryExtractorSchema> | null> {
  const history = (input.chatHistory ?? []).slice(-4).map((m) => ({
    role: m.role,
    content: truncateText(m.content, 300),
  }));
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.config.model)}:generateContent`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), input.config.timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": input.config.apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          maxOutputTokens: 320,
        },
        contents: [{
          role: "user",
          parts: [{
            text: [
              "Extract structured real-estate preference memory for a French property chatbot.",
              "Return JSON only. No markdown.",
              "Do not include raw transcript text.",
              "Only extract facts the user likely stated or implied clearly.",
              "Schema keys: preferences, qualification, selectedPropertyIds, summary, updatedKeys, confidence.",
              "preferences keys: transaction, type, city, bedroomsMin, bathroomsMin, garagesMin, priceMin, priceMax, surfaceMin, surfaceMax, terrainMin, terrainMax, features, sort.",
              "qualification keys: district, timeline, project, financingStatus, urgency, occupancyPurpose, amenities (array).",
              `Current preferences: ${JSON.stringify(input.currentPreferences ?? {})}`,
              `Current summary: ${JSON.stringify(input.currentSummary ?? null)}`,
              `Recent history: ${JSON.stringify(history)}`,
              `Current user question: ${input.question}`,
            ].join("\n"),
          }],
        }],
      }),
    });
    if (!response.ok) return null;
    const raw = await response.json();
    const text = extractGeminiTextPayload(raw);
    if (!text) return null;
    const parsedJson = JSON.parse(stripJsonCodeFence(text));
    const parsed = memoryExtractorSchema.safeParse(parsedJson);
    if (!parsed.success) return null;
    if (
      parsed.data.preferences?.priceMin != null &&
      parsed.data.preferences?.priceMax != null &&
      parsed.data.preferences.priceMin > parsed.data.preferences.priceMax
    ) {
      [parsed.data.preferences.priceMin, parsed.data.preferences.priceMax] = [
        parsed.data.preferences.priceMax,
        parsed.data.preferences.priceMin,
      ];
    }
    if (
      parsed.data.preferences?.surfaceMin != null &&
      parsed.data.preferences?.surfaceMax != null &&
      parsed.data.preferences.surfaceMin > parsed.data.preferences.surfaceMax
    ) {
      [parsed.data.preferences.surfaceMin, parsed.data.preferences.surfaceMax] = [
        parsed.data.preferences.surfaceMax,
        parsed.data.preferences.surfaceMin,
      ];
    }
    if (
      parsed.data.preferences?.terrainMin != null &&
      parsed.data.preferences?.terrainMax != null &&
      parsed.data.preferences.terrainMin > parsed.data.preferences.terrainMax
    ) {
      [parsed.data.preferences.terrainMin, parsed.data.preferences.terrainMax] = [
        parsed.data.preferences.terrainMax,
        parsed.data.preferences.terrainMin,
      ];
    }
    if (Array.isArray(parsed.data.preferences?.features)) {
      const features = parsed.data.preferences.features
        .map((value) => (typeof value === "string" ? value.trim().slice(0, 80) : ""))
        .filter(Boolean)
        .slice(0, 12);
      parsed.data.preferences.features = features.length > 0 ? Array.from(new Set(features)) : undefined;
    }
    return parsed.data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function persistStructuredMemory(input: {
  sessionId?: string;
  baseState?: ToolConversationState;
  patch?: Partial<ToolConversationState>;
  question: string;
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<MemoryResponseMeta | undefined> {
  if (!parseBooleanEnv("CHATBOT_MEMORY_ENABLED", false)) return undefined;
  const sid = typeof input.sessionId === "string" ? input.sessionId.trim() : "";
  if (!sid) return undefined;

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return undefined;
  }

  let existingPreferences: ToolConversationState["preferences"] = {};
  let existingQualification: Record<string, unknown> = {};
  let existingSummary: string | undefined;
  try {
    const { data } = await supabase
      .from("chatbot_memory_sessions")
      .select("preferences,qualification,summary,selected_property_ids")
      .eq("session_id", sid)
      .maybeSingle();
    if (data && typeof data === "object") {
      existingPreferences = sanitizePlannerSearchArgs((data as Record<string, unknown>).preferences) as ToolConversationState["preferences"];
      existingQualification = sanitizeJsonObject((data as Record<string, unknown>).qualification);
      existingSummary =
        typeof (data as Record<string, unknown>).summary === "string"
          ? truncateText(((data as Record<string, unknown>).summary as string).trim(), 500)
          : undefined;
      const existingSelected = uniqueNumberList(
        Array.isArray((data as Record<string, unknown>).selected_property_ids)
          ? ((data as Record<string, unknown>).selected_property_ids as unknown[]).map((value) =>
              typeof value === "number" ? value : Number(value)
            )
          : [],
        3,
      );
      if (existingSelected.length > 0) {
        input.baseState = {
          ...(input.baseState ?? {}),
          selectedPropertyIds: uniqueNumberList([...(input.baseState?.selectedPropertyIds ?? []), ...existingSelected], 3),
        };
      }
    }
  } catch {
    // Ignore read failure; write path can still proceed.
  }

  let preferences: ToolConversationState["preferences"] = {
    ...existingPreferences,
    ...(input.baseState?.preferences ?? {}),
    ...(input.patch?.preferences ?? {}),
  };
  let qualification: Record<string, unknown> = {
    ...existingQualification,
  };
  let selectedPropertyIds = uniqueNumberList(
    [...(input.patch?.selectedPropertyIds ?? []), ...(input.baseState?.selectedPropertyIds ?? [])],
    3,
  );
  let summary =
    truncateText(
      (
        input.patch?.leadDraft?.criteriaSummary ??
        input.patch?.recentSearch?.params?.city ??
        input.baseState?.leadDraft?.criteriaSummary ??
        existingSummary ??
        input.question
      ).toString(),
      500,
    ) || undefined;
  let memorySource: MemoryResponseMeta["source"] = "state_merge";
  let memoryConfidence: number | undefined;
  let updatedKeys: string[] | undefined;

  const extractorConfig = resolveGeminiMemoryExtractorConfig();
  if (extractorConfig) {
    const extracted = await extractStructuredMemoryWithGemini({
      config: extractorConfig,
      question: input.question,
      chatHistory: input.chatHistory,
      currentPreferences: preferences,
      currentSummary: summary,
    });
    if (extracted) {
      const confidence = typeof extracted.confidence === "number" ? clamp01(extracted.confidence) : undefined;
      const canApplyAll = typeof confidence === "number" && confidence >= extractorConfig.confidenceThreshold;
      const nextPreferences = { ...preferences };
      for (const [key, value] of Object.entries(extracted.preferences ?? {})) {
        if (value == null || value === "") continue;
        if (canApplyAll || memoryFieldExplicitlyMentioned(input.question, key)) {
          (nextPreferences as Record<string, unknown>)[key] = value;
        }
      }
      preferences = nextPreferences;
      qualification = {
        ...qualification,
        ...sanitizeJsonObject(extracted.qualification),
      };
      if (Array.isArray(extracted.selectedPropertyIds) && extracted.selectedPropertyIds.length > 0) {
        selectedPropertyIds = uniqueNumberList([...extracted.selectedPropertyIds, ...selectedPropertyIds], 3);
      }
      if (typeof extracted.summary === "string" && extracted.summary.trim().length > 0) {
        summary = truncateText(extracted.summary.trim(), 500);
      }
      memorySource = "gemini_extractor";
      memoryConfidence = confidence;
      updatedKeys = (extracted.updatedKeys ?? []).slice(0, 20);
      try {
        await supabase.from("chatbot_memory_events").insert({
          session_id: sid,
          event_type: "memory_extractor",
          delta: {
            preferences: extracted.preferences ?? {},
            qualification: sanitizeJsonObject(extracted.qualification),
            selectedPropertyIds: extracted.selectedPropertyIds ?? [],
          },
          metadata: {
            confidence,
            source: "gemini_extractor",
            updatedKeys: updatedKeys ?? [],
          },
        });
      } catch {
        // Ignore memory event insert failures.
      }
    }
  }

  const preferenceKeys = Object.entries(preferences)
    .filter(([, value]) => value != null && value !== "")
    .map(([key]) => key)
    .slice(0, 12);
  const retentionDays = extractorConfig?.retentionDays ?? clamp(Math.floor(parseNumberEnv("CHATBOT_MEMORY_RETENTION_DAYS", 90)), 1, 3650);
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { error } = await supabase.from("chatbot_memory_sessions").upsert(
      {
        session_id: sid,
        last_seen_at: new Date().toISOString(),
        memory_version: "v1",
        summary: summary ?? null,
        preferences,
        qualification,
        selected_property_ids: selectedPropertyIds,
        metadata: {
          source: memorySource ?? "none",
          confidence: memoryConfidence ?? null,
          updatedKeys: updatedKeys ?? [],
        },
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" },
    );
    if (error) return undefined;
    return {
      updated: true,
      preferenceKeys,
      summary,
      source: memorySource ?? "none",
      ttlDays: retentionDays,
      updatedKeys,
      confidence: memoryConfidence,
    };
  } catch {
    return undefined;
  }
}

async function getCachedPropertyAnalysisCards(
  supabase: ReturnType<typeof createServiceClient>,
  propertyIds: number[],
  sourceKind: "image" | "document",
): Promise<AnalysisCard[]> {
  if (!parseBooleanEnv("CHATBOT_MULTIMODAL_ENABLED", false)) return [];
  const ids = uniqueNumberList(propertyIds, 3);
  if (ids.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from("property_media_analysis")
      .select("id,property_id,source_id,source_kind,summary_short,summary_long,structured_facts,evidence,status,updated_at,metadata")
      .in("property_id", ids)
      .eq("source_kind", sourceKind)
      .eq("status", "ready")
      .order("updated_at", { ascending: false })
      .limit(12);
    if (error || !Array.isArray(data)) return [];
    const documentSourceIds = sourceKind === "document"
      ? ((data as Array<Record<string, unknown>>)
        .map((row) => (typeof row.source_id === "string" ? row.source_id : ""))
        .filter(Boolean))
      : [];
    const documentKindById = new Map<string, "dpe_pdf" | "diagnostic_pdf" | "floor_plan_pdf" | "brochure_pdf" | "other">();
    if (documentSourceIds.length > 0) {
      try {
        const { data: docs } = await supabase
          .from("property_documents")
          .select("id,kind")
          .in("id", [...new Set(documentSourceIds)].slice(0, 24));
        for (const doc of (docs ?? []) as Array<Record<string, unknown>>) {
          const id = typeof doc.id === "string" ? doc.id : "";
          const kind = doc.kind;
          if (!id) continue;
          if (
            kind === "dpe_pdf" ||
            kind === "diagnostic_pdf" ||
            kind === "floor_plan_pdf" ||
            kind === "brochure_pdf" ||
            kind === "other"
          ) {
            documentKindById.set(id, kind);
          }
        }
      } catch {
        // Ignore document kind enrichment failures.
      }
    }
    const staleHours = clamp(Math.floor(parseNumberEnv("CHATBOT_MULTIMODAL_STALE_HOURS", 168)), 1, 24 * 365);
    const staleMs = staleHours * 60 * 60 * 1000;
    const cards: Array<AnalysisCard | null> = data
      .map((row): AnalysisCard | null => {
        if (!row || typeof row !== "object") return null;
        const r = row as Record<string, unknown>;
        const propertyId = typeof r.property_id === "number" ? r.property_id : Number(r.property_id);
        const summaryShort = typeof r.summary_short === "string" ? r.summary_short.trim() : "";
        const summaryLong = typeof r.summary_long === "string" ? r.summary_long.trim() : "";
        const summary = summaryShort || summaryLong;
        if (!Number.isInteger(propertyId) || propertyId <= 0 || !summary) return null;
        const facts = sanitizeJsonObject(r.structured_facts);
        const confidence = typeof facts.confidence === "number" ? clamp01(facts.confidence) : undefined;
        const metadata = sanitizeJsonObject(r.metadata);
        const updatedAtMs = typeof r.updated_at === "string" ? Date.parse(r.updated_at) : NaN;
        const inferredDocumentKind =
          sourceKind === "document" && typeof r.source_id === "string"
            ? documentKindById.get(r.source_id as string)
            : undefined;
        const evidence = Array.isArray(r.evidence)
          ? (r.evidence as unknown[])
              .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
              .map((item) => ({
                sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl.slice(0, 1000) : undefined,
                thumbnailUrl: typeof item.thumbnailUrl === "string" ? item.thumbnailUrl.slice(0, 1000) : undefined,
                page: typeof item.page === "number" && Number.isFinite(item.page) ? Math.max(1, Math.floor(item.page)) : undefined,
                label: typeof item.label === "string" ? truncateText(item.label, 120) : undefined,
                kind: typeof item.kind === "string" ? truncateText(item.kind, 60) : sourceKind,
              }))
              .slice(0, 8)
          : undefined;
        return {
          id: `analysis-${String(r.id ?? buildToolActionId("analysis"))}`,
          kind:
            sourceKind === "image"
              ? "property_photo_insights"
              : inferredDocumentKind === "floor_plan_pdf"
                ? "property_plan_insights"
                : "property_document_summary",
          propertyId,
          title:
            sourceKind === "image"
              ? "Analyse visuelle du bien"
              : inferredDocumentKind === "floor_plan_pdf"
                ? "Analyse du plan"
                : inferredDocumentKind === "dpe_pdf"
                  ? "Résumé DPE"
                  : inferredDocumentKind === "diagnostic_pdf"
                    ? "Résumé diagnostics"
                    : "Résumé document du bien",
          summary: truncateText(summary, 800),
          confidence,
          stale: Number.isFinite(updatedAtMs) ? (Date.now() - updatedAtMs) > staleMs : undefined,
          cacheHit: true,
          sourceKind,
          documentKind: inferredDocumentKind,
          evidence: evidence && evidence.length > 0 ? evidence : [{
            sourceUrl: typeof metadata.sourceUrl === "string" ? metadata.sourceUrl : undefined,
            label: typeof metadata.label === "string" ? truncateText(metadata.label, 120) : undefined,
            kind: sourceKind,
          }],
        };
      });
    return cards.filter((card): card is AnalysisCard => card !== null);
  } catch {
    return [];
  }
}

const multimodalOutputSchema = z.object({
  observations: z.array(z.string()).optional(),
  uncertainties: z.array(z.string()).optional(),
  facts: z.record(z.string(), z.unknown()).optional(),
  riskFlags: z.array(z.string()).optional(),
  userSafeSummary: z.string().optional(),
  agentNotes: z.union([z.string(), z.null()]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.array(z.unknown()).optional(),
});

function normalizeInlineSourceMimeType(sourceKind: "image" | "document", mimeType: string | null | undefined): string {
  const raw = (mimeType ?? "").trim().toLowerCase();
  if (raw) return raw;
  return sourceKind === "image" ? "image/jpeg" : "application/pdf";
}

function isAllowedInlineSourceMimeType(sourceKind: "image" | "document", mimeType: string): boolean {
  if (sourceKind === "image") return ["image/jpeg", "image/png", "image/webp"].includes(mimeType);
  return mimeType === "application/pdf";
}

async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

function estimatePdfPagesFromBytes(bytes: Uint8Array): number | null {
  try {
    const sample = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 2_500_000)));
    const matches = sample.match(/\/Type\s*\/Page\b/g);
    return matches?.length ? matches.length : null;
  } catch {
    return null;
  }
}

async function getOnDemandPropertySource(
  supabase: ReturnType<typeof createServiceClient>,
  propertyId: number,
  sourceKind: "image" | "document",
): Promise<{
  sourceUrl: string;
  mimeType?: string | null;
  sourceId?: string;
  documentKind?: "dpe_pdf" | "diagnostic_pdf" | "floor_plan_pdf" | "brochure_pdf" | "other";
  label?: string;
} | null> {
  if (sourceKind === "image") {
    const { data, error } = await supabase
      .from("property_images")
      .select("source_url")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !data || typeof (data as Record<string, unknown>).source_url !== "string") return null;
    return { sourceUrl: (data as Record<string, unknown>).source_url as string };
  }
  const { data, error } = await supabase
    .from("property_documents")
    .select("id,source_url,mime_type,kind,metadata,status")
    .eq("property_id", propertyId)
    .in("status", ["ready", "pending", "error"])
    .order("updated_at", { ascending: false })
    .limit(6);
  if (error || !Array.isArray(data)) return null;
  const preferred = (data as Array<Record<string, unknown>>)
    .filter((row) => typeof row.source_url === "string")
    .sort((a, b) => {
      const rank = (kind: unknown) =>
        kind === "floor_plan_pdf" ? 0 : kind === "dpe_pdf" ? 1 : kind === "diagnostic_pdf" ? 2 : kind === "brochure_pdf" ? 3 : 4;
      return rank(a.kind) - rank(b.kind);
    })[0];
  if (!preferred) return null;
  const metadata = sanitizeJsonObject(preferred.metadata);
  return {
    sourceId: typeof preferred.id === "string" ? preferred.id : undefined,
    sourceUrl: preferred.source_url as string,
    mimeType: typeof preferred.mime_type === "string" ? preferred.mime_type : null,
    documentKind:
      preferred.kind === "dpe_pdf" ||
      preferred.kind === "diagnostic_pdf" ||
      preferred.kind === "floor_plan_pdf" ||
      preferred.kind === "brochure_pdf" ||
      preferred.kind === "other"
        ? (preferred.kind as "dpe_pdf" | "diagnostic_pdf" | "floor_plan_pdf" | "brochure_pdf" | "other")
        : undefined,
    label: typeof metadata.label === "string" ? metadata.label : undefined,
  };
}

async function fetchInlineSourceBytes(sourceUrl: string, timeoutMs: number, maxBytes: number): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "FochChatbot/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`inline_fetch_${response.status}`);
    const mimeType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.byteLength > maxBytes) throw new Error("inline_source_too_large");
    return { bytes, mimeType };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getPropertyAnalysisCards(
  supabase: ReturnType<typeof createServiceClient>,
  propertyIds: number[],
  sourceKind: "image" | "document",
): Promise<AnalysisCard[]> {
  const ids = uniqueNumberList(propertyIds, 3);
  const cached = await getCachedPropertyAnalysisCards(supabase, ids, sourceKind);
  if (cached.length > 0) return cached;
  if (!parseBooleanEnv("CHATBOT_MULTIMODAL_ON_DEMAND_ENABLED", true)) return [];
  if (ids.length !== 1) return [];

  const propertyId = ids[0];
  const source = await getOnDemandPropertySource(supabase, propertyId, sourceKind);
  if (!source || !source.sourceUrl) return [];

  const timeoutMs = clamp(Math.floor(parseNumberEnv("CHATBOT_MULTIMODAL_ON_DEMAND_TIMEOUT_MS", 2500)), 600, 10000);
  const maxBytes = clamp(Math.floor(parseNumberEnv("CHATBOT_MULTIMODAL_MAX_FILE_BYTES", 8 * 1024 * 1024)), 200_000, 50 * 1024 * 1024);
  const model = (Deno.env.get("CHATBOT_MULTIMODAL_MODEL") ?? "gemini-2.5-flash").trim() || "gemini-2.5-flash";
  const apiKey = (Deno.env.get("GEMINI_API_KEY") ?? "").trim();
  if (!apiKey) return [];

  try {
    const { bytes, mimeType: fetchedMime } = await fetchInlineSourceBytes(source.sourceUrl, timeoutMs, maxBytes);
    const mimeType = normalizeInlineSourceMimeType(sourceKind, source.mimeType ?? fetchedMime);
    if (!isAllowedInlineSourceMimeType(sourceKind, mimeType)) return [];
    const pageCount = sourceKind === "document" && mimeType === "application/pdf" ? estimatePdfPagesFromBytes(bytes) : null;
    const maxPdfPages = clamp(Math.floor(parseNumberEnv("CHATBOT_MULTIMODAL_MAX_PDF_PAGES", 20)), 1, 200);
    if (sourceKind === "document" && typeof pageCount === "number" && pageCount > maxPdfPages) return [];
    const sourceHash = await sha256HexBytes(bytes);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          maxOutputTokens: 700,
        },
        contents: [{
          role: "user",
          parts: [
            {
              text: [
                "Analyse ce contenu immobilier et réponds uniquement en JSON valide.",
                "Inclure: observations, uncertainties, facts, riskFlags, userSafeSummary, agentNotes, confidence, evidence.",
                "Ne pas inventer. Pour documents DPE/diagnostics, rester prudent et informatif.",
              ].join("\n"),
            },
            {
              inlineData: {
                mimeType,
                data: bytesToBase64(bytes),
              },
            },
          ],
        }],
      }),
    });
    if (!response.ok) return [];
    const raw = await response.json();
    const text = extractGeminiTextPayload(raw);
    if (!text) return [];
    const parsedRaw = JSON.parse(stripJsonCodeFence(text));
    const parsed = multimodalOutputSchema.safeParse(parsedRaw);
    if (!parsed.success) return [];
    const value = parsed.data;
    const facts = sanitizeJsonObject(value.facts);
    const confidence = typeof value.confidence === "number" ? clamp01(value.confidence) : undefined;
    const summary = truncateText(
      (typeof value.userSafeSummary === "string" && value.userSafeSummary.trim()) ||
        (Array.isArray(value.observations) ? value.observations.filter((v) => typeof v === "string").slice(0, 2).join(" • ") : ""),
      800,
    );
    if (!summary) return [];
    const evidence = Array.isArray(value.evidence)
      ? value.evidence
          .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === "object"))
          .map((e) => ({
            sourceUrl: typeof e.sourceUrl === "string" ? e.sourceUrl : source.sourceUrl,
            page: typeof e.page === "number" ? Math.max(1, Math.floor(e.page)) : undefined,
            label: typeof e.label === "string" ? truncateText(e.label, 120) : source.label,
            kind: typeof e.kind === "string" ? truncateText(e.kind, 60) : sourceKind,
          }))
          .slice(0, 8)
      : [{ sourceUrl: source.sourceUrl, label: source.label, kind: sourceKind }];

    // Best-effort cache write so future turns hit the multimodal cache path.
    try {
      await supabase.from("property_media_analysis").upsert({
        property_id: propertyId,
        source_kind: sourceKind,
        source_id: source.sourceId ?? null,
        source_url: source.sourceUrl,
        model,
        analysis_version: (Deno.env.get("CHATBOT_MULTIMODAL_ANALYSIS_VERSION") ?? "v2").trim() || "v2",
        status: "ready",
        summary_short: truncateText(summary, 280),
        summary_long: truncateText(summary, 4000),
        structured_facts: { ...facts, confidence },
        safety_flags: {
          riskFlags: Array.isArray(value.riskFlags) ? value.riskFlags.slice(0, 20) : [],
          uncertainties: Array.isArray(value.uncertainties) ? value.uncertainties.slice(0, 12) : [],
          onDemand: true,
        },
        evidence,
        cost_estimate_usd: null,
        latency_ms: null,
        metadata: {
          onDemand: true,
          mimeType,
          fileSizeBytes: bytes.byteLength,
          pageCount,
        },
        source_hash: sourceHash,
        cache_key: `${sourceKind}:${source.sourceUrl}:${sourceHash}`,
        updated_at: new Date().toISOString(),
      }, { onConflict: "source_kind,source_url,analysis_version" });
    } catch {
      // Ignore cache write failures.
    }

    const kind =
      sourceKind === "image"
        ? "property_photo_insights"
        : source.documentKind === "floor_plan_pdf"
          ? "property_plan_insights"
          : "property_document_summary";
    const title =
      sourceKind === "image"
        ? "Analyse visuelle du bien"
        : source.documentKind === "floor_plan_pdf"
          ? "Analyse du plan"
          : source.documentKind === "dpe_pdf"
            ? "Résumé DPE"
            : source.documentKind === "diagnostic_pdf"
              ? "Résumé diagnostics"
              : "Résumé document du bien";
    const cards: AnalysisCard[] = [{
      id: `analysis-ondemand-${propertyId}-${sourceKind}`,
      kind,
      propertyId,
      title,
      summary,
      confidence,
      stale: false,
      cacheHit: false,
      sourceKind,
      documentKind: source.documentKind,
      evidence,
    }];
    const riskFlags = Array.isArray(value.riskFlags) ? value.riskFlags.filter((v): v is string => typeof v === "string").slice(0, 6) : [];
    if (riskFlags.length > 0) {
      cards.push({
        id: `analysis-risk-${propertyId}-${sourceKind}`,
        kind: "property_risks_notice",
        propertyId,
        title: "Points de vigilance (IA)",
        summary: truncateText(riskFlags.join(" • "), 800),
        confidence,
        stale: false,
        cacheHit: false,
        sourceKind,
        documentKind: source.documentKind,
        evidence,
      });
    }
    return cards;
  } catch {
    return [];
  }
}

async function orchestrateToolRequest(input: {
  question: string;
  actionRequest?: ToolActionRequest;
  conversationState?: ToolConversationState;
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  sessionId?: string;
}): Promise<ToolOrchestrationResult | null> {
  const toolsEnabled = parseBooleanEnv("CHATBOT_AGENT_TOOLS_ENABLED", false);
  if (!toolsEnabled) return null;

  const persistentMemory = await loadPersistentMemoryRecord(input.sessionId);
  const mergedConversationState = mergeConversationStateWithPersistentMemory(input.conversationState, persistentMemory);

  const agentMode = detectAgentMode(input.question, input.actionRequest, mergedConversationState);
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
      const params = extractSearchParamsFromQuestion(input.question, mergedConversationState, effectiveActionRequest);
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
      const quickFacetAction = buildAggregateQuickRefineFacetAction(result.searchParams);
      if (quickFacetAction) actions.push(quickFacetAction);

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
            [...result.items.map((item) => item.id), ...(mergedConversationState?.recentPropertyIds ?? [])],
            20,
          ),
          preferences: {
            ...mergedConversationState?.preferences,
            transaction: result.searchParams.transaction ?? mergedConversationState?.preferences?.transaction,
            type: result.searchParams.type ?? mergedConversationState?.preferences?.type,
            city: result.searchParams.city ?? mergedConversationState?.preferences?.city,
            bedroomsMin:
              result.searchParams.bedroomsMin ?? mergedConversationState?.preferences?.bedroomsMin,
            bathroomsMin:
              result.searchParams.bathroomsMin ?? mergedConversationState?.preferences?.bathroomsMin,
            garagesMin:
              result.searchParams.garagesMin ?? mergedConversationState?.preferences?.garagesMin,
            priceMin: result.searchParams.priceMin ?? mergedConversationState?.preferences?.priceMin,
            priceMax: result.searchParams.priceMax ?? mergedConversationState?.preferences?.priceMax,
            surfaceMin: result.searchParams.surfaceMin ?? mergedConversationState?.preferences?.surfaceMin,
            surfaceMax: result.searchParams.surfaceMax ?? mergedConversationState?.preferences?.surfaceMax,
            terrainMin: result.searchParams.terrainMin ?? mergedConversationState?.preferences?.terrainMin,
            terrainMax: result.searchParams.terrainMax ?? mergedConversationState?.preferences?.terrainMax,
            features: result.searchParams.features ?? mergedConversationState?.preferences?.features,
            sort: result.searchParams.sort ?? mergedConversationState?.preferences?.sort,
          },
        },
        toolTrace,
        agentMode: "tool",
        costHints: { route: "edge_tools", estimatedClass: "low" },
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

  const runAggregate = async (): Promise<ToolOrchestrationResult> => {
    const explicitScope = parseAggregateScopeFromAction(effectiveActionRequest);
    const explicitIds = normalizeAggregatePropertyIdsFromAction(effectiveActionRequest);
    const selectedIdsFromState = uniqueNumberList(mergedConversationState?.selectedPropertyIds ?? [], 50);
    const normalizedQuestion = normalizeText(input.question);
    const mentionsGlobal = /\b(stock|global|tout|tous|ensemble|marche)\b/.test(normalizedQuestion);
    const mentionsSelection = /\b(selection|selectionnes|compare|ces biens|biens choisis)\b/.test(normalizedQuestion);
    const inferredSearchParams = extractSearchParamsFromQuestion(input.question, mergedConversationState, effectiveActionRequest);
    const hasSearchCriteria =
      Boolean(inferredSearchParams.transaction || inferredSearchParams.type || inferredSearchParams.city || inferredSearchParams.q) ||
      inferredSearchParams.bedroomsMin != null ||
      inferredSearchParams.bathroomsMin != null ||
      inferredSearchParams.garagesMin != null ||
      inferredSearchParams.priceMin != null ||
      inferredSearchParams.priceMax != null ||
      inferredSearchParams.surfaceMin != null ||
      inferredSearchParams.surfaceMax != null ||
      inferredSearchParams.terrainMin != null ||
      inferredSearchParams.terrainMax != null ||
      (inferredSearchParams.features?.length ?? 0) > 0;
    const hasRecentSearchContext = Boolean(mergedConversationState?.recentSearch?.params || mergedConversationState?.recentSearch?.resultIds?.length);

    let scope: PropertyAggregationScope | undefined = explicitScope;
    if (!scope && explicitIds.length > 0) scope = "selected_properties";
    if (!scope && mentionsSelection && selectedIdsFromState.length > 0) scope = "selected_properties";
    if (!scope && mentionsGlobal) scope = "global_active_inventory";
    if (!scope && (hasSearchCriteria || hasRecentSearchContext)) scope = "current_filtered";

    if (!scope) {
      const baseSearchParams = hasRecentSearchContext
        ? (parseToolSearchParamsFromState(mergedConversationState) ?? {})
        : inferredSearchParams;
      return {
        answer: "Je peux calculer ces statistiques. Voulez-vous les chiffres sur vos résultats filtrés ou sur tout le stock actif ?",
        suggestedPrompts: ["Statistiques sur mes résultats", "Statistiques sur tout le stock actif"],
        actions: [buildAggregateClarifyScopeAction(baseSearchParams)],
        toolTrace,
        agentMode: "tool",
        costHints: { route: "edge_tools", estimatedClass: "low" },
      };
    }

    const startedAt = Date.now();
    try {
      const searchParams = scope === "global_active_inventory"
        ? undefined
        : (hasSearchCriteria || hasRecentSearchContext ? inferredSearchParams : undefined);
      const propertyIds = scope === "selected_properties"
        ? (explicitIds.length > 0 ? explicitIds : selectedIdsFromState)
        : undefined;

      const aggregate = await executeAggregatePropertiesTool(supabase, {
        scope,
        searchParams,
        propertyIds,
      });
      toolTrace.push({
        tool: "aggregate_properties",
        status: "ok",
        latencyMs: Date.now() - startedAt,
        resultCount: aggregate.metrics.count,
      });

      const statsAction = buildStatsSummaryAction({
        scope: aggregate.scope,
        criteriaSummary: aggregate.criteriaSummary,
        metrics: aggregate.metrics,
        breakdowns: aggregate.breakdowns,
        searchParams: aggregate.searchParams,
        selectedPropertyIds: aggregate.selectedPropertyIds,
      });
      const actions: ToolUiAction[] = [statsAction];

      if (aggregate.scope === "current_filtered" && aggregate.searchParams) {
        actions.push(buildAggregateClarifyScopeAction(aggregate.searchParams));
        const quickFacetAction = buildAggregateQuickRefineFacetAction(aggregate.searchParams);
        if (quickFacetAction) actions.push(quickFacetAction);
      }

      const metrics = normalizeAggregateMetrics(aggregate.metrics);
      if (metrics.count === 0) {
        return {
          answer: "Aucun bien ne correspond aux critères actuels, donc je ne peux pas calculer de moyenne pour l’instant.",
          suggestedPrompts: ["Élargir le budget", "Réduire la surface minimale", "Voir tout le stock actif"],
          actions,
          conversationStatePatch: aggregate.searchParams
            ? {
                preferences: {
                  ...mergedConversationState?.preferences,
                  ...aggregate.searchParams,
                },
              }
            : undefined,
          toolTrace,
          agentMode: "tool",
          costHints: { route: "edge_tools", estimatedClass: "low" },
        };
      }

      const summaryParts = [
        `Sur ${statsAction.data.sampleSizeLabel.toLowerCase()} (${statsAction.data.scopeLabel.toLowerCase()}),`,
      ];
      if (metrics.avgSurfaceM2 != null) {
        summaryParts.push(`la surface moyenne est d’environ ${formatMetricValue(metrics.avgSurfaceM2, "m²")}.`);
      }
      if (metrics.avgPrice != null) {
        summaryParts.push(`Le prix moyen est ${formatPriceValue(metrics.avgPrice)}.`);
      }
      if (metrics.avgPricePerM2 != null) {
        summaryParts.push(`Le prix moyen au m² est ${formatPriceValue(metrics.avgPricePerM2)} / m².`);
      }
      if (statsAction.data.lowSampleWarning) {
        summaryParts.push(statsAction.data.lowSampleWarning);
      }

      return {
        answer: summaryParts.join(" "),
        suggestedPrompts: aggregate.scope === "current_filtered"
          ? ["Voir les biens correspondants", "Comparer avec tout le stock actif", "Affiner la recherche"]
          : ["Filtrer les biens", "Voir les statistiques par type", "Je cherche des biens précis"],
        actions,
        conversationStatePatch: aggregate.searchParams
          ? {
              preferences: {
                ...mergedConversationState?.preferences,
                ...aggregate.searchParams,
              },
            }
          : undefined,
        toolTrace,
        agentMode: "tool",
        costHints: { route: "edge_tools", estimatedClass: "low" },
      };
    } catch {
      toolTrace.push({
        tool: "aggregate_properties",
        status: "error",
        latencyMs: Date.now() - startedAt,
        errorCode: "aggregate_failed",
      });
      return {
        answer: "Je n’ai pas pu calculer les statistiques pour le moment.",
        suggestedPrompts: ["Réessayer les statistiques", "Voir les résultats", "Préparer un contact"],
        actions: [buildNoticeAction("Statistiques indisponibles", "Le calcul des statistiques a échoué.", "aggregate_failed")],
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

      const { summary, recommendedPropertyId } = buildCompareSummaryText(properties, mergedConversationState);
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

      const imageCards = await getPropertyAnalysisCards(supabase, properties.map((property) => property.id), "image");
      const documentCards = await getPropertyAnalysisCards(supabase, properties.map((property) => property.id), "document");
      const analysisCards = [...imageCards, ...documentCards].slice(0, 8);

      return {
        answer: summary,
        suggestedPrompts: ["Ouvrir le bien recommandé", "Préremplir le formulaire de contact", "Voir plus de résultats"],
        actions: [action],
        conversationStatePatch: {
          selectedPropertyIds: properties.map((property) => property.id).slice(0, compareLimit),
          recentPropertyIds: uniqueNumberList(
            [...properties.map((property) => property.id), ...(mergedConversationState?.recentPropertyIds ?? [])],
            20,
          ),
        },
        toolTrace,
        agentMode: "tool",
        analysisCards: analysisCards.length > 0 ? analysisCards : undefined,
        costHints: {
          route: "edge_tools",
          multimodalUsed: analysisCards.length > 0 ? true : undefined,
          estimatedClass: "medium",
        },
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
        ...(mergedConversationState?.selectedPropertyIds ?? []),
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
    const lead = buildLeadCriteriaFromState(input.question, mergedConversationState, selectedProperties);
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

    const handoffPropertyIds = selectedProperties.map((property) => property.id);
    const imageCards = handoffPropertyIds.length > 0 ? await getPropertyAnalysisCards(supabase, handoffPropertyIds, "image") : [];
    const documentCards = handoffPropertyIds.length > 0 ? await getPropertyAnalysisCards(supabase, handoffPropertyIds, "document") : [];
    const analysisCards = [...imageCards, ...documentCards].slice(0, 8);

    return {
      answer:
        "Je peux préremplir le formulaire avec votre sélection et vos critères. Vérifiez les informations puis envoyez la demande quand vous êtes prêt.",
      suggestedPrompts: ["Préremplir le formulaire", "Ajouter un budget", "Comparer d’autres biens"],
      actions: [action],
      conversationStatePatch: {
        leadDraft: {
          propertyId: lead.propertyId,
          citySlug: mergedConversationState?.preferences?.city,
          criteriaSummary: lead.contextSummary,
        },
      },
      toolTrace,
      agentMode: "tool",
      analysisCards: analysisCards.length > 0 ? analysisCards : undefined,
      costHints: {
        route: "edge_tools",
        multimodalUsed: analysisCards.length > 0 ? true : undefined,
        estimatedClass: analysisCards.length > 0 ? "medium" : "low",
      },
    };
  };

  const runPlannerV2Plan = async (decision: Extract<PlannerDecision, { decisionType: "plan" }>): Promise<ToolOrchestrationResult | null> => {
    const maxSteps = clamp(Math.floor(parseNumberEnv("CHATBOT_GEMINI_PLANNER_MAX_STEPS", 3)), 1, 3);
    const seenStepKeys = new Set<string>();
    let prefetchedProperties: ToolCompareProperty[] = [];
    let collectedAnalysisCards: AnalysisCard[] = [];

    for (const step of decision.steps.slice(0, maxSteps)) {
      const stepKey = `${step.tool}:${JSON.stringify(step.args ?? {})}`;
      if (seenStepKeys.has(stepKey)) {
        toolTrace.push({
          tool: step.tool === "retrieve_site_context" ? "retrieve_site_context" : (step.tool as ToolTraceItem["tool"]),
          status: "skipped",
          latencyMs: 0,
          errorCode: "duplicate_planner_step",
        });
        continue;
      }
      seenStepKeys.add(stepKey);

      if (step.tool === "get_properties") {
        const startedAt = Date.now();
        try {
          const propertyIds = uniqueNumberList(
            Array.isArray(step.args?.propertyIds)
              ? (step.args.propertyIds as unknown[]).map((value) => (typeof value === "number" ? value : Number(value)))
              : [],
            compareLimit,
          );
          prefetchedProperties = await executeGetPropertiesTool(supabase, propertyIds);
          toolTrace.push({
            tool: "get_properties",
            status: "ok",
            latencyMs: Date.now() - startedAt,
            resultCount: prefetchedProperties.length,
          });
        } catch {
          toolTrace.push({
            tool: "get_properties",
            status: "error",
            latencyMs: Date.now() - startedAt,
            errorCode: "planner_get_properties_failed",
          });
        }
        continue;
      }

      if (step.tool === "get_property_media_context" || step.tool === "get_property_document_context") {
        const startedAt = Date.now();
        const propertyIds = uniqueNumberList(
          [
            ...(Array.isArray(step.args?.propertyIds)
              ? (step.args.propertyIds as unknown[]).map((value) => (typeof value === "number" ? value : Number(value)))
              : []),
            ...prefetchedProperties.map((property) => property.id),
            ...(mergedConversationState?.selectedPropertyIds ?? []),
          ],
          compareLimit,
        );
        const sourceKind = step.tool === "get_property_media_context" ? "image" : "document";
        const cards = await getPropertyAnalysisCards(supabase, propertyIds, sourceKind);
        collectedAnalysisCards = [...collectedAnalysisCards, ...cards].slice(0, 8);
        toolTrace.push({
          tool: step.tool,
          status: "ok",
          latencyMs: Date.now() - startedAt,
          resultCount: cards.length,
        });
        continue;
      }

      if (step.tool === "retrieve_site_context") {
        const startedAt = Date.now();
        try {
          const query = typeof step.args?.query === "string" && step.args.query.trim().length > 0
            ? step.args.query.trim()
            : input.question;
          const rag = await retrieveWebsiteContextWithPageFallback(query);
          toolTrace.push({
            tool: "retrieve_site_context",
            status: rag.contextBlock ? "ok" : "skipped",
            latencyMs: Date.now() - startedAt,
            resultCount: rag.citations.length,
            errorCode: rag.contextBlock ? undefined : "planner_no_site_context",
          });
        } catch {
          toolTrace.push({
            tool: "retrieve_site_context",
            status: "error",
            latencyMs: Date.now() - startedAt,
            errorCode: "planner_site_context_failed",
          });
        }
        continue;
      }

      if (step.tool === "search_properties") {
        effectiveActionRequest = {
          type: "search_refine",
          payload: {
            searchParams: (step.args ?? {}) as Record<string, unknown>,
          },
        };
        const result = await runSearch();
        if (collectedAnalysisCards.length > 0) {
          result.analysisCards = [...(result.analysisCards ?? []), ...collectedAnalysisCards].slice(0, 8);
          result.costHints = {
            route: "edge_tools",
            multimodalUsed: true,
            estimatedClass: "medium",
          };
        }
        return result;
      }

      if (step.tool === "aggregate_properties") {
        const aggregateArgs =
          step.args && typeof step.args === "object" && !Array.isArray(step.args)
            ? sanitizePlannerAggregateArgs(step.args)
            : {};
        effectiveActionRequest = {
          type: "aggregate_properties",
          payload: {
            ...(aggregateArgs.scope ? { scope: aggregateArgs.scope } : {}),
            ...(aggregateArgs.searchParams ? { searchParams: aggregateArgs.searchParams } : {}),
            ...(aggregateArgs.propertyIds ? { propertyIds: aggregateArgs.propertyIds } : {}),
          },
        };
        const result = await runAggregate();
        if (collectedAnalysisCards.length > 0) {
          result.analysisCards = [...(result.analysisCards ?? []), ...collectedAnalysisCards].slice(0, 8);
          result.costHints = {
            route: "edge_tools",
            multimodalUsed: true,
            estimatedClass: "medium",
          };
        }
        return result;
      }

      if (step.tool === "compare_properties") {
        const ids = uniqueNumberList(
          [
            ...(Array.isArray(step.args?.propertyIds)
              ? (step.args.propertyIds as unknown[]).map((value) => (typeof value === "number" ? value : Number(value)))
              : []),
            ...prefetchedProperties.map((property) => property.id),
            ...(mergedConversationState?.selectedPropertyIds ?? []),
          ],
          compareLimit,
        );
        const result = await runCompare(ids);
        if (collectedAnalysisCards.length > 0) {
          result.analysisCards = [...(result.analysisCards ?? []), ...collectedAnalysisCards].slice(0, 8);
          result.costHints = {
            route: "edge_tools",
            multimodalUsed: true,
            estimatedClass: "medium",
          };
        }
        return result;
      }

      if (step.tool === "prepare_handoff") {
        const ids = uniqueNumberList(
          [
            ...(Array.isArray(step.args?.propertyIds)
              ? (step.args.propertyIds as unknown[]).map((value) => (typeof value === "number" ? value : Number(value)))
              : []),
            ...prefetchedProperties.map((property) => property.id),
          ],
          compareLimit,
        );
        const result = await runPrepareHandoff(ids);
        if (collectedAnalysisCards.length > 0) {
          result.analysisCards = [...(result.analysisCards ?? []), ...collectedAnalysisCards].slice(0, 8);
          result.costHints = {
            route: "edge_tools",
            multimodalUsed: true,
            estimatedClass: "medium",
          };
        }
        return result;
      }
    }

    if (collectedAnalysisCards.length > 0) {
      return {
        answer: "J’ai récupéré des éléments d’analyse (photos/documents) mais il me manque l’action finale à exécuter. Dites-moi si vous voulez comparer, poursuivre la recherche, ou préparer un contact.",
        suggestedPrompts: ["Comparer la sélection", "Voir plus de résultats", "Préremplir le formulaire de contact"],
        actions: [buildNoticeAction("Plan incomplet", "Le plan a chargé du contexte mais pas d’action finale.", "planner_plan_incomplete")],
        toolTrace,
        agentMode: "tool",
        analysisCards: collectedAnalysisCards.slice(0, 8),
        costHints: { route: "edge_tools", multimodalUsed: true, estimatedClass: "medium" },
      };
    }

    return null;
  };

  if (!input.actionRequest && plannerFeatureEnabled) {
    const plannerConfig = resolveGeminiPlannerConfig();
    if (!plannerConfig) {
      const inferred = extractSearchParamsFromQuestion(input.question, mergedConversationState, effectiveActionRequest);
      const normalizedQuestion = normalizeText(input.question);
      const isInvestmentIntent = /\binvest/.test(normalizedQuestion) || /\blocatif\b|\brendement\b/.test(normalizedQuestion);
      const missingCity = !(inferred.city && inferred.city.trim().length > 0);
      const missingTransaction = !inferred.transaction;

      if (isInvestmentIntent && missingCity && missingTransaction) {
        plannerMeta = {
          provider: "fallback",
          mode: "deterministic_fallback",
          decisionType: "clarify",
          reasonCode: "planner_unavailable_clarify_invest",
        };
        return applyPlannerMeta({
          answer: "Pour un investissement, vous visez plutôt l’achat ou la location, et dans quelle ville ?",
          suggestedPrompts: ["Achat au Havre", "Location au Havre", "Comparer achat et location"],
          actions: [buildNoticeAction("Précision nécessaire", "Précisez la transaction et la ville cible.", "planner_clarify")],
          toolTrace,
          agentMode: "tool",
          costHints: { route: "edge_tools", estimatedClass: "low" },
        });
      }

      plannerMeta = {
        provider: "fallback",
        mode: "deterministic_fallback",
        decisionType: "plan",
        toolName: "search_properties",
        reasonCode: "planner_unavailable",
      };
    } else {
      const plannerResult = await generateGeminiPlannerDecision(plannerConfig, {
        question: input.question,
        chatHistory: input.chatHistory,
        conversationState: mergedConversationState,
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
          costHints: { route: "edge_tools", estimatedClass: "low" },
        });
      }

      if (plannerResult.decision?.decisionType === "plan") {
        plannerMeta = {
          provider: "gemini",
          mode: "gemini",
          decisionType: "plan",
          toolName: plannerResult.decision.steps[0]?.tool,
          reasonCode: plannerResult.decision.reasonCode,
          confidence: plannerResult.decision.confidence,
        };
        const plannedResult = await runPlannerV2Plan(plannerResult.decision);
        if (plannedResult) {
          return applyPlannerMeta(plannedResult);
        }
        plannerMeta = {
          provider: "fallback",
          mode: "deterministic_fallback",
          decisionType: "none",
          reasonCode: "planner_plan_not_executable",
        };
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
          decisionType: "plan",
          toolName: "search_properties",
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
      case "aggregate_properties":
        return applyPlannerMeta(await runAggregate());
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

  if (isLikelyCompareQuestion(input.question) && (mergedConversationState?.selectedPropertyIds?.length ?? 0) >= 2) {
    return applyPlannerMeta(await runCompare(mergedConversationState?.selectedPropertyIds ?? []));
  }

  if (isLikelyHandoffQuestion(input.question) && (mergedConversationState?.recentSearch || mergedConversationState?.selectedPropertyIds?.length)) {
    return applyPlannerMeta(await runPrepareHandoff());
  }

  if (isLikelyAggregateQuestion(input.question)) {
    return applyPlannerMeta(await runAggregate());
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
        sessionId: payload.sessionId,
      });
    } catch {
      toolResult = null;
    }

    if (toolResult) {
      const memoryMeta =
        toolResult.memory ??
        await persistStructuredMemory({
          sessionId: payload.sessionId,
          baseState: payload.conversationState as ToolConversationState | undefined,
          patch: toolResult.conversationStatePatch,
          question: payload.question,
          chatHistory: payload.chatHistory,
        });
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
        analysisCards: toolResult.analysisCards,
        memory: memoryMeta,
        costHints: toolResult.costHints,
        streamSupported: parseBooleanEnv("CHATBOT_STREAM_ENABLED", false),
      });
    }

    let ragContext: RAGContextResult = { contextBlock: null, citations: [], retrievalMode: "none" };
    try {
      ragContext = await retrieveWebsiteContextWithPageFallback(payload.question);
    } catch {
      ragContext = { contextBlock: null, citations: [], retrievalMode: "none" };
    }

    if (!resolveGenerationProvider()) {
      const ragFallback = buildRagFallbackWithoutGeneration(ragContext);
      return jsonResponse({
        source: "fallback",
        edgeProvider: "fallback",
        retrievalMode: ragContext.retrievalMode,
        requestId,
        ragUsed: Boolean(ragContext.contextBlock),
        citations: ragContext.citations.length > 0 ? ragContext.citations : undefined,
        agentMode: ragFallback ? "rag" : "fallback",
        pageContextUsed: ragContext.pageContextMeta?.used,
        pageContextMode: ragContext.pageContextMeta?.fetchMode,
        pageContextCacheHit: ragContext.pageContextMeta?.cacheHit,
        streamSupported: parseBooleanEnv("CHATBOT_STREAM_ENABLED", false),
        ...(ragFallback ?? buildFallback(payload.question)),
      });
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
        pageContextUsed: ragContext.pageContextMeta?.used,
        pageContextMode: ragContext.pageContextMeta?.fetchMode,
        pageContextCacheHit: ragContext.pageContextMeta?.cacheHit,
        streamSupported: parseBooleanEnv("CHATBOT_STREAM_ENABLED", false),
        ...fallback,
      });
    }
    const citationPrompts = buildSuggestedPromptsFromCitations(ragContext.citations);
    const mergedCitations = mergeChatbotResponseCitations(ragContext.citations, generationResult.webSearch?.citations ?? []);

    const ragConversationPatch: Partial<ToolConversationState> | undefined = undefined;
    const memoryMeta = await persistStructuredMemory({
      sessionId: payload.sessionId,
      baseState: payload.conversationState as ToolConversationState | undefined,
      patch: ragConversationPatch,
      question: payload.question,
      chatHistory: payload.chatHistory,
    });

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
      citations: mergedCitations,
      ragUsed: Boolean(ragContext.contextBlock),
      retrievalMode: ragContext.retrievalMode,
      agentMode: "rag",
      requestId,
      webSearchUsed: generationResult.webSearch?.used || undefined,
      webSearchProvider: generationResult.webSearch?.used ? "gemini_google_search" : undefined,
      webSearchQueries: generationResult.webSearch?.queries.length ? generationResult.webSearch.queries : undefined,
      pageContextUsed: ragContext.pageContextMeta?.used,
      pageContextMode: ragContext.pageContextMeta?.fetchMode,
      pageContextCacheHit: ragContext.pageContextMeta?.cacheHit,
      memory: memoryMeta,
      costHints: { route: "edge_rag", estimatedClass: ragContext.contextBlock ? "medium" : "low" },
      streamSupported: parseBooleanEnv("CHATBOT_STREAM_ENABLED", false),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 400);
  }
});
