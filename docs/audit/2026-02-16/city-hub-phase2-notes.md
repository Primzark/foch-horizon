# Phase 2 City Hub Notes

## Scope implemented
- New city hub route: `/immobilier/:ville`
- City hub page includes:
  - Hero by city
  - Listing feed filtered by city
  - CTA to `/estimation?ville=<slug>`
  - Link back to `/biens?city=<slug>`

## Internal linking updates
- Home page now links to city hub pages.
- HTML sitemap page now includes all city hub pages.
- XML sitemap now includes city hub canonical URLs.

## Validation
- Route resolved and rendered in production build.
- City slug fallback redirects to `/biens` when city is unknown.
