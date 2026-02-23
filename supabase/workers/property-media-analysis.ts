import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

type JobType = "analyze_images" | "analyze_documents" | "refresh_property_media";
type JobStatus = "queued" | "running" | "done" | "error";
type SourceKind = "image" | "document";

interface AnalysisJob {
  id: string;
  property_id: number;
  job_type: JobType;
  payload: Record<string, unknown> | null;
  attempts: number;
}

interface SourceItem {
  kind: SourceKind;
  propertyId: number;
  sourceId?: string;
  sourceUrl: string;
  mimeType?: string | null;
}

interface WorkerConfig {
  maxJobs: number;
  maxImagesPerProperty: number;
  maxPdfPages: number;
  maxFileBytes: number;
  maxAttempts: number;
  fetchTimeoutMs: number;
  analysisVersion: string;
  model: string;
  multimodalEnabled: boolean;
}

function parseBoolean(value: string | null | undefined, defaultValue = false): boolean {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function parsePositiveInt(value: string | null | undefined, defaultValue: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function nowIso(): string {
  return new Date().toISOString();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unexpected error";
}

function binaryToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sanitizeJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeMimeType(input: string | null | undefined, sourceKind: SourceKind): string {
  const raw = (input ?? "").trim().toLowerCase();
  if (raw) return raw;
  return sourceKind === "image" ? "image/jpeg" : "application/pdf";
}

function allowedMimeType(sourceKind: SourceKind, mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();
  if (sourceKind === "image") {
    return ["image/jpeg", "image/png", "image/webp"].includes(normalized);
  }
  return normalized === "application/pdf";
}

function estimatePdfPageCount(bytes: Uint8Array): number | null {
  try {
    const sample = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 2_500_000)));
    const matches = sample.match(/\/Type\s*\/Page\b/g);
    if (!matches || matches.length === 0) return null;
    return matches.length;
  } catch {
    return null;
  }
}

function estimateAnalysisCostUsd(source: SourceItem, bytesLength: number, pageCount?: number | null): number {
  const base = source.kind === "image" ? 0.0008 : 0.0015;
  const sizeFactor = Math.min(0.008, (bytesLength / 1_000_000) * 0.0008);
  const pageFactor = source.kind === "document" ? Math.min(0.02, Math.max(0, (pageCount ?? 1) - 1) * 0.00025) : 0;
  return Number((base + sizeFactor + pageFactor).toFixed(6));
}

function classifyDocumentKindFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("dpe")) return "dpe_pdf";
  if (lower.includes("diagnostic")) return "diagnostic_pdf";
  if (lower.includes("plan") || lower.includes("floor")) return "floor_plan_pdf";
  if (lower.includes("brochure")) return "brochure_pdf";
  return "other";
}

async function claimJobs(supabase: ReturnType<typeof createClient>, maxJobs: number): Promise<AnalysisJob[]> {
  const { data, error } = await supabase
    .from("property_media_analysis_jobs")
    .select("id,property_id,job_type,payload,attempts,status,next_attempt_at")
    .eq("status", "queued")
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(maxJobs);

  if (error) throw error;
  const rows = ((data ?? []) as Array<Record<string, unknown>>).filter((row) => row.status === "queued");
  const claimed: AnalysisJob[] = [];

  for (const row of rows) {
    const id = String(row.id ?? "");
    const { data: updated, error: updateError } = await supabase
      .from("property_media_analysis_jobs")
      .update({
        status: "running" satisfies JobStatus,
        started_at: nowIso(),
        attempts: (typeof row.attempts === "number" ? row.attempts : Number(row.attempts) || 0) + 1,
      })
      .eq("id", id)
      .eq("status", "queued")
      .select("id,property_id,job_type,payload,attempts")
      .maybeSingle();

    if (updateError) continue;
    if (!updated) continue;
    claimed.push({
      id: String(updated.id),
      property_id: Number(updated.property_id),
      job_type: String(updated.job_type) as JobType,
      payload: sanitizeJsonObject(updated.payload),
      attempts: Number(updated.attempts) || 0,
    });
  }

  return claimed;
}

async function listImageSources(
  supabase: ReturnType<typeof createClient>,
  propertyId: number,
  limit: number,
): Promise<SourceItem[]> {
  const { data, error } = await supabase
    .from("property_images")
    .select("source_url")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as Array<{ source_url: string }>).filter((row) => !!row.source_url).map((row) => ({
    kind: "image",
    propertyId,
    sourceUrl: row.source_url,
    mimeType: "image/jpeg",
  }));
}

