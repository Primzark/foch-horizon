import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const payloadSchema = z.object({
  sessionId: z.string().min(1).max(120),
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload = payloadSchema.parse(await request.json());
    const supabase = createServiceClient();
    const sessionId = payload.sessionId.trim();

    const { error: eventsError } = await supabase.from("chatbot_memory_events").delete().eq("session_id", sessionId);
    if (eventsError) throw eventsError;

    const { error: sessionError } = await supabase.from("chatbot_memory_sessions").delete().eq("session_id", sessionId);
    if (sessionError) throw sessionError;

    return jsonResponse({ ok: true, cleared: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 400);
  }
});

