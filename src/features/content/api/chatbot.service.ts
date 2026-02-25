import { cities, cityById } from "@/features/cities/data/cities";
import { leHavreDistrictHistory, leHavreFaq } from "@/features/content/data/leHavreHistoryContent";
import { agencyReviewsFallbackSnapshot, getAgencyReviews } from "@/features/content/api/googleReviews.service";
import { properties } from "@/features/listings/data/properties";
import { formatPrice, normalizeKeyword, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { apiJson, edgeApiFetch, isEdgeApiEnabled } from "@/lib/api/client";

export interface ChatbotPropertySuggestion {
  id: number;
  title: string;
  city: string;
  price: string;
  path: string;
}

export interface ChatbotCitation {
  kind?: "site" | "web";
  path: string;
  title?: string;
  sourceUrl?: string;
  similarity?: number;
}

export interface ToolSearchParams {
  transaction?: "vente" | "location";
  type?: "appartement" | "maison_villa" | "autre";
  city?: string;
  q?: string;
  bedroomsMin?: number;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  pageSize?: number;
}

export interface ChatbotConversationState {
  recentSearch?: {
    params?: ToolSearchParams;
    resultIds: number[];
    total?: number;
    generatedAt: string;
  };
  selectedPropertyIds?: number[];
  recentPropertyIds?: number[];
  leadDraft?: {
    propertyId?: number;
    citySlug?: string;
    criteriaSummary?: string;
  };
  preferences?: {
    transaction?: "vente" | "location";
    type?: "appartement" | "maison_villa" | "autre";
    city?: string;
    bedroomsMin?: number;
    priceMin?: number;
    priceMax?: number;
  };
}

export type ChatbotActionRequest =
  | {
      type: "search_refine";
      payload?: {
        searchParams?: ToolSearchParams;
        page?: number;
        pageSize?: number;
      };
    }
  | {
      type: "compare_selected_properties";
      payload?: {
        propertyIds?: number[];
      };
    }
  | {
      type: "open_path_confirmed";
      payload?: {
        path?: string;
      };
    }
  | {
      type: "prepare_handoff";
      payload?: {
        propertyIds?: number[];
      };
    }
  | {
      type: "prefill_lead_form";
      payload?: {
        propertyId?: number;
        propertyIds?: number[];
      };
    };

export type ChatbotToolTrace = {
  tool:
    | "search_properties"
    | "get_properties"
    | "compare_properties"
    | "prepare_handoff"
    | "get_property_media_context"
    | "get_property_document_context"
    | "retrieve_site_context";
  status: "ok" | "error" | "skipped";
  latencyMs: number;
  resultCount?: number;
  errorCode?: string;
};

export interface ChatbotPlannerMeta {
  provider: "gemini" | "fallback";
  mode: "disabled" | "gemini" | "deterministic_fallback";
  decisionType: "tool_call" | "clarify" | "plan" | "none";
  toolName?:
    | "search_properties"
    | "get_properties"
    | "compare_properties"
    | "prepare_handoff"
    | "get_property_media_context"
    | "get_property_document_context"
    | "retrieve_site_context";
  reasonCode?: string;
  confidence?: number;
}

export type ChatbotAnalysisCard =
  | {
      id: string;
      kind: "property_photo_insights" | "property_plan_insights" | "property_document_summary" | "property_risks_notice";
      propertyId: number;
      title: string;
      summary: string;
      confidence?: number;
      stale?: boolean;
      cacheHit?: boolean;
      sourceKind?: "image" | "document";
      documentKind?: "dpe_pdf" | "diagnostic_pdf" | "floor_plan_pdf" | "brochure_pdf" | "other";
      evidence?: Array<{
        sourceUrl?: string;
        thumbnailUrl?: string;
        page?: number;
        label?: string;
        kind?: string;
      }>;
    };

interface ChatbotUiActionBase {
  id: string;
  title: string;
  description?: string;
  requiresConfirmation?: boolean;
}

export type ChatbotUiAction =
  | (ChatbotUiActionBase & {
      kind: "search_results";
      data: {
        criteriaSummary: string;
        searchParams: ToolSearchParams;
        total: number;
        items: Array<{
          id: number;
          title: string;
          priceAmount: number;
          currency: string;
          surfaceM2: number | null;
          bedrooms: number | null;
          cityName: string;
          citySlug: string;
          path: string;
          coverImageUrl: string;
          dpeLabel: string | null;
          transaction: string;
          type: string;
        }>;
        canCompare: boolean;
        compareSelectionLimit: number;
        nextSuggestedRefinements?: string[];
      };
    })
  | (ChatbotUiActionBase & {
      kind: "compare_summary";
      data: {
        propertyIds: number[];
        properties: Array<{
          id: number;
          title: string;
          path: string;
          priceAmount: number;
          surfaceM2: number | null;
          bedrooms: number | null;
          cityName: string;
          dpeLabel: string | null;
          terrainM2?: number | null;
          garageCount?: number | null;
          bathrooms?: number | null;
        }>;
        comparisonRows: Array<{ label: string; values: Array<string | null> }>;
        summary: string;
        recommendedPropertyId?: number;
        nextActions?: Array<"open_property" | "prefill_handoff">;
      };
    })
  | (ChatbotUiActionBase & {
      kind: "open_page";
      data: {
        path: string;
        label: string;
        reason?: string;
      };
    })
  | (ChatbotUiActionBase & {
      kind: "lead_handoff_draft";
      data: {
        draft: { source: "contact_page"; propertyId?: number; criteriaMessage: string };
        prefill: { criteria: string; firstName?: string; lastName?: string; email?: string };
        missingFields: Array<"firstName" | "lastName" | "email">;
        contextSummary: string;
      };
    })
  | (ChatbotUiActionBase & {
      kind: "notice";
      data: {
        level?: "info" | "warning";
        code?: string;
      };
    });

export interface ChatbotReply {
  answer: string;
  suggestedPrompts: string[];
  needsLeadCapture?: boolean;
  propertySuggestions?: ChatbotPropertySuggestion[];
  citations?: ChatbotCitation[];
  actions?: ChatbotUiAction[];
  conversationStatePatch?: Partial<ChatbotConversationState>;
  toolTrace?: ChatbotToolTrace[];
  ragUsed?: boolean;
  edgeProvider?: "gemini" | "openai" | "fallback";
  retrievalMode?: "none" | "vector" | "keyword" | "hybrid";
  routeDecision?: string;
  routeCategory?: "deterministic_local" | "edge_rag" | "edge_general" | "edge_tools" | "fallback";
  requestId?: string;
  agentMode?: "tool" | "rag" | "fallback";
  planner?: ChatbotPlannerMeta;
  analysisCards?: ChatbotAnalysisCard[];
  memory?: {
    updated: boolean;
    preferenceKeys?: string[];
    summary?: string;
    source?: "state_merge" | "gemini_extractor" | "none";
    ttlDays?: number;
    updatedKeys?: string[];
    confidence?: number;
    cleared?: boolean;
  };
  pageContextUsed?: boolean;
  pageContextMode?: "http" | "headless";
  pageContextCacheHit?: boolean;
  costHints?: {
    route: string;
    multimodalUsed?: boolean;
    estimatedClass?: "low" | "medium" | "high";
  };
  webSearchUsed?: boolean;
  webSearchProvider?: "gemini_google_search";
  webSearchQueries?: string[];
  streamSupported?: boolean;
  source: "local" | "edge";
}

export interface ChatbotRequest {
  question: string;
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  conversationState?: ChatbotConversationState;
  actionRequest?: ChatbotActionRequest;
  sessionId?: string;
  capabilities?: {
    stream?: boolean;
    multimodalCards?: boolean;
  };
  signal?: AbortSignal;
}

export interface ChatbotStreamHandlers {
  onMeta?: (payload: Record<string, unknown>) => void;
  onStatus?: (payload: Record<string, unknown>) => void;
  onTextDelta?: (delta: string) => void;
  onActions?: (actions: ChatbotUiAction[]) => void;
  onCitations?: (citations: ChatbotCitation[]) => void;
  onAnalysisCards?: (analysisCards: ChatbotAnalysisCard[]) => void;
}

export type ChatbotIntent =
  | "lead_capture"
  | "property"
  | "process"
  | "service"
  | "contact"
  | "reviews"
  | "fees"
  | "history"
  | "about"
  | "navigation"
  | "unknown";

export interface DistrictDescriptor {
  id: string;
  label: string;
  aliases: string[];
}

export interface CityRouteDescriptor {
  slug: string;
  name: string;
  aliases: string[];
}

export interface ConversationContext {
  normalizedQuestion: string;
  normalizedHistory: string;
  normalizedFullHistory: string;
  normalizedCorpus: string;
  inferredIntent: ChatbotIntent;
  budgetMax: number | null;
  bedroomsMin: number | null;
  propertyType: "appartement" | "maison_villa" | null;
  transactionPreference: "vente" | "location" | null;
  district: DistrictDescriptor | null;
  cityRoute: CityRouteDescriptor | null;
  requestedPath: string | null;
  recentKnownPaths: string[];
}

export type ChatbotRouteCategory = "deterministic_local" | "edge_rag" | "edge_general" | "edge_tools" | "fallback";

export interface ChatbotRouteDecision {
  target: "local" | "edge";
  category: ChatbotRouteCategory;
  reason: string;
  intent: ChatbotIntent;
}

interface SiteTopicDescriptor {
  id: string;
  path: string;
  title: string;
  summary: string;
  keywords: string[];
  suggestedPrompts: string[];
}

export const chatbotExamplePrompts = [
  "Je cherche un appartement a vendre dans le quartier Perret avec 2 chambres.",
  "Quel quartier du Havre est le plus adapte pour un investissement locatif ?",
  "Comment se passe un compromis de vente avec votre agence ?",
  "Quels services proposez-vous pour la gestion locative au Havre ?",
  "Je ne trouve pas de bien adapte, pouvez-vous me rappeler ?",
];

const processIntentPattern = /compromis|notaire|process|etape|signature|acte|financement|offre acceptee/;
const propertyIntentPattern = /appartement|maison|bien|acheter|achat|louer|vente|investissement|studio|t2|t3|t4|chambre|budget|m2|surface|quartier|annonce/;
const serviceIntentPattern = /service|gestion|location|vendre|estimation|syndic|accompagnement|mandat|mise en vente/;
const contactIntentPattern = /contact|telephone|tel|appeler|email|mail|adresse|horaire|ouvert|ouverture|rdv|rendez vous|rappel/;
const reviewsIntentPattern = /avis|review|google|note|reputation|temoignage/;
const feesIntentPattern = /honoraire|bareme|frais|commission|pdf/;
const historyIntentPattern = /histoire|historique|fondation|unesco|perret|saint francois|saint-vincent|saint vincent|sanvic|graville|docks vauban|eure/;
const aboutIntentPattern = /agence|equipe|apropos|a propos|depuis 1972|unis/;
const siteNavigationIntentPattern = /site|page|rubrique|navigation|plan du site|sitemap|ou trouver|ou puis je|ou puis-je|lien/;
const directLeadCapturePattern = /ne trouve pas|introuvable|aucun bien|pas de bien|pas adapte|rappeler|etre contacte|etre rappele|laisser mon email|alerte email/;
const shortFollowUpPattern = /^(et|sinon|plutot|du coup|ok|daccord|avec|sans|plus|moins|meme budget|dans ce cas)/;
const districtComparisonPattern = /(quel quartier|quels quartiers|meilleur quartier|meilleurs quartiers).*(investissement|locatif|rendement)|investissement locatif/;
const pageSummaryPattern = /resum|resume|que contient|a quoi sert|explique|detaille|aide moi sur|sur la page/;
const greetingPattern = /^(bonjour|salut|hello|bonsoir|coucou)\b/;
const thanksPattern = /\bmerci\b|^\s*top\b|^\s*parfait\b/;
const capabilityPattern = /qui es tu|qui etes vous|que peux tu|que pouvez vous|aide moi|help/;
const listingsPagePattern = /toutes les annonces|voir les annonces|catalogue|liste des biens|biens disponibles|parcourir les biens|tous les biens/;
const sellPagePattern = /vendre|mise en vente|mettre en vente|mandat|vente de mon bien/;
const estimationPagePattern = /estimer|estimation|avis de valeur|combien vaut|valeur de mon bien/;
const legalIntentPattern = /mentions legales|confidentialite|rgpd|donnees personnelles|cookies|accessibilite|privacy|legal/;
const selectionIntentPattern = /ma selection|my selection|favoris|wishlist|selection sauvegardee|biens sauvegardes/;
const cityPageIntentPattern = /immobilier|prix|marche|quartier|investissement|annonce|bien|achat|vente|location|estimation/;
const followPathRequestPattern = /ouvre|ouvrir|aller|go|cette page|ce lien|redirige/;
const internalPathPattern = /(\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:\?[a-z0-9=&_-]+)?)/i;
const internalPathGlobalPattern = /\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:\?[a-z0-9=&_-]+)?/gi;