async function listDocumentSources(
  supabase: ReturnType<typeof createClient>,
  propertyId: number,
): Promise<SourceItem[]> {
  const { data, error } = await supabase
    .from("property_documents")
    .select("id,source_url,mime_type,status")
    .eq("property_id", propertyId)
    .in("status", ["pending", "ready", "error", "skipped"])
    .limit(12);
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; source_url: string; mime_type: string | null }>).filter((row) => !!row.source_url).map((row) => ({
    kind: "document",
    propertyId,
    sourceId: row.id,
    sourceUrl: row.source_url,
    mimeType: row.mime_type,
  }));
}

async function headPreflight(
  source: SourceItem,
  timeoutMs: number,
): Promise<{ mimeType?: string; contentLength?: number; etag?: string | null; lastModified?: string | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(source.sourceUrl, {
      method: "HEAD",
      headers: { "User-Agent": "FochMultimodalWorker/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) return {};
    const contentLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);
    return {
      mimeType: response.headers.get("content-type") ?? undefined,
      contentLength: Number.isFinite(contentLength) && contentLength > 0 ? contentLength : undefined,
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchSourceBytes(
  source: SourceItem,
  timeoutMs: number,
  maxFileBytes: number,
): Promise<{ bytes: Uint8Array; mimeType: string; fileSizeBytes: number; etag?: string | null; lastModified?: string | null; pageCount?: number | null; sourceHash: string }> {
  const preflight = await headPreflight(source, Math.min(timeoutMs, 2500));
  if (typeof preflight.contentLength === "number" && preflight.contentLength > maxFileBytes) {
    throw new Error(`Source too large (${preflight.contentLength} bytes > ${maxFileBytes})`);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(source.sourceUrl, {
      headers: { "User-Agent": "FochMultimodalWorker/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Source fetch failed (${response.status})`);
    }
    const contentType = response.headers.get("content-type") ?? preflight.mimeType ?? source.mimeType ?? undefined;
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.byteLength > maxFileBytes) {
      throw new Error(`Source too large (${bytes.byteLength} bytes > ${maxFileBytes})`);
    }
    const mimeType = normalizeMimeType(contentType, source.kind);
    if (!allowedMimeType(source.kind, mimeType)) {
      throw new Error(`Unsupported mime type: ${mimeType}`);
    }
    const pageCount = source.kind === "document" && mimeType === "application/pdf" ? estimatePdfPageCount(bytes) : null;
    const sourceHash = await sha256Hex(bytes);
    return {
      bytes,
      mimeType,
      fileSizeBytes: bytes.byteLength,
      etag: response.headers.get("etag") ?? preflight.etag ?? null,
      lastModified: response.headers.get("last-modified") ?? preflight.lastModified ?? null,
      pageCount,
      sourceHash,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildGeminiMultimodalPrompt(source: SourceItem): string {
  const sourceLabel = source.kind === "image" ? "photo de bien immobilier" : "document immobilier (PDF)";
  return [
    "Analyse ce contenu immobilier et retourne uniquement un JSON valide.",
    `Type de source: ${sourceLabel}`,
    "Contraintes:",
    "- Réponse JSON seulement, sans markdown.",
    "- Inclure: observations (array), uncertainties (array), facts (object), riskFlags (array), userSafeSummary (string), agentNotes (string|null), confidence (number 0..1), evidence (array).",
    "- Ne pas inventer d'informations invisibles/incertaines.",
    "- Pour un document technique (DPE/diagnostic), rester informatif et prudent.",
  ].join("\n");
}

function extractJsonFromGeminiText(text: string): Record<string, unknown> {
  const raw = text.trim();
  try {
    return sanitizeJsonObject(JSON.parse(raw));
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Invalid Gemini JSON response");
    return sanitizeJsonObject(JSON.parse(match[0]));
  }
}

async function analyzeSourceWithGemini(
  source: SourceItem,
  config: WorkerConfig,
  supabase?: ReturnType<typeof createClient>,
): Promise<{
  status: "ready" | "error";
  summaryShort?: string;
  summaryLong?: string;
  structuredFacts?: Record<string, unknown>;
  safetyFlags?: Record<string, unknown>;
  evidence?: unknown[];
  confidence?: number;
  costEstimateUsd?: number | null;
  latencyMs: number;
  sourceHash?: string;
  fileSizeBytes?: number;
  pageCount?: number | null;
  mimeType?: string;
  etag?: string | null;
  lastModified?: string | null;
  cacheHit?: boolean;
}> {
  const apiKey = (Deno.env.get("GEMINI_API_KEY") ?? "").trim();
  if (!config.multimodalEnabled) {
    return {
      status: "error",
      summaryShort: "Analyse multimodale désactivée",
      summaryLong: "Le worker multimodal est en place mais la fonctionnalité est désactivée par configuration.",
      structuredFacts: {},
      safetyFlags: { disabled: true },
      evidence: [],
      confidence: 0,
      latencyMs: 0,
    };
  }
  if (!apiKey) {
    return {
      status: "error",
      summaryShort: "Clé Gemini manquante",
      summaryLong: "Impossible de lancer l'analyse multimodale sans GEMINI_API_KEY.",
      structuredFacts: {},
      safetyFlags: { configMissing: true },
      evidence: [],
      confidence: 0,
      latencyMs: 0,
    };
  }

  const startedAt = Date.now();
  const { bytes, mimeType, fileSizeBytes, pageCount, sourceHash, etag, lastModified } = await fetchSourceBytes(
    source,
    config.fetchTimeoutMs,
    config.maxFileBytes,
  );
  if (supabase) {
    try {
      const { data } = await supabase
        .from("property_media_analysis")
        .select("status,summary_short,summary_long,structured_facts,safety_flags,evidence,cost_estimate_usd,latency_ms")
        .eq("source_kind", source.kind)
        .eq("source_url", source.sourceUrl)
        .eq("analysis_version", config.analysisVersion)
        .eq("source_hash", sourceHash)
        .eq("status", "ready")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data && typeof data === "object") {
        const existing = data as Record<string, unknown>;
        return {
          status: "ready",
          summaryShort: typeof existing.summary_short === "string" ? existing.summary_short : undefined,
          summaryLong: typeof existing.summary_long === "string" ? existing.summary_long : undefined,
          structuredFacts: sanitizeJsonObject(existing.structured_facts),
          safetyFlags: sanitizeJsonObject(existing.safety_flags),
          evidence: Array.isArray(existing.evidence) ? existing.evidence : [],
          confidence:
            typeof sanitizeJsonObject(existing.structured_facts).confidence === "number"
              ? Math.max(0, Math.min(1, Number(sanitizeJsonObject(existing.structured_facts).confidence)))
              : undefined,
          costEstimateUsd:
            typeof existing.cost_estimate_usd === "number" ? existing.cost_estimate_usd : estimateAnalysisCostUsd(source, fileSizeBytes, pageCount),
          latencyMs: 0,
          sourceHash,
          fileSizeBytes,
          pageCount,
          mimeType,
          etag,
          lastModified,
          cacheHit: true,
        };
      }
    } catch {
      // Ignore cache lookup failures and continue with live analysis.
    }
  }

  if (source.kind === "document" && mimeType === "application/pdf" && typeof pageCount === "number" && pageCount > config.maxPdfPages) {
    return {
      status: "error",
      summaryShort: `PDF trop volumineux (${pageCount} pages)`,
      summaryLong: `Le document dépasse la limite configurée de ${config.maxPdfPages} pages.`,
      structuredFacts: {},
      safetyFlags: { pageLimitExceeded: true, pageCount, maxPdfPages: config.maxPdfPages },
      evidence: [{ sourceUrl: source.sourceUrl, pageCount }],
      confidence: 0,
      costEstimateUsd: 0,
      latencyMs: Date.now() - startedAt,
      sourceHash,
      fileSizeBytes,
      pageCount,
      mimeType,
      etag,
      lastModified,
      cacheHit: false,
    };
  }
  const base64 = binaryToBase64(bytes);
  const model = encodeURIComponent(config.model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        maxOutputTokens: 700,
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: buildGeminiMultimodalPrompt(source) },
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
          ],
        },
      ],
    }),
  });

  const latencyMs = Date.now() - startedAt;
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini multimodal failed (${response.status})${body ? `: ${body.slice(0, 240)}` : ""}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  const candidates = Array.isArray(json.candidates) ? json.candidates : [];
  const first = (candidates[0] ?? {}) as Record<string, unknown>;
  const content = sanitizeJsonObject(first.content);
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const textPart = parts.find((part) => part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string") as
    | { text: string }
    | undefined;
  if (!textPart?.text) {
    throw new Error("Gemini multimodal returned no text payload");
  }

  const parsed = extractJsonFromGeminiText(textPart.text);
  const confidence = typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
    ? Math.max(0, Math.min(1, parsed.confidence))
    : undefined;
  const userSafeSummary = typeof parsed.userSafeSummary === "string" ? parsed.userSafeSummary.trim() : "";
  const observations = Array.isArray(parsed.observations) ? parsed.observations.filter((v) => typeof v === "string") : [];
  const uncertainties = Array.isArray(parsed.uncertainties) ? parsed.uncertainties.filter((v) => typeof v === "string") : [];
  const evidence = Array.isArray(parsed.evidence) ? parsed.evidence.slice(0, 8) : [];

  return {
    status: "ready",
    summaryShort: userSafeSummary.slice(0, 280) || observations.slice(0, 2).join(" • ").slice(0, 280),
    summaryLong: [userSafeSummary, observations.length ? `Observations: ${observations.join(" ; ")}` : "", uncertainties.length ? `Incertitudes: ${uncertainties.join(" ; ")}` : ""].filter(Boolean).join("\n\n").slice(0, 4000),
    structuredFacts: sanitizeJsonObject(parsed.facts),
    safetyFlags: {
      riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags.slice(0, 20) : [],
      uncertainties,
      confidence,
    },
    evidence,
    confidence,
    costEstimateUsd: estimateAnalysisCostUsd(source, fileSizeBytes, pageCount),
    latencyMs,
    sourceHash,
    fileSizeBytes,
    pageCount,
    mimeType,
    etag,
    lastModified,
    cacheHit: false,
  };
}

async function upsertAnalysis(
  supabase: ReturnType<typeof createClient>,
  source: SourceItem,
  config: WorkerConfig,
  analysis: Awaited<ReturnType<typeof analyzeSourceWithGemini>>,
): Promise<void> {
  const row = {
    property_id: source.propertyId,
    source_kind: source.kind,
    source_id: source.sourceId ?? null,
    source_url: source.sourceUrl,
    model: config.model,
    analysis_version: config.analysisVersion,
    status: analysis.status,
    summary_short: analysis.summaryShort ?? null,
    summary_long: analysis.summaryLong ?? null,
    structured_facts: analysis.structuredFacts ?? {},
    safety_flags: analysis.safetyFlags ?? {},
    evidence: Array.isArray(analysis.evidence) ? analysis.evidence : [],
    cost_estimate_usd: typeof analysis.costEstimateUsd === "number" ? analysis.costEstimateUsd : null,
    latency_ms: analysis.latencyMs,
    metadata: {
      fileSizeBytes: analysis.fileSizeBytes ?? null,
      pageCount: analysis.pageCount ?? null,
      mimeType: analysis.mimeType ?? null,
      etag: analysis.etag ?? null,
      lastModified: analysis.lastModified ?? null,
    },
    source_hash: analysis.sourceHash ?? null,
    cache_key: analysis.sourceHash ? `${source.kind}:${source.sourceUrl}:${config.analysisVersion}:${analysis.sourceHash}` : null,
    updated_at: nowIso(),
  };

  const { error } = await supabase.from("property_media_analysis").upsert(row, {
    onConflict: "source_kind,source_url,analysis_version",
  });
  if (error) throw error;

  if (source.kind === "document" && source.sourceId) {
    await supabase
      .from("property_documents")
      .update({
        status: analysis.status === "ready" ? "ready" : "error",
        mime_type: analysis.mimeType ?? source.mimeType ?? null,
        sha256: analysis.sourceHash ?? null,
        file_size_bytes: analysis.fileSizeBytes ?? null,
        page_count: analysis.pageCount ?? null,
        http_etag: analysis.etag ?? null,
        http_last_modified: analysis.lastModified ?? null,
        last_fetch_at: nowIso(),
        last_error: analysis.status === "ready" ? null : analysis.summaryShort ?? "analysis_failed",
        updated_at: nowIso(),
      })
      .eq("id", source.sourceId);
  }
}

async function setJobStatus(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  status: JobStatus,
  lastError?: string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    finished_at: status === "done" || status === "error" ? nowIso() : null,
    last_error: lastError ?? null,
  };
  if (status === "running") {
    patch.started_at = nowIso();
  }
  const { error } = await supabase.from("property_media_analysis_jobs").update(patch).eq("id", jobId);
  if (error) throw error;
}

