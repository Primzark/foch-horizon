import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const eventTypeSchema = z.enum([
  "reply_received",
  "feedback_submitted",
  "citation_clicked",
  "request_failed",
  "chatbot_opened",
  "chatbot_reset",
  "chatbot_message_sent",
  "tool_action_rendered",
  "tool_action_clicked",
  "tool_orchestration_result",
  "tool_compare_requested",
  "tool_handoff_prefill_opened",
]);

const eventSchema = z.object({
  eventType: eventTypeSchema,
  sessionId: z.string().min(1).max(120),
  conversationId: z.string().min(1).max(120),
  messageId: z.string().min(1).max(120).optional(),
  requestId: z.string().min(1).max(120).optional(),
  pagePath: z.string().min(1).max(500).optional(),
  source: z.enum(["local", "edge", "fallback"]).optional(),
  edgeProvider: z.enum(["gemini", "openai", "fallback"]).optional(),
  routeDecision: z.string().min(1).max(120).optional(),
  routeCategory: z.enum(["deterministic_local", "edge_rag", "edge_general", "edge_tools", "fallback"]).optional(),
  intent: z.string().min(1).max(80).optional(),
  ragUsed: z.boolean().optional(),
  retrievalMode: z.enum(["none", "vector", "keyword", "hybrid"]).optional(),
  citationsCount: z.number().int().min(0).max(50).optional(),
  citationPath: z.string().min(1).max(500).optional(),
  responseLatencyMs: z.number().int().min(0).max(120000).optional(),
  requestChars: z.number().int().min(0).max(10000).optional(),
  answerChars: z.number().int().min(0).max(20000).optional(),
  feedbackValue: z.union([z.literal(1), z.literal(-1)]).optional(),
  feedbackReason: z.string().min(1).max(160).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const payloadSchema = z.object({
  events: z.array(eventSchema).min(1).max(20),
});

function normalizeRow(input: z.infer<typeof eventSchema>) {
  return {
    event_type: input.eventType,
    session_id: input.sessionId,
    conversation_id: input.conversationId,
    message_id: input.messageId ?? null,
    request_id: input.requestId ?? null,
    page_path: input.pagePath ?? null,
    source: input.source ?? null,
    edge_provider: input.edgeProvider ?? null,
    route_decision: input.routeDecision ?? null,
    route_category: input.routeCategory ?? null,
    intent: input.intent ?? null,
    rag_used: input.ragUsed ?? null,
    retrieval_mode: input.retrievalMode ?? null,
    citations_count: input.citationsCount ?? 0,
    citation_path: input.citationPath ?? null,
    response_latency_ms: input.responseLatencyMs ?? null,
    request_chars: input.requestChars ?? null,
    answer_chars: input.answerChars ?? null,
    feedback_value: input.feedbackValue ?? null,
    feedback_reason: input.feedbackReason ?? null,
    metadata: input.metadata ?? {},
  };
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
    const supabase = createServiceClient();

    const rows = payload.events.map(normalizeRow);
    const { error } = await supabase.from("chatbot_quality_events").insert(rows);
    if (error) throw error;

    return jsonResponse({ ok: true, inserted: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 400);
  }
});
