# Supabase Backend Artifacts

This folder contains Phase 1 backend scaffolding:

- `migrations/20260216_phase1_schema.sql`: PostgreSQL schema + RLS policies.
- `migrations/20260223_chatbot_rag.sql`: `pgvector`-backed content chunks + `match_chatbot_content_chunks(...)` RPC for chatbot RAG.
- `migrations/20260225_chatbot_rag_hybrid_retrieval.sql`: keyword/FTS RPC `match_chatbot_content_chunks_keyword(...)` for hybrid retrieval + reranking.
- `migrations/20260224_chatbot_quality_events.sql`: chatbot telemetry/feedback events table + dashboard views.
- `functions/properties-search`: `GET /api/properties` contract.
- `functions/property-detail`: `GET /api/properties/:id` contract.
- `functions/cities-list`: `GET /api/cities` contract.
- `functions/city-detail`: `GET /api/cities/:slug` contract.
- `functions/city-properties`: `GET /api/cities/:slug/properties` contract.
- `functions/leads-create`: `POST /api/leads` contract.
- `functions/chatbot-feedback`: `POST /api/chatbot-feedback` telemetry/feedback batch ingest for chatbot QA dashboards.
- `workers/provider-sync.ts`: scheduled feed sync worker (remote/local JSON feed -> cities/properties/images/features upsert + reconciliation).

## Security notes
- Endpoint validation is server-side.
- Lead insert requires consent.
- RLS policies include service-role management and public read limitations.

## Deployment notes
- Bind each function to your hosting routing layer (for example Vercel rewrites) or call Supabase Edge Functions directly.
- Configure secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Chatbot RAG edge function expects either `GEMINI_API_KEY` or `OPENAI_API_KEY` (Gemini is now the preferred provider).
- Chatbot telemetry ingest (`chatbot-feedback`) requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

## Chatbot RAG indexing (website content)

This repo includes a sitemap-based indexer that fetches pages, extracts visible text, chunks it, embeds chunks, and writes them to `chatbot_content_chunks`.

### Run a dry run (no upload)

```bash
cd /Applications/MAMP/htdocs/Foch-1/foch-horizon
npm run chatbot:index:site -- --dry-run --limit 5
```

### Run full index + upload to Supabase

```bash
cd /Applications/MAMP/htdocs/Foch-1/foch-horizon
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
GEMINI_API_KEY=<server-gemini-key> \
RAG_EMBEDDING_PROVIDER=gemini \
npm run chatbot:index:site
```

### Optional indexer env vars

- `RAG_INDEX_BASE_URL` to override sitemap host (ex: staging/prod)
- `RAG_INDEX_SITEMAP` to use another sitemap path/URL
- `RAG_INDEX_PATH_PREFIX` to index only one site section
- `RAG_INDEX_RENDER_MODE` (`http` or `headless`) for SPA pages (`headless` requires Playwright)
- `RAG_INDEX_RENDER_WAIT_MS` extra wait after navigation in headless mode
- `RAG_EMBEDDING_PROVIDER` (`gemini` or `openai`) for embeddings
- `GEMINI_EMBEDDING_MODEL` (default `gemini-embedding-001`)
- `OPENAI_EMBEDDING_MODEL` (default `text-embedding-3-small`)

### Chatbot RAG runtime tuning (edge function)

- `CHATBOT_RAG_HYBRID_ENABLED=true` (enable vector + keyword hybrid retrieval)
- `CHATBOT_RAG_VECTOR_MATCH_COUNT=10` (vector candidate pool before rerank)
- `CHATBOT_RAG_KEYWORD_MATCH_COUNT=12` (keyword candidate pool before rerank)
- `CHATBOT_RAG_RERANK_TOP_N=8` (final reranked candidate pool)
- `CHATBOT_RAG_CONTEXT_TOP_N=5` (top chunks used in prompt context)
- `CHATBOT_RAG_HYBRID_VECTOR_WEIGHT=0.55`
- `CHATBOT_RAG_HYBRID_KEYWORD_WEIGHT=0.30`
- `CHATBOT_RAG_MATCH_THRESHOLD=0.70`
- `CHATBOT_RAG_MAX_CONTEXT_CHARS=5200`

### Gemini web search grounding (edge fallback / RAG assist)

- `CHATBOT_WEB_SEARCH_ENABLED=false` (default off; Gemini-only Google Search grounding for external/current questions in non-tool edge flows)
- `CHATBOT_WEB_SEARCH_MAX_CITATIONS=4` (max grounded web citations extracted from Gemini metadata)
- `CHATBOT_WEB_SEARCH_MIN_QUESTION_CHARS=8` (skip grounding for very short prompts)

Notes:

- This is Gemini-only (`tools: [{ google_search: {} }]`) and is ignored when OpenAI is the active generation provider.
- It is only used on the non-tool fallback/RAG generation path (not planner tool execution).
- Keep disabled first in production, enable in staging, then monitor latency/cost before rollout.

### Frontend chatbot routing flags