async function processJob(
  supabase: ReturnType<typeof createClient>,
  job: AnalysisJob,
  config: WorkerConfig,
): Promise<{ ok: boolean; analyzed: number; error?: string }> {
  const sources: SourceItem[] = [];

  if (job.job_type === "analyze_images" || job.job_type === "refresh_property_media") {
    sources.push(...(await listImageSources(supabase, job.property_id, config.maxImagesPerProperty)));
  }
  if (job.job_type === "analyze_documents" || job.job_type === "refresh_property_media") {
    sources.push(...(await listDocumentSources(supabase, job.property_id)));
  }

  if (sources.length === 0) {
    return { ok: true, analyzed: 0 };
  }

  let analyzed = 0;
  for (const source of sources) {
    let lastErrorMessage = "";
    for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
      try {
        const analysis = await analyzeSourceWithGemini(source, config, supabase);
        await upsertAnalysis(supabase, source, config, analysis);
        analyzed += 1;
        lastErrorMessage = "";
        break;
      } catch (error) {
        lastErrorMessage = getErrorMessage(error);
        const isLastAttempt = attempt >= config.maxAttempts;
        const transient = /(429|5\d\d|timeout|fetch failed|network|temporar)/i.test(lastErrorMessage);
        if (!isLastAttempt && transient) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 300));
          continue;
        }
        await upsertAnalysis(supabase, source, config, {
          status: "error",
          summaryShort: lastErrorMessage,
          summaryLong: lastErrorMessage,
          structuredFacts: {},
          safetyFlags: { workerError: true, attempts: attempt },
          evidence: [{ sourceUrl: source.sourceUrl, kind: source.kind }],
          latencyMs: 0,
          costEstimateUsd: 0,
        });
        break;
      }
    }
  }

  return { ok: true, analyzed };
}

