import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import { consumeRequestLimit, getSiteCorsHeaders, isAllowedSiteOrigin, secureJsonResponse, secureOptionsResponse } from "../_shared/request-security.ts";

const streamPayloadSchema = z.object({
  question: z.string().min(2).max(1200),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .max(24)
    .optional(),
  conversationState: z.record(z.string(), z.unknown()).optional(),
  actionRequest: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().min(1).max(120).optional(),
  capabilities: z
    .object({
      stream: z.boolean().optional(),
      multimodalCards: z.boolean().optional(),
    })
    .optional(),
});

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitTextIntoChunks(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  const targetSize = 70;
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    let next = Math.min(normalized.length, cursor + targetSize);
    if (next < normalized.length) {
      const lastSpace = normalized.lastIndexOf(" ", next);
      if (lastSpace > cursor + 20) {
        next = lastSpace;
      }
    }
    chunks.push(normalized.slice(cursor, next));
    cursor = next;
    while (normalized[cursor] === " ") cursor += 1;
  }
  return chunks;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return secureOptionsResponse(request);
  }

  if (request.method !== "POST") {
    return secureJsonResponse(request, { ok: false, error: "Method not allowed" }, 405);
  }

  if (!isAllowedSiteOrigin(request.headers.get("origin"))) {
    return secureJsonResponse(request, { ok: false, error: "Request unavailable." }, 403);
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (!contentType.includes("application/json") || (Number.isFinite(declaredLength) && declaredLength > 98_304)) {
    return secureJsonResponse(request, { ok: false, error: "Invalid request." }, 400);
  }

  try {
    const supabase = createServiceClient();
    const withinLimit = await consumeRequestLimit(supabase, request, "chatbot-requests", 30, 600);
    if (!withinLimit) {
      return secureJsonResponse(request, { ok: false, error: "Too many requests. Please try again later." }, 429);
    }
  } catch (error) {
    console.error("Chatbot rate-limit check failed.", error instanceof Error ? error.message : "Unknown error");
    return secureJsonResponse(request, { ok: false, error: "The assistant is temporarily unavailable." }, 503);
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return secureJsonResponse(request, { ok: false, error: "Invalid request." }, 400);
  }
  if (new TextEncoder().encode(rawText).byteLength > 98_304) {
    return secureJsonResponse(request, { ok: false, error: "Invalid request." }, 413);
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawText);
  } catch {
    return secureJsonResponse(request, { ok: false, error: "Invalid request." }, 400);
  }

  const parsedPayload = streamPayloadSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    return secureJsonResponse(request, { ok: false, error: "Invalid request." }, 400);
  }
  const payload: z.infer<typeof streamPayloadSchema> = parsedPayload.data;

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  const serviceRoleKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const proxyTimeoutMs = Number.parseInt(Deno.env.get("CHATBOT_STREAM_PROXY_TIMEOUT_MS") ?? "20000", 10);
  const streamEnabled = (Deno.env.get("CHATBOT_STREAM_ENABLED") ?? "").trim().toLowerCase();
  const streamFlag = ["1", "true", "yes", "on"].includes(streamEnabled);
  const requestId = `stream-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(sseEvent(event, data)));
      try {
        send("meta", { requestId, streamSupported: streamFlag, synthetic: true });
        send("status", { phase: "parsing" });

        if (!supabaseUrl || !serviceRoleKey) {
          send("error", { code: "stream_proxy_config_missing", message: "Missing Supabase edge proxy configuration." });
          send("done", { ok: false });
          controller.close();
          return;
        }

        const proxyApiKey = serviceRoleKey;
        const proxyAuth = `Bearer ${serviceRoleKey}`;
        const proxyController = new AbortController();
        const proxyTimeoutId = setTimeout(() => proxyController.abort(), Number.isFinite(proxyTimeoutMs) ? proxyTimeoutMs : 20000);
        send("status", { phase: "searching" });

        let response: Response;
        try {
          response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/chatbot-assistant`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(proxyApiKey ? { apikey: proxyApiKey } : {}),
            ...(proxyAuth ? { Authorization: proxyAuth } : {}),
          },
          body: JSON.stringify({
            ...payload,
            capabilities: {
              ...(payload.capabilities ?? {}),
              stream: true,
            },
          }),
          signal: proxyController.signal,
        });
        } catch (error) {
          clearTimeout(proxyTimeoutId);
          if (error instanceof DOMException && error.name === "AbortError") {
            send("error", {
              code: "stream_proxy_timeout",
              message: `Proxy call to chatbot-assistant timed out after ${proxyTimeoutMs}ms.`,
            });
            send("done", { ok: false });
            controller.close();
            return;
          }
          throw error;
        } finally {
          clearTimeout(proxyTimeoutId);
        }

        const responseText = await response.text();
        let data: Record<string, unknown> = {};
        try {
          data = JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          send("error", { code: "stream_proxy_invalid_json", message: "Invalid chatbot response." });
          send("done", { ok: false });
          controller.close();
          return;
        }

        if (!response.ok) {
          send("error", {
            code: "stream_proxy_http_error",
            status: response.status,
            message: typeof data.error === "string" ? data.error : `HTTP ${response.status}`,
          });
          send("done", { ok: false });
          controller.close();
          return;
        }

        const answer = typeof data.answer === "string" ? data.answer : "";
        const actions = Array.isArray(data.actions) ? data.actions : [];
        const hasAggregateAction = actions.some((action) =>
          Boolean(action && typeof action === "object" && (action as Record<string, unknown>).kind === "stats_summary")
        );
        if (hasAggregateAction) {
          send("status", { phase: "aggregating" });
        }
        send("meta", {
          requestId: typeof data.requestId === "string" ? data.requestId : requestId,
          agentMode: data.agentMode,
          route: data.routeCategory,
        });
        send("status", { phase: "building_response" });

        const chunks = splitTextIntoChunks(answer);
        for (const chunk of chunks) {
          send("text_delta", { delta: chunk });
          await sleep(22);
        }

        if (Array.isArray(data.citations)) {
          send("citation", { citations: data.citations });
        }
        if (actions.length > 0) {
          send("action", { actions });
        }
        if (Array.isArray(data.analysisCards)) {
          send("action", { analysisCards: data.analysisCards });
        }

        send("done", {
          ok: true,
          reply: data,
        });
      } catch {
        send("error", {
          code: "stream_exception",
          message: "The assistant is temporarily unavailable.",
        });
        send("done", { ok: false });
      } finally {
        controller.close();
      }
    },
    cancel() {
      // No-op for synthetic streaming proxy; downstream request completes independently.
    },
  });

  return new Response(stream, {
    headers: {
      ...getSiteCorsHeaders(request),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
