import { z } from "https://esm.sh/zod@3.25.76";
import { corsHeaders } from "../_shared/cors.ts";

const streamPayloadSchema = z.object({
  question: z.string().min(2).max(1200),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
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
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  let payload: z.infer<typeof streamPayloadSchema>;
  try {
    payload = streamPayloadSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

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
        send("status", { phase: "dispatching" });

        if (!supabaseUrl || !serviceRoleKey) {
          send("error", { code: "stream_proxy_config_missing", message: "Missing Supabase edge proxy configuration." });
          send("done", { ok: false });
          controller.close();
          return;
        }

        const forwardedApiKey = request.headers.get("apikey")?.trim() || "";
        const forwardedAuth = request.headers.get("authorization")?.trim() || "";
        const proxyApiKey = forwardedApiKey || serviceRoleKey;
        const proxyAuth = forwardedAuth || (serviceRoleKey ? `Bearer ${serviceRoleKey}` : "");
        const proxyController = new AbortController();
        const proxyTimeoutId = setTimeout(() => proxyController.abort(), Number.isFinite(proxyTimeoutMs) ? proxyTimeoutMs : 20000);

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
        send("meta", {
          requestId: typeof data.requestId === "string" ? data.requestId : requestId,
          agentMode: data.agentMode,
          route: data.routeCategory,
        });
        send("status", { phase: "streaming_text" });

        const chunks = splitTextIntoChunks(answer);
        for (const chunk of chunks) {
          send("text_delta", { delta: chunk });
          await sleep(22);
        }

        if (Array.isArray(data.citations)) {
          send("citation", { citations: data.citations });
        }
        if (Array.isArray(data.actions)) {
          send("action", { actions: data.actions });
        }
        if (Array.isArray(data.analysisCards)) {
          send("action", { analysisCards: data.analysisCards });
        }

        send("done", {
          ok: true,
          reply: data,
        });
      } catch (error) {
        send("error", {
          code: "stream_exception",
          message: error instanceof Error ? error.message : "Streaming error",
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
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
