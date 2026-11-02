# Chatbot audit corrections — 2 November 2026

The chatbot uses a shared, build-synchronized geography catalog from the site's guides and legacy district content. Geographic overviews resolve locally before generative retrieval, with a clarification for conflicting locations. Search requests continue through the live inventory tools.

Corrections cover action routing, bounded input, explicit degraded-service messages, district description matching, exact T-room filters, feature exclusions, preservation of follow-up criteria, compact budgets, English search detection, city normalization in comparison scoring, synthetic stream character preservation/cancellation, focus handling and chat accessibility. Multi-town and radius requests receive an explicit clarification rather than silently applying only one place. The evaluation runner supplies the allowed site origin. The keyword RPC now drops common introductory question words.

Validation: Focused chatbot/component regression tests passed; frontend type checking, edge type checking and production build passed. The full suite retains three pre-existing failures outside the chatbot (listing badge, recent-sales query expectation, and homepage autocomplete involving an existing user edit). Lint has no errors and existing unrelated warnings.

Operational limit: Gemini embedding requests return HTTP 402 RESOURCE_EXHAUSTED. No vectors were fabricated or unrelated embedding models mixed into the index. Restore provider quota/billing, then run the existing indexer to restore vector retrieval. Supported geography questions and keyword retrieval work independently of this external blocker.

No lead emails were sent during validation. Existing MainSearchBar work and unrelated untracked files were excluded from publication.
