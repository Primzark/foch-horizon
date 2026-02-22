#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://fochimmobilier.lovable.app}"
DATE_STAMP="$(date +%F)"
OUT_DIR="docs/audit/${DATE_STAMP}"

mkdir -p "$OUT_DIR"

echo "[audit] base url: $BASE_URL"
echo "[audit] writing to: $OUT_DIR"

cat > "$OUT_DIR/url-inventory.csv" <<CSV
url,status,canonical
CSV

for path in / /biens-immobiliers /apropos /contact /nos-biens/xdpezdofyyytkyf3/1; do
  url="${BASE_URL}${path}"
  response="$(curl -s -L -D - "$url" -o /tmp/foch_audit_page.html)"
  status="$(printf '%s\n' "$response" | head -n 1 | awk '{print $2}')"
  canonical="$(rg -o 'rel="canonical" href="[^"]+' /tmp/foch_audit_page.html | sed 's/.*href="//' | head -n 1 || true)"
  printf '%s,%s,%s\n' "$url" "${status:-}" "${canonical:-}" >> "$OUT_DIR/url-inventory.csv"
done

curl -s -L "${BASE_URL}/nos-biens/xdpezdofyyytkyf3/1" > "$OUT_DIR/listings-index.html"

rg -o 'href="[^"]+"' "$OUT_DIR/listings-index.html" \
  | sed 's/href="//;s/"$//' \
  | rg '^/' \
  | sort -u > "$OUT_DIR/internal-links.txt" || true

rg -o 'https?://[^"\s]+' "$OUT_DIR/listings-index.html" \
  | rg 'staticlbi\.com' \
  | sort -u > "$OUT_DIR/image-urls.txt" || true

cat > "$OUT_DIR/seo-baseline.md" <<MARKDOWN
# SEO Baseline (${DATE_STAMP})

## Home
- URL: ${BASE_URL}/
- Title: $(curl -s -L "${BASE_URL}/" | rg -o '<title>[^<]+' | sed 's/<title>//' | head -n 1)
- Canonical: $(curl -s -L "${BASE_URL}/" | rg -o 'rel="canonical" href="[^"]+' | sed 's/.*href="//' | head -n 1)

## Listing index
- URL: ${BASE_URL}/nos-biens/xdpezdofyyytkyf3/1
- Title: $(curl -s -L "${BASE_URL}/nos-biens/xdpezdofyyytkyf3/1" | rg -o '<title>[^<]+' | sed 's/<title>//' | head -n 1)
- Canonical: $(curl -s -L "${BASE_URL}/nos-biens/xdpezdofyyytkyf3/1" | rg -o 'rel="canonical" href="[^"]+' | sed 's/.*href="//' | head -n 1)
MARKDOWN

echo "[audit] complete"
