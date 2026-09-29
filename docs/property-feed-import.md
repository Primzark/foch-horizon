# Property feed import

The original property extraction is stored as TypeScript in `src/features/listings/data/properties.ts`; this repository does not contain a complete extracted property JSON file. The only older JSON artifact is `docs/audit/2026-02-16/gallery-enrichment-manifest.json`, which is an image manifest for unrelated Bordeaux listings, so it is not a usable property feed.

Create a shareable feed from the current normalized inventory:

```sh
npm run export:property-feed
```

This writes `supabase/fixtures/property-feed.json` with properties, cities, agents, property references, and status counts. The current normalized inventory has 48 properties and all 48 are marked `active`; it does not currently provide evidence of sold or under-offer properties. The provider scraper maps known labels to `active`, `under_offer`, `sold`, `rented`, and `off_market`, while preserving the original provider label in `sourceStatus` / `source_status` for review when the software uses a new label.

## POST path

The intended path is:

`provider export → JSON feed → PowerShell POST → property-feed-import Edge Function → Supabase → website API`

The Edge Function requires a server-side `PROPERTY_FEED_IMPORT_TOKEN`, validates the feed, and calls the `import_property_feed(jsonb)` database function. Property `id` is the external reference and the conflict key, so later imports overwrite that property instead of creating a second row. The SQL function applies property, status, image, and feature updates in one transaction. Repeating the same feed is safe.

Apply the migration to the local Supabase stack and serve the function locally before importing test data:

```sh
supabase migration up --local
supabase functions serve property-feed-import --env-file /path/to/local-property-feed.env --no-verify-jwt
```

The local function env file should contain a test-only `PROPERTY_FEED_IMPORT_TOKEN`; `supabase functions serve` supplies the local `SUPABASE_URL` and service role credentials. Do not place the import token in a `VITE_` variable or commit it. The uploader is `scripts/import-property-feed.ps1`; it requires an explicit endpoint and token, and supports validation-only requests with `-DryRun`.

Example validation-only request:

```powershell
./scripts/import-property-feed.ps1 `
  -Endpoint "http://127.0.0.1:54321/functions/v1/property-feed-import" `
  -ImportToken $env:PROPERTY_FEED_IMPORT_TOKEN `
  -DryRun
```

Example development import:

```powershell
./scripts/import-property-feed.ps1 `
  -Endpoint "http://127.0.0.1:54321/functions/v1/property-feed-import" `
  -ImportToken $env:PROPERTY_FEED_IMPORT_TOKEN
```

The Vite `/api/property-feed/import` proxy points at the Supabase URL configured for that Vite process. A local website does not imply a local database; check that URL before sending a non-dry-run import. The browser app never receives the import token.

For deployment, first link the CLI to the intended development project and verify that project reference. Only then apply migrations and deploy the Edge Function. This repository is currently linked to a hosted project, so do not run `supabase db push` until the CLI link is deliberately changed to the development project.

## Status update check

For a development-only update check, copy the feed, change one property's `status` and `sourceStatus`, import it, import it again, and verify that the row with the same `id` has the new values and that the property count did not increase. Also verify that its image and feature rows match the new feed. Do not use live listings for update tests.

No admin status editor is included yet. The source software remains the status authority until its feed format and status vocabulary are confirmed.
