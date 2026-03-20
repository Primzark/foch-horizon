#!/usr/bin/env node

import { resolveOptionalSupabaseServiceRoleConfig } from './supabase-env.mjs';

const DEFAULT_SUITE = process.env.CHATBOT_EVAL_SUITE || 'core';
const DEFAULT_ENV = process.env.CHATBOT_EVAL_ENV || 'manual';

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const options = {
    suite: DEFAULT_SUITE,
    dryRun: false,
    limit: undefined,
    only: undefined,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--suite=')) options.suite = arg.slice('--suite='.length).trim() || DEFAULT_SUITE;
    else if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) options.limit = parsed;
    } else if (arg.startsWith('--only=')) {
      options.only = arg.slice('--only='.length).trim() || undefined;
    }
  }

  return options;
}

function getEdgeBaseUrl() {
  const fromEnv = (process.env.EDGE_API_BASE_URL || process.env.RAG_INDEX_BASE_URL || '').trim();
  if (!fromEnv) {
    throw new Error('Missing EDGE_API_BASE_URL (or RAG_INDEX_BASE_URL)');
  }
  return fromEnv.replace(/\/$/, '');
}

function getSupabaseConfig() {
  const { supabaseUrl, serviceRoleKey, enabled } = resolveOptionalSupabaseServiceRoleConfig();
  return { url: supabaseUrl, key: serviceRoleKey, enabled };
}

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const anonKey = (process.env.EDGE_ANON_KEY || '').trim();
  if (anonKey) {
    headers.apikey = anonKey;
    headers.Authorization = `Bearer ${anonKey}`;
  }
  return headers;
}

const evalCases = [
  {
    suite: 'core',
    name: 'rag_honoraires',
    tags: ['rag', 'legal'],
    request: { question: 'Où trouver les honoraires ?' },
    expect: (reply) => Boolean(reply.ragUsed) && Array.isArray(reply.citations) && reply.citations.some((c) => c?.path === '/honoraires'),
  },
  {
    suite: 'core',
    name: 'planner_property_search',
    tags: ['planner', 'tools', 'property'],
    request: { question: 'Je cherche un T3 à vendre au Havre avec budget 260000 €' },
    expect: (reply) => reply.agentMode === 'tool' && Array.isArray(reply.actions) && reply.actions.some((a) => a?.kind === 'search_results'),
  },
  {
    suite: 'core',
    name: 'planner_clarify_invest',
    tags: ['planner', 'clarify'],
    request: { question: 'Je cherche un bien pour investir' },
    expect: (reply) => reply.agentMode === 'tool' && reply.planner && (reply.planner.decisionType === 'clarify' || reply.planner.decisionType === 'plan'),
  },
];

async function callChatbot(edgeBaseUrl, body) {
  const chatbotEndpoint = edgeBaseUrl.includes('/functions/v1')
    ? `${edgeBaseUrl}/chatbot-assistant`
    : `${edgeBaseUrl}/api/chatbot-assistant`;
  const started = Date.now();
  const response = await fetch(chatbotEndpoint, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { parseError: true, raw: text.slice(0, 500) };
  }
  return {
    ok: response.ok,
    status: response.status,
    latencyMs: Date.now() - started,
    body: json,
  };
}

