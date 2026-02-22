# Quotation - Foch Immobilier Phase 1 (Production Launch)

Date: February 22, 2026  
Quote Ref: `FOCH-H1-2026-02-22`  
Currency: EUR (excl. VAT)  
Validity: 15 calendar days

## 1. What This Quote Covers

This quotation covers taking the current `foch-horizon` codebase from its present state to a production-ready Phase 1 launch for Foch Immobilier, including real data integration, backend hardening, QA, deployment, and launch support.

This is not a quote for a simple brochure site. The repository already contains a substantial custom React/Vite frontend plus Supabase backend artifacts and edge functions.

## 2. Basis of Estimate (Repository Audit)

This quote is based on an audit of the current project snapshot on February 22, 2026, including code inspection and local quality checks.

Evidence from the codebase:

- The project README explicitly describes a Phase 1 rebuild with listings/search/leads/SEO and "Supabase schema + edge-function + sync worker scaffolding" (`foch-horizon/README.md:3`, `foch-horizon/README.md:10`).
- The README also confirms the frontend defaults to mock data and requires env switching for edge endpoints (`foch-horizon/README.md:28`, `foch-horizon/README.md:30`, `foch-horizon/README.md:36`).
- The API client defaults to `mock` mode unless `VITE_API_MODE=edge` and `VITE_API_BASE_URL` are set (`foch-horizon/src/lib/api/client.ts:1`, `foch-horizon/src/lib/api/client.ts:6`, `foch-horizon/src/lib/api/client.ts:9`).
- Supabase backend artifacts are labeled as scaffolding/contracts in the backend README (`foch-horizon/supabase/README.md:3`, `foch-horizon/supabase/README.md:12`).
- The provider sync worker is explicitly a scaffold with TODOs for provider access and upsert logic (`foch-horizon/supabase/workers/provider-sync.ts:1`, `foch-horizon/supabase/workers/provider-sync.ts:33`, `foch-horizon/supabase/workers/provider-sync.ts:52`).
- Edge endpoint integration tests exist but are opt-in and skipped unless env flags are set (`foch-horizon/src/test/edge-endpoints.integration.test.ts:13`, `foch-horizon/src/test/edge-endpoints.integration.test.ts:32`, `foch-horizon/src/test/edge-endpoints.integration.test.ts:73`).

Local checks run on the current repo:

- `npm run lint`: passed with 7 warnings (0 errors)
- `npm test`: 28 tests passed, 4 skipped (edge integration tests skipped)
- `npm run build`: passed; main JS chunk is large (`~749.71 kB` minified, `~226.05 kB` gzip) and triggers chunk-size warning

## 3. Brutally Honest Status (What Is Done vs. What Is Not)

### What is already strong / valuable

- Real frontend implementation exists for many routes/pages (listings, detail, city hubs, legal, contact, services, favorites, chatbot UI).
- Good UX effort is visible (animations, search drawer, route-level SEO metadata, legacy redirects).
- Supabase schema and several edge functions are already implemented (properties, cities, leads, reviews, chatbot).
- Test suite exists and is not trivial (listing utils, leads, chatbot behavior, edge contract tests).

### What is still incomplete / risky (and costs real money)

- The system is still mock-first by default, so "it works locally" does not equal "production is ready" (`foch-horizon/README.md:30`, `foch-horizon/src/lib/api/client.ts:6`).
- Provider feed sync is not implemented yet (currently scaffold/TODO), which is the core dependency for live inventory (`foch-horizon/supabase/workers/provider-sync.ts:33`, `foch-horizon/supabase/workers/provider-sync.ts:52`).
- Edge contract parity is incomplete:
  - Frontend sends many listing filters in edge mode (`q`, bedrooms, bathrooms, garages, surface, terrain, features, sort), but the current `/api/properties` edge function only handles a subset (transaction/type/city/priceMin/priceMax) (`foch-horizon/src/features/listings/api/properties.service.ts:136`, `foch-horizon/src/features/listings/api/properties.service.ts:142`, `foch-horizon/src/features/listings/api/properties.service.ts:153`, `foch-horizon/supabase/functions/properties-search/index.ts:57`, `foch-horizon/supabase/functions/properties-search/index.ts:70`).
  - Frontend `Property` type is camelCase, but `/api/properties/:id` returns raw Supabase rows (`*`) with nested DB payloads; no mapping layer is applied in `getPropertyById()` (`foch-horizon/src/types/domain.ts:46`, `foch-horizon/src/features/listings/api/properties.service.ts:201`, `foch-horizon/supabase/functions/property-detail/index.ts:18`, `foch-horizon/supabase/functions/property-detail/index.ts:29`).
  - Frontend `City` type is camelCase, while city edge functions return raw DB rows (`select("*")`) and client service has no mapper (`foch-horizon/src/types/domain.ts:9`, `foch-horizon/src/features/cities/api/cities.service.ts:7`, `foch-horizon/supabase/functions/cities-list/index.ts:11`, `foch-horizon/supabase/functions/city-detail/index.ts:18`).
- Frontend expects `/api/properties/stats` in edge mode, but this endpoint is not present in current Supabase functions (`foch-horizon/src/features/listings/api/properties.service.ts:345`, `foch-horizon/src/features/listings/api/properties.service.ts:348`).
- Some UI data uses local fallbacks (market counters and reviews), which is fine for UX resilience but not a substitute for live integrations (`foch-horizon/src/features/listings/api/properties.service.ts:345`, `foch-horizon/src/features/content/api/googleReviews.service.ts:50`, `foch-horizon/src/features/content/api/googleReviews.service.ts:150`).
- Cookie/legal pages exist, but a full CMP/cookie banner implementation is not clearly present in the active app flow (there is state for consent, but not an obvious banner component) (`foch-horizon/src/lib/state/useUiStore.ts:7`).

