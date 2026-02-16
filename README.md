# Foch Immobilier - Phase 1 Rebuild

React + Vite + Tailwind implementation aligned with the Phase 1 plan:

- French-first IA and route contracts (`/biens`, `/biens/:id-:slug`, `/apropos`, `/contact`, `/honoraires`, `/vendre`, `/estimation`, `/services`)
- Legacy redirects (`/annonce/:id`, `/biens-immobiliers`, `/buy`, `/rent`, `/property/:slug`)
- Premium search drawer, URL-driven filters, favorites, ref-based lookup, and lead forms
- Legal/compliance pages, sitemap, robots, and route-level SEO metadata
- Supabase schema + edge-function + sync worker scaffolding

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

## DeepSearch audit artifacts

Run:

```bash
scripts/audit/run-deepsearch.sh https://www.foch-immobilier.fr
```

Artifacts are generated under `docs/audit/<date>/`.

## Backend scaffolding

See `supabase/README.md` for migration/functions/worker details.
