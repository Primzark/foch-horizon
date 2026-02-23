import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

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
}

interface SanitizedRAGMatchRow {
  path: string;
  source_url?: string;
  title: string | null;
  section_heading: string | null;
  content: string;
  similarity: number | null;
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
      path: row.path!.trim(),
      content: row.content!.trim(),
      title: typeof row.title === "string" ? row.title.trim() : null,
      section_heading: typeof row.section_heading === "string" ? row.section_heading.trim() : null,
      source_url: typeof row.source_url === "string" ? row.source_url.trim() : undefined,
      similarity: typeof row.similarity === "number" ? row.similarity : null,
    }))
    .filter((row) => row.path.length > 0 && row.content.length > 0);
}

function buildRagContextBlock(rows: SanitizedRAGMatchRow[]): RAGContextResult {
  if (rows.length === 0) {
    return { contextBlock: null, citations: [] };
  }

  const maxContextChars = clamp(Math.floor(parseNumberEnv("CHATBOT_RAG_MAX_CONTEXT_CHARS", 5200)), 1200, 12000);
  const maxChunks = clamp(Math.floor(parseNumberEnv("CHATBOT_RAG_MAX_CHUNKS", 5)), 1, 8);
  const seenPaths = new Set<string>();
  const citations: RAGCitation[] = [];
  const blocks: string[] = [];
  let totalChars = 0;

  for (const row of rows.slice(0, maxChunks)) {
    const similarityLabel =
      typeof row.similarity === "number" ? ` (sim=${row.similarity.toFixed(3)})` : "";
    const sectionLine = row.section_heading ? `\nsection: ${row.section_heading}` : "";
    const excerpt = truncateText(row.content ?? "", 1100);
    const block =
      `[source]\npath: ${row.path}${similarityLabel}\n` +
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
    return { contextBlock: null, citations: [] };
  }

  const contextBlock = [
    "WEBSITE_CONTEXT",
    "Use this context first for questions about pages, services, neighborhoods, legal pages, or site navigation.",
    "Cite internal paths like /services or /contact when relevant. If context is insufficient, say so briefly.",
    ...blocks,
  ].join("\n\n");

  return { contextBlock, citations };
}

async function retrieveWebsiteContext(question: string): Promise<RAGContextResult> {
  const ragEnabled = parseBooleanEnv("CHATBOT_RAG_ENABLED", true);
  if (!ragEnabled) {
    return { contextBlock: null, citations: [] };
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return { contextBlock: null, citations: [] };
  }

  const embedding = await createQueryEmbedding(question);
  if (!embedding) {
    return { contextBlock: null, citations: [] };
  }

  const matchCount = clamp(Math.floor(parseNumberEnv("CHATBOT_RAG_MATCH_COUNT", 6)), 1, 12);
  const matchThreshold = clamp(parseNumberEnv("CHATBOT_RAG_MATCH_THRESHOLD", 0.7), 0, 1);
  const pathPrefix = (Deno.env.get("CHATBOT_RAG_PATH_PREFIX") ?? "").trim();

  const { data, error } = await supabase.rpc("match_chatbot_content_chunks", {
    query_embedding_text: vectorToPgLiteral(embedding),
    match_count: matchCount,
    match_threshold: matchThreshold,
    path_prefix: pathPrefix.length > 0 ? pathPrefix : null,
  });

  if (error) {
    return { contextBlock: null, citations: [] };
  }

  const rows = sanitizeRagRows(data);
  return buildRagContextBlock(rows);
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
    if (!resolveGenerationProvider()) {
      return jsonResponse({ source: "fallback", ...buildFallback(payload.question) });
    }

    let ragContext: RAGContextResult = { contextBlock: null, citations: [] };
    try {
      ragContext = await retrieveWebsiteContext(payload.question);
    } catch {
      ragContext = { contextBlock: null, citations: [] };
    }

    const normalizedHistory = normalizeHistoryForModel(payload.chatHistory, payload.question);
    const generationResult = await generateAssistantAnswer(payload.question, normalizedHistory, ragContext);

    if (!generationResult) {
      const fallback = buildFallback(payload.question);
      return jsonResponse({ source: "fallback", ...fallback });
    }
    const citationPrompts = buildSuggestedPromptsFromCitations(ragContext.citations);

    return jsonResponse({
      source: generationResult.provider,
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 400);
  }
});
