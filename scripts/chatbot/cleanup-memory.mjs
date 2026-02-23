#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    batchSize: (() => {
      const idx = argv.indexOf("--batch-size");
      if (idx === -1) return 500;
      const value = Number.parseInt(argv[idx + 1] ?? "", 10);
      return Number.isFinite(value) && value > 0 ? Math.min(value, 5000) : 500;
    })(),
  };
}

async function main() {
  const { dryRun, batchSize } = parseArgs(process.argv.slice(2));
  const supabaseUrl = (process.env.SUPABASE_URL ?? "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const nowIso = new Date().toISOString();

  let deleted = 0;
  let scanned = 0;
  while (true) {
    const { data, error } = await supabase
      .from("chatbot_memory_sessions")
      .select("session_id,expires_at")
      .not("expires_at", "is", null)
      .lt("expires_at", nowIso)
      .order("expires_at", { ascending: true })
      .limit(batchSize);
    if (error) throw error;
    const rows = (data ?? []).filter((row) => typeof row.session_id === "string");
    if (rows.length === 0) break;
    scanned += rows.length;
    if (dryRun) break;
    const ids = rows.map((row) => row.session_id);
    const { error: deleteError } = await supabase.from("chatbot_memory_sessions").delete().in("session_id", ids);
    if (deleteError) throw deleteError;
    deleted += ids.length;
    if (rows.length < batchSize) break;
  }

  console.log(
    JSON.stringify({
      ok: true,
      dryRun,
      scanned,
      deleted,
      at: nowIso,
    }),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});

