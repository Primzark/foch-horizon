# Website SEO and GEO audit — 30 September 2026

## Implemented

- Shared photographic banners use the homepage’s reference dimensions: 360 px below 768 px, 420 px above. The storefront no longer adds viewport-dependent padding. Homepage search controls fit these dimensions on mobile, and city image dimensions cannot expand their banners.
- Centralized French location labels handle `au Havre`, `du Havre`, plural place names, Halles Centrales and Hôtel de Ville. Both source copy and dynamic titles, descriptions, empty states and links were audited. The build rejects incorrect Havre contractions in generated public HTML.
- Added complete Halles Centrales and Hôtel de Ville guides, linked from geography sections, the map, neighboring guides, footer and both sitemaps. Their copy distinguishes central sectors from independent communes. New guides explain housing, architecture, schools, services, commerce, transport and property-specific due diligence. No invented neighborhood price index is presented.
- Added contextual citations to official municipal, education, university, hospital, library, cultural, event and commercial sources. Corrected the Espace Coty destination to its current official website. Dates appear only on the two new guides whose local facts were checked during this audit.
- Every geographic guide links to relevant buying, rental, apartment and house searches, valuation, selling services, regulation and neighboring areas. Service cards link to corresponding destinations. Property location labels link to their city guide. Redirected historical content is not falsely presented as a separate live guide.
- Corrected 21 commune map markers using the government administrative API. The dataset records source URLs and INSEE codes. Neighborhood points remain indicative; the map labels that distinction. The map now has an isolated stacking context so Leaflet panes cannot cover consent controls.
- Added a shared `RealEstateAgent` identity, `WebSite`, page information and visible breadcrumbs with matching `BreadcrumbList` markup. All pages use the actual 109 avenue Foch address, telephone and email. Legacy footer, header, contact and legal entrypoints now reuse active content, removing conflicting contact details and placeholder legal/fee information. Geography collections use consecutive list positions and canonical place URLs; neighborhood entities explicitly belong to Le Havre. Commune entities include INSEE identifiers, coordinates and source references.
- Property JSON-LD describes an actual Apartment, House or Accommodation as the listing’s main entity, with area and room fields on the dwelling. Offers refer to the dwelling and the agency, distinguish selling from renting and use the actual status. Existing visible regulation FAQs remain marked up; no artificial FAQ expansion was added.
- Production builds prerender 44 public editorial pages, including all 30 geographic guides. They contain readable text, links, metadata and JSON-LD without JavaScript. Local guide rendering no longer waits for property API requests. Live listing counts and availability are omitted from snapshots. A separate SPA shell avoids returning homepage content for dynamic routes. Vercel rewrites explicitly serve generated pages, and its build command installs Chromium.
- Canonicals, the generated sitemap and the robots declaration use one configurable public origin. Development localhost configuration cannot become the production canonical. Private selections and administration pages retain noindex controls.

## Research and rationale

[Google’s current guidance for generative AI search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) and [AI features documentation](https://developers.google.com/search/docs/appearance/ai-features) emphasize helpful, accessible content and conventional crawl/index eligibility. This implementation follows that guidance through factual entity relationships, extracted readable HTML, source attribution, consistent business information and useful navigation. It adds no speculative AI-only schema or special AI text files. Schema describes visible content; it does not guarantee citations or ranking.

[Bing’s AI Performance documentation](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c) provides a way to monitor citations and grounding queries after deployment. Citation reporting is an operational measurement task, not something that can be confirmed by a local code build.

## Local sources checked

- [Halles architecture — Ville du Havre](https://lehavre.fr/que-faire-au-havre/lh-culture/panorama/ville-des-modernites-architecturales)
- [Municipal market information](https://lehavre.fr/services-au-quotidien/commerces-entreprises/les-marches-havrais)
- [Hôtel de Ville services](https://lehavre.fr/annuaire-equipements/hotel-de-ville)
- [Hôtel de Ville historical record — Archives municipales](https://archives.lehavre.fr/expositions/lhotel-de-ville-du-havre-1958-2018-symbole-de-la-reconstruction)
- [Centre patrimonial dossier, including collège Raoul-Dufy](https://lehavre.fr/sites/default/files/fichier/dossier_candidature_havre_patrimoine_mondial.pdf)
- [Éducation nationale directory](https://www.education.gouv.fr/annuaire)
- [Université Le Havre Normandie](https://www.univ-lehavre.fr/fr/universite/)
- [Groupe Hospitalier du Havre](https://www.ch-havre.fr/)
- [Bibliothèque Oscar Niemeyer](https://bibliotheques.lehavre.fr/bibliotheque/bibliotheque-oscar-niemeyer)
- [MuMa](https://www.muma-lehavre.fr/)
- [Un Été Au Havre](https://www.uneteauhavre.fr/fr/)
- [Espace Coty](https://espace-coty.klepierre.fr/)
- [Government commune API documentation](https://geo.api.gouv.fr/decoupage-administratif/communes)

The Volcan website was not readable through the web research tool; its identity is corroborated by the municipal quartier Perrey–Perret page. No changing performance schedule was copied into the site.

## Verification and operational limits

Final checks passed: 44 prerendered pages, 48 internal destinations, 148 browser banner checks, 86 unit tests, and ESLint on changed code. Eight live edge integration tests remain intentionally skipped.

The production build validates H1 counts, French contractions and canonical URLs for every generated editorial page. `npm run audit:seo` checks the generated HTML, business identity, breadcrumbs, list positions, internal destinations and banner dimensions across four viewport widths. The unit suite includes geographic relationships, related-guide integrity, business identity and French contractions. Browser screenshots of the homepage and geography page were inspected on desktop and mobile.

The existing TypeScript checker has unrelated errors in `chatbot.service.ts` and `SiteChatbot.tsx`; the audit does not conceal them or claim a clean global typecheck. Existing edge integration tests require a separately configured live test environment and are skipped by the normal suite. Production builds also retain the existing large JavaScript bundle warning.

Set `VITE_PUBLIC_SITE_URL` to the intended production hostname before deploying. The default preserves the repository’s existing `foch-horizon.vercel.app` destination; this work does not redirect the existing `www.fochimmobilier.com` site or change its domain settings. Live property details, listing results, reviews and recent sales continue to require JavaScript/API responses. They are not frozen into editorial snapshots. Unknown SPA routes still rely on application noindex handling rather than a newly introduced hosting-level HTTP 404 system.

Existing market figures retain their original attribution and reference dates. They were not independently revalidated across every municipality, and should be maintained through a separate market-data refresh. New guides deliberately avoid manufacturing unsupported prices. School catchment areas, current events, transport timetables and project completion dates should be checked at their official sources when used for a particular purchase.

No deployment, Search Console submission, Bing verification, live rich-results inspection or AI citation measurement was performed. Those checks require the final public hostname and deployed pages. Google Business Profile and third-party directory consistency cannot be verified from this repository alone.