async function main(): Promise<void> {
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  const serviceRoleKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const config: WorkerConfig = {
    maxJobs: parsePositiveInt(Deno.env.get("CHATBOT_MULTIMODAL_WORKER_MAX_JOBS"), 5),
    maxImagesPerProperty: parsePositiveInt(Deno.env.get("CHATBOT_MULTIMODAL_MAX_IMAGES_PER_PROPERTY"), 6),
    maxPdfPages: parsePositiveInt(Deno.env.get("CHATBOT_MULTIMODAL_MAX_PDF_PAGES"), 20),
    maxFileBytes: parsePositiveInt(Deno.env.get("CHATBOT_MULTIMODAL_MAX_FILE_BYTES"), 8 * 1024 * 1024),
    maxAttempts: parsePositiveInt(Deno.env.get("CHATBOT_MULTIMODAL_WORKER_MAX_ATTEMPTS"), 3),
    fetchTimeoutMs: parsePositiveInt(Deno.env.get("CHATBOT_MULTIMODAL_FETCH_TIMEOUT_MS"), 5000),
    analysisVersion: (Deno.env.get("CHATBOT_MULTIMODAL_ANALYSIS_VERSION") ?? "v1").trim() || "v1",
    model: (Deno.env.get("CHATBOT_MULTIMODAL_MODEL") ?? "gemini-2.5-flash").trim() || "gemini-2.5-flash",
    multimodalEnabled: parseBoolean(Deno.env.get("CHATBOT_MULTIMODAL_ENABLED"), false),
  };

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const jobs = await claimJobs(supabase, config.maxJobs);

  const summary = {
    startedAt: nowIso(),
    claimedJobs: jobs.length,
    processedJobs: 0,
    analyzedSources: 0,
    errors: [] as Array<{ jobId: string; error: string }>,
    multimodalEnabled: config.multimodalEnabled,
    model: config.model,
  };

  for (const job of jobs) {
    try {
      const result = await processJob(supabase, job, config);
      await setJobStatus(supabase, job.id, "done");
      summary.processedJobs += 1;
      summary.analyzedSources += result.analyzed;
    } catch (error) {
      const message = getErrorMessage(error);
      await setJobStatus(supabase, job.id, "error", message).catch(() => undefined);
      summary.errors.push({ jobId: job.id, error: message });
    }
  }

  console.log("property_media_analysis_summary", JSON.stringify(summary));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("property_media_analysis_failed", getErrorMessage(error));
    if (error instanceof Error && error.stack) console.error(error.stack);
    Deno.exit(1);
  });
}
