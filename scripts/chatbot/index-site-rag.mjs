#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveRequiredSupabaseServiceRoleConfig } from "./supabase-env.mjs";

const DEFAULT_SITEMAP_PATH = "public/sitemap.xml";
const DEFAULT_OUT_FILE = "docs/chatbot/rag-index-preview.json";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const MIN_RENDERED_WORD_COUNT = 40;

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.RAG_INDEX_BASE_URL ?? "",
    sitemap: process.env.RAG_INDEX_SITEMAP ?? DEFAULT_SITEMAP_PATH,
    outFile: process.env.RAG_INDEX_OUT_FILE ?? DEFAULT_OUT_FILE,
    renderMode: (process.env.RAG_INDEX_RENDER_MODE ?? "http").toLowerCase(),
    renderWaitMs: Number(process.env.RAG_INDEX_RENDER_WAIT_MS ?? 1000),
    limit: null,
    concurrency: Number(process.env.RAG_INDEX_CONCURRENCY ?? 4),
    dryRun: false,
    skipUpload: false,
    skipEmbeddings: false,
    pathPrefix: process.env.RAG_INDEX_PATH_PREFIX ?? "",
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === "--base-url" || arg === "-b") && next) {
      args.baseUrl = next;
      index += 1;
      continue;
    }

    if ((arg === "--sitemap" || arg === "-s") && next) {
      args.sitemap = next;
      index += 1;
      continue;
    }

    if ((arg === "--out" || arg === "-o") && next) {
      args.outFile = next;
      index += 1;
      continue;
    }

    if (arg === "--limit" && next) {
      const parsed = Number(next);
      args.limit = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
      index += 1;
      continue;
    }

    if (arg === "--render" && next) {
      args.renderMode = next.toLowerCase();
      index += 1;
      continue;
    }

    if (arg === "--headless") {
      args.renderMode = "headless";
      continue;
    }

    if (arg === "--concurrency" && next) {
      const parsed = Number(next);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.concurrency = Math.floor(parsed);
      }
      index += 1;
      continue;
    }

    if (arg === "--path-prefix" && next) {
      args.pathPrefix = next;
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      args.dryRun = true;
      args.skipUpload = true;
      continue;
    }

    if (arg === "--skip-upload") {
      args.skipUpload = true;
      continue;
    }

    if (arg === "--skip-embeddings") {
      args.skipEmbeddings = true;
      continue;
    }

    if (arg === "--verbose") {
      args.verbose = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  args.concurrency = Math.max(1, Math.min(args.concurrency || 4, 10));
  if (!["http", "headless"].includes(args.renderMode)) {
    args.renderMode = "http";
  }
  args.renderWaitMs = Number.isFinite(args.renderWaitMs) ? Math.max(0, Math.floor(args.renderWaitMs)) : 1000;
  if (args.renderMode === "headless") {
    args.concurrency = Math.min(args.concurrency, 3);
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/chatbot/index-site-rag.mjs [options]

Options:
  --base-url <url>      Override sitemap host (useful for staging/prod)
  --sitemap <path|url>  Local sitemap.xml path or remote sitemap URL
  --out <file>          Write a JSON preview of extracted chunks
  --render <mode>       html fetch mode: http (default) or headless
  --headless            Shortcut for --render headless
  --limit <n>           Limit number of pages for a test run
  --concurrency <n>     Fetch concurrency (default: 4)
  --path-prefix <path>  Index only paths starting with this prefix (ex: /immobilier/)
  --skip-embeddings     Skip OpenAI embeddings (rows are stored with null embedding)
  --skip-upload         Do not upload to Supabase (still writes preview file)
  --dry-run             Shortcut for --skip-upload
  --verbose             Print per-page progress

Environment used for upload:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  OPENAI_API_KEY or GEMINI_API_KEY (unless --skip-embeddings)
  OPENAI_EMBEDDING_MODEL (optional, default: ${DEFAULT_EMBEDDING_MODEL})
  GEMINI_EMBEDDING_MODEL (optional, default: gemini-embedding-001)
  RAG_EMBEDDING_PROVIDER=openai|gemini
  RAG_INDEX_RENDER_MODE=http|headless
`);
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

async function loadTextFromPathOrUrl(input) {
  if (isHttpUrl(input)) {
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed to load ${input} (${response.status})`);
    }
    return await response.text();
  }

  return await readFile(input, "utf8");
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractSitemapUrls(xml) {
  const urls = [];
  const matches = xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi);
  for (const match of matches) {
    const raw = decodeXmlEntities(match[1] ?? "").trim();
    if (!raw) continue;
    try {
      urls.push(new URL(raw).toString());
    } catch {
      // ignore invalid loc entries
    }
  }
  return urls;
}

