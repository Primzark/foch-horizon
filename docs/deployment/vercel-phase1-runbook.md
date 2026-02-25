# Phase 1 Vercel Deployment Runbook (Vite + Supabase Edge)

Date: 2026-02-25
Scope: Phase 1 launch stabilization / Vercel preview and production-ready setup (no domain yet)

## Goal

Deploy the Vite app to Vercel and route Phase 1 `/api/*` endpoints to Supabase Edge Functions via `vercel.json` rewrites.

## What this covers

- Vercel static deployment for Vite `dist/`
- Same-origin `/api/*` rewrites to Supabase Edge Functions
- Required Vercel env vars for edge mode
- Preview validation without a custom domain
- Rollback/disable guidance
- Supabase edge function deploy sequence before validation

## What this does not cover

- Final custom domain/DNS cutover (domain not chosen yet)
- CMP/cookie consent implementation
- Advanced chatbot feature expansion beyond Phase 1-safe defaults

## 1. Prerequisites

- Vercel account/project access
- Repo connected to Vercel (Git integration or `vercel` CLI)
- Supabase project access (`rcrulfdobtmfxzpuyryn`)
- Supabase CLI available locally to deploy updated edge functions

## 2. Files used for deployment

- `vercel.json` (rewrites + SPA fallback)
- `dist/` output from `npm run build`

## 3. Vercel build settings (Vite)

Use these settings in Vercel project config:

- Framework preset: `Vite` (or `Other` with the same commands)
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci` (or default npm install if preferred)

## 4. Required Vercel environment variables

Set for Preview and Production unless noted.

### Core edge mode

- `VITE_API_MODE=edge`
- `VITE_API_BASE_URL=` (empty; use same-origin `/api/*` rewrites)
- `VITE_SUPABASE_PROJECT_URL=https://rcrulfdobtmfxzpuyryn.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<public anon key>`

### SEO / domain (important)

- `VITE_PUBLIC_SITE_URL`
  - Preview: leave unset while no domain exists
  - Production: set before go-live to enable canonical/OG absolute URLs

### Phase 1-safe chatbot defaults (recommended)

- `VITE_CHATBOT_STREAMING_ENABLED=false`
- `VITE_CHATBOT_ENABLE_EDGE_AGENT_TOOLS=false`
- `VITE_CHATBOT_ENABLE_EDGE_RAG` only if validated on preview

## 5. Supabase edge function deploy sequence (before Vercel preview validation)

Local repo contains edge function fixes that are not live until deployed.

Minimum deploy set for this stabilization pass:

- `leads-create`
- `properties-search`

Recommended if drift is suspected:

- `cities-list`
- `city-detail`
- `property-detail`
- `properties-stats`

Example:

```bash
supabase login
supabase link --project-ref rcrulfdobtmfxzpuyryn
supabase functions deploy leads-create
supabase functions deploy properties-search
supabase functions deploy cities-list
supabase functions deploy city-detail
supabase functions deploy property-detail
supabase functions deploy properties-stats
```

Note: until `leads-create` is deployed, the city-slug lead write test will fail remotely even though the repo code is fixed.

## 6. Local validation before Vercel deploy

```bash
npm run lint
npm test
npm run build
```

Expected baseline (current repo):

- `lint`: pass with warnings only
- `test`: pass
- `build`: pass (large chunk warning may remain)

## 7. Vercel preview deployment

### Option A: Git integration

1. Push branch to remote
2. Let Vercel create a preview deployment
3. Confirm preview env vars are set

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel --prod=false
```

## 8. Preview validation checklist (no domain yet)

### Route serving (SPA)

- `/` loads
- `/biens` loads (client route)
- `/contact` loads
- `/property/test-slug` serves SPA shell (client redirect logic tested in browser)

### `/api/*` rewrites (must return JSON, not HTML)

- `GET /api/cities`
- `GET /api/properties?page=1&pageSize=1`
- `GET /api/properties/stats`
- `POST /api/leads` invalid payload returns validation `400` (not `401 Missing authorization header`)

### Chatbot / telemetry

- `POST /api/chatbot-assistant` works in edge mode if enabled
- Streaming remains disabled by default (`VITE_CHATBOT_STREAMING_ENABLED=false`) unless explicitly testing Vercel SSE behavior
- Chatbot feedback telemetry does not break UX on page hide/unload

## 9. Direct Supabase edge contract tests (recommended)

These validate Supabase endpoints independently from Vercel rewrites:

```bash
EDGE_CITIES_URL="$VITE_SUPABASE_PROJECT_URL/functions/v1/cities-list" \
EDGE_PROPERTIES_URL="$VITE_SUPABASE_PROJECT_URL/functions/v1/properties-search" \
EDGE_PROPERTY_DETAIL_BASE_URL="$VITE_SUPABASE_PROJECT_URL/functions/v1/property-detail" \
EDGE_LEADS_URL="$VITE_SUPABASE_PROJECT_URL/functions/v1/leads-create" \
EDGE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
npm run test:edge

EDGE_CITIES_URL="$VITE_SUPABASE_PROJECT_URL/functions/v1/cities-list" \
EDGE_PROPERTIES_URL="$VITE_SUPABASE_PROJECT_URL/functions/v1/properties-search" \
EDGE_PROPERTY_DETAIL_BASE_URL="$VITE_SUPABASE_PROJECT_URL/functions/v1/property-detail" \
EDGE_LEADS_URL="$VITE_SUPABASE_PROJECT_URL/functions/v1/leads-create" \
EDGE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
npm run test:edge:write
```

## 10. Production setup later (when domain exists)

Before production launch:

1. Add custom domain in Vercel
2. Set `VITE_PUBLIC_SITE_URL=https://<final-domain>`
3. Rebuild/redeploy production
4. Re-check canonical tags and `og:url`
5. Finalize legal "hébergeur" wording with definitive hosting provider details

## 11. Rollback / disable procedures

- Revert Vercel deployment to previous successful build via Vercel dashboard
- Disable promotion to production if preview checks fail
- If Supabase function deploy caused regression, redeploy prior function version or hotfix and re-run edge tests

## 12. Known risks and fallback

### If Vercel rewrites do not forward `Authorization` reliably

Trigger: `/api/leads` still returns `401` through Vercel preview even after browser anon headers are sent.

Fallback:

- Add minimal Vercel serverless proxy endpoints for protected POST routes (`/api/leads`, chatbot POST/stream/feedback/memory reset`) and inject anon headers server-side.

### If SSE is unstable on Vercel preview

Fallback:

- Keep `VITE_CHATBOT_STREAMING_ENABLED=false` for Phase 1 and use non-streaming chatbot endpoint.
