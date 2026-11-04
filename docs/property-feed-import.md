# Property feed import

The original property extraction is stored as TypeScript in `src/features/listings/data/properties.ts`; this repository does not contain a complete extracted property JSON file. The only older JSON artifact is `docs/audit/2026-02-16/gallery-enrichment-manifest.json`, which is an image manifest for unrelated Bordeaux listings, so it is not a usable property feed.

Create a shareable feed from the current normalized inventory:

```sh
npm run export:property-feed
```

This writes `supabase/fixtures/property-feed.json` with properties, cities, agents, property references, and status counts for review. A property's external reference number is its `id` and the unique database key. Imports ignore feed status fields: new listings use the database defaults, while existing status and display settings remain under manual control.

## POST path

The .NET ZIP uploader completes ZIP extraction, CSV parsing, and feed validation before it sends any request to Supabase. An unreadable ZIP/CSV or invalid feed therefore cannot trigger inventory reconciliation. Empty feeds are rejected.

The import upserts property references present in the feed. Existing references are updated and new references are inserted. After all feed rows and their images/features have been applied, every database property absent from the feed is set offline unless either its current status or admin status override is `sold`. Sold properties are left untouched by this reconciliation. No property rows are deleted. This upsert and reconciliation run in one database transaction, so a database error rolls back the complete sync.

For properties included in the feed, existing `status`, `source_status`, `admin_status_override`, `is_online`, `is_featured`, and negotiator assignment remain under manual control. New properties use database defaults (active and online) and may use the negotiator supplied in the feed. Existing negotiator rows are never updated or deleted; an import may add a negotiator only when its stable ID is not already present. Images and features are replaced only for property references included in the feed.

The RPC returns the references and titles added, updated, taken offline, or ignored. Ignored entries include sold properties absent from the feed and already-offline properties absent from the feed.

The supported Fochimmo inventory path is:

`Annonces.zip → .NET Fochimmo.exe → property-feed-import Edge Function → Supabase transaction → website API`

The executable is the only supported entry point for Fochimmo ZIP inventory synchronization. It extracts and validates the ZIP/CSV, creates the JSON feed, and sends it to the Supabase Edge Function. The Edge Function requires a server-side `PROPERTY_FEED_IMPORT_TOKEN`, validates the feed, and calls the `import_property_feed(jsonb)` database function. Property `id` is the external reference and conflict key, so later imports update that row instead of creating a second row. The function serializes concurrent imports and reconciles missing references in the same transaction. Repeating the same feed is safe; omitted non-sold listings remain in the database but are offline.

Apply the migration to the local Supabase stack and serve the function locally before importing test data:

```sh
supabase migration up --local
supabase functions serve property-feed-import --env-file /path/to/local-property-feed.env --no-verify-jwt
```

The local function env file should contain a test-only `PROPERTY_FEED_IMPORT_TOKEN`; `supabase functions serve` supplies the local `SUPABASE_URL` and service role credentials. Do not place the import token in a `VITE_` variable or commit it. `scripts/import-property-feed.ps1` is retained only as a local development helper for validation/import checks against the local Supabase stack; it is not the Fochimmo inventory sync entry point.

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

For a development-only update check, change a property's title or price and its images/features, import it twice, and verify that its row with the same `id` is updated without creating a duplicate. Also verify that an omitted non-sold listing becomes offline but remains in the table, an omitted sold listing retains its online setting and status, existing feed-row status/display fields are unchanged, and existing negotiator details are unchanged. Do not use live listings for update checks.

The admin console is the authority for sold status and online visibility. Imports do not change those settings.