function applyBaseUrlOverride(rawUrl, baseUrl) {
  if (!baseUrl) return rawUrl;
  const current = new URL(rawUrl);
  const base = new URL(baseUrl);
  return new URL(`${current.pathname}${current.search}`, `${base.origin}/`).toString();
}

function normalizeInternalPath(urlValue) {
  const url = new URL(urlValue);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  return `${pathname}${url.search}`;
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : "";
    });
}

function collapseWhitespace(value) {
  return value.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function extractFirstMatch(html, regex) {
  const match = html.match(regex);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : "";
}

function extractHtmlDocumentText(html) {
  const title = extractFirstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = extractFirstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const metaDescription =
    extractFirstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i) ||
    extractFirstMatch(html, /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i);

  const mainOrBodyMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ?? html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let contentHtml = mainOrBodyMatch?.[1] ?? html;

  contentHtml = contentHtml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<(br|\/p|\/li|\/h1|\/h2|\/h3|\/h4|\/h5|\/h6|\/section|\/article|\/div)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ");

  const rawText = decodeHtmlEntities(contentHtml)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");

  const normalizedText = collapseWhitespace(rawText);
  const wordCount = normalizedText.length > 0 ? normalizedText.split(/\s+/).length : 0;

  return {
    title,
    h1,
    metaDescription,
    text: normalizedText,
    wordCount,
  };
}