async function restInsert(url, serviceRoleKey, table, rows, preferRepresentation = false) {
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: preferRepresentation ? 'return=representation' : 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    throw new Error(`Supabase REST insert failed (${table} ${response.status})`);
  }
  if (!preferRepresentation) return null;
  return response.json();
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const edgeBaseUrl = getEdgeBaseUrl();
  const supabase = getSupabaseConfig();

  let cases = evalCases.filter((item) => item.suite === options.suite);
  if (options.only) {
    cases = cases.filter((item) => item.name.includes(options.only));
  }
  if (options.limit) {
    cases = cases.slice(0, options.limit);
  }
  if (cases.length === 0) {
    throw new Error(`No eval cases selected for suite="${options.suite}"`);
  }

  const runStartedAt = nowIso();
  let runRow = null;

  if (supabase.enabled && !options.dryRun) {
    const inserted = await restInsert(supabase.url, supabase.key, 'chatbot_eval_runs', [{
      suite: options.suite,
      git_sha: (process.env.GIT_SHA || '').trim() || null,
      env: DEFAULT_ENV,
      status: 'running',
      started_at: runStartedAt,
      summary: {},
    }], true);
    runRow = Array.isArray(inserted) ? inserted[0] : null;
  }

  const results = [];
  for (const testCase of cases) {
    const response = await callChatbot(edgeBaseUrl, testCase.request);
    const pass = response.ok && testCase.expect(response.body);
    results.push({
      name: testCase.name,
      suite: testCase.suite,
      tags: testCase.tags,
      pass,
      latencyMs: response.latencyMs,
      status: response.status,
      body: response.body,
      failureReason: pass ? null : response.ok ? 'expectation_failed' : `http_${response.status}`,
    });
  }

  const passCount = results.filter((result) => result.pass).length;
  const failCount = results.length - passCount;
  const summary = {
    suite: options.suite,
    env: DEFAULT_ENV,
    startedAt: runStartedAt,
    finishedAt: nowIso(),
    caseCount: results.length,
    passCount,
    failCount,
    passRate: results.length > 0 ? passCount / results.length : 0,
    avgLatencyMs: results.length > 0 ? Math.round(results.reduce((sum, item) => sum + item.latencyMs, 0) / results.length) : 0,
    dryRun: options.dryRun,
  };

  if (supabase.enabled && !options.dryRun && runRow?.id) {
    const caseRows = await fetch(`${supabase.url.replace(/\/$/, '')}/rest/v1/chatbot_eval_cases?suite=eq.${encodeURIComponent(options.suite)}&select=id,name,suite`, {
      headers: {
        apikey: supabase.key,
        Authorization: `Bearer ${supabase.key}`,
      },
    }).then((res) => (res.ok ? res.json() : []));
    const caseIdByName = new Map((Array.isArray(caseRows) ? caseRows : []).map((row) => [row.name, row.id]));

    const missingCases = results.filter((result) => !caseIdByName.has(result.name)).map((result) => ({
      suite: options.suite,
      name: result.name,
      input: evalCases.find((c) => c.name === result.name)?.request ?? {},
      expected: { tags: result.tags },
      tags: result.tags,
      active: true,
    }));

    if (missingCases.length > 0) {
      await restInsert(supabase.url, supabase.key, 'chatbot_eval_cases', missingCases, false);
      const refreshed = await fetch(`${supabase.url.replace(/\/$/, '')}/rest/v1/chatbot_eval_cases?suite=eq.${encodeURIComponent(options.suite)}&select=id,name`, {
        headers: { apikey: supabase.key, Authorization: `Bearer ${supabase.key}` },
      }).then((res) => (res.ok ? res.json() : []));
      for (const row of Array.isArray(refreshed) ? refreshed : []) caseIdByName.set(row.name, row.id);
    }

    const resultRows = results
      .map((result) => {
        const caseId = caseIdByName.get(result.name);
        if (!caseId) return null;
        return {
          run_id: runRow.id,
          case_id: caseId,
          pass: result.pass,
          scores: { status: result.status },
          actual: {
            agentMode: result.body?.agentMode,
            routeCategory: result.body?.routeCategory,
            ragUsed: result.body?.ragUsed,
            retrievalMode: result.body?.retrievalMode,
            planner: result.body?.planner,
            citations: Array.isArray(result.body?.citations) ? result.body.citations.slice(0, 5) : undefined,
            actions: Array.isArray(result.body?.actions) ? result.body.actions.map((a) => a.kind).slice(0, 8) : undefined,
          },
          failure_reason: result.failureReason,
          latency_ms: result.latencyMs,
          cost_estimate_usd: null,
        };
      })
      .filter(Boolean);

    if (resultRows.length > 0) {
      await restInsert(supabase.url, supabase.key, 'chatbot_eval_results', resultRows, false);
    }

    await fetch(`${supabase.url.replace(/\/$/, '')}/rest/v1/chatbot_eval_runs?id=eq.${runRow.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabase.key,
        Authorization: `Bearer ${supabase.key}`,
      },
      body: JSON.stringify({
        status: failCount > 0 ? 'failed' : 'passed',
        finished_at: summary.finishedAt,
        summary,
      }),
    });
  }

  console.log('chatbot_eval_summary', JSON.stringify(summary));
  for (const result of results) {
    console.log('chatbot_eval_case', JSON.stringify({
      name: result.name,
      pass: result.pass,
      latencyMs: result.latencyMs,
      failureReason: result.failureReason,
    }));
  }

  const alertsWebhook = (process.env.CHATBOT_ALERTS_WEBHOOK_URL || '').trim();
  if (alertsWebhook && failCount > 0 && !options.dryRun) {
    await fetch(alertsWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'chatbot_eval_regression',
        summary,
        failures: results.filter((r) => !r.pass).map((r) => ({ name: r.name, failureReason: r.failureReason })),
      }),
    }).catch(() => undefined);
  }

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('chatbot_eval_runner_failed', error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack) console.error(error.stack);
  process.exit(1);
});
