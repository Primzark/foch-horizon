# Foch Immobilier analytics tracking map

## Scope and release state

This map describes Foch Immobilier's consent-gated analytics implementation. Production collection is limited to `fochimmobilier.com` and `www.fochimmobilier.com`; preview, development, and local hosts do not load GTM. `/admin` is excluded. The site code sends virtual `page_view` events after consent and on route or search-URL changes, once per page URL; hash-only changes do not create another view. The local implementation is not deployed yet.

The site code emits the event map below through the existing GTM data layer. The verified Foch property is `556502046`; its web stream is `15865178662` (`G-NSPH0CCF4C`, `https://www.fochimmobilier.com`). The currently published GTM container is version 6 and contains the existing Google tag and GA4 event tag. Keep both tags; update their settings and the existing event trigger, then publish. No tag has been added.

## Verified current configuration

- The published container's host condition allows `fochimmobilier.com` and `www.fochimmobilier.com`. Its Google tag fires on `gtm.init` and has no explicit `send_page_view=false` setting. Google Tag Manager's default is to send an initial page view, so it must be disabled when the site sends its own sanitized page views.
- The GA4 event tag currently forwards only the previous event subset: the six `comparison_*` events, `property_view`, `gallery_opened`, `lead_submitted`, and `phone_clicked`. It currently sends `property_id` and the legacy `property_ids` parameter.
- The Foch stream currently has Enhanced Measurement page history changes, form interactions, and site search enabled. Those settings can produce page views, form events, and search terms outside the selected event map. Disable those three automatic sources as part of the coordinated release; leave other stream settings alone.
- Before these code changes, the available report from 2026-09-29 through 2026-11-03 showed 5,336 `page_view`, 101 `form_start`, 11 `view_search_results`, and 2 `lead_submitted` events. The stream settings confirm automatic form and search measurement were enabled.
- `lead_submitted` is already a GA4 key event and is configured to count once per event. No conversion setting change is needed.
- Event-scoped custom dimensions are now registered on the Foch property for `source`, `action`, `form_type`, and `method`, with clear display names. `property_id` was already registered.

## Event map

| Area | Event(s) | Parameters |
| --- | --- | --- |
| Every public route | `page_view` | `page_location`, sanitized `page_referrer`, `page_title` |
| Homepage, header, and search drawer | `search_opened` | `source` |
| Homepage and search surfaces | `search_submitted` | `source`, `action` (`keyword`, `filters`, `suggested_search`, `browse_all`) |
| Search filters | `filter_applied` | `source`, `action=apply_filters`; only emitted when a non-default filter is active |
| Property detail | `property_view` | `property_id`, `source` |
| Property detail gallery | `gallery_opened` | `property_id`, `source`, `action=open_gallery` |
| Property share/reference | `property_shared`, `property_reference_copied` | `property_id`, `source`, `action`, `method` |
| Property contact actions | `property_contact_clicked` | `property_id`, `source`, `action`, `method` |
| Saved listings | `property_liked`, `property_unliked`, `favorites_opened` | `property_id` where relevant, `source`, `action` |
| Comparison | `comparison_add`, `comparison_remove`, `comparison_open`, `comparison_differences_toggle`, `comparison_listing_click`, `comparison_contact_click` | `property_id` where relevant, `source`, `action`/`method` where relevant |
| Contact links | `phone_clicked`, `email_clicked` | `property_id` where relevant, `source`, `method` |
| Contact, valuation, property, and chatbot forms | `form_start`, `form_error`, `lead_submitted` | `property_id` where relevant, `source`, `form_type`, `action` |
| Property alerts | `alert_form_opened`, `alert_subscribed` | `source`, `form_type`, `action`, `method` where relevant; `alert_subscribed` fires only after email confirmation |
| AI assistant | `chatbot_opened`, `chatbot_message_sent`, `chatbot_tool_action_clicked`, `chatbot_tool_handoff_prefill_opened` | safe `source`, `property_id`, `action`, and `form_type` where relevant |

Pages such as About, Services, Reviews, Geography, and legal content use the shared page view and existing contact/form actions. Decorative controls, scrolling, and individual photo transitions have no custom events.

## Event parameter rules

- Event payloads are allowlisted in `src/lib/analytics/events.ts`. The only custom event parameters sent to GTM are `property_id`, `source`, `action`, `form_type`, and `method`.
- Every event clears those optional data-layer variables, plus the legacy `property_ids` variable, before setting the current event’s safe values. The GTM event tag should forward only `property_id`, `source`, `action`, `form_type`, and `method` and should remove the unused legacy `property_ids` parameter.
- Search terms, filters, email addresses, phone numbers, names, form contents, chatbot text, URL paths from chatbot actions, and error details are not event parameters.
- The URL sanitizer removes token, authorization, session, reset/confirmation, personal-data, and free-text search query parameters from `page_location` and `page_referrer`. UTM/campaign and ordinary structured search-filter parameters are preserved.
- `lead_submitted` is emitted only after the lead API resolves successfully. It is already designated as a GA4 key event; phone and email clicks remain separate engagement events.

## GTM expansion checklist

Update the existing GA4 event trigger to include:

```regex
^(search_opened|search_submitted|filter_applied|property_view|gallery_opened|property_shared|property_contact_clicked|property_reference_copied|lead_submitted|form_start|form_error|phone_clicked|email_clicked|alert_form_opened|alert_subscribed|favorites_opened|property_liked|property_unliked|comparison_(add|remove|open|differences_toggle|listing_click|contact_click)|chatbot_(opened|message_sent|tool_action_clicked|tool_handoff_prefill_opened))$
```

Keep the existing production-host condition. Add data-layer variables for `source`, `action`, `form_type`, and `method`; reuse the existing `property_id` variable and remove `property_ids`. Set `send_page_view=false` on the existing Google tag. In the Foch web stream, turn off automatic page history changes, form interactions, and site search so the consent-gated site code is the single source for sanitized `page_view`, `form_start`, and `search_submitted` events. Do not add tags. Verify the published setup sends one event per action, only after consent, and nothing from preview hosts.

## Verification status

Local tests cover event allowlisting, consent gating, parameter clearing, URL redaction, and one page view per URL navigation including React StrictMode. The focused analytics suite passes 27 tests; typecheck and the SPA production build pass. Local desktop and mobile smoke tests cover search, contact links, and property detail actions. These checks verify the browser-side event intent; they do not confirm GA4 receipt. The live mobile menu still runs the older deployment, which lacks the telephone handler added locally. Production journey and GA4 receipt verification require deploying the site changes and publishing the updated existing GTM configuration. The GTM connector does not currently expose Tag Manager methods, and browser automation is disabled in Work settings.