const knownInternalPaths = [
  "/",
  "/biens",
  "/biens-immobiliers",
  "/apropos",
  "/contact",
  "/vendre",
  "/estimation",
  "/services",
  "/avis",
  "/histoire-immobilier-le-havre",
  "/honoraires",
  "/biens-sauvegardes",
  "/my-selection",
  "/mentions-legales",
  "/confidentialite",
  "/cookies",
  "/accessibilite",
  "/plan-du-site",
  "/buy",
  "/rent",
  "/legal/fees",
  "/legal/privacy",
  "/legal/cookies",
  "/legal/notice",
];

const knownInternalPathPrefixes = ["/biens", "/immobilier/"];

const topicPathAliases = new Map<string, string>([
  ["/my-selection", "/biens-sauvegardes"],
  ["/biens-immobiliers", "/biens"],
  ["/buy", "/biens"],
  ["/rent", "/biens"],
  ["/legal/fees", "/honoraires"],
  ["/legal/privacy", "/confidentialite"],
  ["/legal/cookies", "/cookies"],
  ["/legal/notice", "/mentions-legales"],
]);

const stopWords = new Set([
  "le",
  "la",
  "les",
  "de",
  "du",
  "des",
  "un",
  "une",
  "et",
  "ou",
  "a",
  "au",
  "aux",
  "dans",
  "sur",
  "pour",
  "avec",
  "sans",
  "est",
  "sont",
  "je",
  "tu",
  "il",
  "elle",
  "nous",
  "vous",
  "ils",
  "elles",
  "mon",
  "ma",
  "mes",
  "votre",
  "vos",
  "notre",
  "nos",
  "ce",
  "cette",
  "ces",
  "quel",
  "quelle",
  "quels",
  "quelles",
  "qui",
  "quoi",
  "ou",
  "comment",
  "quand",
  "je",
  "moi",
  "toi",
  "lui",
  "leur",
  "ici",
  "la",
  "site",
  "page",
  "pages",
  "foch",
  "immobilier",
]);

const siteTopics: SiteTopicDescriptor[] = [
  {
    id: "home",
    path: "/",
    title: "Accueil",
    summary:
      "Page d'accueil avec hero immobilier, selection du moment, villes couvertes, avis Google et presentation de l'equipe.",
    keywords: ["accueil", "hero", "selection", "villes", "avis", "equipe", "agence", "bien immobilier"],
    suggestedPrompts: ["Ouvrir /", "Ouvrir /biens", "Ouvrir /avis"],
  },
  {
    id: "listings",
    path: "/biens",
    title: "Catalogue des biens",
    summary:
      "Catalogue complet avec filtres avances (budget, ville, chambres, type, transaction) et tri pour trouver rapidement un bien.",
    keywords: ["annonces", "biens", "catalogue", "filtrer", "tri", "vente", "location", "budget", "surface"],
    suggestedPrompts: ["Ouvrir /biens", "Je veux filtrer par budget", "Je cherche un appartement au Havre"],
  },
  {
    id: "sell",
    path: "/vendre",
    title: "Vendre",
    summary:
      "Parcours vendeur: estimation, strategie de mise en marche, qualification acheteurs et accompagnement jusqu'a la signature.",
    keywords: ["vendre", "mise en vente", "mandat", "strategie", "acheteur", "signature", "acte"],
    suggestedPrompts: ["Ouvrir /vendre", "Ouvrir /estimation", "Je veux parler a un conseiller"],
  },
  {
    id: "estimation",
    path: "/estimation",
    title: "Estimation",
    summary:
      "Demande d'estimation avec analyse du bien, comparables locaux et proposition de strategie de commercialisation.",
    keywords: ["estimation", "estimer", "avis de valeur", "comparables", "prix", "strategie de vente"],
    suggestedPrompts: ["Ouvrir /estimation", "Quels documents preparer ?", "Ouvrir /contact"],
  },
  {
    id: "services",
    path: "/services",
    title: "Services",
    summary:
      "Services de transaction, location et administration de biens avec accompagnement commercial, administratif et operationnel.",
    keywords: ["services", "transaction", "location", "gestion locative", "administration", "accompagnement"],
    suggestedPrompts: ["Ouvrir /services", "Je veux vendre mon bien", "Je cherche une gestion locative"],
  },
  {
    id: "reviews",
    path: "/avis",
    title: "Avis clients",
    summary:
      "Page reputation avec note Google, volume d'avis, extraits de temoignages et suivi des retours clients.",
    keywords: ["avis", "google", "note", "reputation", "temoignages", "retours clients"],
    suggestedPrompts: ["Ouvrir /avis", "Quelle est la note Google ?", "Je veux contacter l'agence"],
  },
  {
    id: "history",
    path: "/histoire-immobilier-le-havre",
    title: "Histoire immobilier Le Havre",
    summary:
      "Analyse historique et immobiliere de Perret, Saint-Francois, Saint-Vincent, Sanvic, Graville et Eure-Docks.",
    keywords: ["histoire", "perret", "saint francois", "saint vincent", "sanvic", "graville", "eure", "docks"],
    suggestedPrompts: ["Ouvrir /histoire-immobilier-le-havre", "Quel quartier pour investir ?", "Ouvrir /biens"],
  },
  {
    id: "fees",
    path: "/honoraires",
    title: "Honoraires",
    summary:
      "Bareme d'honoraires TTC, telechargement du PDF officiel et tableau de synthese par tranches de prix.",
    keywords: ["honoraires", "bareme", "frais", "commission", "pdf", "ttc"],
    suggestedPrompts: ["Ouvrir /honoraires", "Telecharger le PDF des honoraires", "Ouvrir /contact"],
  },
  {
    id: "about",
    path: "/apropos",
    title: "A propos",
    summary:
      "Presentation de l'agence Foch Immobilier depuis 1972, equipe, valeurs et ancrage local au Havre.",
    keywords: ["apropos", "agence", "equipe", "1972", "unis", "presentation"],
    suggestedPrompts: ["Ouvrir /apropos", "Qui sont les conseillers ?", "Ouvrir /contact"],
  },
  {
    id: "contact",
    path: "/contact",
    title: "Contact",
    summary:
      "Coordonnees agence, horaires, carte et formulaire de contact pour transaction, location et gestion.",
    keywords: ["contact", "telephone", "email", "adresse", "horaires", "rendez vous", "carte"],
    suggestedPrompts: ["Ouvrir /contact", "Quels sont vos horaires ?", "Je veux etre rappele"],
  },
  {
    id: "saved",
    path: "/biens-sauvegardes",
    title: "Biens sauvegardes",
    summary:
      "Espace de selection personnelle pour retrouver, comparer et partager les biens favoris.",
    keywords: ["biens sauvegardes", "selection", "favoris", "wishlist", "coeur", "partager"],
    suggestedPrompts: ["Ouvrir /biens-sauvegardes", "Ouvrir /biens", "Comment ajouter un favori ?"],
  },
  {
    id: "sitemap",
    path: "/plan-du-site",
    title: "Plan du site",
    summary:
      "Carte complete des pages principales et des pages ville pour naviguer rapidement sur tout le site.",
    keywords: ["plan du site", "navigation", "toutes les pages", "sitemap", "rubriques", "liens"],
    suggestedPrompts: ["Ouvrir /plan-du-site", "Ouvrir /biens", "Ouvrir /contact"],
  },
  {
    id: "legal",
    path: "/mentions-legales",
    title: "Mentions legales",
    summary:
      "Informations legales de l'editeur, carte professionnelle et hebergement de l'application.",
    keywords: ["mentions legales", "editeur", "cpi", "hebergement", "legal"],
    suggestedPrompts: ["Ouvrir /mentions-legales", "Ouvrir /confidentialite", "Ouvrir /cookies"],
  },
  {
    id: "privacy",
    path: "/confidentialite",
    title: "Confidentialite",
    summary:
      "Politique RGPD: donnees collectees, finalites, duree de conservation et droits des utilisateurs.",
    keywords: ["confidentialite", "rgpd", "donnees", "vie privee", "droits", "traitement"],
    suggestedPrompts: ["Ouvrir /confidentialite", "Ouvrir /cookies", "Ouvrir /contact"],
  },
  {
    id: "cookies",
    path: "/cookies",
    title: "Cookies",
    summary:
      "Informations sur cookies essentiels, cookies de mesure et gestion des preferences utilisateur.",
    keywords: ["cookies", "consentement", "mesure", "preferences", "traceurs"],
    suggestedPrompts: ["Ouvrir /cookies", "Ouvrir /confidentialite", "Ouvrir /plan-du-site"],
  },
  {
    id: "accessibility",
    path: "/accessibilite",
    title: "Accessibilite",
    summary:
      "Declaration d'accessibilite numerique, objectifs WCAG AA et canal de signalement.",
    keywords: ["accessibilite", "wcag", "navigation clavier", "contraste", "a11y", "signalement"],
    suggestedPrompts: ["Ouvrir /accessibilite", "Ouvrir /contact", "Ouvrir /plan-du-site"],
  },
];

const districtVocabulary: DistrictDescriptor[] = [
  { id: "perret", label: "Quartier Perret", aliases: ["perret", "hotel de ville", "saint-joseph"] },
  { id: "saint-francois", label: "Quartier Saint-Francois", aliases: ["saint francois", "bassin du roy"] },
  { id: "saint-vincent", label: "Quartier Saint-Vincent", aliases: ["saint vincent", "front de mer"] },
  { id: "sanvic", label: "Sanvic", aliases: ["sanvic", "ville haute"] },
  { id: "graville", label: "Graville", aliases: ["graville", "ville basse"] },
  { id: "eure-docks", label: "Eure - Docks Vauban", aliases: ["eure", "docks vauban", "vauban"] },
];

const cityRouteVocabulary: CityRouteDescriptor[] = cities.map((city) => {
  const normalizedName = normalizeKeyword(city.name);
  const normalizedSlugSpaced = city.slug.replace(/-/g, " ");

  return {
    slug: city.slug,
    name: city.name,
    aliases: [normalizedName, normalizedSlugSpaced, city.slug],
  };
});

const cityBySlug = new Map(cities.map((city) => [city.slug, city]));
const propertyById = new Map(properties.map((property) => [property.id, property]));

const cityTopics: SiteTopicDescriptor[] = cities.map((city) => ({
  id: `city-${city.slug}`,
  path: `/immobilier/${city.slug}`,
  title: `Immobilier ${city.name}`,
  summary:
    `Page ville ${city.name}: contexte local, selection de biens actifs dans la commune, lien direct vers /biens?city=${city.slug} et acces rapide a /estimation?ville=${city.slug}.`,
  keywords: [
    city.name,
    city.slug.replace(/-/g, " "),
    "ville",
    "marche local",
    "biens",
    "estimation",
    "vendre",
    "investissement",
  ],
  suggestedPrompts: [
    `Ouvrir /immobilier/${city.slug}`,
    `Ouvrir /biens?city=${city.slug}`,
    `Ouvrir /estimation?ville=${city.slug}`,
  ],
}));

const allSiteTopics: SiteTopicDescriptor[] = [...siteTopics, ...cityTopics];
const topicByPath = new Map(allSiteTopics.map((topic) => [topic.path, topic]));

function normalizePromptList(prompts: string[]): string[] {
  return prompts.map((prompt) => prompt.trim()).filter((prompt) => prompt.length > 0).slice(0, 6);
}

function detectDistrict(text: string): DistrictDescriptor | null {
  return districtVocabulary.find((district) => district.aliases.some((alias) => text.includes(alias))) ?? null;
}

function detectCityRoute(text: string): CityRouteDescriptor | null {
  return cityRouteVocabulary.find((city) => city.aliases.some((alias) => text.includes(alias))) ?? null;
}

function normalizeInternalPath(path: string): string {
  const [rawBasePath, rawQuery = ""] = path.trim().split("?");
  const basePath = rawBasePath.replace(/\/+$/, "") || "/";
  return rawQuery.length > 0 ? `${basePath}?${rawQuery}` : basePath;
}

function isKnownInternalPath(path: string): boolean {
  if (knownInternalPaths.includes(path)) return true;
  return knownInternalPathPrefixes.some((prefix) => path === prefix || path.startsWith(prefix));
}

function extractRequestedPath(text: string): string | null {
  const match = text.match(internalPathPattern);
  if (!match) return null;

  const normalizedPath = normalizeInternalPath(match[1]);
  return isKnownInternalPath(normalizedPath) ? normalizedPath : null;
}

function extractKnownPathsFromText(text: string): string[] {
  const matches = text.match(internalPathGlobalPattern);
  if (!matches) return [];

  return matches
    .map((path) => normalizeInternalPath(path))
    .filter((path) => isKnownInternalPath(path));
}

