# Supabase Backend Artifacts

This folder contains Phase 1 backend scaffolding:

- `migrations/20260216_phase1_schema.sql`: PostgreSQL schema + RLS policies.
- `functions/properties-search`: `GET /api/properties` contract.
- `functions/property-detail`: `GET /api/properties/:id` contract.
- `functions/cities-list`: `GET /api/cities` contract.
- `functions/city-detail`: `GET /api/cities/:slug` contract.
- `functions/city-properties`: `GET /api/cities/:slug/properties` contract.
- `functions/leads-create`: `POST /api/leads` contract.
- `workers/provider-sync.ts`: scheduled feed sync worker (remote/local JSON feed -> cities/properties/images/features upsert + reconciliation).

## Security notes
- Endpoint validation is server-side.
- Lead insert requires consent.
- RLS policies include service-role management and public read limitations.

## Deployment notes
- Bind each function to your routing layer in Lovable/Supabase edge deploy config.
- Configure secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

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
