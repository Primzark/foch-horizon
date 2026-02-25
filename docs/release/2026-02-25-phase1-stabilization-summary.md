# Phase 1 Stabilization Summary (Repo-Green + Vercel-Ready)

Date: 2026-02-25
Commit baseline during original stabilization work: `b2ad3a5`

## Outcome

Phase 1 launch blockers in the repo were fixed and local quality gates are green. The deployment path is now prepared for **Vercel**.

## Fixed in the stabilization pass (kept)

### Test determinism and local QA

- Added `.env.test` to override `.env.local` edge-mode settings during Vitest runs
- Added global RTL `cleanup()` in `src/test/setup.ts`
- Stabilized `SiteChatbot.feedback` tests (dynamic import timing, query scoping, per-test timeout)

### Lint failures

- Fixed the 2 ESLint regex errors in `supabase/functions/chatbot-assistant/index.ts`

### Cities edge/frontend parity

- Added snake_case -> `City` domain mapping in `src/features/cities/api/cities.service.ts`
- Mapped `postal_codes`, `is_active`, `hero_image_url`
- Added hero image fallback from local city data

### Leads edge contract parity

- Updated `supabase/functions/leads-create/index.ts` to accept `cityId` as UUID or slug
- Added server-side slug -> UUID normalization before insert
- Returns clear `400` for unknown city slugs

### Listings search edge parity / legacy slug path

- Extended `supabase/functions/properties-search/index.ts` to support frontend filters (`q`, rooms/surfaces, features, sort, slug)
- Added city filtering helper and legacy exact slug lookup path
- Updated `resolveLegacySlugToProperty(...)` to work in edge mode via `/api/properties?slug=...`

### Edge integration test coverage improvements

- Updated `src/test/edge-endpoints.integration.test.ts` for direct Supabase function URLs
- Added `EDGE_PROPERTY_DETAIL_BASE_URL` override
- Increased edge cities timeout
- Added optional write-path test for city-slug leads

## Additional migration updates (this pass)

### Deployment target switched to Vercel

- Removed the previous deployment artifacts from active docs/config
- Added `vercel.json` rewrites for Phase 1 `/api/*` endpoints and SPA fallback
- Added Vercel deployment runbook (`docs/deployment/vercel-phase1-runbook.md`)

### Vercel-compatible edge auth from browser

- Added shared edge auth header handling in `src/lib/api/client.ts`
- Edge JSON and raw fetch calls can now attach Supabase anon headers in browser edge mode
- Chatbot SSE and chatbot telemetry POST paths updated to use shared auth headers
- Chatbot telemetry `sendBeacon` path is bypassed when auth headers are required (falls back to `fetch keepalive`)

### Hosting reference cleanup

- Removed platform-specific runtime badge cleanup code
- Removed old staging URLs/text from active docs and user-facing/legal/SEO metadata strings

### SEO behavior without domain

- Canonical and `og:url` are suppressed until `VITE_PUBLIC_SITE_URL` is configured
- Prevents preview URL indexing before a real domain is chosen

## Validation summary (local)

- `npm run lint`: passes (warnings only, 0 errors)
- `npm test`: passes (default suite)
- `npm run build`: passes

## Validation summary (edge/Supabase)

- Direct Supabase read-only edge contract tests: pass
- Direct Supabase write lead test (generic): pass
- Direct Supabase write lead test (city slug): pass (after redeploying `leads-create`)

## Validation summary (Vercel deployment)

- Vercel deployment created and aliased at `https://foch-horizon.vercel.app`
- `vercel` CLI deployments aliased to the project production alias from this machine, so Production env vars were mirrored from Preview and the site was redeployed
- SPA route shell checks: pass (`/`, `/biens`, `/contact`, `/property/test-slug`)
- `VITE_PUBLIC_SITE_URL` remains unset; canonical and `og:url` are intentionally absent in shell HTML
- `/api/*` rewrites require Supabase auth headers (anonymous headers); unauthenticated GET checks return `401`, authenticated GET checks return JSON `200`
- `POST /api/leads` invalid payload with anon headers returns `400` (not `401`)
- `POST /api/chatbot-assistant` invalid payload with anon headers returns `400` (auth path confirmed)
- Manual browser smoke remains pending

## Deferred / not included in this pass

- CMP/cookie consent implementation
- Deep bundle optimization/CWV campaign (large chunk warning remains)
- Advanced chatbot foundation hardening (streaming/planner/memory/multimodal end-to-end)
- Production custom domain setup (no domain selected yet)

## Phase 1-safe deployment defaults (Vercel)

Recommended preview defaults until Vercel validation is complete:

- `VITE_API_MODE=edge`
- `VITE_API_BASE_URL=`
- `VITE_CHATBOT_STREAMING_ENABLED=false`
- `VITE_CHATBOT_ENABLE_EDGE_AGENT_TOOLS=false`
- `VITE_PUBLIC_SITE_URL` unset (until final domain exists)

## Pre-production TODOs (explicit)

- Finalize legal "hébergeur" wording with definitive host/provider information
- Set `VITE_PUBLIC_SITE_URL` before production launch so canonical/OG URLs are emitted
- Complete manual browser smoke on `https://foch-horizon.vercel.app`
- Optional: connect GitHub repository integration in Vercel (CLI project link already works)
