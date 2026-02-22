# Devis Client - Refonte Complete Du Site Foch Immobilier (Design + Rebuild + Mise En Production)

Date : 22 fevrier 2026  
Reference : `DEVIS-FOCH-REFONTE-COMPLETE-2026-02-22`  
Devise : EUR (HT, TVA non incluse)  
Validite : 15 jours calendaires

## 1. Destinataire

Direction / Gerance  
**Foch Immobilier**

## 2. Objet De La Prestation

Conception, redesign, developpement et mise en production d'un **nouveau site immobilier premium** pour Foch Immobilier, sur un perimetre complet incluant :

- strategie et cadrage
- UX/UI design premium
- frontend sur mesure
- backend et logique metier
- base de donnees + API (reference Supabase)
- SEO technique + contenu local + donnees structurees
- integration chatbot
- optimisation performance
- tests / QA / recette
- deploiement / infrastructure
- maintenance mensuelle (obligatoire apres mise en production)

Ce devis est volontairement positionne comme un **devis de reconstruction complete ("from scratch")** a valeur de marche, et non comme un simple chiffrage de "finition" du code existant.

Version de presentation : **prete a envoi client** (structure commerciale, hypothese de maintenance obligatoire incluse).

## 3. Positionnement Honnete (Brutal Mais Professionnel)

Ce projet n'est **pas** un site vitrine standard.

Le cout ne vient pas principalement de "faire des pages". Il vient surtout de :

