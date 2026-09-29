# SEO, local search, AI search, and measurement research

**Prepared:** 29 September 2026
**Scope:** Research and recommendations for Foch Immobilier; SEO and analytics strategy changes are not applied in this phase.

## Executive summary

The site already has useful foundations: page-specific titles and descriptions, canonical URLs, a local business entity, review content, five municipality pages, a visible property breadcrumb, and event hooks for important interactions. The best next steps are to correct the production sitemap host, improve the largest images, add meaningful and visibly supported local content, and finish a review of page-level breadcrumb/schema coverage.

The live PageSpeed report scored **58 mobile / 80 desktop for performance**, **82 / 87 for accessibility**, **100 for best practices**, and **100 for SEO**. The primary performance issue is image delivery: Lighthouse estimated **22,564 KiB** of mobile savings and recorded **49,796 KiB** total transfer. Mobile LCP was **23.7 s**; desktop LCP was **3.7 s**. These are single Lighthouse lab runs, not field Core Web Vitals.

The existing supplier JSON was not present in the repository. I generated a reproducible test feed from the site's local TypeScript inventory at [`supabase/fixtures/property-feed.json`](../supabase/fixtures/property-feed.json). It contains **48 properties, 5 cities, and 4 agents**; all 48 have the local `active` status and none has a supplier `sourceStatus`. Treat it as a site-side fixture, not a supplier export or proof of the real software's status vocabulary.

## Current site audit

### Geography and page structure

- Five geography hubs are configured: Le Havre, Sainte-Adresse, Montivilliers, Manéglise, and Gainneville.
- The city template has a title, description, canonical URL, `Place` and `CollectionPage` JSON-LD, a short general introduction, listings, and an estimate call to action. City pages do not currently show a visitor breadcrumb or `BreadcrumbList` JSON-LD.
- The geography index links to area pages and has breadcrumb markup. Property details show a visual `Accueil / Biens / …` trail, but their JSON-LD does not include a breadcrumb list.
- Property-detail JSON-LD currently describes a `RealEstateListing` and `Offer`. The home page describes the agency as a `RealEstateAgent`; review content is visible on the reviews page and home page.
- The `useSeo` hook sets much of the metadata and JSON-LD in the browser after JavaScript runs. Google can render JavaScript, but server rendering or prerendering is worth evaluating for faster and more reliable discovery by crawlers that do not render the app shell.
- The public sitemap currently points at `foch-horizon.vercel.app`, while the public site and canonical domain use `www.fochimmobilier.com`. Resolve the intended production hostname, then align the sitemap entries and `robots.txt` sitemap declaration before the next indexing submission.
- No GTM container ID or GTM bootstrap was found in the repository. The event module can push named events to `dataLayer` when it exists, but no container currently loads it. The existing GTM account could not be inspected because this browser session is not signed in.

### Page and content opportunities

Keep the current useful lower-page copy. The visual pass reduced oversized spacing in shared page heroes, listing cards, the listings index, home sections, and the footer, and removed a duplicate footer home link. Existing routes reviewed included home, listings, a listing detail, reviews, geography and a city page, contact, estimate, about, and recent sales. The reviews page and footer link already exist. Listing pages already have a native share action with Web Share and clipboard fallback.

For location pages, add content only when it can be grounded in current inventory, verified facts, and distinct local usefulness. A suggested page outline is:

1. A clear local H1 and a short, factual introduction that distinguishes the municipality or neighborhood.
2. Current, filtered listings with descriptive links and a visible update date where the feed supports it.
3. Verified local housing characteristics and practical links for transport, schools, shops, services, and landmarks.
4. A concise explanation of the agency's local service and a valuation/contact action.
5. Breadcrumbs and contextual links to the geography index, nearby places, genuinely useful property-type pages, and relevant listings.

Do not generate many near-identical “house/apartment in X” pages from templates alone. Start with the five existing hubs, then prioritize a place/property-type combination only when Search Console query demand, inventory, and distinct local material support it. Use canonical or `noindex` rules for thin filter combinations rather than letting every query URL compete as an indexable landing page.

### Structured data and reviews

Use JSON-LD that matches visible page content. A practical target is `BreadcrumbList` on the geography index, city pages, and property details; `RealEstateAgent` / `LocalBusiness` details on the agency page; and listing/offer data on available properties. Add `FAQPage` only if the same real questions and answers are visible on that page. Validate each template with Google's Rich Results Test and Schema.org validator after changes.

Keep reviews useful and visible, but do not expect a star snippet from review markup about the agency on its own site. Google classifies ratings for a `LocalBusiness` or `Organization` controlled by the reviewed entity as self-serving and does not show those review snippets.

### Local facts and statistics

Use primary sources and label the reference year. INSEE reports a population of **166,687** for Le Havre (2023 reference population, effective 2026) and **7,004** for Sainte-Adresse (2023 reference population). The AURH housing market report is useful for methodology and historic context, but its latest found edition was published in 2023 with market data through 2022. Do not label those old price figures as current. For a current municipality-level price view, compute a dated statistic from current DVF transactions or use a newer AURH release and state the time window and number of transactions.

## Competitor review

These are representative local agency pages reviewed for structure and content. This review did not establish exact Google ranking positions; rankings vary by query, location, device, and date. Use Search Console plus a dated query benchmark before describing any competitor as a top-ranked result.