## 4. Recommended Commercial Scope (From Current Repo to Production)

Included in this quotation:

- API contract alignment and edge/frontend data mapping completion (cities, property detail, filter parity, stats endpoint)
- Provider feed integration completion (authenticated fetch, normalization, upsert, image/features sync, off-market logic)
- Supabase deployment/config hardening (env secrets, routing, function deployment, RLS validation, smoke checks)
- Frontend hardening for edge mode and error-path QA
- Performance pass (bundle splitting / chunking strategy, image handling, load testing pass)
- SEO/redirect launch validation
- QA/UAT, bugfix pass, launch checklist, and short hypercare support after go-live
- Project management and client review rounds (bounded)

## 5. Pricing (Production Launch from Current Repository Baseline)

Blended delivery rate used for estimation: `€90/hour` (senior full-stack + QA + PM blended rate)

| Work Package | Est. Hours | Subtotal |
|---|---:|---:|
| Technical gap audit, final scope lock, delivery plan | 24h | €2,160 |
| API parity + mapping layer completion (cities/property detail/stats/filter parity) | 96h | €8,640 |
| Provider feed sync implementation (worker + normalization + upserts + reconciliation) | 120h | €10,800 |
| Supabase deployment/config/security hardening | 40h | €3,600 |
| Frontend edge-mode hardening and integration fixes | 64h | €5,760 |
| Performance optimization + SEO/redirect launch pass | 36h | €3,240 |
| QA/UAT, regression fixes, go-live, hypercare | 56h | €5,040 |
| Project management, client communication, review cycles | 28h | €2,520 |
| **Subtotal (Delivery)** | **464h** | **€41,760** |
| Contingency reserve (unknowns in provider feed/data quality, 12.1%) | 56h | €5,040 |
| **Total Authorized Budget (Recommended)** | **520h cap** | **€46,800** |

### Commercial structure (recommended)

- This should be contracted as a capped delivery budget (`€46,800 excl. VAT`) with milestone billing.
- Unused contingency hours are not invoiced.
- Any scope outside Section 4 requires written change approval.

## 6. Timeline (Realistic, Not Marketing)

Estimated delivery time: `8 to 12 weeks` from project kickoff, assuming timely client access and feedback.

Typical schedule:

- Week 1: scope lock, env access, deployment setup, edge parity audit
- Weeks 2-4: provider feed integration + data mapping completion
- Weeks 4-6: frontend edge hardening + API parity + missing endpoint(s)
- Weeks 6-8: QA/UAT + performance + SEO/redirect validation
- Weeks 8-10: content/legal validation, launch prep, production rollout
- Weeks 10-12: buffer for provider/API surprises and client-side delays

## 7. Payment Schedule (Suggested)

- 30% on signature / kickoff
- 30% after backend integration and edge parity milestone
- 25% at staging UAT delivery
- 15% at production launch (or handover if launch is delayed by client dependencies)

## 8. Client Responsibilities (Assumptions)

This quotation assumes the client provides, on time:

- Provider feed/API credentials and documentation (or export format samples)
- Access to domain/DNS and hosting/Supabase accounts
- Final legal text approval (privacy/cookies/legal notices)
- Branding/content/photo approvals and review feedback within 2-3 business days
- A named decision-maker for scope and UAT signoff

If these are delayed, timeline extends and may affect cost.

## 9. Explicit Exclusions (Not Included)

- CMS / back-office for editors or agents
- CRM/ERP/extranet bi-directional integration beyond the feed sync described above
- Multilingual versions
- Paid media setup, SEO content production, copywriting campaigns
- Formal legal compliance certification (CNIL/GDPR legal advice)
- Cookie CMP license and implementation (unless added as optional item)
- Advanced analytics dashboards/reporting
- Ongoing maintenance after hypercare

## 10. Optional Add-Ons (Commonly Requested Later)

| Optional Item | Budget Range |
|---|---:|
| Cookie banner/CMP + consent mode integration (GTM/GA4-ready) | €2,400 - €4,200 |
| Ongoing maintenance retainer (8h/mo) | €720 / month |
| Ongoing maintenance retainer (16h/mo) | €1,440 / month |
| Additional SEO/performance optimization sprint | €2,500 - €6,000 |
| Basic admin/CMS capability (content editing) | €9,000 - €28,000 |

## 11. Third-Party Operating Costs (Monthly, Estimated)

Expected monthly operating costs after launch (not included in project fee):

- Hosting / frontend runtime: `€20 - €150`
- Supabase (DB + edge functions): `€25 - €300+` depending traffic/storage
- Email notifications (Resend or equivalent): `€0 - €50+`
- Google Places API (reviews): `€5 - €80+`
- OpenAI chatbot usage: `€20 - €500+` (highly usage-dependent)
- Monitoring/logging: `€0 - €100+`

Practical total range for this project: `~€70 to €1,180+/month`

## 12. Context: Replacement Value of the Existing Work

If the client asked for this same solution from zero (design + frontend + backend + testing + SEO routing + integrations), the likely commercial value is materially higher than the "finish and launch" quote above.

Reasonable full-build replacement range (from scratch): `€55,000 - €85,000+ excl. VAT`

This matters because the current repository already contains meaningful implementation value, but it still requires serious integration and hardening work to be production-grade.

## 13. Final Recommendation

If the client wants a serious launch (not a demo), quote and contract this as:

- **Phase 1 Production Launch Budget: `€46,800 excl. VAT` (capped, with contingency included)**

If they push for a much lower number, the only honest way to reduce price is to remove scope (for example: no provider sync automation, no chatbot, no reviews, fewer QA cycles, or no performance pass).

