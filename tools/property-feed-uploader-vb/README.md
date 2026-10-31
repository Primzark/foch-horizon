# Fochimmo ZIP importer

This .NET 10 Visual Basic console app replaces the legacy desktop import flow with a cross-platform build. The supplied Visual Basic project targets .NET Framework 3.5 (rather than 4.8) and refers to dependencies that are not present in the ZIP, so that original project cannot be built as-is on macOS.

The importer:

1. Finds `Annonces.csv` inside the ZIP, including nested folders, and extracts it to `Unzip/Annonces.csv`.
2. Reads the legacy `!#`-delimited CSV (also accepts `;#`, UTF-8, and Windows-1252), maps its listing fields to the website's property-feed schema, and writes `Prod/Annonces.json`.
3. Reads each negotiator signature from the end of the description (`Agent co ...` / `Agent Co ...`) and associates it with the stable website agent ID. `Agences.csv` contains the agency's contact details, not per-listing negotiator names.
4. Includes source status details in the JSON for review. The database import ignores feed status fields: a new listing defaults to active, and existing manual status and visibility settings stay unchanged.
5. Sends the feed through the existing `property-feed-import` Supabase Edge Function. The function upserts on the property's reference number (`id`) and refreshes images and features only for references in this ZIP. Listings absent from the ZIP remain in the database. Existing listings keep their current status, online setting, and negotiator assignment; a new listing can use the negotiator supplied in the ZIP. Existing negotiator records are preserved.
6. Keeps the first row when a property reference is repeated in the ZIP, records a warning naming both rows, and continues with the rest of the feed.
7. Writes a `Fochimmo_ddMMyyyy_Hmm.txt` log using the legacy semicolon-separated `OK/KO;function;date;message` structure.

The feed also includes `sourceDetails` for source fields that are not columns in the current website database schema. The Edge Function stores supported listing details and ignores fields that are outside the website schema, including source status and administrator-managed display settings.

## Build the standalone Windows executable on macOS

Install the .NET 10 SDK, then run this from the repository root:

```sh
dotnet publish tools/property-feed-uploader-vb/PropertyFeedUploader.vbproj \
  --configuration Release \
  --runtime win-x64 \
  --self-contained true \
  -p:PublishSingleFile=true \
  -p:EnableCompressionInSingleFile=true \
  -p:DebugType=None \
  --output tools/property-feed-uploader-vb/publish/win-x64
```

The result is `tools/property-feed-uploader-vb/publish/win-x64/Fochimmo.exe`. It includes the .NET runtime and can run on 64-bit Windows without a separate .NET installation. Publishing for another Windows architecture requires that runtime identifier (for example, `win-arm64`).

## Run

Run the console executable from Command Prompt or PowerShell. With no ZIP argument, it searches for the only `.zip` beside `Fochimmo.exe`:

```powershell
Fochimmo.exe --dry-run
```

To search another folder for its only `.zip` file, pass `--zip-dir`:

```powershell
Fochimmo.exe --zip-dir "D:\Fochimmo\Exports" --dry-run
```

You can also pass one ZIP file path directly. When the selected folder contains no ZIP or more than one ZIP, the program reports the issue; it never picks an arbitrary file. Before writing JSON or uploading, it removes a trailing period from an otherwise numeric reference. Duplicate normalized references keep the first row and produce a warning instead of blocking the upload. Invalid nonnumeric references still stop the import.

For an import, set the following environment variables before launching the program:

- `SUPABASE_API_KEY`: the project's publishable/anon key. It is sent in the `apikey` HTTP header.
- `PROPERTY_FEED_IMPORT_TOKEN`: the private token configured for the Supabase Edge Function. It is sent in the `x-property-import-token` header.
- `PROPERTY_FEED_IMPORT_ENDPOINT` (optional): override the default Foch Supabase function URL.

The importer never embeds or requests the Supabase service-role key. The API key and import token are not written to the JSON or log. If the variables are absent, the console prompts for each value without echoing it.

The output path can be changed with `--output <path-to-json>`. The generated JSON is saved before any upload attempt so it can be reviewed locally. Each successful run logs the number of parsed/imported listings; errors include the failed stage and message.

By default, a successful upload also runs the site's property-alert dispatch. For a bulk import that should not send alert or pending confirmation emails, pass `--skip-alert-dispatch`; this applies only to that run.

> The supplied source ZIP was examined as application data. Its bundled project files and PDF were not treated as instructions for this task.