function collectRecentKnownPaths(chatHistory: ChatbotRequest["chatHistory"]): string[] {
  if (!chatHistory || chatHistory.length === 0) return [];

  const seen = new Set<string>();
  const ordered: string[] = [];

  for (let index = chatHistory.length - 1; index >= 0; index -= 1) {
    const content = normalizeKeyword(chatHistory[index]?.content ?? "");
    if (!content) continue;

    const paths = extractKnownPathsFromText(content);
    for (const path of paths) {
      if (seen.has(path)) continue;
      seen.add(path);
      ordered.push(path);
    }
  }

  return ordered;
}

function canonicalizeTopicPath(path: string): string {
  const normalized = normalizeInternalPath(path);
  const [basePath] = normalized.split("?");
  return topicPathAliases.get(basePath) ?? basePath;
}

function parsePropertyIdFromPath(path: string): number | null {
  const normalized = normalizeInternalPath(path);
  const [basePath] = normalized.split("?");
  const match = basePath.match(/^\/biens\/(\d+)-/);
  if (!match) return null;

  const id = Number(match[1]);
  return Number.isInteger(id) ? id : null;
}

function buildPropertyPathTopic(path: string): SiteTopicDescriptor | null {
  const propertyId = parsePropertyIdFromPath(path);
  if (propertyId == null) return null;

  const property = propertyById.get(propertyId);
  if (!property) return null;

  const city = cityById.get(property.cityId)?.name ?? "Le Havre";
  const canonicalPath = toCanonicalPropertyPath({ id: property.id, slug: property.slug });
  const transactionLabel = property.transactionType === "location" ? "location" : "vente";
  const propertyTypeLabel = property.propertyType === "maison_villa" ? "Maison / Villa" : "Appartement";

  return {
    id: `property-${property.id}`,
    path: canonicalPath,
    title: property.title,
    summary:
      `Annonce detaillee du bien ${property.title} a ${city}: ${propertyTypeLabel}, ${transactionLabel}, prix ${formatPrice(property.priceAmount, property.transactionType)}. La fiche contient descriptif, caracteristiques et media.`,
    keywords: [property.title, city, transactionLabel, propertyTypeLabel, "annonce", "details", "prix", "surface"],
    suggestedPrompts: [ `Ouvrir ${canonicalPath}`, "Ouvrir /biens", `Ouvrir /immobilier/${cityById.get(property.cityId)?.slug ?? "le-havre"}`],
  };
}

function findTopicByPath(path: string): SiteTopicDescriptor | null {
  const canonicalPath = canonicalizeTopicPath(path);
  const directTopic = topicByPath.get(canonicalPath);
  if (directTopic) return directTopic;

  if (canonicalPath.startsWith("/biens/")) {
    return buildPropertyPathTopic(canonicalPath);
  }

  return null;
}

function tokenizeForTopicScoring(text: string): string[] {
  return normalizeKeyword(text)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function scoreTopicRelevance(topic: SiteTopicDescriptor, context: ConversationContext): number {
  const [questionPath] = (context.requestedPath ?? "").split("?");
  const normalizedQuestion = context.normalizedQuestion;
  const normalizedCorpus = context.normalizedCorpus;
  const queryTokens = tokenizeForTopicScoring(normalizedQuestion);
  const topicTokens = tokenizeForTopicScoring(`${topic.title} ${topic.summary} ${topic.keywords.join(" ")}`);
  const topicTokenSet = new Set(topicTokens);

  let score = 0;

  if (questionPath.length > 0 && canonicalizeTopicPath(questionPath) === topic.path) score += 14;
  if (context.recentKnownPaths.some((path) => canonicalizeTopicPath(path) === topic.path)) score += 10;
  if (normalizedQuestion.includes(topic.path)) score += 12;
  if (context.cityRoute && topic.path === `/immobilier/${context.cityRoute.slug}`) score += 10;

  for (const keyword of topic.keywords) {
    const normalizedKeyword = normalizeKeyword(keyword);
    if (normalizedKeyword.length < 3) continue;
    if (normalizedQuestion.includes(normalizedKeyword)) {
      score += 6;
    } else if (normalizedCorpus.includes(normalizedKeyword)) {
      score += 3;
    }
  }

  for (const token of queryTokens) {
    if (topicTokenSet.has(token)) score += 2;
  }

  return score;
}

function findRelevantTopics(context: ConversationContext, limit = 3): SiteTopicDescriptor[] {
  return allSiteTopics
    .map((topic) => ({ topic, score: scoreTopicRelevance(topic, context) }))
    .filter(({ score }) => score >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ topic }) => topic);
}

function extractBudget(text: string): number | null {
  const match = text.match(/(\d[\d\s]{2,})\s*(e|euros|€)/);
  if (!match) return null;

  const value = Number(match[1].replace(/\s+/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function extractBedrooms(text: string): number | null {
  const match = text.match(/(\d+)\s*chambre/);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function detectPropertyType(text: string): "appartement" | "maison_villa" | null {
  if (text.includes("maison") || text.includes("villa") || text.includes("pavillon")) {
    return "maison_villa";
  }

  if (text.includes("appartement") || text.includes("studio") || text.includes("t1") || text.includes("t2") || text.includes("t3")) {
    return "appartement";
  }

  return null;
}

function detectTransactionPreference(text: string): "vente" | "location" | null {
  if (/louer|location|locatif|loyer/.test(text)) return "location";
  if (/acheter|achat|vente|vendre|acquerir/.test(text)) return "vente";
  return null;
}

function detectIntent(text: string): ChatbotIntent {
  if (directLeadCapturePattern.test(text)) return "lead_capture";
  if (processIntentPattern.test(text)) return "process";
  if (contactIntentPattern.test(text)) return "contact";
  if (reviewsIntentPattern.test(text)) return "reviews";
  if (feesIntentPattern.test(text)) return "fees";
  if (propertyIntentPattern.test(text)) return "property";
  if (serviceIntentPattern.test(text)) return "service";
  if (historyIntentPattern.test(text)) return "history";
  if (aboutIntentPattern.test(text)) return "about";
  if (siteNavigationIntentPattern.test(text)) return "navigation";
  return "unknown";
}

export function buildConversationContext(question: string, chatHistory: ChatbotRequest["chatHistory"]): ConversationContext {
  const normalizedQuestion = normalizeKeyword(question);
  const historyMessages = (chatHistory ?? []).map((message) => message.content.trim()).filter((content) => content.length > 0);
  const historyUserMessages = (chatHistory ?? [])
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter((content) => content.length > 0);

  const lastHistoryMessage = historyUserMessages[historyUserMessages.length - 1];
  const historyWithoutCurrent =
    lastHistoryMessage && normalizeKeyword(lastHistoryMessage) === normalizedQuestion
      ? historyUserMessages.slice(0, Math.max(0, historyUserMessages.length - 1))
      : historyUserMessages;
  const normalizedHistory = normalizeKeyword(historyWithoutCurrent.join(" "));
  const normalizedFullHistory = normalizeKeyword(historyMessages.join(" "));
  const normalizedCorpus = normalizeKeyword(`${historyWithoutCurrent.join(" ")} ${question}`.trim());

  const explicitIntent = detectIntent(normalizedQuestion);
  const historicalIntent = detectIntent(normalizedHistory);
  const inferredIntent =
    explicitIntent !== "unknown"
      ? explicitIntent
      : shortFollowUpPattern.test(normalizedQuestion) && historicalIntent !== "unknown"
        ? historicalIntent
        : detectIntent(normalizedCorpus) !== "unknown"
          ? detectIntent(normalizedCorpus)
          : detectIntent(normalizedFullHistory);

  const budgetMax = extractBudget(normalizedQuestion) ?? extractBudget(normalizedHistory);
  const bedroomsMin = extractBedrooms(normalizedQuestion) ?? extractBedrooms(normalizedHistory);
  const propertyType = detectPropertyType(normalizedQuestion) ?? detectPropertyType(normalizedHistory);
  const transactionPreference = detectTransactionPreference(normalizedQuestion) ?? detectTransactionPreference(normalizedHistory);
  const district = detectDistrict(normalizedQuestion) ?? detectDistrict(normalizedHistory);
  const cityRoute = detectCityRoute(normalizedQuestion) ?? detectCityRoute(normalizedHistory);
  const explicitRequestedPath = extractRequestedPath(normalizedQuestion);
  const recentKnownPathsFromHistory = collectRecentKnownPaths(chatHistory);
  const recentKnownPaths =
    explicitRequestedPath == null
      ? recentKnownPathsFromHistory
      : [explicitRequestedPath, ...recentKnownPathsFromHistory.filter((path) => path !== explicitRequestedPath)];
  const requestedPath =
    explicitRequestedPath ??
    (followPathRequestPattern.test(normalizedQuestion) ? recentKnownPathsFromHistory[0] ?? null : null);

  return {
    normalizedQuestion,
    normalizedHistory,
    normalizedFullHistory,
    normalizedCorpus,
    inferredIntent,
    budgetMax,
    bedroomsMin,
    propertyType,
    transactionPreference,
    district,
    cityRoute,
    requestedPath,
    recentKnownPaths,
  };
}

function formatCriteriaSummary(context: ConversationContext): string {
  const parts: string[] = [];

  if (context.propertyType === "appartement") parts.push("appartement");
  if (context.propertyType === "maison_villa") parts.push("maison");
  if (context.transactionPreference === "vente") parts.push("en vente");
  if (context.transactionPreference === "location") parts.push("en location");
  if (context.bedroomsMin != null) parts.push(`${context.bedroomsMin}+ chambres`);
  if (context.budgetMax != null) parts.push(`budget max ${new Intl.NumberFormat("fr-FR").format(context.budgetMax)} EUR`);
  if (context.district) parts.push(`secteur ${context.district.label}`);
  if (context.cityRoute) parts.push(`ville ${context.cityRoute.name}`);

  return parts.join(", ");
}

function buildPropertySuggestions(question: string, context: ConversationContext): ChatbotPropertySuggestion[] {
  const normalized = normalizeKeyword(question);
  const wantsRental = /location|louer|locatif|loyer/.test(normalized) || context.transactionPreference === "location";
  const wantsSale = /vente|acheter|achat|acquerir/.test(normalized) || context.transactionPreference === "vente";
  const bedroomsMin = extractBedrooms(normalized) ?? context.bedroomsMin;
  const budgetMax = extractBudget(normalized) ?? context.budgetMax;
  const propertyType = detectPropertyType(normalized) ?? context.propertyType;
  const district = detectDistrict(normalized) ?? context.district;
  const requestedCity = detectCityRoute(normalized) ?? context.cityRoute;

  const requestSpecificity =
    Number(Boolean(district)) +
    Number(Boolean(bedroomsMin)) +
    Number(Boolean(budgetMax)) +
    Number(Boolean(propertyType)) +
    Number(Boolean(requestedCity)) +
    Number(Boolean(wantsRental || wantsSale));

  return properties
    .filter((property) => property.status === "active")
    .filter((property) => {
      if (wantsRental && property.transactionType !== "location") return false;
      if (wantsSale && property.transactionType !== "vente") return false;
      if (bedroomsMin != null && (property.bedrooms ?? 0) < bedroomsMin) return false;
      if (budgetMax != null && property.priceAmount > budgetMax) return false;
      if (propertyType && property.propertyType !== propertyType) return false;

      if (requestedCity) {
        const citySlug = cityById.get(property.cityId)?.slug;
        if (citySlug !== requestedCity.slug) return false;
      }

      return true;
    })
    .map((property) => {
      const city = cityById.get(property.cityId)?.name ?? "Le Havre";
      const citySlug = cityById.get(property.cityId)?.slug ?? "";
      const haystack = normalizeKeyword(`${property.title} ${property.description} ${city}`);
      let score = 0;

      if (district && district.aliases.some((alias) => haystack.includes(alias))) score += 4;
      if (requestedCity && citySlug === requestedCity.slug) score += 4;
      if (bedroomsMin != null && (property.bedrooms ?? 0) >= bedroomsMin) score += 2;
      if (budgetMax != null && property.priceAmount <= budgetMax) score += 2;
      if (propertyType && property.propertyType === propertyType) score += 2;
      if (normalized.includes("vue mer") && haystack.includes("vue mer")) score += 2;
      if (normalized.includes("investissement") && (property.surfaceM2 <= 55 || property.priceAmount <= 170000)) score += 2;
      if (haystack.includes("le havre")) score += 1;

      return { property, score };
    })
    .filter(({ score }) => score >= (requestSpecificity >= 4 ? 4 : 1))
    .sort((a, b) => {
      if (b.score === a.score) {
        return new Date(b.property.publishedAt).getTime() - new Date(a.property.publishedAt).getTime();
      }
      return b.score - a.score;
    })
    .slice(0, 3)
    .map(({ property }) => ({
      id: property.id,
      title: property.title,
      city: cityById.get(property.cityId)?.name ?? "Le Havre",
      price: formatPrice(property.priceAmount, property.transactionType),
      path: toCanonicalPropertyPath({ id: property.id, slug: property.slug }),
    }));
}

function buildLeadCaptureAnswer(context: ConversationContext): ChatbotReply {
  const criteriaSummary = formatCriteriaSummary(context);

  return {
    source: "local",
    answer:
      criteriaSummary.length > 0
        ? `Je vous accompagne avec plaisir. Je n'ai pas encore de bien parfaitement aligne sur vos criteres (${criteriaSummary}). Laissez votre email ici dans le chat ou via /contact et je transmets votre demande a l'agence.`
        : "Je vous accompagne avec plaisir. Si vous ne trouvez pas le bon bien, laissez votre email, votre budget et le secteur souhaite: je transmets directement votre demande a l'agence via /contact.",
    suggestedPrompts: normalizePromptList([
      "Je veux laisser mon email pour etre rappelle",
      "Je cherche un T3 a Perret avec balcon",
      "Je cherche une maison familiale a Sanvic",
      "Ouvrir /contact",
    ]),
    needsLeadCapture: true,
  };
}

function buildProcessAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Bien sur. Processus type: 1) offre acceptee, 2) verification financement et pieces, 3) compromis de vente, 4) delai legal + conditions suspensives, 5) acte authentique chez le notaire. L'agence coordonne chaque etape pour securiser le dossier. Pour un accompagnement direct: /vendre puis /contact.",
    suggestedPrompts: normalizePromptList([
      "Quel delai moyen entre compromis et acte ?",
      "Quels documents faut-il pour vendre ?",
      "Pouvez-vous m'accompagner sur un achat avec pret ?",
      "Ouvrir /vendre",
    ]),
  };
}

function buildContactAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Avec plaisir. Coordonnees agence: 109 Av. Foch, 76600 Le Havre, tel 02 35 42 51 76, email vendre@fochimmobilier.com. Horaires: lundi-vendredi 09:30-12:00 et 14:00-18:30, samedi sur rendez-vous. Page complete: /contact.",
    suggestedPrompts: normalizePromptList([
      "Pouvez-vous me rappeler demain matin ?",
      "Je veux envoyer une demande d'estimation",
      "Ou est situee l'agence exactement ?",
      "Ouvrir /contact",
    ]),
  };
}

function buildReviewsAnswerFromSnapshot(
  snapshot: Pick<typeof agencyReviewsFallbackSnapshot, "rating" | "userRatingCount" | "reviews">,
): ChatbotReply {
  const rating = `${snapshot.rating.toFixed(1)} / 5`;
  const count = `${snapshot.userRatingCount} avis`;
  const highlights = snapshot.reviews
    .slice(0, 2)
    .map((review) => `${review.authorName}: ${review.text}`)
    .join(" | ");

  return {
    source: "local",
    answer:
      `Oui. La page /avis affiche la note Google (${rating}, ${count}) et les retours clients. Extraits: ${highlights}. Pour lire tous les avis et la mise a jour, ouvrez /avis.`,
    suggestedPrompts: normalizePromptList([
      "Ouvrir /avis",
      "Quelle est la note Google actuelle ?",
      "Je veux contacter un conseiller apres lecture des avis",
      "Quels services sont cites dans les avis ?",
    ]),
  };
}

async function buildReviewsAnswer(): Promise<ChatbotReply> {
  let timeoutHandle: number | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = window.setTimeout(() => reject(new Error("reviews_fetch_timeout")), 1500);
    });
    const liveReviews = await Promise.race([getAgencyReviews(), timeoutPromise]);
    return buildReviewsAnswerFromSnapshot(liveReviews);
  } catch {
    return {
      source: "local",
      answer:
        "Oui. La page /avis affiche la note Google actuelle et les retours clients avec mise a jour sur le site. Ouvrez /avis pour consulter les derniers avis et la note la plus recente.",
      suggestedPrompts: normalizePromptList([
        "Ouvrir /avis",
        "Quelle est la note Google actuelle ?",
        "Je veux contacter un conseiller apres lecture des avis",
        "Quels services sont cites dans les avis ?",
      ]),
    };
  } finally {
    if (typeof timeoutHandle === "number") {
      window.clearTimeout(timeoutHandle);
    }
  }
}

function buildFeesAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Bien note. Les honoraires sont detailles sur /honoraires avec acces au PDF officiel et une synthese des tranches tarifaires TTC. Vous pouvez verifier la grille complete directement sur /honoraires.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /honoraires",
      "Comment sont calcules les frais de vente ?",
      "Pouvez-vous m'expliquer le bareme TTC ?",
    ]),
  };
}

function buildHistoryAnswer(context: ConversationContext): ChatbotReply {
  const faqMatch = leHavreFaq.find((faq) => {
    const faqQuestion = normalizeKeyword(faq.question);
    return faqQuestion.split(" ").some((token) => token.length > 4 && context.normalizedQuestion.includes(token));
  });

  if (faqMatch) {
    return {
      source: "local",
      answer: `Bonne question. ${faqMatch.answer} Pour le dossier complet, ouvrez /histoire-immobilier-le-havre.`,
      suggestedPrompts: normalizePromptList([
        "Quels quartiers suivre pour investir au Havre ?",
        "Resumez-moi Perret, Saint-Francois et Saint-Vincent",
        "Ouvrir /histoire-immobilier-le-havre",
      ]),
    };
  }

  return {
    source: "local",
    answer:
      "Je vous conseille la page /histoire-immobilier-le-havre: elle couvre l'evolution du marche de 1517 a aujourd'hui avec focus sur Perret, Saint-Francois, Saint-Vincent, Sanvic, Graville et Eure-Docks.",
    suggestedPrompts: normalizePromptList([
      "Quels sont les atouts du quartier Perret ?",
      "Quel secteur viser pour un investissement locatif ?",
      "Ouvrir /histoire-immobilier-le-havre",
    ]),
  };
}

function buildAboutAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Foch Immobilier est une agence du Havre active depuis 1972 (reseau UNIS). L'equipe accompagne la transaction, la location et l'administration de biens. Presentation complete sur /apropos.",
    suggestedPrompts: normalizePromptList([
      "Quels services propose l'agence ?",
      "Comment contacter un conseiller ?",
      "Ouvrir /apropos",
      "Je veux voir les biens disponibles",
    ]),
  };
}

function buildDistrictComparisonAnswer(): ChatbotReply | null {
  const districtById = new Map(leHavreDistrictHistory.map((district) => [district.id, district]));
  const rankedDistrictIds = ["saint-francois", "eure-docks", "perret"];
  const rankedDistricts = rankedDistrictIds
    .map((districtId) => districtById.get(districtId))
    .filter((district): district is (typeof leHavreDistrictHistory)[number] => Boolean(district));

  if (rankedDistricts.length === 0) {
    return null;
  }

  return {
    source: "local",
    answer:
      `Pour un investissement locatif au Havre, trois secteurs ressortent souvent: ${rankedDistricts[0].name} (demande locative active), ${rankedDistricts[1].name} (renouvellement urbain et petites surfaces) et ${rankedDistricts[2].name} (liquidite patrimoniale forte). Vous pouvez approfondir sur /histoire-immobilier-le-havre puis filtrer les annonces sur /biens.`,
    suggestedPrompts: normalizePromptList([
      "Quels biens avez-vous dans ces quartiers ?",
      "Je veux un comparatif rendement / budget",
      "Ouvrir /biens",
      "Ouvrir /histoire-immobilier-le-havre",
    ]),
  };
}

function buildDistrictAnswer(context: ConversationContext): ChatbotReply | null {
  const district =
    context.district ??
    leHavreDistrictHistory
      .map((item) => ({
        descriptor: districtVocabulary.find((districtItem) => districtItem.id === item.id),
        item,
      }))
      .find(({ descriptor, item }) => {
        const districtName = normalizeKeyword(item.name);
        return (
          context.normalizedQuestion.includes(districtName) ||
          item.keywordTags.some((tag) => context.normalizedQuestion.includes(normalizeKeyword(tag))) ||
          Boolean(descriptor && descriptor.aliases.some((alias) => context.normalizedQuestion.includes(alias)))
        );
      })?.descriptor ?? null;

  if (!district) {
    return null;
  }

  const districtData = leHavreDistrictHistory.find((item) => item.id === district.id);
  if (!districtData) {
    return null;
  }

  return {
    source: "local",
    answer: `${districtData.name}: ${districtData.summary} ${districtData.investmentAngle} Detail historique: /histoire-immobilier-le-havre.`,
    suggestedPrompts: normalizePromptList([
      `Quels biens avez-vous actuellement dans ${districtData.name} ?`,
      `Quelle strategie de vente recommandez-vous dans ${districtData.name} ?`,
      "Ouvrir /histoire-immobilier-le-havre",
      "Ouvrir /biens",
    ]),
  };
}

function buildSellPageAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Pour vendre, la page la plus adaptee est /vendre. Vous y trouverez la methode (mise en valeur, qualification acheteurs, suivi jusqu'a l'acte), puis vous pouvez lancer une estimation sur /estimation.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /vendre",
      "Ouvrir /estimation",
      "Je veux etre rappele pour vendre",
    ]),
  };
}

function buildEstimationPageAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Pour estimer votre bien, utilisez /estimation. Le parcours couvre les caracteristiques du bien, les comparables et la strategie de commercialisation. Contact direct possible sur /contact.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /estimation",
      "Quels documents preparer pour une estimation ?",
      "Ouvrir /contact",
    ]),
  };
}

function buildListingsPageAnswer(context: ConversationContext): ChatbotReply {
  const cityHint = context.cityRoute ? ` et la page ville /immobilier/${context.cityRoute.slug}` : "";

  return {
    source: "local",
    answer: `Pour consulter toutes les annonces, ouvrez /biens${cityHint}. Vous pourrez ensuite filtrer par budget, typologie, transaction et secteur.`,
    suggestedPrompts: normalizePromptList([
      "Ouvrir /biens",
      context.cityRoute ? `Ouvrir /immobilier/${context.cityRoute.slug}` : "Je veux filtrer les biens a la vente",
      "Je veux des biens avec vue mer",
      "Je cherche un T3 avec 2 chambres",
    ]),
  };
}

function buildCityPageAnswer(context: ConversationContext): ChatbotReply | null {
  if (!context.cityRoute) return null;

  return {
    source: "local",
    answer:
      `Pour ${context.cityRoute.name}, la page dediee est /immobilier/${context.cityRoute.slug}. Vous y trouverez le contexte local puis les annonces liees a la ville.`,
    suggestedPrompts: normalizePromptList([
      `Ouvrir /immobilier/${context.cityRoute.slug}`,
      "Ouvrir /biens",
      "Je veux des biens a vendre dans cette ville",
    ]),
  };
}

function buildSelectionAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Votre selection sauvegardee est accessible sur /biens-sauvegardes. Vous pouvez y retrouver les biens favoris puis partager la selection.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /biens-sauvegardes",
      "Je veux ajouter des biens a ma selection",
      "Ouvrir /biens",
    ]),
  };
}

function buildListingsQueryHint(path: string): string {
  const [, rawQuery = ""] = normalizeInternalPath(path).split("?");
  if (!rawQuery) return "";

  const query = new URLSearchParams(rawQuery);
  const hints: string[] = [];

  const transaction = query.get("transaction");
  if (transaction === "vente") hints.push("mode vente");
  if (transaction === "location") hints.push("mode location");

  const citySlug = query.get("city");
  if (citySlug && cityBySlug.has(citySlug)) {
    hints.push(`ville ${cityBySlug.get(citySlug)?.name}`);
  }

  const minBedrooms = query.get("bedroomsMin");
  if (minBedrooms && /^\d+$/.test(minBedrooms)) {
    hints.push(`${minBedrooms}+ chambres`);
  }

  const propertyType = query.get("type");
  if (propertyType === "appartement") hints.push("appartements");
  if (propertyType === "maison_villa") hints.push("maisons / villas");

  const minPrice = query.get("priceMin");
  const maxPrice = query.get("priceMax");
  if (minPrice && /^\d+$/.test(minPrice)) {
    hints.push(`prix min ${new Intl.NumberFormat("fr-FR").format(Number(minPrice))} EUR`);
  }
  if (maxPrice && /^\d+$/.test(maxPrice)) {
    hints.push(`prix max ${new Intl.NumberFormat("fr-FR").format(Number(maxPrice))} EUR`);
  }

  return hints.length > 0 ? ` Filtres detectes: ${hints.join(", ")}.` : "";
}

