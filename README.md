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

`npm run build` builds the React application and prerenders the homepage, public information pages, listing and review pages, all geographic guides, and each active property in the local feed. It requires Chromium: run `npx playwright install chromium` once locally, or `npx playwright install --with-deps chromium` on Linux CI. Vercel builds use portable Chromium with bundled Linux libraries, without requiring a system package manager. `npm run build:spa` remains available for a client-only diagnostic build.

Set `VITE_PUBLIC_SITE_URL` in the production build environment to the intended canonical HTTPS origin. The default is the repository’s existing deployment origin, `https://foch-horizon.vercel.app`. The build deliberately ignores development localhost URLs and generates matching canonical URLs, sitemap entries and the robots sitemap declaration. Vercel-hosted pages emit `noindex,follow` until a non-Vercel public origin is configured; set the final domain before the launch rebuild rather than editing generated files.

The listing pages and sitemap use `src/features/listings/data/properties.ts`; run `npm run sync:annonces` before a release build to refresh that feed. Live availability and private selections still update after the page loads. Review snapshots omit unverified ratings and comments. The separate `spa.html` fallback remains for unknown and private routes.

Geographic entity references and business identity are maintained in `src/lib/seo/entities.ts`. Commune map points and INSEE identifiers are sourced from the government administrative API in `src/features/content/data/communeLocations.json`. Review dates belong only to content actually checked, not to every rebuild. See `docs/seo-geo-audit-2026-09-30.md` for the research, verification and remaining operational limits.
