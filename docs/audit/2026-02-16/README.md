# DeepSearch Audit - 2026-02-16

This folder contains the Phase 0 audit artifacts generated before implementation.

## Generated artifacts
- `url-inventory.csv`: crawl snapshot with status + canonical.
- `listings-index.html`: raw HTML from listing endpoint.
- `internal-links.txt`: extracted internal URL references.
- `image-urls.txt`: extracted `staticlbi` image URL references.
- `seo-baseline.md`: baseline title/canonical for representative pages.

## Remaining manual checks (DevTools/Lighthouse)
- Capture filter requests payload/response in browser Network tab.
- Capture contact and property form payload schema (without real submission when possible).
- Run Lighthouse (mobile + desktop) for home, listing index, and property detail.
- Save HAR waterfalls and screenshots to this folder.

## Exit gate status
- Feed/API discoverability: partial (server-rendered + JS endpoints detected, provider credentials unknown).
- Form endpoint behavior: pending manual capture.
- Image manifest: partial extraction complete.
- Legacy URL map: in progress.
