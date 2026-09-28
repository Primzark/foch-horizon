# Foch website update — 28 September 2026

Implemented the requested navigation, compact static homepage banner and French transaction copy with prominent « Depuis 1972 », homepage « Nos belles ventes » section and « Nos dernières ventes » page, Géographie page and history URL redirect, agency photography on all secondary main-menu pages, Avis de valeur labels, larger listing prices and sharing, and source-backed listing badges. « Mon assistant IA » opens the existing assistant. Its « Ajouter volet (test) » panel now offers example questions that fill the input without sending a request. UNIS was removed from the active header, footer, About page and local assistant description.

## Resolved assets and wording

- The homepage uses Raoul Dufy's *L’Estacade et la Plage du Havre* (circa 1926), photographed by Martpan at MuMa. The photograph comes from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Le_Havre_Mus%C3%A9e_d%27art_moderne_Dufy.jpg) under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Visible credit names the painter, photographer and license and notes the display crop. The museum [identifies the painting](https://www.muma-lehavre.fr/fr/collections/oeuvres-commentees/raoul-dufy/dufy-lestacade-et-la-plage-du-havre).
- The exact sentence « N’hésitez pas à y faire estimer gracieusement votre bien et ce en toute confidentialité. » is used on Avis de valeur with a link to [Gallieni’s source page](https://gallieni-location.fr/page/a-vendre).
- The selling page includes « Le cabinet Foch Immobilier vous accompagne jusqu’au bout de votre projet, de l’avis de valeur à la signature. »

## Source data still required

- Provide or mark confirmed sold listings and their photos for the sales showcase. The live search feed currently contains 51 active sale listings and no sold records. The showcase renders only records explicitly marked sold and otherwise shows an agency-photo callout. Archived or active properties are never presented as sales. The feed does not expose sale dates.

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