function buildPageSummaryAnswer(context: ConversationContext): ChatbotReply | null {
  const targetPath = context.requestedPath ?? context.recentKnownPaths[0] ?? null;
  if (!targetPath) return null;

  const topic = findTopicByPath(targetPath);
  if (!topic) return null;

  const queryHint = topic.path === "/biens" ? buildListingsQueryHint(targetPath) : "";
  const alternativePrompts = findRelevantTopics(context, 3)
    .filter((candidate) => candidate.path !== topic.path)
    .slice(0, 2)
    .map((candidate) => `Ouvrir ${candidate.path}`);

  return {
    source: "local",
    answer: `La page ${topic.path} (${topic.title}) sert a ceci: ${topic.summary}${queryHint}`,
    suggestedPrompts: normalizePromptList([
      `Ouvrir ${topic.path}`,
      ...topic.suggestedPrompts,
      ...alternativePrompts,
      "Ouvrir /plan-du-site",
    ]),
  };
}

function buildTopicGuidanceAnswer(context: ConversationContext): ChatbotReply | null {
  const relevantTopics = findRelevantTopics(context, 3);
  if (relevantTopics.length === 0) return null;

  const [primaryTopic, ...relatedTopics] = relevantTopics;
  const relatedPaths = relatedTopics.map((topic) => topic.path);
  const relatedSuffix =
    relatedPaths.length > 0 ? ` Pages proches: ${relatedPaths.join(", ")}.` : "";

  return {
    source: "local",
    answer: `${primaryTopic.title} (${primaryTopic.path}): ${primaryTopic.summary}${relatedSuffix}`,
    suggestedPrompts: normalizePromptList([
      `Ouvrir ${primaryTopic.path}`,
      ...primaryTopic.suggestedPrompts,
      ...relatedTopics.map((topic) => `Ouvrir ${topic.path}`),
      "Ouvrir /plan-du-site",
    ]),
  };
}

function buildDirectPathAnswer(path: string): ChatbotReply {
  const topic = findTopicByPath(path);
  const queryHint = canonicalizeTopicPath(path) === "/biens" ? buildListingsQueryHint(path) : "";

  if (topic) {
    return {
      source: "local",
      answer: `Parfait, ${topic.path} (${topic.title}) est la page adaptee. ${topic.summary}${queryHint}`,
      suggestedPrompts: normalizePromptList([`Ouvrir ${topic.path}`, ...topic.suggestedPrompts, "Je veux un resume de cette page"]),
    };
  }

  return {
    source: "local",
    answer: `Parfait, la page demandee est ${path}. Cliquez sur ce lien pour y acceder directement depuis le chat.`,
    suggestedPrompts: normalizePromptList([
      `Ouvrir ${path}`,
      "Je veux un resume de cette page",
      "Je veux contacter un conseiller",
    ]),
  };
}

function buildLegalAnswer(context: ConversationContext): ChatbotReply {
  const targetPath = /cookie/.test(context.normalizedQuestion)
    ? "/cookies"
    : /accessibilite/.test(context.normalizedQuestion)
      ? "/accessibilite"
      : /confidentialite|rgpd|donnees/.test(context.normalizedQuestion)
        ? "/confidentialite"
        : "/mentions-legales";

  return {
    source: "local",
    answer:
      `Pour ce sujet legal, la page adaptee est ${targetPath}. Vous pouvez aussi retrouver toutes les pages legales depuis /plan-du-site.`,
    suggestedPrompts: normalizePromptList([
      `Ouvrir ${targetPath}`,
      "Ouvrir /plan-du-site",
      "Ouvrir /contact",
    ]),
  };
}

function buildServiceAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Nos services couvrent la transaction (achat/vente), la location, la gestion locative et l'estimation. Selon votre besoin: /vendre, /services, /estimation et /contact.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /services",
      "Je veux vendre mon bien au Havre",
      "Pouvez-vous gerer mon bien en location ?",
      "Ouvrir /estimation",
    ]),
  };
}

function buildPropertyAnswer(question: string, context: ConversationContext): ChatbotReply {
  const suggestions = buildPropertySuggestions(question, context);
  const criteriaSummary = formatCriteriaSummary(context);

  if (suggestions.length === 0) {
    return buildLeadCaptureAnswer(context);
  }

  return {
    source: "local",
    answer:
      criteriaSummary.length > 0
        ? `Parfait, j'ai une premiere selection coherente avec vos criteres (${criteriaSummary}). Vous pouvez aussi ouvrir /biens pour tout le catalogue.`
        : "Parfait, voici une premiere selection de biens qui correspondent a votre demande. Vous pouvez aussi ouvrir /biens pour tout le catalogue.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /biens",
      "Affinez sur un budget precis",
      "Je veux prioriser les quartiers proches mer",
      "Je ne trouve pas le bon bien, je veux etre rappelle",
    ]),
    propertySuggestions: suggestions,
  };
}

function hasPropertyContext(context: ConversationContext): boolean {
  return (
    context.propertyType !== null ||
    context.transactionPreference !== null ||
    context.bedroomsMin !== null ||
    context.budgetMax !== null ||
    context.district !== null ||
    context.cityRoute !== null
  );
}

function buildSiteNavigationAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Vous pouvez naviguer rapidement vers: /biens, /vendre, /estimation, /services, /histoire-immobilier-le-havre, /avis, /honoraires, /contact et /plan-du-site.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /biens",
      "Ouvrir /avis",
      "Ouvrir /contact",
      "Ouvrir /plan-du-site",
    ]),
  };
}

function buildGreetingAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Bonjour, avec plaisir. Je peux vous guider sur les biens, quartiers du Havre, services agence, avis clients et etapes de vente/achat. Dites-moi votre objectif et je vous redirige vers la bonne page.",
    suggestedPrompts: normalizePromptList(chatbotExamplePrompts),
  };
}

function buildThanksAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Avec plaisir. Je peux maintenant affiner votre recherche par budget, quartier, type de bien et ville, puis vous rediriger vers la page la plus utile.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /biens",
      "Je veux comparer Perret et Saint-Francois",
      "Je ne trouve pas de bien adapte, pouvez-vous me rappeler ?",
    ]),
  };
}

function buildCapabilitiesAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Je suis l'assistant immobilier du site. Je reponds sur les annonces, quartiers (Perret, Saint-Francois, Saint-Vincent, Sanvic, Graville, Eure-Docks), villes, services, honoraires, avis clients, process de vente/achat et contacts.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /biens",
      "Ouvrir /avis",
      "Ouvrir /histoire-immobilier-le-havre",
      "Ouvrir /contact",
    ]),
  };
}

function buildFallbackReply(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Je suis la pour vous guider. Je peux vous aider sur les biens disponibles, les quartiers du Havre, les services de l'agence, les avis clients, les etapes de vente/achat et les pages du site. Navigation rapide: /plan-du-site.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /plan-du-site",
      "Ouvrir /biens",
      "Ouvrir /avis",
      "Ouvrir /contact",
    ]),
  };
}

async function buildLocalReply(question: string, context: ConversationContext): Promise<ChatbotReply> {
  if (pageSummaryPattern.test(context.normalizedQuestion)) {
    const pageSummaryReply = buildPageSummaryAnswer(context);
    if (pageSummaryReply) return pageSummaryReply;
  }

  if (context.requestedPath) return buildDirectPathAnswer(context.requestedPath);
  if (context.inferredIntent === "lead_capture") return buildLeadCaptureAnswer(context);
  if (context.inferredIntent === "process") return buildProcessAnswer();
  if (context.inferredIntent === "contact") return buildContactAnswer();
  if (context.inferredIntent === "reviews") return await buildReviewsAnswer();
  if (context.inferredIntent === "fees") return buildFeesAnswer();
  if (legalIntentPattern.test(context.normalizedQuestion)) return buildLegalAnswer(context);
  if (selectionIntentPattern.test(context.normalizedQuestion)) return buildSelectionAnswer();

  if (context.inferredIntent === "property") {
    if (listingsPagePattern.test(context.normalizedQuestion)) return buildListingsPageAnswer(context);

    return (
      (districtComparisonPattern.test(context.normalizedQuestion) ? buildDistrictComparisonAnswer() : null) ??
      buildPropertyAnswer(question, context)
    );
  }

  if (context.inferredIntent === "service") {
    if (sellPagePattern.test(context.normalizedQuestion)) return buildSellPageAnswer();
    if (estimationPagePattern.test(context.normalizedQuestion)) return buildEstimationPageAnswer();
    return buildServiceAnswer();
  }

  if (context.inferredIntent === "history") return buildHistoryAnswer(context);
  if (context.inferredIntent === "about") return buildAboutAnswer();
  if (context.inferredIntent === "navigation") {
    if (context.cityRoute) return buildCityPageAnswer(context) ?? buildSiteNavigationAnswer();
    return buildTopicGuidanceAnswer(context) ?? buildSiteNavigationAnswer();
  }

  if (greetingPattern.test(context.normalizedQuestion)) return buildGreetingAnswer();
  if (thanksPattern.test(context.normalizedQuestion)) return buildThanksAnswer();
  if (capabilityPattern.test(context.normalizedQuestion)) return buildCapabilitiesAnswer();

  if (legalIntentPattern.test(context.normalizedQuestion)) return buildLegalAnswer(context);
  if (selectionIntentPattern.test(context.normalizedQuestion)) return buildSelectionAnswer();
  if (sellPagePattern.test(context.normalizedQuestion)) return buildSellPageAnswer();
  if (estimationPagePattern.test(context.normalizedQuestion)) return buildEstimationPageAnswer();
  if (listingsPagePattern.test(context.normalizedQuestion)) return buildListingsPageAnswer(context);

  if (context.cityRoute && cityPageIntentPattern.test(context.normalizedQuestion)) {
    return buildCityPageAnswer(context) ?? buildListingsPageAnswer(context);
  }

  if (hasPropertyContext(context)) return buildPropertyAnswer(question, context);

  return buildDistrictAnswer(context) ?? buildTopicGuidanceAnswer(context) ?? buildFallbackReply();
}

function isWebsiteContentQuestion(context: ConversationContext): boolean {
  return (
    context.requestedPath !== null ||
    context.inferredIntent !== "unknown" ||
    pageSummaryPattern.test(context.normalizedQuestion) ||
    greetingPattern.test(context.normalizedQuestion) ||
    thanksPattern.test(context.normalizedQuestion) ||
    capabilityPattern.test(context.normalizedQuestion) ||
    legalIntentPattern.test(context.normalizedQuestion) ||
    selectionIntentPattern.test(context.normalizedQuestion) ||
    sellPagePattern.test(context.normalizedQuestion) ||
    estimationPagePattern.test(context.normalizedQuestion) ||
    listingsPagePattern.test(context.normalizedQuestion) ||
    Boolean(context.cityRoute && cityPageIntentPattern.test(context.normalizedQuestion)) ||
    findRelevantTopics(context, 1).length > 0 ||
    hasPropertyContext(context)
  );
}

function isListingsNavigationPath(path: string | null): boolean {
  if (!path) return false;
  return /^\/biens(?:$|[-/])/.test(path);
}

function isInformationalCityHubQuestion(context: ConversationContext): boolean {
  if (!context.cityRoute) return false;
  if (!/immobilier|prix|marche|quartier|investissement|ville/.test(context.normalizedQuestion)) return false;

  const listingFilterSignals =
    context.propertyType !== null ||
    context.transactionPreference !== null ||
    context.bedroomsMin !== null ||
    context.budgetMax !== null;

  return !listingFilterSignals;
}

function isExplicitRouteContentQuestion(context: ConversationContext): boolean {
  if (!context.requestedPath) return false;
  if (followPathRequestPattern.test(context.normalizedQuestion)) return false;
  return true;
}

function isDeterministicLocalQuestion(context: ConversationContext): boolean {
  return (
    context.inferredIntent === "lead_capture" ||
    context.inferredIntent === "property" ||
    context.inferredIntent === "process" ||
    greetingPattern.test(context.normalizedQuestion) ||
    thanksPattern.test(context.normalizedQuestion) ||
    capabilityPattern.test(context.normalizedQuestion) ||
    selectionIntentPattern.test(context.normalizedQuestion) ||
    isListingsNavigationPath(context.requestedPath)
  );
}

interface ChatbotRoutingOptions {
  edgeApiEnabled: boolean;
  edgeRagForWebsiteQuestionsEnabled: boolean;
  edgeAgentToolsEnabled?: boolean;
  routerV2Enabled: boolean;
}

interface ChatbotRoutingMeta {
  actionRequest?: ChatbotActionRequest;
  conversationState?: ChatbotConversationState;
}