function chunkText(text, options = {}) {
  const maxChars = options.maxChars ?? 900;
  const minChars = options.minChars ?? 200;
  const maxParagraphChars = options.maxParagraphChars ?? 1000;
  const paragraphs = text
    .split(/\n{2,}|\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const normalizedParagraphs = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxParagraphChars) {
      normalizedParagraphs.push(paragraph);
      continue;
    }

    // Hard-split very long paragraphs while preserving order.
    let start = 0;
    while (start < paragraph.length) {
      normalizedParagraphs.push(paragraph.slice(start, start + maxParagraphChars).trim());
      start += maxParagraphChars;
    }
  }

  const chunks = [];
  let buffer = "";

  for (const paragraph of normalizedParagraphs) {
    const next = buffer ? `${buffer}\n${paragraph}` : paragraph;
    if (next.length <= maxChars) {
      buffer = next;
      continue;
    }

    if (buffer) {
      chunks.push(buffer);
      buffer = paragraph;
      continue;
    }

    chunks.push(paragraph.slice(0, maxChars));
    buffer = paragraph.slice(maxChars).trim();
  }

  if (buffer) chunks.push(buffer);

  return chunks.filter((chunk, index) => chunk.length >= minChars || index === 0);
}

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function vectorToPgLiteral(vector) {
  return `[${vector.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

function parseEmbeddingProviderValue(raw) {
  const normalized = String(raw ?? "").trim().toLowerCase();
  return normalized === "gemini" || normalized === "openai" ? normalized : null;
}

function resolveIndexerEmbeddingProvider() {
  const explicit = parseEmbeddingProviderValue(process.env.RAG_EMBEDDING_PROVIDER);
  const geminiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  const openAiKey = (process.env.OPENAI_API_KEY ?? "").trim();

  if (explicit === "gemini") {
    return geminiKey
      ? { provider: "gemini", apiKey: geminiKey, model: process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001" }
      : null;
  }

  if (explicit === "openai") {
    return openAiKey
      ? { provider: "openai", apiKey: openAiKey, model: process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL }
      : null;
  }

  if (geminiKey) {
    return { provider: "gemini", apiKey: geminiKey, model: process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001" };
  }

  if (openAiKey) {
    return { provider: "openai", apiKey: openAiKey, model: process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL };
  }

  return null;
}

function parseJsStringLiteralValue(raw) {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

function parseQuotedStringArray(raw) {
  const values = [];
  const matches = raw.matchAll(/"((?:\\.|[^"\\])*)"/g);
  for (const match of matches) {
    values.push(parseJsStringLiteralValue(match[1]));
  }
  return values;
}

async function readLocalFallbackRouteDocuments() {
  const filePath = path.resolve("src/features/content/api/chatbot.service.ts");
  const source = await readFile(filePath, "utf8");

  const start = source.indexOf("const siteTopics: SiteTopicDescriptor[] = [");
  const end = source.indexOf("const districtVocabulary:");
  if (start === -1 || end === -1 || end <= start) {
    return [];
  }

  const slice = source.slice(start, end);
  const docs = [];
  const objectBlocks = slice.match(/\{\s*id:\s*"[^"]+"[\s\S]*?\n\s*\},/g) ?? [];

  for (const block of objectBlocks) {
    const idMatch = block.match(/id:\s*"((?:\\.|[^"\\])*)"/);
    const pathMatch = block.match(/path:\s*"((?:\\.|[^"\\])*)"/);
    const titleMatch = block.match(/title:\s*"((?:\\.|[^"\\])*)"/);
    const summaryMatch = block.match(/summary:\s*"((?:\\.|[^"\\])*)"/);
    const keywordsMatch = block.match(/keywords:\s*\[([\s\S]*?)\]/);
    const promptsMatch = block.match(/suggestedPrompts:\s*\[([\s\S]*?)\]/);

    if (!idMatch || !pathMatch || !titleMatch || !summaryMatch || !keywordsMatch || !promptsMatch) {
      continue;
    }

    const id = parseJsStringLiteralValue(idMatch[1]);
    const routePath = parseJsStringLiteralValue(pathMatch[1]);
    const title = parseJsStringLiteralValue(titleMatch[1]);
    const summary = parseJsStringLiteralValue(summaryMatch[1]);
    const keywords = parseQuotedStringArray(keywordsMatch[1]);
    const prompts = parseQuotedStringArray(promptsMatch[1]);
    const textParts = [title, summary];

    if (keywords.length > 0) {
      textParts.push(`Mots-clés: ${keywords.join(", ")}`);
    }

    if (prompts.length > 0) {
      textParts.push(`Prompts suggérés: ${prompts.join(" | ")}`);
    }

    docs.push({
      id,
      path: routePath,
      title,
      text: textParts.filter(Boolean).join("\n"),
      sourceKind: "route_summary",
      metaDescription: "",
      h1: title,
      wordCount: textParts.join(" ").split(/\s+/).filter(Boolean).length,
      extraMetadata: {
        summary_source_file: "src/features/content/api/chatbot.service.ts",
        route_topic_id: id,
        keywords,
        suggested_prompts: prompts,
      },
    });
  }

  return docs;
}

async function readLocalCityFallbackDocuments() {
  const filePath = path.resolve("src/features/cities/data/cities.ts");
  const source = await readFile(filePath, "utf8");
  const docs = [];
  const cityRegex =
    /\{\s*id:\s*"([^"]+)"\s*,\s*name:\s*"([^"]+)"\s*,\s*slug:\s*"([^"]+)"\s*,\s*postalCodes:\s*\[([\s\S]*?)\]\s*,/g;

  for (const match of source.matchAll(cityRegex)) {
    const [, id, nameRaw, slugRaw, postalCodesRaw] = match;
    const name = parseJsStringLiteralValue(nameRaw);
    const slug = parseJsStringLiteralValue(slugRaw);
    const postalCodes = parseQuotedStringArray(postalCodesRaw);
    const routePath = `/immobilier/${slug}`;
    const summary =
      `Page ville pour ${name} : contexte immobilier local, accès aux biens de la commune et raccourcis vers ` +
      `/biens?city=${slug} et /estimation?ville=${slug}.`;
    const text = [
      `Immobilier ${name}`,
      summary,
      postalCodes.length > 0 ? `Codes postaux: ${postalCodes.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    docs.push({
      id: `city-${id}`,
      path: routePath,
      title: `Immobilier ${name}`,
      text,
      sourceKind: "route_summary",
      metaDescription: "",
      h1: `Immobilier ${name}`,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      extraMetadata: {
        summary_source_file: "src/features/cities/data/cities.ts",
        city_id: id,
        city_slug: slug,
        postal_codes: postalCodes,
      },
    });
  }

  return docs;
}

