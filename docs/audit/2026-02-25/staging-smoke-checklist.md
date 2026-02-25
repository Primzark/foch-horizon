# Deployment Validation Checklist (Vercel, No Domain Yet) — 2026-02-25

Date: 2026-02-25
Scope: local QA + direct Supabase edge contract checks + post-Vercel preview validation checklist (legacy hosting path removed)
Commit baseline during prior stabilization run: `b2ad3a5`

## 1. Local quality gates (repo)

Status: PASS (with lint warnings)

- `npm run lint`
  - Result: PASS (0 errors, warnings remain)
- `npm test`
  - Result: PASS (default suite)
- `npm run build`
  - Result: PASS
  - Note: main bundle warning remains (~842 kB minified / ~248 kB gzip)

## 2. Direct Supabase edge contract checks (read-only)

Status: PASS

Validated using direct function URLs and anon key headers:

- `cities-list` -> PASS
- `properties-search` -> PASS
- `property-detail` -> PASS

Command family used:

- `npm run test:edge` with:
  - `EDGE_CITIES_URL=<supabase>/functions/v1/cities-list`
  - `EDGE_PROPERTIES_URL=<supabase>/functions/v1/properties-search`
  - `EDGE_PROPERTY_DETAIL_BASE_URL=<supabase>/functions/v1/property-detail`
  - `EDGE_LEADS_URL=<supabase>/functions/v1/leads-create`
  - `EDGE_ANON_KEY=<anon key>`

## 3. Direct Supabase edge write checks (creates test leads)

Status at last run: PARTIAL PASS (deployment drift detected)

- Generic lead payload (`/leads-create`) -> PASS
- City lead payload with slug `cityId` -> FAIL on currently deployed endpoint

Interpretation:

- Repo code supports slug-based `cityId` normalization in `supabase/functions/leads-create/index.ts`
- Remote `leads-create` function needs redeploy before this passes

## 4. Vercel preview validation (post-deploy) — PENDING

Status: PENDING (no preview URL yet)

### Route serving (SPA)

- `/` returns app shell
- `/biens` returns app shell
- `/contact` returns app shell
- `/property/test-slug` returns app shell (legacy client redirect path tested in browser)

### `/api/*` rewrites (must return JSON, not HTML)

- `GET /api/cities`
- `GET /api/properties?page=1&pageSize=1`
- `GET /api/properties/stats`
- `POST /api/leads` invalid payload returns `400` validation error (not `401 Missing authorization header`)

### Chatbot / telemetry (Phase 1-safe)

- `POST /api/chatbot-assistant` works in edge mode (if enabled)
- Streaming disabled by default unless specifically testing SSE on Vercel
- Chatbot feedback telemetry does not break UX during unload/visibility changes

## 5. Manual browser smoke (post-preview) — PENDING

Status: PENDING

- Home page navigation
- Listings filters + sort interactions
- Listing detail rendering
- City hub rendering (postal code + hero image)
- Legacy redirect `/property/:slug` -> canonical route
- Lead forms (property / generic / city slug path)
- Chatbot Phase 1-safe flows (fees, contact, reviews, no-match lead capture)

## 6. Readiness summary

Status: READY FOR VERCEL PREVIEW DEPLOY (with one known remote dependency)

Remaining blockers before fully green preview validation:

1. Deploy updated Supabase `leads-create` function (and `properties-search` if not already deployed)
2. Create Vercel preview deployment with required env vars
3. Run the pending preview + manual browser checks above
