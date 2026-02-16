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
scripts/audit/run-deepsearch.sh https://www.foch-immobilier.fr
```

Artifacts are generated under `docs/audit/<date>/`.

## Backend scaffolding

See `supabase/README.md` for migration/functions/worker details.