async function loadFallbackRouteDocumentsMap() {
  const fallbackDocs = [...(await readLocalFallbackRouteDocuments()), ...(await readLocalCityFallbackDocuments())];
  return new Map(fallbackDocs.map((doc) => [doc.path, doc]));
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
    while (true) {
      const currentIndex = cursor;
      cursor += 1;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(runners);
  return results;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Foch-RAG-Indexer/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.text();
}

async function createHtmlFetcher(args) {
  if (args.renderMode !== "headless") {
    return {
      mode: "http",
      close: async () => {},
      fetchHtml,
    };
  }

  let playwrightModule;
  try {
    playwrightModule = await import("playwright");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Headless mode requires playwright. Install it first (example: npm install --no-save playwright && npx playwright install chromium). ${reason}`,
    );
  }

  const { chromium } = playwrightModule;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Foch-RAG-Indexer/1.0",
  });

  return {
    mode: "headless",
    close: async () => {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    },
    fetchHtml: async (url) => {
      const page = await context.newPage();

      try {
        await page.goto(url, {
          waitUntil: "networkidle",
          timeout: 45000,
        });

        if (args.renderWaitMs > 0) {
          await page.waitForTimeout(args.renderWaitMs);
        }

        return await page.content();
      } finally {
        await page.close().catch(() => {});
      }
    },
  };
}

function buildRowsForDocument(document) {
  const chunks = chunkText(document.text, {
    maxChars: 900,
    minChars: 150,
    maxParagraphChars: 1000,
  });

  const rows = chunks.map((chunk, chunkIndex) => ({
    document_key: document.path,
    source_kind: document.sourceKind ?? "web_page",
    source_url: document.url,
    path: document.path,
    title: document.title || null,
    section_heading: null,
    chunk_index: chunkIndex,
    content: chunk,
    content_hash: sha256(`${document.path}:${chunkIndex}:${chunk}`),
    token_estimate: estimateTokens(chunk),
    metadata: {
      h1: document.h1 || null,
      meta_description: document.metaDescription || null,
      word_count: document.wordCount,
      indexed_at: document.indexedAt,
      source_kind: document.sourceKind ?? "web_page",
      ...(document.extraMetadata ?? {}),
    },
    embedding: null,
  }));

  return rows;
}

async function createOpenAIEmbeddingsForRows(rows, model, apiKey) {
  if (rows.length === 0) return;

  const batchSize = 50;
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: batch.map((row) => row.content),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`OpenAI embeddings failed (${response.status}): ${errorText.slice(0, 240)}`);
    }

    const payload = await response.json();
    const vectors = Array.isArray(payload?.data) ? payload.data : [];

    if (vectors.length !== batch.length) {
      throw new Error(`Embeddings response size mismatch (${vectors.length} for ${batch.length} chunks).`);
    }

    for (let index = 0; index < batch.length; index += 1) {
      const embedding = vectors[index]?.embedding;
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error(`Missing embedding at batch row ${start + index}.`);
      }
      batch[index].embedding = vectorToPgLiteral(embedding);
    }
  }
}

async function createGeminiEmbeddingsForRows(rows, model, apiKey) {
  if (rows.length === 0) return;

  const outputDimensionality = Number.isFinite(Number(process.env.RAG_EMBEDDING_OUTPUT_DIMENSION))
    ? Math.max(128, Math.min(Math.floor(Number(process.env.RAG_EMBEDDING_OUTPUT_DIMENSION)), 3072))
    : 1536;

  const batchSize = 20;
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        requests: batch.map((row) => ({
          model: `models/${model}`,
          content: {
            parts: [{ text: row.content }],
          },
          taskType: "RETRIEVAL_DOCUMENT",
          title: row.title || row.path,
          outputDimensionality,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Gemini embeddings failed (${response.status}): ${errorText.slice(0, 240)}`);
    }

    const payload = await response.json();
    const vectors = Array.isArray(payload?.embeddings) ? payload.embeddings : [];

    if (vectors.length !== batch.length) {
      throw new Error(`Gemini embeddings response size mismatch (${vectors.length} for ${batch.length} chunks).`);
    }

    for (let index = 0; index < batch.length; index += 1) {
      const embedding = vectors[index]?.values;
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error(`Missing Gemini embedding at batch row ${start + index}.`);
      }
      batch[index].embedding = vectorToPgLiteral(embedding);
    }
  }
}

