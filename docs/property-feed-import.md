# Property feed import

The original property extraction is stored as TypeScript in `src/features/listings/data/properties.ts`; this repository does not contain a complete extracted property JSON file. The only older JSON artifact is `docs/audit/2026-02-16/gallery-enrichment-manifest.json`, which is an image manifest for unrelated Bordeaux listings, so it is not a usable property feed.

Create a shareable feed from the current normalized inventory:

```sh
npm run export:property-feed
```

This writes `supabase/fixtures/property-feed.json` with properties, cities, agents, property references, and status counts for review. A property's external reference number is its `id` and the unique database key. Imports ignore feed status fields: new listings use the database defaults, while existing status and display settings remain under manual control.

## POST path

An import upserts only the property references present in the feed. Existing properties with the same reference are updated, new references are inserted, and properties missing from the feed remain in the database. A feed status such as `sold` or `off_market` never deletes a listing or changes its status. The manually managed `status`, `source_status`, `admin_status_override`, `is_online`, and `is_featured` fields are preserved on existing listings; new listings default to active and online. Existing listings also keep their current negotiator assignment, while a new listing can use the negotiator supplied in the feed. Existing negotiator rows are never updated or deleted; an import may add a negotiator only when its stable ID is not already present. Images and features are replaced only for property references included in that import.

The intended path is:

`provider export → JSON feed → PowerShell POST → property-feed-import Edge Function → Supabase → website API`

The Edge Function requires a server-side `PROPERTY_FEED_IMPORT_TOKEN`, validates the feed, and calls the `import_property_feed(jsonb)` database function. Property `id` is the external reference and the conflict key, so later imports overwrite that property instead of creating a second row. The SQL function applies property, image, and feature updates in one transaction. Repeating the same feed is safe, and an empty or partial feed never removes other listings. The one-time property reset is performed separately from this import function.

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

## Upsert behavior check

For a development-only update check, change a property's title or price and its images/features, import it twice, and verify that its row with the same `id` is updated without increasing the listing count. Also verify that a property omitted from the feed remains present, its manually managed status/display fields are unchanged, and existing negotiator details are unchanged. Do not use live listings for update checks.

The admin console is the authority for sold status and online visibility. Imports do not change those settings.
