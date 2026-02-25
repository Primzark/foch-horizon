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

Status: PASS

- Generic lead payload (`/leads-create`) -> PASS
- City lead payload with slug `cityId` -> PASS (after `leads-create` redeploy)

## 4. Vercel deployment validation (post-deploy)

Status: PARTIAL PASS (automated HTTP checks PASS, manual browser smoke still pending)

Validated URL used for checks:

- `https://foch-horizon.vercel.app`

Deployment note:

- `vercel` CLI aliased deployments to the project production alias (including a run with `--prod=false`), so Production env vars were mirrored from Preview and the site was redeployed before validation.

### Route serving (SPA)

- `/` -> PASS (200 HTML app shell)
- `/biens` -> PASS (200 HTML app shell)
- `/contact` -> PASS (200 HTML app shell)
- `/property/test-slug` -> PASS (200 HTML app shell)
- Canonical and `og:url` tags absent in shell HTML -> PASS (expected while `VITE_PUBLIC_SITE_URL` is unset)

### `/api/*` rewrites (JSON through Vercel + Supabase auth)

- `GET /api/cities` without auth headers -> `401` (`Missing authorization header`) [expected with current Supabase auth policy]
- `GET /api/properties?page=1&pageSize=1` without auth headers -> `401` [expected]
- `GET /api/properties/stats` without auth headers -> `401` [expected]
- `GET /api/cities` with browser-style anon headers -> PASS (`200` JSON)
- `GET /api/properties?page=1&pageSize=1` with browser-style anon headers -> PASS (`200` JSON)
- `GET /api/properties/stats` with browser-style anon headers -> PASS (`200` JSON)
- `POST /api/leads` invalid payload with auth headers -> PASS (`400` validation error, not `401`)

### Chatbot / telemetry (Phase 1-safe)

- `POST /api/chatbot-assistant` invalid payload with auth headers -> PASS (`400` validation error, not `401`)
- Streaming remains disabled by default (`VITE_CHATBOT_STREAMING_ENABLED=false`) -> configured
- Chatbot feedback telemetry unload behavior -> PENDING manual browser check

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

Status: READY FOR MANUAL BROWSER SMOKE ON VERCEL

Remaining checks before fully green end-to-end signoff:

1. Run the pending manual browser smoke checks above (listings, city pages, legacy redirect, lead forms, chatbot UX)
2. Optionally connect the GitHub repository in Vercel (CLI link succeeded, GitHub auto-connect failed)
