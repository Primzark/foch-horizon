# Foch Immobilier - Phase 1 Rebuild

React + Vite + Tailwind implementation aligned with the Phase 1 plan:

- French-first IA and route contracts (`/biens`, `/biens/:id-:slug`, `/apropos`, `/contact`, `/honoraires`, `/vendre`, `/estimation`, `/services`)
- City hub pages for phase 2 (`/immobilier/:ville`)
- Legacy redirects (`/annonce/:id`, `/biens-immobiliers`, `/buy`, `/rent`, `/property/:slug`)
- Premium search drawer, URL-driven filters, favorites, ref-based lookup, and lead forms
- Legal/compliance pages, sitemap, robots, and route-level SEO metadata
- Supabase schema + edge-function + sync worker scaffolding
- Environment-switchable API client (`VITE_API_MODE=mock|edge`)

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## API mode switch

Default mode is local mock data.

```bash
VITE_API_MODE=mock
```

To use Supabase edge endpoints:

```bash
VITE_API_MODE=edge
VITE_API_BASE_URL=https://<your-edge-host>
```

## Edge integration tests

Read-only contract checks:

```bash
RUN_EDGE_INTEGRATION=true EDGE_API_BASE_URL=https://<your-edge-host> npm run test:edge
```

Optional write-path lead test:

```bash
RUN_EDGE_INTEGRATION=true RUN_EDGE_WRITE_TESTS=true EDGE_API_BASE_URL=https://<your-edge-host> npm run test:edge:write
```

## DeepSearch audit artifacts

Run:

```bash
scripts/audit/run-deepsearch.sh https://<preview-or-production-url>
```

Artifacts are generated under `docs/audit/<date>/`.

## Backend scaffolding

See `supabase/README.md` for migration/functions/worker details.


## Public HTML and SEO/GEO verification

`npm run build` builds the React application and prerenders the homepage, public information pages and all geographic guides. It requires Chromium: run `npx playwright install chromium` once locally, or `npx playwright install --with-deps chromium` on Linux CI. Vercel’s build command installs the browser and its dependencies automatically. `npm run build:spa` remains available for a client-only diagnostic build.

Set `VITE_PUBLIC_SITE_URL` in the production build environment to the intended canonical HTTPS origin. The default is the repository’s existing deployment origin, `https://foch-horizon.vercel.app`. The build deliberately ignores development localhost URLs, and generates matching canonical URLs, sitemap entries and the robots sitemap declaration. When moving to `www.fochimmobilier.com`, set that origin before rebuilding rather than editing generated files.

Run `npm run audit:seo` after a production build to validate all prerendered pages and check photographic banners at 320, 375, 768 and 1440 px. Run `npm test` for the unit suite. Editorial pages are available without JavaScript; listing results, availability, reviews and private selections continue to load live. Prerendering omits live listing counts and availability so a build cannot freeze obsolete stock information. The separate `spa.html` fallback prevents dynamic routes from returning the homepage’s text and schema.

Geographic entity references and business identity are maintained in `src/lib/seo/entities.ts`. Commune map points and INSEE identifiers are sourced from the government administrative API in `src/features/content/data/communeLocations.json`. Review dates belong only to content actually checked, not to every rebuild. See `docs/seo-geo-audit-2026-09-30.md` for the research, verification and remaining operational limits.
