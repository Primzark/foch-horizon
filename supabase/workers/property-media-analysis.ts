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

function sanitizeJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeMimeType(input: string | null | undefined, sourceKind: SourceKind): string {
  const raw = (input ?? "").trim().toLowerCase();
  if (raw) return raw;
  return sourceKind === "image" ? "image/jpeg" : "application/pdf";
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
    .select("id,property_id,job_type,payload,attempts,status")
    .eq("status", "queued")
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

async function fetchSourceBytes(source: SourceItem, timeoutMs: number): Promise<{ bytes: Uint8Array; mimeType: string }> {
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
    const contentType = response.headers.get("content-type") ?? source.mimeType ?? undefined;
    const arrayBuffer = await response.arrayBuffer();
    return {
      bytes: new Uint8Array(arrayBuffer),
      mimeType: normalizeMimeType(contentType, source.kind),
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
): Promise<{
  status: "ready" | "error";
  summaryShort?: string;
  summaryLong?: string;
  structuredFacts?: Record<string, unknown>;
  safetyFlags?: Record<string, unknown>;
  evidence?: unknown[];
  confidence?: number;
  latencyMs: number;
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
  const { bytes, mimeType } = await fetchSourceBytes(source, config.fetchTimeoutMs);
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
    latencyMs,
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
    cost_estimate_usd: null,
    latency_ms: analysis.latencyMs,
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
        mime_type: source.mimeType ?? null,
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
    try {
      const analysis = await analyzeSourceWithGemini(source, config);
      await upsertAnalysis(supabase, source, config, analysis);
      analyzed += 1;
    } catch (error) {
      const message = getErrorMessage(error);
      await upsertAnalysis(supabase, source, config, {
        status: "error",
        summaryShort: message,
        summaryLong: message,
        structuredFacts: {},
        safetyFlags: { workerError: true },
        evidence: source.kind === "document" ? [{ sourceUrl: source.sourceUrl }] : [{ sourceUrl: source.sourceUrl }],
        latencyMs: 0,
      });
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
