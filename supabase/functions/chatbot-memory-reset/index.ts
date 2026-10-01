import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import { consumeRequestLimit, isAllowedSiteOrigin, secureJsonResponse, secureOptionsResponse } from "../_shared/request-security.ts";

const payloadSchema = z.object({
  sessionId: z.string().min(1).max(120),
}).strict();

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

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 2_048) {
    return secureJsonResponse(request, { ok: false, error: "Invalid request." }, 413);
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return secureJsonResponse(request, { ok: false, error: "Invalid request." }, 400);
  }
  if (new TextEncoder().encode(rawText).byteLength > 2_048) {
    return secureJsonResponse(request, { ok: false, error: "Invalid request." }, 413);
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawText);
  } catch {
    return secureJsonResponse(request, { ok: false, error: "Invalid request." }, 400);
  }
  const parsedPayload = payloadSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    return secureJsonResponse(request, { ok: false, error: "Invalid request." }, 400);
  }

  try {
    const payload = parsedPayload.data;
    const supabase = createServiceClient();
    const withinLimit = await consumeRequestLimit(supabase, request, "chatbot-memory-reset", 10, 600);
    if (!withinLimit) {
      return secureJsonResponse(request, { ok: false, error: "Too many requests. Please try again later." }, 429);
    }
    const sessionId = payload.sessionId.trim();

    const { error: eventsError } = await supabase.from("chatbot_memory_events").delete().eq("session_id", sessionId);
    if (eventsError) throw eventsError;

    const { error: sessionError } = await supabase.from("chatbot_memory_sessions").delete().eq("session_id", sessionId);
    if (sessionError) throw sessionError;

    return secureJsonResponse(request, { ok: true, cleared: true });
  } catch (error) {
    console.error("Chatbot memory reset failed.", error instanceof Error ? error.message : "Unknown error");
    return secureJsonResponse(request, { ok: false, error: "Conversation memory could not be cleared." }, 500);
  }
});