export function decideChatbotRoute(
  context: ConversationContext,
  options: ChatbotRoutingOptions,
  meta?: ChatbotRoutingMeta,
): ChatbotRouteDecision {
  const edgeAgentToolsEnabled = options.edgeAgentToolsEnabled === true;
  if (!options.routerV2Enabled) {
    if (!options.edgeApiEnabled) {
      return { target: "local", category: "fallback", reason: "edge_disabled_legacy", intent: context.inferredIntent };
    }
    if (isWebsiteContentQuestion(context) && !options.edgeRagForWebsiteQuestionsEnabled) {
      return { target: "local", category: "fallback", reason: "edge_rag_disabled_legacy", intent: context.inferredIntent };
    }
    return { target: "edge", category: "edge_general", reason: "legacy_edge_path", intent: context.inferredIntent };
  }

  if (isDeterministicLocalQuestion(context)) {
    if (context.inferredIntent === "property" && edgeAgentToolsEnabled && options.edgeApiEnabled) {
      return { target: "edge", category: "edge_tools", reason: "property_tool_mode", intent: context.inferredIntent };
    }
    return { target: "local", category: "deterministic_local", reason: "deterministic_local_match", intent: context.inferredIntent };
  }

  if (meta?.actionRequest) {
    if (!options.edgeApiEnabled) {
      return { target: "local", category: "fallback", reason: "edge_disabled_for_tool_action", intent: context.inferredIntent };
    }
    return { target: "edge", category: "edge_tools", reason: "tool_action_request", intent: context.inferredIntent };
  }

  if (!options.edgeApiEnabled) {
    return { target: "local", category: "fallback", reason: "edge_disabled", intent: context.inferredIntent };
  }

  const needsEdgeRag =
    context.inferredIntent === "navigation" ||
    context.inferredIntent === "fees" ||
    context.inferredIntent === "history" ||
    context.inferredIntent === "about" ||
    context.inferredIntent === "contact" ||
    context.inferredIntent === "service" ||
    legalIntentPattern.test(context.normalizedQuestion) ||
    pageSummaryPattern.test(context.normalizedQuestion) ||
    isExplicitRouteContentQuestion(context) ||
    isInformationalCityHubQuestion(context);

  if (needsEdgeRag) {
    if (!options.edgeRagForWebsiteQuestionsEnabled) {
      return { target: "local", category: "fallback", reason: "edge_rag_disabled", intent: context.inferredIntent };
    }
    return { target: "edge", category: "edge_rag", reason: "website_content_rag", intent: context.inferredIntent };
  }

  if (context.inferredIntent === "unknown") {
    const hasCompareSelection = (meta?.conversationState?.selectedPropertyIds?.length ?? 0) >= 2;
    if (edgeAgentToolsEnabled && hasCompareSelection && /compar|compare|entre les deux|entre ces biens/.test(context.normalizedQuestion)) {
      return { target: "edge", category: "edge_tools", reason: "compare_tool_with_selection", intent: context.inferredIntent };
    }
    return { target: "edge", category: "edge_general", reason: "unknown_intent_edge_general", intent: context.inferredIntent };
  }

  if (
    edgeAgentToolsEnabled &&
    options.edgeApiEnabled &&
    (context.inferredIntent === "property" ||
      (context.inferredIntent === "contact" &&
        ((meta?.conversationState?.recentSearch?.resultIds?.length ?? 0) > 0 ||
          (meta?.conversationState?.selectedPropertyIds?.length ?? 0) > 0)))
  ) {
    return { target: "edge", category: "edge_tools", reason: "property_or_handoff_tool_mode", intent: context.inferredIntent };
  }

  return { target: "local", category: "deterministic_local", reason: "default_local", intent: context.inferredIntent };
}

function isEdgeReplyUsable(payload: unknown): payload is ChatbotReply {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const maybeReply = payload as Partial<ChatbotReply>;
  return typeof maybeReply.answer === "string" && maybeReply.answer.trim().length > 0;
}

function sanitizeToolSearchParams(raw: unknown): ToolSearchParams | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const candidate = raw as Record<string, unknown>;
  const params: ToolSearchParams = {};
  if (candidate.transaction === "vente" || candidate.transaction === "location") params.transaction = candidate.transaction;
  if (candidate.type === "appartement" || candidate.type === "maison_villa" || candidate.type === "autre") {
    params.type = candidate.type;
  }
  if (typeof candidate.city === "string" && candidate.city.trim().length > 0) params.city = candidate.city.trim().slice(0, 80);
  if (typeof candidate.q === "string" && candidate.q.trim().length > 0) params.q = candidate.q.trim().slice(0, 120);
  for (const key of ["bedroomsMin", "priceMin", "priceMax", "page", "pageSize"] as const) {
    const value = candidate[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      (params as Record<string, number>)[key] = Math.floor(value);
    }
  }
  return Object.keys(params).length > 0 ? params : undefined;
}

function sanitizeCitations(raw: unknown): ChatbotCitation[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const citations = raw
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
    .map((citation) => {
      const path = typeof citation.path === "string" ? citation.path.trim() : "";
      if (!path) return null;

      const inferredKind =
        citation.kind === "site" || citation.kind === "web"
          ? citation.kind
          : path.startsWith("/")
            ? "site"
            : /^https?:\/\//i.test(path)
              ? "web"
              : null;
      if (!inferredKind) return null;

      if (inferredKind === "site" && !path.startsWith("/")) return null;
      if (inferredKind === "web" && !/^https?:\/\//i.test(path)) return null;

      const sourceUrlRaw = typeof citation.sourceUrl === "string" ? citation.sourceUrl.trim() : undefined;
      return {
        kind: inferredKind,
        path,
        title: typeof citation.title === "string" && citation.title.trim().length > 0 ? citation.title.trim().slice(0, 240) : undefined,
        sourceUrl:
          inferredKind === "web"
            ? ((sourceUrlRaw && /^https?:\/\//i.test(sourceUrlRaw)) ? sourceUrlRaw : path)
            : (sourceUrlRaw && sourceUrlRaw.length > 0 ? sourceUrlRaw : undefined),
        similarity: typeof citation.similarity === "number" && Number.isFinite(citation.similarity) ? citation.similarity : undefined,
      } satisfies ChatbotCitation;
    })
    .filter((citation): citation is ChatbotCitation => Boolean(citation))
    .slice(0, 6);

  return citations.length > 0 ? citations : undefined;
}

function sanitizeConversationStatePatch(raw: unknown): Partial<ChatbotConversationState> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const candidate = raw as Record<string, unknown>;
  const patch: Partial<ChatbotConversationState> = {};

  if (candidate.recentSearch && typeof candidate.recentSearch === "object") {
    const recent = candidate.recentSearch as Record<string, unknown>;
    const resultIds = Array.isArray(recent.resultIds)
      ? recent.resultIds
          .map((value) => (typeof value === "number" && Number.isInteger(value) ? value : Number(value)))
          .filter((value) => Number.isInteger(value) && value > 0)
          .slice(0, 20)
      : [];
    const generatedAt =
      typeof recent.generatedAt === "string" && recent.generatedAt.trim().length > 0
        ? recent.generatedAt.trim().slice(0, 80)
        : new Date().toISOString();
    patch.recentSearch = {
      params: sanitizeToolSearchParams(recent.params),
      resultIds,
      total: typeof recent.total === "number" && Number.isFinite(recent.total) ? Math.max(0, Math.floor(recent.total)) : undefined,
      generatedAt,
    };
  }

  if (Array.isArray(candidate.selectedPropertyIds)) {
    patch.selectedPropertyIds = candidate.selectedPropertyIds
      .map((value) => (typeof value === "number" ? value : Number(value)))
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(0, 3);
  }

  if (Array.isArray(candidate.recentPropertyIds)) {
    patch.recentPropertyIds = candidate.recentPropertyIds
      .map((value) => (typeof value === "number" ? value : Number(value)))
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(0, 20);
  }

  if (candidate.leadDraft && typeof candidate.leadDraft === "object") {
    const leadDraftCandidate = candidate.leadDraft as Record<string, unknown>;
    patch.leadDraft = {
      propertyId:
        typeof leadDraftCandidate.propertyId === "number" && Number.isInteger(leadDraftCandidate.propertyId)
          ? leadDraftCandidate.propertyId
          : undefined,
      citySlug:
        typeof leadDraftCandidate.citySlug === "string" && leadDraftCandidate.citySlug.trim().length > 0
          ? leadDraftCandidate.citySlug.trim().slice(0, 80)
          : undefined,
      criteriaSummary:
        typeof leadDraftCandidate.criteriaSummary === "string" && leadDraftCandidate.criteriaSummary.trim().length > 0
          ? leadDraftCandidate.criteriaSummary.trim().slice(0, 500)
          : undefined,
    };
  }

  if (candidate.preferences && typeof candidate.preferences === "object") {
    const preferencesCandidate = candidate.preferences as Record<string, unknown>;
    patch.preferences = {
      ...sanitizeToolSearchParams(preferencesCandidate),
    };
  }

  return Object.keys(patch).length > 0 ? patch : undefined;
}

function sanitizeToolTrace(raw: unknown): ChatbotToolTrace[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const traces = raw
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
    .map((trace) => {
      const tool =
        trace.tool === "search_properties" ||
        trace.tool === "get_properties" ||
        trace.tool === "compare_properties" ||
        trace.tool === "prepare_handoff" ||
        trace.tool === "get_property_media_context" ||
        trace.tool === "get_property_document_context" ||
        trace.tool === "retrieve_site_context"
          ? trace.tool
          : null;
      const status = trace.status === "ok" || trace.status === "error" || trace.status === "skipped" ? trace.status : null;
      const latencyMs =
        typeof trace.latencyMs === "number" && Number.isFinite(trace.latencyMs) ? Math.max(0, Math.floor(trace.latencyMs)) : null;
      if (!tool || !status || latencyMs == null) return null;
      return {
        tool,
        status,
        latencyMs,
        resultCount:
          typeof trace.resultCount === "number" && Number.isFinite(trace.resultCount)
            ? Math.max(0, Math.floor(trace.resultCount))
            : undefined,
        errorCode:
          typeof trace.errorCode === "string" && trace.errorCode.trim().length > 0
            ? trace.errorCode.trim().slice(0, 80)
            : undefined,
      } satisfies ChatbotToolTrace;
    })
    .filter((trace): trace is ChatbotToolTrace => Boolean(trace))
    .slice(0, 10);

  return traces.length > 0 ? traces : undefined;
}

function sanitizePlannerMeta(raw: unknown): ChatbotPlannerMeta | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const candidate = raw as Record<string, unknown>;
  const provider = candidate.provider === "gemini" || candidate.provider === "fallback" ? candidate.provider : null;
  const mode =
    candidate.mode === "disabled" || candidate.mode === "gemini" || candidate.mode === "deterministic_fallback"
      ? candidate.mode
      : null;
  const decisionType =
    candidate.decisionType === "tool_call" ||
    candidate.decisionType === "clarify" ||
    candidate.decisionType === "plan" ||
    candidate.decisionType === "none"
      ? candidate.decisionType
      : null;
  if (!provider || !mode || !decisionType) return undefined;

  return {
    provider,
    mode,
    decisionType,
    toolName:
      candidate.toolName === "search_properties" ||
      candidate.toolName === "get_properties" ||
      candidate.toolName === "compare_properties" ||
      candidate.toolName === "prepare_handoff" ||
      candidate.toolName === "get_property_media_context" ||
      candidate.toolName === "get_property_document_context" ||
      candidate.toolName === "retrieve_site_context"
        ? candidate.toolName
        : undefined,
    reasonCode:
      typeof candidate.reasonCode === "string" && candidate.reasonCode.trim().length > 0
        ? candidate.reasonCode.trim().slice(0, 80)
        : undefined,
    confidence:
      typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence)
        ? Math.max(0, Math.min(1, candidate.confidence))
        : undefined,
  };
}

function sanitizeAnalysisCards(raw: unknown): ChatbotAnalysisCard[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const cards = raw
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
    .map((card) => {
      const kind =
        card.kind === "property_photo_insights" ||
        card.kind === "property_plan_insights" ||
        card.kind === "property_document_summary" ||
        card.kind === "property_risks_notice"
          ? card.kind
          : null;
      const id = typeof card.id === "string" ? card.id.trim().slice(0, 120) : "";
      const propertyId = typeof card.propertyId === "number" ? card.propertyId : Number(card.propertyId);
      const title = typeof card.title === "string" ? card.title.trim().slice(0, 160) : "";
      const summary = typeof card.summary === "string" ? card.summary.trim().slice(0, 1200) : "";
      if (!kind || !id || !Number.isInteger(propertyId) || propertyId <= 0 || !title || !summary) return null;
      return {
        id,
        kind,
        propertyId,
        title,
        summary,
        confidence:
          typeof card.confidence === "number" && Number.isFinite(card.confidence)
            ? Math.max(0, Math.min(1, card.confidence))
            : undefined,
        stale: typeof card.stale === "boolean" ? card.stale : undefined,
        cacheHit: typeof card.cacheHit === "boolean" ? card.cacheHit : undefined,
        sourceKind: card.sourceKind === "image" || card.sourceKind === "document" ? card.sourceKind : undefined,
        documentKind:
          card.documentKind === "dpe_pdf" ||
          card.documentKind === "diagnostic_pdf" ||
          card.documentKind === "floor_plan_pdf" ||
          card.documentKind === "brochure_pdf" ||
          card.documentKind === "other"
            ? card.documentKind
            : undefined,
        evidence: Array.isArray(card.evidence)
          ? card.evidence
              .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
              .map((evidence) => ({
                sourceUrl: typeof evidence.sourceUrl === "string" ? evidence.sourceUrl.trim().slice(0, 1000) : undefined,
                thumbnailUrl:
                  typeof evidence.thumbnailUrl === "string" ? evidence.thumbnailUrl.trim().slice(0, 1000) : undefined,
                page:
                  typeof evidence.page === "number" && Number.isFinite(evidence.page)
                    ? Math.max(1, Math.floor(evidence.page))
                    : undefined,
                label: typeof evidence.label === "string" ? evidence.label.trim().slice(0, 120) : undefined,
                kind: typeof evidence.kind === "string" ? evidence.kind.trim().slice(0, 60) : undefined,
              }))
              .slice(0, 8)
          : undefined,
      } satisfies ChatbotAnalysisCard;
    })
    .filter((card): card is ChatbotAnalysisCard => Boolean(card))
    .slice(0, 8);
  return cards.length > 0 ? cards : undefined;
}