- `VITE_CHATBOT_ENABLE_EDGE_RAG=true` to route site-content questions to the edge chatbot
- `VITE_CHATBOT_ROUTER_V2=true` to enable deterministic-first Router V2 (local for listing/process flows, edge for site content/unknown)
- `VITE_CHATBOT_ENABLE_EDGE_AGENT_TOOLS=true` to route property search/compare/handoff flows to the edge tool assistant (Phase 1 tools)

### Chatbot tool-assistant runtime flags (edge function)

- `CHATBOT_AGENT_TOOLS_ENABLED=false` (default off; enable to activate live search/compare/handoff action cards)
- `CHATBOT_AGENT_TOOLS_MAX_RESULTS=5` (search results returned per tool response)
- `CHATBOT_AGENT_TOOLS_COMPARE_LIMIT=3` (max properties in compare flow)

### Gemini planner runtime flags (edge function, property tools only)

- `CHATBOT_GEMINI_PLANNER_ENABLED=false` (default off; Gemini proposes one tool call or one clarifier for property turns)
- `CHATBOT_GEMINI_PLANNER_MODEL=gemini-2.5-flash-lite`
- `CHATBOT_GEMINI_PLANNER_TIMEOUT_MS=1800`
- `CHATBOT_GEMINI_PLANNER_INCLUDE_HISTORY_TURNS=4`
- `CHATBOT_GEMINI_PLANNER_MAX_QUESTION_CHARS=700`
- `CHATBOT_GEMINI_PLANNER_TEMPERATURE=0`

Notes:

- Planner is Gemini-only and only affects property tool turns (search / compare / handoff).
- The server still validates planner JSON and executes tools deterministically.
- Invalid planner JSON, timeout, or missing Gemini key automatically falls back to the deterministic tool path.
- Planner metadata is returned in edge responses and forwarded to telemetry metadata, but not shown in the chat UI.

### Gemini Max (phased foundations)

This repo now includes the Phase 1/2 foundation scaffolding for a larger Gemini-powered chatbot upgrade:

- `functions/chatbot-assistant-stream`: SSE wrapper endpoint for streaming-compatible chat UX
- Planner v2 scaffolding (multi-step validated plans, feature-flagged)
- Persistent memory table scaffolding (structured preferences only)
- Multimodal cache table scaffolding (property images/documents analysis)
- Eval/ops tables + dashboard views scaffolding
- Worker/script stubs for multimodal analysis and eval execution

Recommended rollout order:

1. Apply the new migrations.
2. Deploy `chatbot-assistant` and `chatbot-assistant-stream`.
3. Keep all new flags disabled first (`CHATBOT_GEMINI_PLANNER_V2_ENABLED=false`, `CHATBOT_MEMORY_ENABLED=false`, `CHATBOT_MULTIMODAL_ENABLED=false`, `CHATBOT_STREAM_ENABLED=false`).
4. Enable streaming in staging, then planner v2, then memory, then multimodal cache reads.

### New runtime flags (Gemini Max foundations)

- `CHATBOT_GEMINI_PLANNER_V2_ENABLED=false`
- `CHATBOT_GEMINI_PLANNER_MAX_STEPS=3`
- `CHATBOT_MEMORY_ENABLED=false`
- `CHATBOT_MEMORY_MODEL=gemini-2.5-flash-lite`
- `CHATBOT_MULTIMODAL_ENABLED=false`
- `CHATBOT_MULTIMODAL_MODEL=gemini-2.5-flash`
- `CHATBOT_MULTIMODAL_ON_DEMAND_ENABLED=true`
- `CHATBOT_MULTIMODAL_ON_DEMAND_TIMEOUT_MS=2500`
- `CHATBOT_MULTIMODAL_MAX_IMAGES_PER_PROPERTY=6`
- `CHATBOT_MULTIMODAL_MAX_PDF_PAGES=20`
- `CHATBOT_MULTIMODAL_MAX_FILE_BYTES=8388608`
- `CHATBOT_MULTIMODAL_WORKER_MAX_ATTEMPTS=3`
- `CHATBOT_MULTIMODAL_STALE_HOURS=168`
- `CHATBOT_MULTIMODAL_FETCH_TIMEOUT_MS=5000`
- `CHATBOT_MULTIMODAL_ANALYSIS_VERSION=v2`
- `CHATBOT_PAGE_FALLBACK_ENABLED=true`
- `CHATBOT_PAGE_FETCH_BASE_URL=https://your-site.example`
- `CHATBOT_PAGE_FETCH_CACHE_TTL_SECONDS=86400`
- `CHATBOT_PAGE_FETCH_ERROR_TTL_SECONDS=900`
- `CHATBOT_PAGE_FETCH_TIMEOUT_MS=3000`
- `CHATBOT_PAGE_FETCH_MIN_TEXT_CHARS=500`
- `CHATBOT_PAGE_FETCH_WEAK_CONTEXT_CHARS=1200`
- `CHATBOT_PAGE_RENDERER_URL` (optional external Playwright renderer, `POST /render`)
- `CHATBOT_PAGE_RENDERER_TIMEOUT_MS=4000`
- `CHATBOT_MEMORY_EXTRACTOR_ENABLED=true`
- `CHATBOT_MEMORY_EXTRACTOR_TIMEOUT_MS=1500`
- `CHATBOT_MEMORY_EXTRACTOR_CONFIDENCE_THRESHOLD=0.65`
- `CHATBOT_MEMORY_RETENTION_DAYS=90`
- `CHATBOT_STREAM_ENABLED=false`
- `CHATBOT_STREAM_PROXY_TIMEOUT_MS=20000`
- `CHATBOT_EVALS_ENABLED=false`
- `CHATBOT_ALERTS_WEBHOOK_URL` (optional ops alerts webhook)

