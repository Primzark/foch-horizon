import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { validatePropertyFeed } from "../_shared/property-feed.ts";

function constantTimeEquals(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

async function stableAgentId(localId: string): Promise<string> {
  const input = new TextEncoder().encode(`foch-import:agent:${localId}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", input));
  const hex = Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("").split("");
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16] ?? "0", 16) & 0x3) | 0x8).toString(16);
  const compact = hex.join("");
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const expectedToken = Deno.env.get("PROPERTY_FEED_IMPORT_TOKEN") ?? "";
  const providedToken = request.headers.get("x-property-import-token") ?? "";
  if (!expectedToken) return jsonResponse({ error: "Property feed import is not configured." }, 503);
  if (!constantTimeEquals(providedToken, expectedToken)) return jsonResponse({ error: "Unauthorized." }, 401);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_000_000) return jsonResponse({ error: "The feed exceeds the 8 MB limit." }, 413);

  let feed;
  try {
    feed = validatePropertyFeed(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid property feed.";
    return jsonResponse({ error: message }, 400);
  }

  const summary = {
    properties: feed.properties.length,
    cities: feed.cities.length,
    agents: feed.agents.length,
    propertyReferences: feed.properties.map((property) => property.id),
  };

  if (request.headers.get("x-property-feed-dry-run") === "true") {
    return jsonResponse({ ok: true, dryRun: true, validated: summary });
  }

  try {
    const databaseFeed = {
      ...feed,
      agents: await Promise.all(feed.agents.map(async (agent) => ({
        ...agent,
        sync_id: await stableAgentId(agent.id),
      }))),
    };
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("EDGE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Local Supabase credentials are not available.");

    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/import_property_feed`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_feed: databaseFeed }),
    });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`Supabase import RPC failed (${response.status}): ${details.slice(0, 500)}`);
    }
    const data = await response.json();

    return jsonResponse({ ok: true, dryRun: false, imported: data, validated: summary });
  } catch (error) {
    console.error("Property feed import failed:", error);
    return jsonResponse({ error: "Property feed could not be imported." }, 500);
  }
});