async function createEmbeddingsForRows(rows) {
  if (rows.length === 0) return { provider: null, model: null };

  const providerConfig = resolveIndexerEmbeddingProvider();
  if (!providerConfig) {
    throw new Error("Missing embedding provider credentials. Set GEMINI_API_KEY or OPENAI_API_KEY (or use --skip-embeddings).");
  }

  if (providerConfig.provider === "gemini") {
    await createGeminiEmbeddingsForRows(rows, providerConfig.model, providerConfig.apiKey);
    return { provider: "gemini", model: providerConfig.model };
  }

  await createOpenAIEmbeddingsForRows(rows, providerConfig.model, providerConfig.apiKey);
  return { provider: "openai", model: providerConfig.model };
}

async function deleteDocumentChunks(supabaseUrl, serviceRoleKey, documentKey) {
  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/chatbot_content_chunks?document_key=eq.${encodeURIComponent(documentKey)}`;
  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "return=minimal",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Delete failed for ${documentKey} (${response.status}): ${errorText.slice(0, 240)}`);
  }
}

async function insertDocumentChunks(supabaseUrl, serviceRoleKey, rows) {
  if (rows.length === 0) return;

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/chatbot_content_chunks`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Insert failed (${response.status}): ${errorText.slice(0, 240)}`);
  }
}