### New backend endpoints / scripts (major upgrade extensions)

- `functions/chatbot-memory-reset`: clears persistent structured chatbot memory for a session (`POST { sessionId }`)
- `scripts/chatbot/page-renderer-server.mjs`: optional Playwright renderer for on-demand page fallback when HTTP fetch is too thin (SPA shell)
- `scripts/chatbot/cleanup-memory.mjs`: deletes expired `chatbot_memory_sessions` (90-day TTL by default)
- `.github/workflows/chatbot-memory-cleanup.yml`: daily cleanup workflow (requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` repo secrets)

### On-demand page fallback behavior (RAG coverage boost)

- When hybrid RAG returns weak/missing context, `chatbot-assistant` can fetch the requested page route on demand (same-origin only).
- Fast path: direct HTTP HTML fetch + readable text extraction.
- Fallback path: optional external headless renderer (`CHATBOT_PAGE_RENDERER_URL`) when the HTTP page looks like a thin SPA shell.
- Cached snapshots are stored in `chatbot_page_snapshot_cache` with configurable TTLs for ready/error states.

### Persistent memory extractor behavior

- `CHATBOT_MEMORY_ENABLED=true` enables structured memory persistence (`chatbot_memory_sessions`).
- `CHATBOT_MEMORY_EXTRACTOR_ENABLED=true` runs a Gemini JSON extractor after replies and merges memory with confidence gating.
- If the extractor fails or returns invalid JSON, the backend falls back to state-merge persistence (no user-facing error).

### Frontend feature flags (Gemini Max foundations)

- `VITE_CHATBOT_STREAMING_ENABLED=true` enables SSE chat path with JSON fallback
- `VITE_CHATBOT_MULTIMODAL_CARDS_ENABLED=true` renders multimodal insight cards if returned
- `VITE_CHATBOT_PERSISTENT_MEMORY_ENABLED=true` reserves UI affordances for memory-aware flows (backend memory can still remain disabled)

### Automated re-index (GitHub Actions)

The workflow `\.github/workflows/chatbot-rag-reindex.yml` runs:

- on a daily schedule
- on pushes touching content/listing/indexer files
- on manual trigger (`workflow_dispatch`)

GitHub repository secrets required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` (preferred) or `OPENAI_API_KEY`
- `RAG_INDEX_BASE_URL` (optional but recommended, e.g. your production site URL)

## Provider Sync Worker (inventory feed)

The provider sync worker is designed to ingest a supplier feed into the Supabase tables:

- upserts `cities`
- upserts `properties`
- replaces `property_images` and `property_features` for synced properties
- marks missing properties as `off_market` on **full** sync only (incremental can opt-in)

### Run (dry-run, local JSON file)

Useful before you have final provider credentials:

```bash
PROVIDER_SYNC_INPUT_FILE=/absolute/path/to/provider-sample.json \
deno run -A supabase/workers/provider-sync.ts full --dry-run
```

### Run (remote provider feed)

```bash
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
PROVIDER_FEED_URL=https://provider.example.com/feed.json \
deno run -A supabase/workers/provider-sync.ts full
```

### Common optional env vars

- `PROVIDER_FEED_ITEMS_PATH` (example: `data.items`) to locate the array in nested JSON
- `PROVIDER_FEED_METHOD` (`GET` by default)
- `PROVIDER_FEED_BODY_JSON` (for POST feeds)
- `PROVIDER_FEED_HEADERS_JSON` (JSON object string of custom headers)
- `PROVIDER_FEED_AUTH_HEADER` + `PROVIDER_FEED_AUTH_TOKEN`
- `PROVIDER_FEED_BASIC_USER` + `PROVIDER_FEED_BASIC_PASSWORD`
- `PROVIDER_INCREMENTAL_QUERY_PARAM` (adds an ISO timestamp on incremental syncs)
- `PROVIDER_INCREMENTAL_LOOKBACK_HOURS` (default `24`)
- `PROVIDER_RECONCILE_MISSING_ON_INCREMENTAL=true` (usually leave disabled)
- `PROVIDER_SYNC_DRY_RUN=true`

### Notes

- The worker accepts already-normalized records, but also tries common `camelCase` / `snake_case` field aliases.
- Without real feed credentials or sample payload, the worker logic is production-capable but still needs provider-specific mapping validation.
