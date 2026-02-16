# Source Realignment Addendum (`fochimmobilier.com`)

Date: 2026-02-16

## Why this addendum exists
The previous alignment pass used `foch-immobilier.fr` as reference.
This addendum supersedes that source for branding/content/gallery decisions and locks the canonical legacy source to:

- `https://www.fochimmobilier.com/`

## Locked legacy assets
- Navbar logo: `https://www.fochimmobilier.com/static/img/logo_unis.png`
- About hero image 1: `https://www.fochimmobilier.com/static/img/fochimmobilier-agence-immobiliere-le-havre-76_1.jpg`
- About hero image 2: `https://www.fochimmobilier.com/static/img/fochimmobilier-agence-immobiliere-le-havre-76_2.jpg`
- Honoraires PDF: `https://www.fochimmobilier.com/static/pdf/honoraires-fochimmobilier-le-havre-76.pdf`
- Facebook URL: `https://www.facebook.com/FochImmo/`

## About page wording source
Content tone/phrasing aligned to `/apropos` on `fochimmobilier.com`:
- "Professionnels de l'immobilier au Havre"
- "Depuis 1972"
- "Conseils de Professionnels & Réseau UNIS"
- Service paragraphs for vente / recherche de bien / location adapted from the same page.

## Gallery mapping used for seeded properties
Each seeded property now points to full image sets extracted from live `fochimmobilier.com/annonce/*` pages (via staticlbi URLs):

- `5139` <- annonce `5139` (6 images)
- `5128` <- annonce `5128` (4 images)
- `5107` <- annonce `5104` (6 images)
- `5099` <- annonce `5095` (5 images)
- `5088` <- annonce `5086` (5 images)
- `5075` <- annonce `5071` (5 images)
- `5061` <- annonce `5061` (7 images)
- `5042` <- annonce `5046` (5 images)

Note: this mapping keeps stable local mock property IDs while expanding gallery coverage with real legacy assets.