async function uploadRowsToSupabase(rows) {
  const { supabaseUrl, serviceRoleKey } = resolveRequiredSupabaseServiceRoleConfig();

  const rowsByDocument = new Map();
  for (const row of rows) {
    const existing = rowsByDocument.get(row.document_key);
    if (existing) {
      existing.push(row);
    } else {
      rowsByDocument.set(row.document_key, [row]);
    }
  }

  let documentCount = 0;
  for (const [documentKey, documentRows] of rowsByDocument.entries()) {
    await deleteDocumentChunks(supabaseUrl, serviceRoleKey, documentKey);
    await insertDocumentChunks(supabaseUrl, serviceRoleKey, documentRows);
    documentCount += 1;
    console.log(`[upload] ${documentKey}: ${documentRows.length} chunks`);
  }

  return { documentCount, rowCount: rows.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sitemapText = await loadTextFromPathOrUrl(args.sitemap);
  const fallbackDocsByPath = await loadFallbackRouteDocumentsMap();
  const htmlFetcher = await createHtmlFetcher(args);
  const allUrls = extractSitemapUrls(sitemapText)
    .map((url) => applyBaseUrlOverride(url, args.baseUrl))
    .filter((url) => {
      if (!args.pathPrefix) return true;
      return normalizeInternalPath(url).startsWith(args.pathPrefix);
    });

  const uniqueUrls = Array.from(new Set(allUrls));
  const selectedUrls = args.limit ? uniqueUrls.slice(0, args.limit) : uniqueUrls;

  if (selectedUrls.length === 0) {
    throw new Error("No URLs found in sitemap after filtering.");
  }

  console.log(`[index] sitemap: ${args.sitemap}`);
  console.log(`[index] urls: ${selectedUrls.length}`);
  console.log(`[index] render-mode: ${htmlFetcher.mode}`);
  if (args.baseUrl) {
    console.log(`[index] base-url override: ${args.baseUrl}`);
  }
  if (args.pathPrefix) {
    console.log(`[index] path-prefix: ${args.pathPrefix}`);
  }

  try {
    const pages = await mapWithConcurrency(selectedUrls, args.concurrency, async (url, pageIndex) => {
      if (args.verbose) {
        console.log(`[fetch] ${pageIndex + 1}/${selectedUrls.length} ${url}`);
      }

      try {
        const html = await htmlFetcher.fetchHtml(url);
        const extracted = extractHtmlDocumentText(html);
        const pathName = normalizeInternalPath(url);
        const indexedAt = new Date().toISOString();
        const fallbackDoc = fallbackDocsByPath.get(pathName);
        const shouldUseFallback = extracted.wordCount < MIN_RENDERED_WORD_COUNT && Boolean(fallbackDoc);

        return {
          ok: true,
          url,
          path: pathName,
          title: shouldUseFallback ? fallbackDoc.title : extracted.title || extracted.h1 || pathName,
          h1: shouldUseFallback ? fallbackDoc.h1 : extracted.h1,
          metaDescription: shouldUseFallback ? fallbackDoc.metaDescription : extracted.metaDescription,
          text: shouldUseFallback ? fallbackDoc.text : extracted.text,
          wordCount: shouldUseFallback ? fallbackDoc.wordCount : extracted.wordCount,
          sourceKind: shouldUseFallback ? fallbackDoc.sourceKind : "web_page",
          extraMetadata: shouldUseFallback
            ? {
                ...(fallbackDoc.extraMetadata ?? {}),
                html_shell_detected: true,
                rendered_word_count: extracted.wordCount,
              }
            : {},
          indexedAt,
        };
      } catch (error) {
        return {
          ok: false,
          url,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const failures = pages.filter((page) => !page.ok);
    const successfulPages = pages.filter((page) => page.ok && page.text && page.text.length > 0);

    const selectedPathToUrl = new Map(selectedUrls.map((url) => [normalizeInternalPath(url), url]));
    const existingPaths = new Set(successfulPages.map((page) => page.path));

    for (const [routePath, fallbackDoc] of fallbackDocsByPath.entries()) {
      if (!selectedPathToUrl.has(routePath)) continue;
      if (existingPaths.has(routePath)) continue;

      successfulPages.push({
        ok: true,
        url: selectedPathToUrl.get(routePath),
        path: routePath,
        title: fallbackDoc.title,
        h1: fallbackDoc.h1,
        metaDescription: fallbackDoc.metaDescription,
        text: fallbackDoc.text,
        wordCount: fallbackDoc.wordCount,
        indexedAt: new Date().toISOString(),
        sourceKind: fallbackDoc.sourceKind,
        extraMetadata: {
          ...(fallbackDoc.extraMetadata ?? {}),
          fallback_without_fetch_content: true,
        },
      });
      existingPaths.add(routePath);
    }

    for (const failure of failures) {
      console.warn(`[warn] failed ${failure.url}: ${failure.error}`);
    }

    if (successfulPages.length === 0) {
      throw new Error("No page content extracted successfully.");
    }

    const rows = successfulPages.flatMap((page) => buildRowsForDocument(page));
    let embeddingProvider = null;
    let embeddingModel = null;

    if (!args.skipEmbeddings) {
      const embeddingInfo = await createEmbeddingsForRows(rows);
      embeddingProvider = embeddingInfo.provider;
      embeddingModel = embeddingInfo.model;
      console.log(`[embed] provider: ${embeddingProvider} model: ${embeddingModel}`);
    } else {
      console.log("[embed] skipped (rows will be stored without embeddings)");
    }

    const preview = {
      generatedAt: new Date().toISOString(),
      pageCount: successfulPages.length,
      failedPages: failures.length,
      rowCount: rows.length,
      embeddingProvider,
      embeddingModel: args.skipEmbeddings ? null : embeddingModel,
      sample: rows.slice(0, 5).map((row) => ({
        ...row,
        embedding: row.embedding ? "[vector omitted]" : null,
      })),
    };

    const outFilePath = path.resolve(args.outFile);
    await mkdir(path.dirname(outFilePath), { recursive: true });
    await writeFile(outFilePath, `${JSON.stringify(preview, null, 2)}\n`, "utf8");
    console.log(`[index] preview written: ${args.outFile}`);

    if (!args.skipUpload) {
      const result = await uploadRowsToSupabase(rows);
      console.log(`[upload] complete: ${result.documentCount} documents, ${result.rowCount} chunks`);
    } else {
      console.log("[upload] skipped");
    }

    console.log(
      `[done] indexed ${successfulPages.length} pages (${rows.length} chunks), failed ${failures.length} pages`,
    );
  } finally {
    await htmlFetcher.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[error] ${message}`);
  process.exit(1);
});