function sanitizeMemoryMeta(raw: unknown): ChatbotReply["memory"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.updated !== "boolean") return undefined;
  return {
    updated: candidate.updated,
    preferenceKeys: Array.isArray(candidate.preferenceKeys)
      ? candidate.preferenceKeys
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim().slice(0, 80))
          .filter(Boolean)
          .slice(0, 20)
      : undefined,
    summary:
      typeof candidate.summary === "string" && candidate.summary.trim().length > 0
        ? candidate.summary.trim().slice(0, 500)
        : undefined,
    source:
      candidate.source === "state_merge" || candidate.source === "gemini_extractor" || candidate.source === "none"
        ? candidate.source
        : undefined,
    ttlDays:
      typeof candidate.ttlDays === "number" && Number.isFinite(candidate.ttlDays)
        ? Math.max(1, Math.min(3650, Math.floor(candidate.ttlDays)))
        : undefined,
    updatedKeys: Array.isArray(candidate.updatedKeys)
      ? candidate.updatedKeys
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim().slice(0, 80))
          .filter(Boolean)
          .slice(0, 20)
      : undefined,
    confidence:
      typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence)
        ? Math.max(0, Math.min(1, candidate.confidence))
        : undefined,
    cleared: typeof candidate.cleared === "boolean" ? candidate.cleared : undefined,
  };
}

function sanitizeCostHints(raw: unknown): ChatbotReply["costHints"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const candidate = raw as Record<string, unknown>;
  const route = typeof candidate.route === "string" ? candidate.route.trim().slice(0, 80) : "";
  if (!route) return undefined;
  return {
    route,
    multimodalUsed: typeof candidate.multimodalUsed === "boolean" ? candidate.multimodalUsed : undefined,
    estimatedClass:
      candidate.estimatedClass === "low" || candidate.estimatedClass === "medium" || candidate.estimatedClass === "high"
        ? candidate.estimatedClass
        : undefined,
  };
}

function sanitizeActions(raw: unknown): ChatbotUiAction[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const actions: ChatbotUiAction[] = [];

  for (const value of raw.slice(0, 5)) {
    if (!value || typeof value !== "object") continue;
    const candidate = value as Record<string, unknown>;
    const id = typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id.trim().slice(0, 120) : undefined;
    const title =
      typeof candidate.title === "string" && candidate.title.trim().length > 0 ? candidate.title.trim().slice(0, 160) : undefined;
    const description =
      typeof candidate.description === "string" && candidate.description.trim().length > 0
        ? candidate.description.trim().slice(0, 300)
        : undefined;
    const requiresConfirmation = typeof candidate.requiresConfirmation === "boolean" ? candidate.requiresConfirmation : undefined;
    if (!id || !title || typeof candidate.kind !== "string" || !candidate.data || typeof candidate.data !== "object") continue;

    const base = { id, title, description, requiresConfirmation };
    const data = candidate.data as Record<string, unknown>;

    if (candidate.kind === "search_results") {
      const items = Array.isArray(data.items)
        ? data.items
            .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
            .map((item) => ({
              id: typeof item.id === "number" ? item.id : Number(item.id),
              title: typeof item.title === "string" ? item.title.trim().slice(0, 200) : "",
              priceAmount: typeof item.priceAmount === "number" ? item.priceAmount : Number(item.priceAmount),
              currency: typeof item.currency === "string" ? item.currency.trim().slice(0, 10) : "EUR",
              surfaceM2:
                typeof item.surfaceM2 === "number" && Number.isFinite(item.surfaceM2)
                  ? item.surfaceM2
                  : item.surfaceM2 == null
                    ? null
                    : Number(item.surfaceM2) || null,
              bedrooms:
                typeof item.bedrooms === "number" && Number.isFinite(item.bedrooms)
                  ? item.bedrooms
                  : item.bedrooms == null
                    ? null
                    : Number(item.bedrooms) || null,
              cityName: typeof item.cityName === "string" ? item.cityName.trim().slice(0, 120) : "",
              citySlug: typeof item.citySlug === "string" ? item.citySlug.trim().slice(0, 80) : "",
              path: typeof item.path === "string" ? item.path.trim().slice(0, 500) : "",
              coverImageUrl:
                typeof item.coverImageUrl === "string" ? item.coverImageUrl.trim().slice(0, 1000) : "",
              dpeLabel: typeof item.dpeLabel === "string" ? item.dpeLabel.trim().slice(0, 10) : null,
              transaction: typeof item.transaction === "string" ? item.transaction.trim().slice(0, 30) : "",
              type: typeof item.type === "string" ? item.type.trim().slice(0, 30) : "",
            }))
            .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.title.length > 0 && item.path.startsWith("/"))
            .slice(0, 5)
        : [];
      if (items.length === 0 && !(typeof data.total === "number" && data.total === 0)) continue;

      actions.push({
        ...base,
        kind: "search_results",
        data: {
          criteriaSummary:
            typeof data.criteriaSummary === "string" ? data.criteriaSummary.trim().slice(0, 300) : "Résultats de recherche",
          searchParams: sanitizeToolSearchParams(data.searchParams) ?? {},
          total: typeof data.total === "number" && Number.isFinite(data.total) ? Math.max(0, Math.floor(data.total)) : items.length,
          items,
          canCompare: Boolean(data.canCompare),
          compareSelectionLimit:
            typeof data.compareSelectionLimit === "number" && Number.isFinite(data.compareSelectionLimit)
              ? Math.min(3, Math.max(2, Math.floor(data.compareSelectionLimit)))
              : 3,
          nextSuggestedRefinements: Array.isArray(data.nextSuggestedRefinements)
            ? data.nextSuggestedRefinements
                .filter((v): v is string => typeof v === "string")
                .map((v) => v.trim())
                .filter(Boolean)
                .slice(0, 5)
            : undefined,
        },
      });
      continue;
    }

    if (candidate.kind === "compare_summary") {
      const propertyIds = Array.isArray(data.propertyIds)
        ? data.propertyIds
            .map((value) => (typeof value === "number" ? value : Number(value)))
            .filter((value) => Number.isInteger(value) && value > 0)
            .slice(0, 3)
        : [];
      const properties = Array.isArray(data.properties)
        ? data.properties
            .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
            .map((item) => ({
              id: typeof item.id === "number" ? item.id : Number(item.id),
              title: typeof item.title === "string" ? item.title.trim().slice(0, 200) : "",
              path: typeof item.path === "string" ? item.path.trim().slice(0, 500) : "",
              priceAmount: typeof item.priceAmount === "number" ? item.priceAmount : Number(item.priceAmount),
              surfaceM2:
                typeof item.surfaceM2 === "number" && Number.isFinite(item.surfaceM2)
                  ? item.surfaceM2
                  : item.surfaceM2 == null
                    ? null
                    : Number(item.surfaceM2) || null,
              bedrooms:
                typeof item.bedrooms === "number" && Number.isFinite(item.bedrooms)
                  ? item.bedrooms
                  : item.bedrooms == null
                    ? null
                    : Number(item.bedrooms) || null,
              cityName: typeof item.cityName === "string" ? item.cityName.trim().slice(0, 120) : "",
              dpeLabel: typeof item.dpeLabel === "string" ? item.dpeLabel.trim().slice(0, 10) : null,
              terrainM2:
                typeof item.terrainM2 === "number" && Number.isFinite(item.terrainM2)
                  ? item.terrainM2
                  : item.terrainM2 == null
                    ? null
                    : undefined,
              garageCount:
                typeof item.garageCount === "number" && Number.isFinite(item.garageCount)
                  ? Math.floor(item.garageCount)
                  : item.garageCount == null
                    ? null
                    : undefined,
              bathrooms:
                typeof item.bathrooms === "number" && Number.isFinite(item.bathrooms)
                  ? Math.floor(item.bathrooms)
                  : item.bathrooms == null
                    ? null
                    : undefined,
            }))
            .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.title.length > 0 && item.path.startsWith("/"))
            .slice(0, 3)
        : [];
      const comparisonRows = Array.isArray(data.comparisonRows)
        ? data.comparisonRows
            .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
            .map((row) => ({
              label: typeof row.label === "string" ? row.label.trim().slice(0, 80) : "",
              values: Array.isArray(row.values)
                ? row.values.map((v) => (typeof v === "string" ? v.slice(0, 80) : v == null ? null : String(v).slice(0, 80))).slice(0, 3)
                : [],
            }))
            .filter((row) => row.label.length > 0)
            .slice(0, 10)
        : [];
      if (properties.length < 2) continue;
      actions.push({
        ...base,
        kind: "compare_summary",
        data: {
          propertyIds: propertyIds.length > 0 ? propertyIds : properties.map((p) => p.id),
          properties,
          comparisonRows,
          summary: typeof data.summary === "string" ? data.summary.trim().slice(0, 800) : "",
          recommendedPropertyId:
            typeof data.recommendedPropertyId === "number" && Number.isInteger(data.recommendedPropertyId)
              ? data.recommendedPropertyId
              : undefined,
          nextActions: Array.isArray(data.nextActions)
            ? data.nextActions
                .filter((v): v is "open_property" | "prefill_handoff" => v === "open_property" || v === "prefill_handoff")
                .slice(0, 4)
            : undefined,
        },
      });
      continue;
    }

    if (candidate.kind === "lead_handoff_draft") {
      const draft = data.draft && typeof data.draft === "object" ? (data.draft as Record<string, unknown>) : null;
      const prefill = data.prefill && typeof data.prefill === "object" ? (data.prefill as Record<string, unknown>) : null;
      const criteria = typeof prefill?.criteria === "string" ? prefill.criteria.trim().slice(0, 2000) : "";
      if (!draft || !prefill || criteria.length === 0) continue;
      actions.push({
        ...base,
        kind: "lead_handoff_draft",
        data: {
          draft: {
            source: "contact_page",
            propertyId:
              typeof draft.propertyId === "number" && Number.isInteger(draft.propertyId) ? draft.propertyId : undefined,
            criteriaMessage:
              typeof draft.criteriaMessage === "string" ? draft.criteriaMessage.trim().slice(0, 2000) : criteria,
          },
          prefill: {
            criteria,
            firstName: typeof prefill.firstName === "string" ? prefill.firstName.trim().slice(0, 80) : undefined,
            lastName: typeof prefill.lastName === "string" ? prefill.lastName.trim().slice(0, 80) : undefined,
            email: typeof prefill.email === "string" ? prefill.email.trim().slice(0, 120) : undefined,
          },
          missingFields: Array.isArray(data.missingFields)
            ? data.missingFields
                .filter(
                  (v): v is "firstName" | "lastName" | "email" => v === "firstName" || v === "lastName" || v === "email",
                )
                .slice(0, 3)
            : ["firstName", "lastName", "email"],
          contextSummary:
            typeof data.contextSummary === "string" ? data.contextSummary.trim().slice(0, 500) : "Demande de contact",
        },
      });
      continue;
    }

    if (candidate.kind === "open_page") {
      const path = typeof data.path === "string" ? data.path.trim().slice(0, 500) : "";
      const label = typeof data.label === "string" ? data.label.trim().slice(0, 120) : path;
      if (!path.startsWith("/")) continue;
      actions.push({
        ...base,
        kind: "open_page",
        data: {
          path,
          label,
          reason: typeof data.reason === "string" ? data.reason.trim().slice(0, 80) : undefined,
        },
      });
      continue;
    }

    if (candidate.kind === "notice") {
      actions.push({
        ...base,
        kind: "notice",
        data: {
          level: data.level === "warning" ? "warning" : data.level === "info" ? "info" : undefined,
          code: typeof data.code === "string" ? data.code.trim().slice(0, 80) : undefined,
        },
      });
    }
  }

  return actions.length > 0 ? actions : undefined;
}

