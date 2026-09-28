# Foch website update — 28 September 2026

Implemented the requested navigation, compact static homepage banner and French transaction copy with prominent « Depuis 1972 », homepage « Nos belles ventes » section and « Nos dernières ventes » page, Géographie page and history URL redirect, agency photography on all secondary main-menu pages, Avis de valeur labels, larger listing prices and sharing, and source-backed listing badges. « Mon assistant IA » opens the existing assistant. UNIS was removed from the active header, footer, About page and local assistant description.

## Assets and wording still required

- Confirm the specific Le Havre beach photograph by Raoul and its exact attribution. The static homepage currently retains an existing panorama from the site, without attributing it to Raoul.
- Confirm the content and behavior of « Ajouter volet (test) ». No test panel has been published.
- Confirm the sentence for Avis de valeur from https://gallieni-location.fr/page/a-vendre. Candidate: « N’hésitez pas à y faire estimer gracieusement votre bien et ce en toute confidentialité. » It has not been inserted without confirmation.
- Provide the full wording and intended placement of « Le cabinet....jusqu'au bout ».
- Provide/mark confirmed sold listings and their photos for the sales showcase. The current local inventory contains no sold records. The showcase only renders records explicitly marked sold; otherwise it invites visitors to contact the agency for references. Archived or active properties are never presented as sales. The current search feed orders by publication date and does not expose sale dates.

The supplied office photograph is already installed at `/images/agence-foch.jpg`. The original file is untouched; the published copy is resized to 1600 × 1200.

## Listing labels

The source feed has no separate exclusivity, novelty, or sous-compromis fields. Cards use explicit leading labels in source titles and the existing status field. Thus « Sous compromis », « Sous offre », « Exclusivité » and « Nouveautés » are supported without inventing property statuses. A structured sous-compromis field remains a possible future feed enhancement.

## Verification

- Production Vite build passes.
- Existing suite plus sharing and badge tests: 65 tests pass; 8 optional edge integration tests skipped.
- Three additional sales tests pass (truthful filtering, pagination, request failures).
- Changed interface files pass ESLint.
- A separate TypeScript check reports 15 existing errors in chatbot service/component types. The same errors reproduce with the original versions of those two files; the Vite production build is unaffected.
- Desktop/mobile browser checks cover navigation, agency imagery, responsive overflow, assistant opening and property sharing. No lead/contact form was submitted.