- la qualite de la conception UX/UI (site premium, pas template)
- les integrations de donnees immobilieres et la fiabilisation du backend
- le SEO local et les donnees structurees (schema.org) a un niveau propre
- la production de contenus utiles (dont page historique / quartiers)
- la recette multi-devices, les corrections et la mise en production fiable
- la performance (images, bundle, animations, Core Web Vitals)
- le chatbot (logique, garde-fous, fallback, couts d'exploitation)

Les postes les plus souvent sous-estimes sur ce type de projet :

- flux de donnees reelles (qualite, normalisation, cas limites)
- allers-retours client et validations tardives
- SEO de detail (redirections, balisage, contenus locaux, schema)
- recette et regressions
- deploiement / DNS / secrets / environnement / rollback

Un budget "bas" est possible uniquement en retirant des briques (chatbot, contenu local riche, automatisation flux, QA, optimisation performance, niveau de design).

## 4. Base D'Estimation Et Repere Marche (France Regionale, Niveau Serieux/Premium)

### Base de complexite retenue (observations sur un perimetre comparable)

Le chiffrage ci-dessous est aligne sur un perimetre comparable a celui deja visible dans le projet `foch-horizon`, qui montre notamment :

- un site multi-pages avec routage riche (pages institutionnelles, listings, detail, avis, legal, page historique, pages locales)
- SEO structure et balisage JSON-LD sur plusieurs pages
- composants d'animations / compteurs animes / effets visuels
- chatbot immobilier (UI + logique + endpoint backend)
- backend Supabase avec plusieurs fonctions edge + worker de synchronisation fournisseur
- socle de tests et artefacts d'audit SEO/performance deja presents

### Repere marche utilises (calibrage des fourchettes)

Positionnement choisi : **France regionale (Normandie / province), niveau serieux/premium**, donc :

- au-dessus des tarifs "low-cost" / template
- en dessous (ou a l'interieur de la borne basse) de certaines agences parisiennes haut de gamme

Repere public de marche utilise pour calibrer les taux / fourchettes :

- **Malt (barometres 2026)** : developpeurs, UX designers, chefs de projet tech, consultants SEO (TJM moyens autour de ~500-560 EUR/j selon specialite)
- **BDM / Fyte (France, reference 2024)** : ecarts Paris vs province sur plusieurs profils tech (frontend, UX/UI, DevOps, PM/PO)
- **La Fabrique du Net / Lemon Interactive** : ordres de grandeur de budgets agence pour sites sur mesure (contexte de marche, pas tarification contractuelle de ce projet)

Important : ces sources servent a **positionner** le devis. Le montant final depend surtout du **volume reel de travail** (pages, contenus, integrations, QA, iterations), pas d'un "prix catalogue" par page.

## 5. Perimetre Global Inclus (Vision Complete De La Refonte)

### Inclus dans le perimetre de ce devis (baseline)

- Audit initial, cadrage fonctionnel, priorisation et lotissement
- Architecture de l'information, parcours utilisateur, wireframes et maquettes UI premium (desktop + mobile)
- Design system / composants UI reutilisables
- Frontend sur mesure (pages, formulaires, recherche, listings, details, sections editoriales, animations)
- Page historique / contenu local enrichi avec plusieurs quartiers (volume comparable a la page historique presente dans le scope)
- Integration d'images libres de droits / sous licence : selection, recadrage, optimisation, integration (hors shooting)
- Backend metier (leads, recherche, endpoints, logique de validation, securisation)
- Base de donnees et API (Supabase en reference), synchronisation flux biens et normalisation des donnees
- SEO technique : meta, canonical, sitemap, robots, redirects, schema.org, maillage interne
- SEO contenu local et integration editoriale (pages institutionnelles + contenu local cible)
- Chatbot immobilier integre (logique, garde-fous, fallback, capture de leads / redirection)
- Optimisation performance (bundle, images, lazy-loading, animations, CWV)
- Tests, recette, corrections, preproduction, mise en production, hypercare court
- Maintenance mensuelle obligatoire apres lancement (supervision/correctifs/evolutions mineures selon pack contractuel)

### Variante technique (hors base)

- **Firebase** : possible, mais ce devis est chiffre sur une **reference Supabase**. Un passage a Firebase implique une etude d'impact (architecture, auth, regles, fonctions, couts d'usage) et peut augmenter le budget / delai.

## 6. Detail Chiffre Par Categorie

### 6.1. Lots projet (hors maintenance mensuelle)

| Categorie | Inclus (precis et concret) | Fourchette basse HT | Fourchette haute HT | Pourquoi ce cout (justification) | Delai estime | Notes / risques |
|---|---|---:|---:|---|---|---|
| Strategy & Audit | Audit existant / concurrence locale, cadrage fonctionnel, perimetre V1, architecture de contenus, roadmap, priorisation, ateliers, specification des lots et criteres de recette | 4,500 EUR | 9,000 EUR | Travail senior de cadrage indispensable pour eviter les surcouts en dev/QA. Sur ce type de projet, une mauvaise specification coute plus cher qu'un bon cadrage. | 2 a 4 sem. (debut projet) | Fortement dependant de la disponibilite du decisionnaire client. Peu parallellisable au demarrage. |
| UX/UI Design | IA, wireframes, direction artistique premium, maquettes desktop/mobile, design system, prototypes clickables, variantes critiques (home, listings, detail, contact, pages de contenu local), adaptation responsive | 12,000 EUR | 24,000 EUR | Niveau premium + volume de templates reels (pas une home seule). Le cout vient des iterations et de la cohesion systeme, pas seulement de "dessiner". | 4 a 8 sem. (demarre S1/S2) | Derive vite si les allers-retours design ne sont pas limites. Nombre de rounds a cadrer contractuellement. |
| Frontend Development | Developpement React/Vite des pages et composants, routage, formulaires, filtres listings, detail bien, pages institutionnelles, animations (ex. compteurs), responsive, accessibilite de base, integration UI du chatbot | 22,000 EUR | 40,000 EUR | Gros volume de composants + comportements + responsive + etats d'erreur. Les animations premium et pages editoriales longues augmentent la charge. | 8 a 16 sem. (partiellement en parallele) | Risques : changements de maquettes tardifs, volume de contenus final, compatibilite mobile et regressions post-integration API. |
| Backend Development | Endpoints metier, logique leads/contact, validation serveur, securisation, gestion erreurs, fonctions edge/serverless, logique chatbot server-side, logging technique de base, traitements metier | 14,000 EUR | 26,000 EUR | Le backend immobilier n'est pas "simple formulaire" : validation, robustesse, erreurs, securite, logique de routage metier et fiabilite production. | 6 a 12 sem. (parallele possible avec front) | Risques : exigences metier non formalisees, gestion des consentements, cas limites de recherche / disponibilite. |
| Database & API Integration | Schema DB, migrations, RLS/politiques, contrats API, integration flux biens (fournisseur), normalisation/upsert, mapping front<->API, sync images/caracteristiques/statuts, Google Reviews / APIs externes utiles | 12,000 EUR | 24,000 EUR | Poste critique et souvent sous-estime : qualite des donnees, mapping et synchronisation determinent la fiabilite du site et la charge de maintenance. | 6 a 12 sem. (chevauche backend/front) | Risque majeur : qualite du flux fournisseur, documentation incomplete, changements de format. Variante Firebase : surcout + delai possible. |
| SEO (technical + content) | Audit SEO technique, architecture SEO locale, metas/canonicals, redirects, sitemap/robots, donnees structurees schema.org, maillage interne, contenu institutionnel optimise, contenu local (incl. page historique / quartiers) et integration editoriale | 10,000 EUR | 20,000 EUR | Ici on chiffre un vrai SEO de lancement (technique + contenu), pas uniquement "balises title". La production de contenus qualitatifs et le balisage schema prennent du temps. | 4 a 12 sem. (continu, puis finalisation pre-launch) | Risques : validations tardives des textes, demandes de pages locales supplementaires, modifications de wording legal/commercial. |
| Chatbot Integration | Conception cas d'usage, UX conversationnelle, integration UI/UX, logique de reponse, fallback, garde-fous, routage vers pages / lead forms, configuration IA/API, tests conversationnels et messages d'erreur | 5,500 EUR | 12,000 EUR | "Brancher un widget" est peu couteux. Un chatbot utile, cadre et testable coute du temps (prompts, fallback, UX, latence, securite, suivi). | 2 a 6 sem. (apres base front/back disponible) | Risques : latence IA, couts d'usage, attentes trop larges ("assistant expert") sans cadrage metier. |
| Performance Optimization | Audit perf, optimisation images, compression/format, lazy-loading, split de bundles, priorisation chargement, tuning animations, budget performance, verification CWV et corrections ciblees | 3,500 EUR | 8,000 EUR | Sur un site riche (images + animations + data), la performance demande une phase dediee. Ce n'est pas "automatique" meme avec un bon framework. | 1.5 a 4 sem. (principalement fin de projet + passes intermediaires) | Risques : contenus lourds, assets ajoutes tard, scripts tiers, exigences visuelles contradictoires avec performance. |
| Testing & QA | Plan de recette, tests fonctionnels, multi-device / multi-browser, verification formulaires / parcours, tests integration, regression, support UAT, triage des bugs, corrections de stabilisation | 8,000 EUR | 16,000 EUR | La QA absorbe les variations de qualite et les surprises d'integration. C'est un poste essentiel pour une mise en ligne commerciale fiable. | 3 a 8 sem. (continu + pic final) | Risques : UAT client tardive, flux reelles livrees tard, iterations multiples apres preprod. |
| Deployment & Infrastructure | Setup environnements (dev/staging/prod), secrets/config, DNS/SSL, pipelines de deploiement, monitoring/logs de base, sauvegardes/rollbacks, checklist go-live, mise en production, hypercare court | 5,000 EUR | 10,000 EUR | Le deploiement pro inclut la reduction de risque (rollback, monitoring, secrets), pas seulement "mettre en ligne". | 1 a 3 sem. + hypercare 1 a 2 sem. | Risques : acces DNS/hebergement tardifs, certificats, comptes tiers, politiques IT client. |

### 6.2. Maintenance (mandatory monthly retainer) - obligatoire apres mise en production

| Categorie | Inclus (precis et concret) | Fourchette basse HT | Fourchette haute HT | Pourquoi ce cout (justification) | Delai estime | Notes / risques |
|---|---|---:|---:|---|---|---|
| Maintenance (mandatory monthly retainer) | Correctifs, petites evolutions, supervision basique, mises a jour mineures, support technique cadre, suivi chatbot/API, optimisation ponctuelle. **Pack minimum contractuel : 8h/mois** (packs superieurs possibles). | 960 EUR / mois | 3,600 EUR / mois | Le retainer paie la disponibilite + priorisation + interventions fractionnees (plus couteuses qu'un sprint planifie), ainsi que le maintien operationnel d'un site avec integrations et chatbot. | Mensuel reconductible (apres mise en production) | N'inclut pas nouvelles features majeures, refonte, migration, gros chantiers SEO/contenu, SLA 24/7. Engagement initial minimum recommande/contractualise : 12 mois. |

## 7. Synthese Budgetaire (Minimum Realiste + Premium + Recommande)

### Totaux projet de realisation (hors maintenance mensuelle obligatoire)

| Scenario | Sous-total lots projet (sections 6.1) | Reserve de risque recommandee | Total estime HT |
|---|---:|---:|---:|
| **Minimum realiste** (scope complet cadre, arbitrages stricts) | 96,500 EUR | 12,500 EUR | **109,000 EUR HT** |
| **Version recommandee** (equilibre qualite / delai / risque) | 143,000 EUR | 17,000 EUR | **160,000 EUR HT** |
| **Version premium** (execution renforcee, plus de contenu/QA/iterations) | 189,000 EUR | 28,500 EUR | **217,500 EUR HT** |

### Comment lire ces montants

- **Minimum realiste** : ce n'est pas un "discount". C'est le minimum defendable pour livrer un projet commercial complet sans bricolage majeur.
- **Version recommandee** : la plus probable pour un resultat premium propre, avec reserve de risque raisonnable.
- **Version premium** : scenario de confort (design/QA/contenu/perf renforce, iterations plus nombreuses, charge de coordination plus forte).

### Maintenance obligatoire (contrat post-lancement)

Maintenance mensuelle **obligatoire** a compter de la mise en production :

- **Pack minimum contractuel** : `8h/mois`
- Fourchette : **960 a 1,360 EUR HT / mois**
- Equivalent annuel (12 mois) : **11,520 a 16,320 EUR HT**

### Engagement total de premiere annee (realisation + maintenance obligatoire 12 mois, pack 8h/mois)

| Scenario | Total projet HT | Maintenance obligatoire (12 mois) | Engagement total premiere annee HT |
|---|---:|---:|---:|
| **Minimum realiste** | 109,000 EUR | 11,520 a 16,320 EUR | **120,520 a 125,320 EUR HT** |
| **Version recommandee** | 160,000 EUR | 11,520 a 16,320 EUR | **171,520 a 176,320 EUR HT** |
| **Version premium** | 217,500 EUR | 11,520 a 16,320 EUR | **229,020 a 233,820 EUR HT** |

### Recommandation commerciale (client)

Pour un projet de ce niveau, la recommandation est de contractualiser :

- un **budget plafonne (cap) a 160,000 EUR HT** pour la realisation
- **+ un contrat de maintenance obligatoire** (minimum `8h/mois`) des la mise en production

avec :

- une reserve de risque explicite
- facturation des imprevus uniquement si consommes
- procedure de validation ecrite pour tout hors perimetre

## 8. Planning Global Realiste (Macro + Chevauchements)

### 8.1. Delais par categorie

Les delais par categorie sont indiques dans la colonne **"Delai estime"** du tableau de la section 6.

Point important :

- plusieurs lots sont **parallellisables** (UX/UI, front, backend, DB/API, SEO)
- certains jalons sont **goulots d'etranglement** (cadrage initial, validations design, acces flux/API, recette finale, go-live)

### 8.2. Planning macro projet (realiste, equipe compacte)

Estimation globale : **16 a 24 semaines** en equipe compacte (designer + full-stack senior + support SEO/content + QA ponctuelle), sous reserve de validations client normales.

#### Exemple de macro-planning

- **Semaines 1-2** : cadrage, audit, architecture de contenus, specification V1
- **Semaines 2-6** : UX/UI (wireframes + maquettes), debut architecture technique
- **Semaines 4-12** : developpement frontend + backend (parallele partiel)
- **Semaines 5-13** : DB/API + flux fournisseur + normalisation + integrations externes
- **Semaines 6-14** : SEO technique et integration progressive des contenus
- **Semaines 9-14** : integration chatbot (apres base front/back disponible)
- **Semaines 12-16** : optimisation performance + stabilisation
- **Semaines 13-18** : QA, recette, corrections, preproduction
- **Semaines 17-20** : mise en production + hypercare
- **Semaines 20-24** : marge de buffer (retards client / flux / validations / correctifs tardifs)

### Commentaire brutalement honnete sur le delai

Un planning "4 a 6 semaines" pour ce perimetre est **non realiste** sauf a supprimer une partie importante du scope (design premium, integrations reelles, SEO contenu, QA, performance, chatbot).

En mode **freelance solo**, le meme perimetre peut facilement prendre **5 a 8 mois** selon disponibilite client et volume de contenu.

## 9. Echeancier De Paiement Recommande

### Proposition (4 jalons)

- **30%** a la signature / kickoff (reservation capacite + cadrage)
- **20%** a la validation cadrage + UX/UI (maquettes et specification V1 validees)
- **30%** a la livraison preproduction / feature-complete (debut recette client)
- **20%** a la mise en production (ou a la livraison si mise en ligne retardee par dependances client)

La maintenance mensuelle obligatoire demarre a la date de mise en production (ou a la date de mise a disposition production si le client decale l'ouverture publique).

### Variante possible

Un schema **30/40/30** reste possible si le client prefere un contrat plus simple (souvent utilise sur des projets plus compacts ou des jalons fusionnes).

## 10. Maintenance Mensuelle (Obligatoire)

### Regle contractuelle

La maintenance du site est **mandatory / obligatoire** pour ce projet compte tenu :

- des integrations de donnees et APIs
- du chatbot et de ses dependances d'usage
- des mises a jour et correctifs post-lancement
- du besoin de supervision et de reactivite minimale sur un site commercial

**Pack minimum impose : `8h/mois`** a compter de la mise en production.  
Les packs `16h/mois` et `24h/mois` sont des **montes en charge**, pas des options de substitution a "pas de maintenance".

### Packs de maintenance (hors couts tiers)

| Pack | Prix HT / mois | Inclus | Non inclus |
|---|---:|---|---|
| `8h/mois` (**minimum contractuel**) | 960 a 1,360 EUR | Correctifs, petites evolutions, supervision basique, support technique cadre, ajustements mineurs chatbot/API, optimisation legere | Nouvelles features importantes, refonte UX/UI, migration infra, gros chantier SEO/contenu |
| `16h/mois` | 1,840 a 2,560 EUR | Idem + cadence reguliere d'amelioration, micro-optimisations continues, support metier plus reactif | Projets structurants (CRM, back-office, refonte de parcours, multi-langue) |
| `24h/mois` | 2,640 a 3,600 EUR | Idem + backlog evolutif mensuel et suivi proactif plus soutenu | SLA 24/7, astreinte, replatforming complet, nouvelles integrations lourdes |

### Conditions utiles a preciser contractuellement

- engagement initial minimum : **12 mois** (recommandation forte et base de ce devis)
- facturation mensuelle a terme a echoir ou a terme echu (a definir au contrat)
- heures non consommees : reportables (ou non) selon contrat
- priorite / delai de prise en charge : a definir (SLA optionnel)
- forfaits mensuels revisables si trafic, chatbot ou integrations augmentent fortement

## 11. Couts Tiers Recurrents (Hors Devis) - Estimations

Ces couts ne sont **pas inclus** dans le devis de realisation.

| Poste | Estimation mensuelle (HT) | Commentaire |
|---|---:|---|
| Hosting / runtime frontend | 20 a 200 EUR | Selon trafic, previews, bande passante, logs |
| Supabase (DB + auth + storage + edge/functions) | 25 a 500+ EUR | Tres dependant du trafic, stockage images, volume API, retention logs |
| Email transactionnel (leads / notifications) | 0 a 80+ EUR | Selon volume et fournisseur |
| Google Places API (avis) | 0 a 100+ EUR | Selon appels et cache |
| API IA / chatbot (OpenAI ou equivalent) | 20 a 800+ EUR | Fortement usage-dependant (trafic + longueur des conversations) |
| Monitoring / logs / alerting | 0 a 150+ EUR | Outils choisis et retention |
| CMP cookies (si retenu) | 10 a 150+ EUR | Licence selon fournisseur et trafic |

**Ordre de grandeur global** : **~75 a 1,980+ EUR / mois** (selon trafic, usage IA, stack/outils retenus)

## 12. Exclusions Claires (Non Inclus)

### Exclusions fonctionnelles

- Back-office / CMS complet pour equipe agence (hors mini-ajustements ponctuels)
- CRM/ERP/extranet bidirectionnel complexe
- Multi-agence / multisite / franchises
- Application mobile native (iOS/Android)
- Moteur d'estimation automatique base sur datasets tiers payants / AVM

### Exclusions legales / conformite

- Conseil juridique / validation CNIL/GDPR par avocat
- Certification legale de conformite
- Audit d'accessibilite RGAA certifiant (un niveau de bonnes pratiques peut etre applique, mais pas la certification)

### Exclusions licences / outils tiers

- Licences payantes (CMP, assets premium, polices premium, APIs payantes, outils SEO, monitoring)
- Surcouts d'usage IA / chatbot / storage / trafic

### Exclusions contenus / production media

- Shooting photo / video / drone
- Redaction illimitee ou campagnes editoriales mensuelles
- Traduction multilingue
- Saisie / reprise manuelle massive de donnees hors perimetre convenu

### Exclusions integrations lourdes

- Connecteurs specifiques vers logiciels metier non documentes
- Integrations comptables / telephonie / call tracking / marketing automation avancee
- SSO enterprise / IAM complexe

## 13. Risques Et Facteurs D'Augmentation Budgetaire

### Risques principaux

- **Qualite du flux fournisseur / API immobiliere** : formats instables, champs manquants, medias incoherents, statuts incomplets
- **Retards d'acces** : DNS, hebergement, comptes techniques, APIs, boites email, clefs IA
- **Retours client tardifs** : blocage design, contenus, recette, validation legale
- **Changements de perimetre** en cours de projet : nouvelles pages, nouvelles integrations, nouvelles regles metier
- **Contraintes SEO / conformite decouvertes tard** : redirects, contenus, mentions, cookies/CMP
- **Couts tiers qui montent** : IA, Google APIs, stockage, trafic, logs
- **Chatbot** : latence, moderation, couts d'usage, attentes metier trop larges

### Exemples de hausses budgetaires frequentes (ordre de grandeur)

- Flux data complexe / mauvaise qualite : **+5,000 a +25,000 EUR**
- Pages locales / contenus supplementaires (au-dela du volume prevu) : **+3,000 a +15,000 EUR**
- Passage a une architecture differente (ex. Firebase apres cadrage Supabase) : **+10% a +25%** sur les lots backend + DB/API
- Rounds de design / recette supplementaires non prevus : **+2,000 a +12,000 EUR**
- Integrations tierces non documentees : **+4,000 a +20,000 EUR**

## 14. Hypotheses Client / Dependances (Conditions De Reussite)

Ce devis repose sur les hypothese suivantes :

- **1 langue (francais)** pour la V1
- Refonte premium + design system + responsive complet
- Volume de contenus institutionnels et locaux **comparable** au perimetre de reference (incluant page historique / quartiers)
- Integration d'images libres de droits / sous licence (selection + optimisation) **sans shooting**
- **Supabase** comme architecture de reference
- Variante Firebase traitee en **note d'impact**, pas en double implementation
- SEO local + donnees structurees + redirects + sitemap/robots inclus
- Chatbot integre avec logique cadre, garde-fous et fallback (pas "IA generale" illimitee)
- Deploiement production inclus, sous reserve de reception des acces
- Maintenance mensuelle **obligatoire** apres mise en production, **hors couts tiers**

### Responsabilites client

Le client s'engage a fournir dans des delais compatibles :

- acces aux flux / APIs / comptes techniques / DNS
- validations design et contenus dans des delais raisonnables
- validation legale (mentions, confidentialite, cookies)
- un interlocuteur decisionnaire pour arbitrages et recette

## 15. Conclusion / Recommandation

Pour un site immobilier local premium avec redesign, rebuild, integrations, SEO serieux, chatbot, performance et mise en production propre, un budget defendable sur le marche est **nettement au-dessus d'un simple site vitrine**.

### Recommandation (prete a signature)

- **Budget de realisation recommande (plafonne)** : **160,000 EUR HT**
- **Maintenance obligatoire** : **pack minimum 8h/mois** (budget **960 a 1,360 EUR HT / mois**)
- **Engagement premiere annee estime** (realisation + maintenance obligatoire 12 mois) : **171,520 a 176,320 EUR HT**
- **Duree cible** : **16 a 24 semaines**
- **Structure contractuelle** : budget cap + reserve de risque + validation ecrite des hors perimetre

Si le client souhaite reduire significativement le budget, il faut **reduire le scope**, pas seulement "negocier le prix". Les reductions les plus efficaces sont generalement :

- reporter le chatbot
- reduire le volume de contenu local / editorial
- limiter les integrations/API
- simplifier le design premium et les animations
- reduire les cycles de QA/recette (avec risque accru)

## 16. Zone D'Acceptation / Signature

Nom / Fonction : __________________________

Societe : **Foch Immobilier**

Date : ____ / ____ / ______

Signature + cachet : ______________________