| Site | Useful patterns | Implications for Foch |
| --- | --- | --- |
| [Orpi Mesnil Immobilier](https://www.orpi.com/mesnilparvis/) | Agency and mandate proposition, live listings, service-area links, team and agency proof, external review source, local articles and transaction/sector material. | Connect each supported municipality/neighborhood to inventory and specific agency expertise. Add proof and local service details instead of repeating broad generic copy. |
| [Cabinet Dero Renard](https://www.immorenard.com/) | Le Havre-focused positioning, property selection, estimate journey, agency/team proof, review information, and links to named local sectors such as Saint-Vincent, Sainte-Adresse, Sanvic, and Saint-François. | Organize the geography hub around real named sectors and useful pathways into active inventory; avoid a list of empty SEO doorway pages. |
| [Lemâistre Immobilier](https://www.lemaistre-immo.fr/fr/nos-agences-immobilieres.htm) | Multiple agency locations with practical address, phone, hours, and property-type pathways. | Provide clear local contact/service details and use property-type links only where the site has relevant stock and distinct content. |

## Google and AI-search guidance

Google's current AI-search guidance says the established Search essentials remain the foundation. Pages need to be crawlable and eligible to appear with a snippet; there are no special AI-only schema requirements. Make key facts available as clear page text, keep internal links crawlable, and make structured data agree with what visitors see. A special `llms.txt` file is not a Google requirement and is not a substitute for these fundamentals.

For ChatGPT search, OpenAI documents `OAI-SearchBot` as the crawler for search visibility. `GPTBot` is separate and relates to model-training controls. Review `robots.txt` deliberately against the agency's preferences before changing crawler access. Clear headings, stable URLs, descriptive links, fast pages, and current factual content help both human visitors and automated systems understand the site.

The chatbot was tested with a generic, non-personal query for a two-bedroom Le Havre apartment under €300,000. Before the parser fix, the hosted assistant returned 26 results and displayed some properties above that budget or below the room count. The parser now understands French number words and the phrase “budget maximum de …”. It was deployed to Supabase `chatbot-assistant` version 31 and the same query was retested through the site: the assistant returned 9 results, stated the apartment / sale / Le Havre / minimum two bedrooms / maximum €300,000 criteria, and all five displayed listings met the visible city, price, and bedroom constraints. The focused Deno tests (4/4) and function type check passed. This validates the tested phrasing; other natural-language variants still need broader coverage.

## PageSpeed findings

Report date: **29 September 2026**.

| Category | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 58 | 80 |
| Accessibility | 82 | 87 |
| Best practices | 100 | 100 |
| SEO | 100 | 100 |
| Largest Contentful Paint | 23.7 s | 3.7 s |
| Total Blocking Time | 60 ms | 30 ms |
| Cumulative Layout Shift | 0 | 0 |

Lighthouse flagged oversized image delivery (estimated savings **22,564 KiB mobile / 12,759 KiB desktop**), inefficient cache lifetimes (about **5,068 KiB**), render-blocking requests, image elements without explicit dimensions, and unused JavaScript/CSS. First investigate the largest hero and listing images, serve appropriately sized modern formats, set width/height or aspect ratio, lazy-load below-the-fold images, and use long-lived caching for immutable assets. Then rerun both mobile and desktop reports and compare the same URL. Accessibility opportunities included unlabeled selects, unnamed links/buttons, contrast, and heading order.

- [PageSpeed Insights — mobile report](https://pagespeed.web.dev/analysis/https-www-fochimmobilier-com/vaxbgwfb3a?form_factor=mobile)
- [PageSpeed Insights — desktop report](https://pagespeed.web.dev/analysis/https-www-fochimmobilier-com/vaxbgwfb3a?form_factor=desktop)

## GTM and GA4 next steps

No tracking code was installed during this research phase. To complete setup, an authorized account user needs to provide or confirm the GTM container ID and GA4 measurement ID, and the site's consent requirements. Then:

1. Install the GTM bootstrap once, through the site's approved configuration mechanism.
2. Configure a GA4 tag in GTM and verify it in Tag Assistant / GA4 DebugView.
3. Map the existing event hooks to a small event plan: `phone_click`, `email_click`, `listing_click`, `form_start`, `form_submit`, `share_click`, `chatbot_query`, and important CTA clicks.
4. Include only useful, non-personal event parameters (for example property reference and page type); do not send message bodies, names, email addresses, or phone numbers to analytics.
5. Confirm consent behavior, deduplication, and production/staging separation before publishing the container.

## Recommended order

1. Confirm the canonical production host and correct the sitemap host / `robots.txt` reference.
2. Reduce large image and cache payloads; address the accessibility findings in shared controls.
3. Review title, description, H1, canonical, indexability, and breadcrumb coverage across page templates; add structured data only where it matches visible content.
4. Use Search Console query and landing-page data to select the next geographic pages. Validate local facts with INSEE, official town sources, transit/school operators, DVF, and current AURH publications.
5. Confirm the GTM/GA4 IDs and consent behavior with the account owner; configure and test tags in preview before publishing.
6. Deploy the chatbot parser update only after the owner approves the edge-function rollout; repeat the same synthetic query after deployment.

## Sources

- [Google Search: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Search: AI features and your website (optimization guide)](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google Search: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google Search: Breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
- [Google Search: Local business structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Google Search: Review snippet structured data](https://developers.google.com/search/docs/appearance/structured-data/review-snippet?hl=en)
- [OpenAI: Crawling and indexing](https://developers.openai.com/api/docs/bots)
- [INSEE: Le Havre population](https://www.insee.fr/fr/statistiques/8643952?geo=COM-76351)
- [INSEE: Sainte-Adresse population](https://www.insee.fr/fr/statistiques/2011101?geo=COM-76552)
- [AURH: Housing market dynamics](https://www.aurh.fr/observatoires-et-etudes/dynamiques-marche-immobilier-lhsm)
