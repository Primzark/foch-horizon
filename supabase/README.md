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
- Bind each function to your routing layer in Lovable/Supabase edge deploy config.
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

### Frontend chatbot routing flags

- `VITE_CHATBOT_ENABLE_EDGE_RAG=true` to route site-content questions to the edge chatbot
- `VITE_CHATBOT_ROUTER_V2=true` to enable deterministic-first Router V2 (local for listing/process flows, edge for site content/unknown)
- `VITE_CHATBOT_ENABLE_EDGE_AGENT_TOOLS=true` to route property search/compare/handoff flows to the edge tool assistant (Phase 1 tools)

### Chatbot tool-assistant runtime flags (edge function)

- `CHATBOT_AGENT_TOOLS_ENABLED=false` (default off; enable to activate live search/compare/handoff action cards)
- `CHATBOT_AGENT_TOOLS_MAX_RESULTS=5` (search results returned per tool response)
- `CHATBOT_AGENT_TOOLS_COMPARE_LIMIT=3` (max properties in compare flow)

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