function normalizeReplyOutput(reply: ChatbotReply): ChatbotReply {
  const answer = typeof reply.answer === "string" && reply.answer.trim().length > 0 ? reply.answer.trim() : buildFallbackReply().answer;
  const prompts = normalizePromptList(reply.suggestedPrompts ?? []);
  const citations = sanitizeCitations(reply.citations);
  const edgeProvider =
    reply.edgeProvider === "gemini" || reply.edgeProvider === "openai" || reply.edgeProvider === "fallback"
      ? reply.edgeProvider
      : undefined;
  const retrievalMode =
    reply.retrievalMode === "none" ||
    reply.retrievalMode === "vector" ||
    reply.retrievalMode === "keyword" ||
    reply.retrievalMode === "hybrid"
      ? reply.retrievalMode
      : undefined;
  const routeCategory =
    reply.routeCategory === "deterministic_local" ||
    reply.routeCategory === "edge_rag" ||
    reply.routeCategory === "edge_general" ||
    reply.routeCategory === "edge_tools" ||
    reply.routeCategory === "fallback"
      ? reply.routeCategory
      : undefined;
  const routeDecision = typeof reply.routeDecision === "string" ? reply.routeDecision.trim().slice(0, 120) : undefined;
  const requestId = typeof reply.requestId === "string" ? reply.requestId.trim().slice(0, 120) : undefined;
  const agentMode = reply.agentMode === "tool" || reply.agentMode === "rag" || reply.agentMode === "fallback" ? reply.agentMode : undefined;
  const actions = sanitizeActions(reply.actions);
  const conversationStatePatch = sanitizeConversationStatePatch(reply.conversationStatePatch);
  const toolTrace = sanitizeToolTrace(reply.toolTrace);
  const planner = sanitizePlannerMeta(reply.planner);
  const analysisCards = sanitizeAnalysisCards(reply.analysisCards);
  const memory = sanitizeMemoryMeta(reply.memory);
  const costHints = sanitizeCostHints(reply.costHints);
  const streamSupported = typeof reply.streamSupported === "boolean" ? reply.streamSupported : undefined;
  const pageContextUsed = typeof reply.pageContextUsed === "boolean" ? reply.pageContextUsed : undefined;
  const pageContextMode = reply.pageContextMode === "http" || reply.pageContextMode === "headless" ? reply.pageContextMode : undefined;
  const pageContextCacheHit = typeof reply.pageContextCacheHit === "boolean" ? reply.pageContextCacheHit : undefined;
  const webSearchUsed = typeof reply.webSearchUsed === "boolean" ? reply.webSearchUsed : undefined;
  const webSearchProvider = reply.webSearchProvider === "gemini_google_search" ? reply.webSearchProvider : undefined;
  const webSearchQueries = Array.isArray(reply.webSearchQueries)
    ? reply.webSearchQueries
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim().slice(0, 240))
        .slice(0, 3)
    : undefined;

  return {
    ...reply,
    answer,
    suggestedPrompts: prompts.length > 0 ? prompts : normalizePromptList(chatbotExamplePrompts),
    citations,
    edgeProvider,
    retrievalMode,
    routeCategory,
    routeDecision: routeDecision && routeDecision.length > 0 ? routeDecision : undefined,
    requestId: requestId && requestId.length > 0 ? requestId : undefined,
    agentMode,
    actions,
    conversationStatePatch,
    toolTrace,
    planner,
    analysisCards,
    memory,
    pageContextUsed,
    pageContextMode,
    pageContextCacheHit,
    costHints,
    webSearchUsed,
    webSearchProvider,
    webSearchQueries,
    streamSupported,
  };
}

function applyRouteMetadata(reply: ChatbotReply, route: ChatbotRouteDecision): ChatbotReply {
  return {
    ...reply,
    routeDecision: route.reason,
    routeCategory: route.category,
  };
}

export async function askAgencyChatbot(request: ChatbotRequest): Promise<ChatbotReply> {
  const context = buildConversationContext(request.question, request.chatHistory);
  const edgeRagForWebsiteQuestionsEnabled =
    (import.meta.env.VITE_CHATBOT_ENABLE_EDGE_RAG as string | undefined)?.toLowerCase() === "true";
  const edgeAgentToolsEnabled =
    ((import.meta.env.VITE_CHATBOT_ENABLE_EDGE_AGENT_TOOLS as string | undefined) ?? "false").toLowerCase() === "true";
  const routerV2Enabled = ((import.meta.env.VITE_CHATBOT_ROUTER_V2 as string | undefined) ?? "true").toLowerCase() !== "false";
  const routeDecision = decideChatbotRoute(context, {
    edgeApiEnabled: isEdgeApiEnabled(),
    edgeRagForWebsiteQuestionsEnabled,
    edgeAgentToolsEnabled,
    routerV2Enabled,
  }, {
    actionRequest: request.actionRequest,
    conversationState: request.conversationState,
  });

  let localReplyCache: ChatbotReply | null = null;
  const getLocalReply = async () => {
    if (!localReplyCache) {
      localReplyCache = normalizeReplyOutput(await buildLocalReply(request.question, context));
    }
    return localReplyCache;
  };

  if (routeDecision.target === "local") {
    return normalizeReplyOutput(applyRouteMetadata(await getLocalReply(), routeDecision));
  }

  const { signal, ...requestPayload } = request;

  try {
    const responsePayload = await apiJson<ChatbotReply>("/api/chatbot-assistant", {
      method: "POST",
      body: JSON.stringify(requestPayload),
      signal,
    });

    if (!isEdgeReplyUsable(responsePayload)) {
      return normalizeReplyOutput(
        applyRouteMetadata(await getLocalReply(), {
          ...routeDecision,
          target: "local",
          category: "fallback",
          reason: "edge_invalid_payload",
        }),
      );
    }

    const inferredEdgeProvider =
      responsePayload.edgeProvider ??
      ((responsePayload as Partial<ChatbotReply> & { source?: unknown }).source === "gemini" ||
      (responsePayload as Partial<ChatbotReply> & { source?: unknown }).source === "openai" ||
      (responsePayload as Partial<ChatbotReply> & { source?: unknown }).source === "fallback"
        ? ((responsePayload as Partial<ChatbotReply> & { source?: "gemini" | "openai" | "fallback" }).source ?? undefined)
        : undefined);

    return normalizeReplyOutput(
      applyRouteMetadata(
        {
          ...responsePayload,
          source: "edge",
          edgeProvider: inferredEdgeProvider,
        },
        routeDecision,
      ),
    );
  } catch {
    return normalizeReplyOutput(
      applyRouteMetadata(await getLocalReply(), {
        ...routeDecision,
        target: "local",
        category: "fallback",
        reason: "edge_request_failed",
      }),
    );
  }
}

export async function resetAgencyChatbotMemory(sessionId: string, signal?: AbortSignal): Promise<boolean> {
  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) return false;
  if (!isEdgeApiEnabled()) return false;
  try {
    const response = await apiJson<{ ok?: boolean; cleared?: boolean }>("/api/chatbot-memory/reset", {
      method: "POST",
      body: JSON.stringify({ sessionId: normalizedSessionId }),
      signal,
    });
    return response.ok === true && response.cleared === true;
  } catch {
    return false;
  }
}

function streamEndpointPath(): string {
  return "/api/chatbot-assistant-stream";
}

async function parseSseResponseStream(
  response: Response,
  handlers?: ChatbotStreamHandlers,
): Promise<ChatbotReply> {
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Stream request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";
  let currentData = "";
  let finalReply: ChatbotReply | null = null;

  const dispatchEvent = () => {
    if (!currentData) {
      currentEvent = "message";
      return;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(currentData);
    } catch {
      payload = { raw: currentData };
    }

    if (currentEvent === "meta" && handlers?.onMeta && payload && typeof payload === "object") {
      handlers.onMeta(payload as Record<string, unknown>);
    } else if (currentEvent === "status" && handlers?.onStatus && payload && typeof payload === "object") {
      handlers.onStatus(payload as Record<string, unknown>);
    } else if (currentEvent === "text_delta" && handlers?.onTextDelta && payload && typeof payload === "object") {
      const delta = (payload as Record<string, unknown>).delta;
      if (typeof delta === "string") handlers.onTextDelta(delta);
    } else if (currentEvent === "citation" && handlers?.onCitations && payload && typeof payload === "object") {
      const citations = sanitizeCitations((payload as Record<string, unknown>).citations);
      if (citations) handlers.onCitations(citations);
    } else if (currentEvent === "action" && payload && typeof payload === "object") {
      if (handlers?.onActions) {
        const actions = sanitizeActions((payload as Record<string, unknown>).actions);
        if (actions) handlers.onActions(actions);
      }
      if (handlers?.onAnalysisCards) {
        const analysisCards = sanitizeAnalysisCards((payload as Record<string, unknown>).analysisCards);
        if (analysisCards) handlers.onAnalysisCards(analysisCards);
      }
    } else if (currentEvent === "done" && payload && typeof payload === "object") {
      const replyCandidate = (payload as Record<string, unknown>).reply;
      if (replyCandidate && typeof replyCandidate === "object") {
        const maybeReply = replyCandidate as ChatbotReply;
        if (isEdgeReplyUsable(maybeReply)) {
          finalReply = normalizeReplyOutput({
            ...maybeReply,
            source: "edge",
            edgeProvider:
              maybeReply.edgeProvider ??
              ((maybeReply as Partial<ChatbotReply> & { source?: unknown }).source === "gemini" ||
              (maybeReply as Partial<ChatbotReply> & { source?: unknown }).source === "openai" ||
              (maybeReply as Partial<ChatbotReply> & { source?: unknown }).source === "fallback"
                ? ((maybeReply as Partial<ChatbotReply> & { source?: "gemini" | "openai" | "fallback" }).source ?? undefined)
                : undefined),
          });
        }
      }
    } else if (currentEvent === "error" && payload && typeof payload === "object") {
      const message = (payload as Record<string, unknown>).message;
      if (typeof message === "string" && message.trim().length > 0) {
        throw new Error(message);
      }
    }
    currentEvent = "message";
    currentData = "";
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let delimiterIndex = buffer.indexOf("\n\n");
    while (delimiterIndex !== -1) {
      const rawEvent = buffer.slice(0, delimiterIndex);
      buffer = buffer.slice(delimiterIndex + 2);
      currentEvent = "message";
      currentData = "";
      for (const rawLine of rawEvent.split(/\r?\n/)) {
        const line = rawLine.trimEnd();
        if (!line) continue;
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          const dataLine = line.slice(5).trim();
          currentData = currentData ? `${currentData}\n${dataLine}` : dataLine;
        }
      }
      dispatchEvent();
      delimiterIndex = buffer.indexOf("\n\n");
    }
  }

  if (!finalReply) {
    throw new Error("Streaming response completed without final reply.");
  }
  return finalReply;
}

export async function askAgencyChatbotStream(
  request: ChatbotRequest,
  handlers?: ChatbotStreamHandlers,
): Promise<ChatbotReply> {
  const context = buildConversationContext(request.question, request.chatHistory);
  const edgeRagForWebsiteQuestionsEnabled =
    (import.meta.env.VITE_CHATBOT_ENABLE_EDGE_RAG as string | undefined)?.toLowerCase() === "true";
  const edgeAgentToolsEnabled =
    ((import.meta.env.VITE_CHATBOT_ENABLE_EDGE_AGENT_TOOLS as string | undefined) ?? "false").toLowerCase() === "true";
  const routerV2Enabled = ((import.meta.env.VITE_CHATBOT_ROUTER_V2 as string | undefined) ?? "true").toLowerCase() !== "false";
  const routeDecision = decideChatbotRoute(context, {
    edgeApiEnabled: isEdgeApiEnabled(),
    edgeRagForWebsiteQuestionsEnabled,
    edgeAgentToolsEnabled,
    routerV2Enabled,
  }, {
    actionRequest: request.actionRequest,
    conversationState: request.conversationState,
  });

  let localReplyCache: ChatbotReply | null = null;
  const getLocalReply = async () => {
    if (!localReplyCache) {
      localReplyCache = normalizeReplyOutput(await buildLocalReply(request.question, context));
    }
    return localReplyCache;
  };

  if (routeDecision.target === "local") {
    return normalizeReplyOutput(applyRouteMetadata(await getLocalReply(), routeDecision));
  }

  const { signal, ...requestPayload } = request;
  const response = await edgeApiFetch(streamEndpointPath(), {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

  try {
    const streamedReply = await parseSseResponseStream(response, handlers);
    return normalizeReplyOutput(applyRouteMetadata(streamedReply, routeDecision));
  } catch {
    return normalizeReplyOutput(
      applyRouteMetadata(await getLocalReply(), {
        ...routeDecision,
        target: "local",
        category: "fallback",
        reason: "edge_stream_failed",
      }),
    );
  }
}
