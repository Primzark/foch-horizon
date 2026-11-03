import { geographyReply } from "../../../../supabase/functions/_shared/chatbot-geography";
import { cities, cityById } from "@/features/cities/data/cities";
import { leHavreDistrictHistory, leHavreFaq } from "@/features/content/data/leHavreHistoryContent";
import { agencyReviewsFallbackSnapshot, getAgencyReviews } from "@/features/content/api/googleReviews.service";
import { properties } from "@/features/listings/data/properties";
import { formatPrice, isAvailablePropertyStatus, normalizeKeyword, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
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
  transaction?: "vente";
  type?: "appartement" | "maison_villa" | "autre";
  city?: string;
  q?: string;
  rooms?: number;
  excludedFeatures?: string[];
  bedroomsMin?: number;
  bathroomsMin?: number;
  garagesMin?: number;
  priceMin?: number;
  priceMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  terrainMin?: number;
  terrainMax?: number;
  features?: string[];
  sort?: "newest" | "price_asc" | "price_desc" | "surface_desc";
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
    transaction?: "vente";
    type?: "appartement" | "maison_villa" | "autre";
    city?: string;
    bedroomsMin?: number;
    bathroomsMin?: number;
    garagesMin?: number;
    priceMin?: number;
    priceMax?: number;
    surfaceMin?: number;
    surfaceMax?: number;
    terrainMin?: number;
    terrainMax?: number;
    features?: string[];
    sort?: "newest" | "price_asc" | "price_desc" | "surface_desc";
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
      type: "aggregate_properties";
      payload?: {
        scope?: "current_filtered" | "global_active_inventory" | "selected_properties";
        searchParams?: ToolSearchParams;
        propertyIds?: number[];
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
    | "aggregate_properties"
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
    | "aggregate_properties"
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
          status: string;
          dataQualityWarning?: string | null;
        }>;
        canCompare: boolean;
        compareSelectionLimit: number;
        nextSuggestedRefinements?: string[];
      };
    })
  | (ChatbotUiActionBase & {
      kind: "stats_summary";
      data: {
        scope: "current_filtered" | "global_active_inventory" | "selected_properties";
        scopeLabel: string;
        criteriaSummary: string;
        searchParams?: ToolSearchParams;
        selectedPropertyIds?: number[];
        metrics: {
          count: number;
          excludedSurfaceCount?: number;
          avgSurfaceM2?: number | null;
          medianSurfaceM2?: number | null;
          minSurfaceM2?: number | null;
          maxSurfaceM2?: number | null;
          avgPrice?: number | null;
          medianPrice?: number | null;
          minPrice?: number | null;
          maxPrice?: number | null;
        };
        breakdowns?: {
          byTransaction?: Array<{ key: string; label: string; count: number; avgPrice?: number | null; avgSurfaceM2?: number | null }>;
          byType?: Array<{ key: string; label: string; count: number; avgPrice?: number | null; avgSurfaceM2?: number | null }>;
          topCities?: Array<{ key: string; label: string; count: number; avgPrice?: number | null; avgSurfaceM2?: number | null }>;
        };
        sampleSizeLabel: string;
        lowSampleWarning?: string;
      };
    })
  | (ChatbotUiActionBase & {
      kind: "facet_refine";
      data: {
        searchParams: ToolSearchParams;
        suggestions: Array<{
          label: string;
          patch: Partial<ToolSearchParams>;
          removeKeys?: Array<keyof ToolSearchParams>;
        }>;
      };
    })
  | (ChatbotUiActionBase & {
      kind: "apply_filter_patch";
      data: {
        searchParamsPatch: Partial<ToolSearchParams>;
        removeKeys?: Array<keyof ToolSearchParams>;
        label: string;
        syntheticPrompt?: string;
      };
    })
  | (ChatbotUiActionBase & {
      kind: "clarify_scope";
      data: {
        options: Array<{
          scope: "current_filtered" | "global_active_inventory" | "selected_properties";
          label: string;
          description?: string;
          searchParams?: ToolSearchParams;
        }>;
        defaultScope?: "current_filtered" | "global_active_inventory" | "selected_properties";
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
  edgeProvider?: "gemini" | "fallback";
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
  webSearchStatus?: "used" | "no_usable_sources" | "unavailable";
  webSearchProvider?: "tavily_search" | "official_dvf_dataset";
  webSearchQueries?: string[];
  streamSupported?: boolean;
  source: "local" | "edge";
}

export interface ChatbotRequest {
  question: string;
  language?: "fr" | "en";
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
  transactionPreference: "vente" | null;
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
  "Je cherche un appartement à vendre dans le quartier Perret avec 2 chambres.",
  "Quel quartier du Havre choisir pour acheter ?",
  "Comment se passe un compromis de vente avec votre agence ?",
  "Quels services proposez-vous pour vendre un bien au Havre ?",
  "Je ne trouve pas de bien adapté, pouvez-vous me rappeler ?",
];

const processIntentPattern = /\b(compromis|notaire|process|etape|signature|acte|financement|offre acceptee)\b/;
const propertyIntentPattern = /appartement|maison|bien|acheter|achat|vente|investissement|studio|t2|t3|t4|chambre|budget|m2|surface|quartier|annonce/;
const serviceIntentPattern = /service|gestion|administration|syndic|vendre|estimation|accompagnement|mandat|mise en vente/;
// The place name Sainte-Adresse must not trigger the agency-contact intent.
const contactIntentPattern = /contact|telephone|\btel\b|appeler|email|mail|(?<!sainte[-\s])adresse|horaire|ouvert|ouverture|rdv|rendez vous|rappel/;
const reviewsIntentPattern = /avis|review|google|note|reputation|temoignage/;
const feesIntentPattern = /honoraire|bareme|frais|commission|pdf/;
const historyIntentPattern = /geographie|secteurs|sainte adresse|gobelins|saint michel|octeville|saint romain|etretat|deauville|trouville|histoire|historique|fondation|unesco|perret|saint francois|saint-vincent|saint vincent|sanvic|graville|docks vauban|eure/;
const aboutIntentPattern = /agence|equipe|apropos|a propos|depuis 1972|unis/;
const siteNavigationIntentPattern = /site|page|rubrique|navigation|plan du site|sitemap|ou trouver|ou puis je|ou puis-je|lien/;
const directLeadCapturePattern = /ne trouve pas|introuvable|aucun bien|pas de bien|pas adapte|rappeler|etre contacte|etre rappele|laisser mon email|alerte email/;
const shortFollowUpPattern = /^(et|sinon|plutot|du coup|ok|daccord|avec|sans|plus|moins|meme budget|dans ce cas)/;
const districtComparisonPattern = /(quel(?:s)? quartier(?:s)?).*(choisir|conseiller|recommander|investissement|achat|acheter|habiter|vivre)|meilleur(?:s)? quartier(?:s)?.*(investissement|achat|acheter|habiter|vivre)|investissement immobilier/;
const sellingDocumentsPattern = /(?:document|papier|piece|justificatif).*(?:prepar|fournir|vendre|vente)|(?:prepar|fournir).*(?:document|papier|piece|justificatif).*(?:vendre|vente)|(?:vendre|vente).*(?:document|papier|piece|justificatif)/;
const pageSummaryPattern = /resum|resume|que contient|a quoi sert|explique|detaille|aide moi sur|sur la page/;
const explicitPathOpenPattern = /\b(?:ouvrir|ouvre|open|go to|aller sur)\s+\/[a-z0-9-]+/i;
const greetingPattern = /^(bonjour|salut|hello|bonsoir|coucou)\b/;
const thanksPattern = /\bmerci\b|^\s*top\b|^\s*parfait\b/;
const capabilityPattern = /qui es tu|qui etes vous|que peux tu|que pouvez vous|aide moi|help/;
const listingsPagePattern = /toutes les annonces|voir les annonces|catalogue|liste des biens|biens disponibles|parcourir les biens|tous les biens/;
const sellPagePattern = /vendre|mise en vente|mettre en vente|mandat|vente de mon bien/;
const estimationPagePattern = /estimer|estimation|avis de valeur|combien vaut|valeur de mon bien/;
const legalIntentPattern = /mentions legales|confidentialite|rgpd|donnees personnelles|cookies|accessibilite|privacy|legal/;
const selectionIntentPattern = /ma selection|my selection|favoris|wishlist|selection sauvegardee|biens sauvegardes/;
const cityPageIntentPattern = /immobilier|prix|marche|quartier|investissement|annonce|bien|achat|vente|estimation/;
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
  "/geographie",
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
      "Page d’accueil avec présentation immobilière, sélection du moment, villes couvertes, avis Google et présentation de l’équipe.",
    keywords: ["accueil", "hero", "selection", "villes", "avis", "equipe", "agence", "bien immobilier"],
    suggestedPrompts: ["Ouvrir /", "Ouvrir /biens", "Ouvrir /avis"],
  },
  {
    id: "listings",
    path: "/biens",
    title: "Catalogue des biens",
    summary:
      "Catalogue des biens à vendre avec filtres (budget, ville, chambres, type) et tri pour trouver rapidement un bien.",
    keywords: ["annonces", "biens", "catalogue", "filtrer", "tri", "vente", "budget", "surface"],
    suggestedPrompts: ["Ouvrir /biens", "Je veux filtrer par budget", "Je cherche un appartement au Havre"],
  },
  {
    id: "sell",
    path: "/vendre",
    title: "Vendre",
    summary:
      "Parcours vendeur : estimation, stratégie de mise en marché, qualification des acheteurs et accompagnement jusqu’à la signature.",
    keywords: ["vendre", "mise en vente", "mandat", "strategie", "acheteur", "signature", "acte"],
    suggestedPrompts: ["Ouvrir /vendre", "Ouvrir /estimation", "Je veux parler à un conseiller"],
  },
  {
    id: "estimation",
    path: "/estimation",
    title: "Estimation",
    summary:
      "Demande d’estimation avec analyse du bien, comparables locaux et proposition d’une stratégie de commercialisation.",
    keywords: ["estimation", "estimer", "avis de valeur", "comparables", "prix", "strategie de vente"],
    suggestedPrompts: ["Ouvrir /estimation", "Quels documents préparer ?", "Ouvrir /contact"],
  },
  {
    id: "services",
    path: "/services",
    title: "Services",
    summary:
      "Accompagnement pour l’achat, la vente et l’estimation de biens au Havre.",
    keywords: ["services", "achat", "vente", "estimation", "accompagnement"],
    suggestedPrompts: ["Ouvrir /services", "Je veux vendre mon bien", "Je veux faire estimer mon bien"],
  },
  {
    id: "reviews",
    path: "/avis",
    title: "Avis clients",
    summary:
      "Page de réputation avec la note Google, le nombre d’avis, des extraits de témoignages et le suivi des retours clients.",
    keywords: ["avis", "google", "note", "reputation", "temoignages", "retours clients"],
    suggestedPrompts: ["Ouvrir /avis", "Quelle est la note Google ?", "Je veux contacter l'agence"],
  },
  {
    id: "history",
    path: "/geographie",
    title: "Géographie",
    summary:
      "Nos secteurs : Sainte-Adresse, la plage, les Gobelins, Saint-Michel, Octeville-sur-Mer et la campagne dans un rayon de 30 km autour du Havre, de Saint-Romain à Étretat, ainsi que Deauville et Trouville.",
    keywords: ["geographie", "secteurs", "sainte adresse", "plage", "gobelins", "saint michel", "octeville", "saint romain", "etretat", "deauville", "trouville"],
    suggestedPrompts: ["Ouvrir /geographie", "Quel quartier pour investir ?", "Ouvrir /biens"],
  },
  {
    id: "history-article",
    path: "/histoire-immobilier-le-havre",
    title: "Histoire de l’immobilier au Havre",
    summary:
      "Article consacré aux repères historiques du marché havrais, à l’architecture de la Reconstruction et aux évolutions des quartiers du Havre.",
    keywords: ["histoire immobilier le havre", "histoire du marché immobilier", "patrimoine", "reconstruction", "auguste perret"],
    suggestedPrompts: ["Ouvrir /histoire-immobilier-le-havre", "Ouvrir /geographie", "Quel quartier du Havre choisir pour acheter ?"],
  },
  {
    id: "fees",
    path: "/honoraires",
    title: "Honoraires",
    summary:
      "Barème d’honoraires TTC, téléchargement du PDF officiel et tableau de synthèse par tranches de prix.",
    keywords: ["honoraires", "bareme", "frais", "commission", "pdf", "ttc"],
    suggestedPrompts: ["Ouvrir /honoraires", "Télécharger le PDF des honoraires", "Ouvrir /contact"],
  },
  {
    id: "about",
    path: "/apropos",
    title: "À propos",
    summary:
      "Présentation de l’agence Foch Immobilier, active depuis 1972, de son équipe, de ses valeurs et de son ancrage local au Havre.",
    keywords: ["apropos", "agence", "equipe", "1972", "unis", "presentation"],
    suggestedPrompts: ["Ouvrir /apropos", "Qui sont les conseillers ?", "Ouvrir /contact"],
  },
  {
    id: "contact",
    path: "/contact",
    title: "Contact",
    summary:
      "Coordonnées, horaires, carte et formulaire de contact pour vos projets d’achat, de vente et d’estimation.",
    keywords: ["contact", "telephone", "email", "adresse", "horaires", "rendez vous", "carte"],
    suggestedPrompts: ["Ouvrir /contact", "Quels sont vos horaires ?", "Je veux être rappelé"],
  },
  {
    id: "saved",
    path: "/biens-sauvegardes",
    title: "Biens sauvegardés",
    summary:
      "Espace de sélection personnelle pour retrouver, comparer et partager vos biens favoris.",
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
    title: "Mentions légales",
    summary:
      "Informations légales sur l’éditeur, la carte professionnelle et l’hébergement de l’application.",
    keywords: ["mentions legales", "editeur", "cpi", "hebergement", "legal"],
    suggestedPrompts: ["Ouvrir /mentions-legales", "Ouvrir /confidentialite", "Ouvrir /cookies"],
  },
  {
    id: "privacy",
    path: "/confidentialite",
    title: "Confidentialité",
    summary:
      "Politique RGPD : données collectées, finalités, durée de conservation et droits des utilisateurs.",
    keywords: ["confidentialite", "rgpd", "donnees", "vie privee", "droits", "traitement"],
    suggestedPrompts: ["Ouvrir /confidentialite", "Ouvrir /cookies", "Ouvrir /contact"],
  },
  {
    id: "cookies",
    path: "/cookies",
    title: "Cookies",
    summary:
      "Informations sur les cookies essentiels et de mesure, et gestion des préférences utilisateur.",
    keywords: ["cookies", "consentement", "mesure", "preferences", "traceurs"],
    suggestedPrompts: ["Ouvrir /cookies", "Ouvrir /confidentialite", "Ouvrir /plan-du-site"],
  },
  {
    id: "accessibility",
    path: "/accessibilite",
    title: "Accessibilité",
    summary:
      "Déclaration d’accessibilité numérique, objectifs WCAG AA et canal de signalement.",
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
    `Page ville ${city.name} : contexte local, sélection de biens actifs dans la commune, lien vers /biens?city=${city.slug} et accès rapide à /estimation?ville=${city.slug}.`,
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
  return districtVocabulary.find((district) => district.aliases.some((alias) => text.includes(normalizeKeyword(alias)))) ?? null;
}

function detectCityRoute(text: string): CityRouteDescriptor | null {
  return cityRouteVocabulary.find((city) => city.aliases.some((alias) => text.includes(normalizeKeyword(alias)))) ?? null;
}

function isSearchLocationFollowUp(question: string, conversationState?: ChatbotConversationState): boolean {
  if (!conversationState?.recentSearch) return false;
  const normalized = normalizeKeyword(question);
  return /^(?:et\s+)?(?:a|au|aux|dans|sur)\s+/.test(normalized) && Boolean(detectCityRoute(normalized));
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
  const transactionLabel = "vente";
  const propertyTypeLabel = property.propertyType === "maison_villa" ? "Maison / Villa" : "Appartement";

  return {
    id: `property-${property.id}`,
    path: canonicalPath,
    title: property.title,
    summary:
      `Annonce detaillee du bien ${property.title} a ${city}: ${propertyTypeLabel}, ${transactionLabel}, prix ${formatPrice(property.priceAmount, "vente")}. La fiche contient descriptif, caracteristiques et media.`,
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

function detectTransactionPreference(text: string): "vente" | null {
  if (/acheter|achat|vente|vendre|acquerir/.test(text)) return "vente";
  return null;
}

function isRentalQuestion(text: string, language: "fr" | "en" = "fr"): boolean {
  const normalized = normalizeKeyword(text);
  return containsRentalLanguage(normalized, language) || (language === "fr" && /\b(?:location|locations)\b/.test(normalized));
}

export function containsRentalLanguage(text: string, language: "fr" | "en" = "fr"): boolean {
  const normalized = normalizeKeyword(text);
  const rentalTerms = /\b(?:louer|loue|louent|loues|louee|louees|louons|louez|louant|locatif\w*|locative\w*|loyer\w*|bail\w*|bailleur\w*|locataire\w*|rent\w*|lease\w*|tenant\w*|landlord\w*|buy[ -]?to[ -]?let)\b|\b(?:en|de|pour|a la)\s+locations?\b/;
  return rentalTerms.test(normalized) || (language === "fr" && /\blocat\w*\b/.test(normalized));
}

function buildPurchaseOnlyRedirectAnswer(language: "fr" | "en" = "fr"): ChatbotReply {
  return {
    source: "local",
    answer: language === "en"
      ? "I can help with buying, selling, or valuing a property. Would you like to search for an apartment or a house to buy?"
      : "Je peux vous aider à acheter, vendre ou faire estimer un bien. Cherchez-vous un appartement ou une maison à acheter ?",
    suggestedPrompts: language === "en"
      ? ["View properties for sale", "Find an apartment to buy", "Request a property valuation"]
      : ["Voir les biens à vendre", "Je cherche un appartement à acheter", "Je veux faire estimer mon bien"],
  };
}

function detectIntent(text: string): ChatbotIntent {
  if (directLeadCapturePattern.test(text)) return "lead_capture";
  if (sellingDocumentsPattern.test(text)) return "service";
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

export function buildConversationContext(
  question: string,
  chatHistory: ChatbotRequest["chatHistory"],
  conversationState?: ChatbotConversationState,
): ConversationContext {
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
      : isSearchLocationFollowUp(question, conversationState)
        ? "property"
      : shortFollowUpPattern.test(normalizedQuestion) && historicalIntent !== "unknown"
        ? historicalIntent
        : detectIntent(normalizedCorpus) !== "unknown"
          ? detectIntent(normalizedCorpus)
          : detectIntent(normalizedFullHistory);

  const recentSearchParams = conversationState?.recentSearch?.params ?? conversationState?.preferences;
  const budgetMax = extractBudget(normalizedQuestion) ?? extractBudget(normalizedHistory) ?? recentSearchParams?.priceMax ?? null;
  const bedroomsMin = extractBedrooms(normalizedQuestion) ?? extractBedrooms(normalizedHistory) ?? recentSearchParams?.bedroomsMin ?? null;
  const propertyType =
    detectPropertyType(normalizedQuestion) ??
    detectPropertyType(normalizedHistory) ??
    (recentSearchParams?.type === "appartement" || recentSearchParams?.type === "maison_villa" ? recentSearchParams.type : null);
  const transactionPreference = detectTransactionPreference(normalizedQuestion) ?? detectTransactionPreference(normalizedHistory) ?? (recentSearchParams?.transaction === "vente" ? "vente" : null);
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
  if (context.bedroomsMin != null) parts.push(`${context.bedroomsMin}+ chambres`);
  if (context.budgetMax != null) parts.push(`budget max ${new Intl.NumberFormat("fr-FR").format(context.budgetMax)} EUR`);
  if (context.district) parts.push(`secteur ${context.district.label}`);
  if (context.cityRoute) parts.push(`ville ${context.cityRoute.name}`);

  return parts.join(", ");
}

function buildPropertySuggestions(question: string, context: ConversationContext): ChatbotPropertySuggestion[] {
  const normalized = normalizeKeyword(question);
  const wantsSale = /vente|acheter|achat|acquerir/.test(normalized) || context.transactionPreference === "vente";
  const bedroomsMin = extractBedrooms(normalized) ?? context.bedroomsMin;
  const budgetMax = extractBudget(normalized) ?? context.budgetMax;
  const propertyType = detectPropertyType(normalized) ?? context.propertyType;
  const district = detectDistrict(normalized) ?? context.district;
  const requestedCity = detectCityRoute(normalized) ?? context.cityRoute;
  const excludedFeatures = Array.from(
    normalized.matchAll(/\b(?:sans|aucun(?:e)?|pas de|absence de)\s+(?:de\s+|le\s+|la\s+)?(balcon|terrasse|ascenseur|garage|parking|jardin)\b/g),
    (match) => match[1],
  );

  const propertyCopy = (property: (typeof properties)[number]) => normalizeKeyword(`${property.title} ${property.description}`);
  const propertyTypeConflicts = (property: (typeof properties)[number]) => {
    const copy = propertyCopy(property);
    const describesHouse = /\b(?:maison|villa|pavillon)\s+(?:de\s+)?(?:\d+|[a-z]+)\s+pieces?\b/.test(copy);
    const describesApartment = /\bappartement\s+(?:de\s+)?(?:\d+|[a-z]+)\s+pieces?\b/.test(copy);
    return (property.propertyType === "appartement" && describesHouse) ||
      (property.propertyType === "maison_villa" && describesApartment);
  };
  const propertyHasFeature = (property: (typeof properties)[number], feature: string) => {
    const terms = feature === "garage" ? ["garage", "garages", "garag"] : [feature, `${feature}s`];
    const structuredMatch = property.features.some((item) =>
      terms.some((term) => normalizeKeyword(`${item.featureKey} ${item.labelFr}`).includes(term))
    );
    return structuredMatch || new RegExp(`\\b(?:${terms.join("|")})\\b`).test(propertyCopy(property));
  };
  const propertyExplicitlyLacksFeature = (property: (typeof properties)[number], feature: string) => {
    const terms = feature === "garage" ? "garage(?:s)?|garag(?:e|es)" : `${feature}(?:s)?`;
    return new RegExp(`\\b(?:sans|aucun(?:e)?|pas de|absence de)\\s+(?:de\\s+|le\\s+|la\\s+)?(?:${terms})\\b`).test(propertyCopy(property));
  };

  const requestSpecificity =
    Number(Boolean(district)) +
    Number(Boolean(bedroomsMin)) +
    Number(Boolean(budgetMax)) +
    Number(Boolean(propertyType)) +
    Number(Boolean(requestedCity)) +
    Number(Boolean(wantsSale));

  return properties
    .filter((property) => isAvailablePropertyStatus(property.status) && property.transactionType === "vente" && property.isOnline !== false)
    .filter((property) => {
      if (wantsSale && property.transactionType !== "vente") return false;
      if (bedroomsMin != null && (property.bedrooms ?? 0) < bedroomsMin) return false;
      if (budgetMax != null && property.priceAmount > budgetMax) return false;
      if (propertyType && property.propertyType !== propertyType) return false;
      if (propertyTypeConflicts(property)) return false;
      if (excludedFeatures.some((feature) =>
        propertyHasFeature(property, feature) || !propertyExplicitlyLacksFeature(property, feature)
      )) return false;

      const copy = propertyCopy(property);
      if (district && !district.aliases.some((alias) => copy.includes(normalizeKeyword(alias)))) return false;

      if (requestedCity) {
        const citySlug = cityById.get(property.cityId)?.slug;
        if (citySlug !== requestedCity.slug) return false;
      }

      return true;
    })
    .map((property) => {
      const city = cityById.get(property.cityId)?.name ?? "Le Havre";
      const citySlug = cityById.get(property.cityId)?.slug ?? "";
      const haystack = normalizeKeyword(`${property.title} ${property.description} ${city} ${property.features.map((feature) => `${feature.featureKey} ${feature.labelFr}`).join(" ")}`);
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
        ? `Je peux préparer une demande de rappel avec vos critères (${criteriaSummary}). Vérifiez vos coordonnées puis envoyez le formulaire sur /contact ; rien n’est transmis avant cet envoi.`
        : "Je peux préparer une demande de rappel. Ouvrez /contact, complétez le formulaire et envoyez-le quand vous êtes prêt ; aucune demande n’est transmise depuis ce message.",
    suggestedPrompts: normalizePromptList([
      "Je veux laisser mon e-mail pour être rappelé",
      "Je cherche un T3 à Perret avec balcon",
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
      "Bien sûr. Le parcours comprend généralement : 1) l’offre acceptée, 2) la vérification du financement et des pièces, 3) la signature du compromis, 4) le délai légal et les conditions suspensives, puis 5) l’acte authentique chez le notaire. L’agence peut vous accompagner à chaque étape. Découvrez /vendre puis contactez-nous sur /contact.",
    suggestedPrompts: normalizePromptList([
      "Quel délai moyen entre compromis et acte ?",
      "Quels documents faut-il pour vendre ?",
      "Pouvez-vous m'accompagner sur un achat avec prêt ?",
      "Ouvrir /vendre",
    ]),
  };
}

function buildContactAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Avec plaisir. Coordonnées de l’agence : 109 avenue Foch, 76600 Le Havre ; téléphone : 02 35 42 51 76 ; e-mail : vendre@fochimmobilier.com. Horaires : du lundi au vendredi, de 9 h 30 à 12 h et de 14 h à 18 h 30 ; le samedi sur rendez-vous. Tous les détails sont sur /contact.",
    suggestedPrompts: normalizePromptList([
      "Pouvez-vous me rappeler demain matin ?",
      "Je veux envoyer une demande d'estimation",
      "Où est située l'agence exactement ?",
      "Ouvrir /contact",
    ]),
  };
}

function buildReviewsAnswerFromSnapshot(
  snapshot: Pick<typeof agencyReviewsFallbackSnapshot, "rating" | "userRatingCount" | "reviews">,
  summarize = false,
): ChatbotReply {
  const rating = snapshot.rating > 0 ? `${snapshot.rating.toFixed(1)} / 5` : null;
  const count = snapshot.userRatingCount > 0 ? `${snapshot.userRatingCount} avis` : null;
  const highlights = snapshot.reviews
    .slice(0, 2)
    .map((review) => `${review.authorName}: ${review.text}`)
    .join(" | ");
  const normalizedReviews = snapshot.reviews.map((review) => normalizeKeyword(review.text));
  const themes = [
    { label: "le professionnalisme et l’accompagnement", pattern: /profession|competent|conseil|accompagn/ },
    { label: "l’écoute et la disponibilité de l’équipe", pattern: /ecoute|disponibil|accueil|reactif|repon/ },
    { label: "la confiance et les recommandations", pattern: /confiance|recommand|satisf/ },
  ]
    .map((theme) => ({ ...theme, count: normalizedReviews.filter((review) => theme.pattern.test(review)).length }))
    .filter((theme) => theme.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);
  const summary = themes.length > 0
    ? `Les commentaires disponibles mettent notamment en avant ${themes.map((theme) => theme.label).join(" et ")}.`
    : "Les témoignages et la note affichée sont consultables sur la page de l’agence.";

  return {
    source: "local",
    answer:
      summarize
        ? `Résumé des avis Foch Immobilier : ${summary}${rating ? ` Note Google affichée : ${rating}${count ? ` sur ${count}` : ""}.` : ""} ${highlights ? `Extraits : ${highlights}.` : ""} Pour consulter les témoignages et la note à jour, ouvrez /avis.`
        : `La page /avis présente${rating ? ` la note Google (${rating}${count ? `, ${count}` : ""})` : " les avis clients"} et les retours clients. ${highlights ? `Quelques extraits : ${highlights}.` : "Les témoignages sont consultables sur la page."} Ouvrez /avis pour tout lire.`,
    suggestedPrompts: normalizePromptList([
      "Ouvrir /avis",
      "Quelle est la note Google actuelle ?",
      "Je veux contacter un conseiller après lecture des avis",
      "Quels services sont cités dans les avis ?",
    ]),
  };
}

function buildSellingDocumentsAnswer(): ChatbotReply {
  const diagnosticsUrl = "https://www.service-public.gouv.fr/particuliers/vosdroits/F10798";
  const copropertyUrl = "https://www.service-public.gouv.fr/particuliers/vosdroits/F2604";
  return {
    source: "local",
    answer:
      "Pour vendre un appartement, rassemblez le titre de propriété, les pièces d’identité des propriétaires et les diagnostics immobiliers applicables, réunis dans le dossier de diagnostic technique (DDT). En copropriété, prévoyez aussi les documents de l’immeuble : règlement et état descriptif de division, procès-verbaux des assemblées générales des trois dernières années, carnet d’entretien, fiche synthétique et informations financières de la copropriété. La surface Loi Carrez doit également être indiquée. Les diagnostics requis dépendent notamment de l’âge et de la situation du logement ; le notaire ou l’agence vérifiera la liste correspondant à votre bien.",
    citations: [
      { kind: "web", path: diagnosticsUrl, sourceUrl: diagnosticsUrl, title: "Service-Public.fr — Diagnostics à fournir en cas de vente" },
      { kind: "web", path: copropertyUrl, sourceUrl: copropertyUrl, title: "Service-Public.fr — Vente d’un logement en copropriété" },
    ],
    suggestedPrompts: normalizePromptList([
      "Quels diagnostics sont nécessaires pour mon appartement ?",
      "Je veux faire estimer mon appartement",
      "Ouvrir /contact",
    ]),
  };
}

async function buildReviewsAnswer(question: string): Promise<ChatbotReply> {
  const summarize = /resum|synthese/.test(normalizeKeyword(question));
  let timeoutHandle: number | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = window.setTimeout(() => reject(new Error("reviews_fetch_timeout")), 1500);
    });
    const liveReviews = await Promise.race([getAgencyReviews(), timeoutPromise]);
    return buildReviewsAnswerFromSnapshot(liveReviews, summarize);
  } catch {
    return {
      source: "local",
      answer:
        summarize
          ? "Je n’ai pas pu charger les avis en direct pour en faire un résumé fiable. Consultez la page /avis pour voir les témoignages et la note Google affichée."
          : "Je n’ai pas pu charger les avis en direct. Consultez /avis pour voir les témoignages et la note Google affichée.",
      suggestedPrompts: normalizePromptList([
        "Ouvrir /avis",
        "Quelle est la note Google actuelle ?",
        "Je veux contacter un conseiller après lecture des avis",
        "Quels services sont cités dans les avis ?",
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
      "Les honoraires sont détaillés sur /honoraires, avec le PDF officiel et une synthèse des tranches tarifaires TTC. Vous pouvez y consulter la grille complète.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /honoraires",
      "Comment sont calculés les frais de vente ?",
      "Pouvez-vous m'expliquer le barème TTC ?",
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
      answer: `Bonne question. ${faqMatch.answer} Pour découvrir nos secteurs, ouvrez /geographie.`,
      suggestedPrompts: normalizePromptList([
        "Quels quartiers suivre pour investir au Havre ?",
        "Résumez-moi Perret, Saint-François et Saint-Vincent",
        "Ouvrir /geographie",
      ]),
    };
  }

  return {
    source: "local",
    answer:
      "La page /geographie présente nos secteurs : Sainte-Adresse, la plage, les Gobelins, Saint-Michel, Octeville-sur-Mer et la campagne dans un rayon de 30 km autour du Havre, de Saint-Romain à Étretat, ainsi que Deauville et Trouville.",
    suggestedPrompts: normalizePromptList([
      "Quels sont les atouts du quartier Perret ?",
      "Quel quartier choisir pour acheter ?",
      "Ouvrir /geographie",
    ]),
  };
}

function buildAboutAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Foch Immobilier est une agence du Havre active depuis 1972. L’équipe accompagne les projets d’achat, de vente et d’estimation. Présentation complète sur /apropos.",
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
      `Le meilleur quartier dépend de vos priorités. ${rankedDistricts[0].name} peut convenir si vous cherchez un cadre portuaire et patrimonial ; ${rankedDistricts[1].name} si vous privilégiez le renouvellement urbain et les espaces réaménagés ; ${rankedDistricts[2].name} si vous recherchez une architecture de la Reconstruction et un emplacement central. Pour vous orienter précisément, quel budget avez-vous et privilégiez-vous le calme, les commerces, les transports ou un extérieur ? Vous pouvez aussi consulter /geographie.`,
    suggestedPrompts: normalizePromptList([
      "Quels biens avez-vous dans ces quartiers ?",
      "Je privilégie le calme et les espaces verts",
      "Je cherche un appartement près des commerces",
      "Ouvrir /biens",
      "Ouvrir /geographie",
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
    answer: `${districtData.name} : ${districtData.summary} ${districtData.investmentAngle} Détail historique : /geographie.`,
    suggestedPrompts: normalizePromptList([
      `Quels biens avez-vous actuellement dans ${districtData.name} ?`,
      `Quelle strategie de vente recommandez-vous dans ${districtData.name} ?`,
      "Ouvrir /geographie",
      "Ouvrir /biens",
    ]),
  };
}

function buildSellPageAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Pour vendre, la page la plus adaptée est /vendre. Vous y trouverez la méthode (mise en valeur, qualification des acheteurs, suivi jusqu’à l’acte), puis vous pourrez demander une estimation sur /estimation.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /vendre",
      "Ouvrir /estimation",
      "Je veux être rappelé pour vendre",
    ]),
  };
}

function buildEstimationPageAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Pour estimer votre bien, utilisez /estimation. Le parcours couvre les caractéristiques du bien, les comparables et la stratégie de commercialisation. Vous pouvez aussi nous contacter directement sur /contact.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /estimation",
      "Quels documents préparer pour une estimation ?",
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
      context.cityRoute ? `Ouvrir /immobilier/${context.cityRoute.slug}` : "Je veux filtrer les biens à la vente",
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
      `Pour ${context.cityRoute.name}, la page dédiée est /immobilier/${context.cityRoute.slug}. Vous y trouverez le contexte local, puis les annonces liées à la ville.`,
    suggestedPrompts: normalizePromptList([
      `Ouvrir /immobilier/${context.cityRoute.slug}`,
      "Ouvrir /biens",
      "Je veux des biens à vendre dans cette ville",
    ]),
  };
}

function buildSelectionAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Votre sélection sauvegardée est accessible sur /biens-sauvegardes. Vous pouvez y retrouver vos biens favoris, puis partager la sélection.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /biens-sauvegardes",
      "Je veux ajouter des biens à ma sélection",
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

  return hints.length > 0 ? ` Filtres détectés : ${hints.join(", ")}.` : "";
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
    answer: `La page ${topic.path} (${topic.title}) sert à ceci : ${topic.summary}${queryHint}`,
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
    relatedPaths.length > 0 ? ` Pages proches : ${relatedPaths.join(", ")}.` : "";

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
      answer: `La page ${topic.path} (${topic.title}) est prête à être ouverte. ${topic.summary}${queryHint}`,
      actions: [
        {
          id: `open-page-${topic.path}`,
          kind: "open_page",
          title: "Ouvrir la page",
          description: topic.title,
          data: { path: topic.path, label: topic.title, reason: "user_requested" },
        },
      ],
      suggestedPrompts: normalizePromptList([`Ouvrir ${topic.path}`, ...topic.suggestedPrompts, "Je veux un résumé de cette page"]),
    };
  }

  return {
    source: "local",
    answer: `Vous avez demandé la page ${path}. Ouvrez-la avec le bouton ci-dessous.`,
    actions: [
      {
        id: `open-page-${path}`,
        kind: "open_page",
        title: "Ouvrir la page",
        description: path,
        data: { path, label: path, reason: "user_requested" },
      },
    ],
    suggestedPrompts: normalizePromptList([
      `Ouvrir ${path}`,
      "Je veux un résumé de cette page",
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
      `Pour ce sujet légal, la page adaptée est ${targetPath}. Vous pouvez aussi retrouver toutes les pages légales depuis /plan-du-site.`,
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
      "Nos services couvrent l’achat, la vente et l’estimation immobilière. Selon votre besoin : /vendre, /services, /estimation et /contact.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /services",
      "Je veux vendre mon bien au Havre",
      "Je veux faire estimer mon bien",
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
        ? `Parfait, j’ai une première sélection cohérente avec vos critères (${criteriaSummary}). Vous pouvez aussi ouvrir /biens pour consulter tout le catalogue.`
        : "Parfait, voici une première sélection de biens qui correspondent à votre demande. Vous pouvez aussi ouvrir /biens pour consulter tout le catalogue.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /biens",
      "Affinez avec un budget précis",
      "Je veux privilégier les quartiers proches de la mer",
      "Je ne trouve pas le bon bien, je veux être rappelé",
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
      "Vous pouvez accéder rapidement à /biens, /vendre, /estimation, /services, /geographie, /avis, /honoraires, /contact et /plan-du-site.",
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
      "Bonjour, avec plaisir. Je peux vous guider sur les biens, les quartiers du Havre, les services de l’agence, les avis clients et les étapes de vente ou d’achat. Dites-moi votre objectif et je vous orienterai vers la bonne page.",
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
      "Je veux comparer Perret et Saint-François",
      "Je ne trouve pas de bien adapté, pouvez-vous me rappeler ?",
    ]),
  };
}

function buildCapabilitiesAnswer(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Je suis l’assistant immobilier du site. Je réponds aux questions sur les annonces, les quartiers (Perret, Saint-François, Saint-Vincent, Sanvic, Graville et Eure-Docks), les villes, les services, les honoraires, les avis clients, les étapes de vente ou d’achat et les contacts.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /biens",
      "Ouvrir /avis",
      "Ouvrir /geographie",
      "Ouvrir /contact",
    ]),
  };
}

function buildFallbackReply(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Je suis là pour vous guider. Je peux vous aider sur les biens disponibles, les quartiers du Havre, les services de l’agence, les avis clients, les étapes de vente ou d’achat et les pages du site. Plan du site : /plan-du-site.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /plan-du-site",
      "Ouvrir /biens",
      "Ouvrir /avis",
      "Ouvrir /contact",
    ]),
  };
}

async function buildLocalReply(question: string, context: ConversationContext, language: "fr" | "en" = "fr"): Promise<ChatbotReply> {
  if (isRentalQuestion(question, language)) return buildPurchaseOnlyRedirectAnswer(language);

  if (context.requestedPath && explicitPathOpenPattern.test(context.normalizedQuestion)) {
    return buildDirectPathAnswer(context.requestedPath);
  }
  if (sellingDocumentsPattern.test(context.normalizedQuestion)) return buildSellingDocumentsAnswer();
  if (context.inferredIntent === "reviews") return await buildReviewsAnswer(context.normalizedQuestion);
  if (districtComparisonPattern.test(context.normalizedQuestion)) {
    const advice = buildDistrictComparisonAnswer();
    if (advice) return advice;
  }

  if (pageSummaryPattern.test(context.normalizedQuestion)) {
    const pageSummaryReply = buildPageSummaryAnswer(context);
    if (pageSummaryReply) return pageSummaryReply;
  }

  if (context.requestedPath) return buildDirectPathAnswer(context.requestedPath);
  if (context.inferredIntent === "lead_capture") return buildLeadCaptureAnswer(context);
  if (context.inferredIntent === "process") return buildProcessAnswer();
  if (context.inferredIntent === "contact") return buildContactAnswer();
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
    context.inferredIntent === "service" ||
    context.inferredIntent === "about" ||
    context.inferredIntent === "contact" ||
    context.inferredIntent === "history" ||
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
  if (meta?.actionRequest) {
    if (!options.edgeApiEnabled) {
      return { target: "local", category: "fallback", reason: "edge_disabled_for_tool_action", intent: context.inferredIntent };
    }
    return { target: "edge", category: "edge_tools", reason: "tool_action_request", intent: context.inferredIntent };
  }
  if (context.requestedPath && explicitPathOpenPattern.test(context.normalizedQuestion)) {
    return { target: "local", category: "deterministic_local", reason: "explicit_path_navigation", intent: context.inferredIntent };
  }
  if (
    context.inferredIntent === "reviews" ||
    sellingDocumentsPattern.test(context.normalizedQuestion) ||
    districtComparisonPattern.test(context.normalizedQuestion)
  ) {
    return { target: "local", category: "deterministic_local", reason: "accepted_information_intent", intent: context.inferredIntent };
  }
  if (isSearchLocationFollowUp(context.normalizedQuestion, meta?.conversationState) && options.edgeApiEnabled && options.edgeAgentToolsEnabled) {
    return { target: "edge", category: "edge_tools", reason: "recent_search_location_refinement", intent: "property" };
  }
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

function getLegacyEdgeProvider(payload: unknown): ChatbotReply["edgeProvider"] {
  if (!payload || typeof payload !== "object") return undefined;
  const source = (payload as Record<string, unknown>).source;
  return source === "gemini" || source === "fallback" ? source : undefined;
}

function sanitizeToolSearchParams(raw: unknown): ToolSearchParams | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const candidate = raw as Record<string, unknown>;
  const params: ToolSearchParams = {};
  if (candidate.transaction === "vente") params.transaction = candidate.transaction;
  if (candidate.type === "appartement" || candidate.type === "maison_villa" || candidate.type === "autre") {
    params.type = candidate.type;
  }
  if (typeof candidate.city === "string" && candidate.city.trim().length > 0) params.city = candidate.city.trim().slice(0, 80);
  if (typeof candidate.q === "string" && candidate.q.trim().length > 0) params.q = candidate.q.trim().slice(0, 120);
  if (
    candidate.sort === "newest" ||
    candidate.sort === "price_asc" ||
    candidate.sort === "price_desc" ||
    candidate.sort === "surface_desc"
  ) {
    params.sort = candidate.sort;
  }
  if (Array.isArray(candidate.features)) {
    const features = candidate.features
      .map((value) => (typeof value === "string" ? value.trim().slice(0, 80) : ""))
      .filter((value) => value.length > 0)
      .slice(0, 12);
    if (features.length > 0) {
      params.features = Array.from(new Set(features));
    }
  }
  for (
    const key of [
      "bedroomsMin",
      "bathroomsMin",
      "garagesMin",
      "priceMin",
      "priceMax",
      "surfaceMin",
      "surfaceMax",
      "terrainMin",
      "terrainMax",
      "page",
      "pageSize",
    ] as const
  ) {
    const value = candidate[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      (params as Record<string, number>)[key] = Math.floor(value);
    }
  }
  if (typeof params.priceMin === "number" && typeof params.priceMax === "number" && params.priceMin > params.priceMax) {
    [params.priceMin, params.priceMax] = [params.priceMax, params.priceMin];
  }
  if (typeof params.surfaceMin === "number" && typeof params.surfaceMax === "number" && params.surfaceMin > params.surfaceMax) {
    [params.surfaceMin, params.surfaceMax] = [params.surfaceMax, params.surfaceMin];
  }
  if (typeof params.terrainMin === "number" && typeof params.terrainMax === "number" && params.terrainMin > params.terrainMax) {
    [params.terrainMin, params.terrainMax] = [params.terrainMax, params.terrainMin];
  }
  const extra = raw as Record<string, unknown>;
  if (typeof extra.rooms === "number" && Number.isInteger(extra.rooms) && extra.rooms > 0 && extra.rooms < 20) params.rooms = extra.rooms;
  if (Array.isArray(extra.excludedFeatures)) params.excludedFeatures = extra.excludedFeatures.filter((v): v is string => typeof v === "string").slice(0,12);
  return Object.keys(params).length > 0 ? params : undefined;
}

function sanitizeCitations(raw: unknown): ChatbotCitation[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const citations = raw
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
    .map((citation): ChatbotCitation | null => {
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
    .map((trace): ChatbotToolTrace | null => {
      const tool =
        trace.tool === "search_properties" ||
        trace.tool === "aggregate_properties" ||
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
      candidate.toolName === "aggregate_properties" ||
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
    .map((card): ChatbotAnalysisCard | null => {
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
  type SanitizedAggregateBucket = {
    key: string;
    label: string;
    count: number;
    avgPrice: number | null;
    avgSurfaceM2: number | null;
  };
  type SanitizedFacetSuggestion = {
    label: string;
    patch: Partial<ToolSearchParams>;
    removeKeys?: Array<keyof ToolSearchParams>;
  };
  type SanitizedScopeOption = {
    scope: "current_filtered" | "global_active_inventory" | "selected_properties";
    label: string;
    description?: string;
    searchParams?: ToolSearchParams;
  };
  const isFilterPatchKey = (value: unknown): value is keyof ToolSearchParams =>
    value === "transaction" ||
    value === "type" ||
    value === "city" ||
    value === "q" ||
    value === "bedroomsMin" ||
    value === "bathroomsMin" ||
    value === "garagesMin" ||
    value === "priceMin" ||
    value === "priceMax" ||
    value === "surfaceMin" ||
    value === "surfaceMax" ||
    value === "terrainMin" ||
    value === "terrainMax" ||
    value === "features" ||
    value === "sort" ||
    value === "page" ||
    value === "pageSize";
  const sanitizeFilterPatchKeys = (value: unknown): Array<keyof ToolSearchParams> | undefined => {
    if (!Array.isArray(value)) return undefined;
    const keys = Array.from(new Set(value.filter(isFilterPatchKey))).slice(0, 12);
    return keys.length > 0 ? keys : undefined;
  };
  const sanitizeBucketList = (value: unknown): SanitizedAggregateBucket[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const buckets = value
      .filter((bucket): bucket is Record<string, unknown> => Boolean(bucket && typeof bucket === "object"))
      .map((bucket) => {
        const key = typeof bucket.key === "string" ? bucket.key.trim().slice(0, 80) : "";
        const label = typeof bucket.label === "string" ? bucket.label.trim().slice(0, 120) : "";
        const count =
          typeof bucket.count === "number" && Number.isFinite(bucket.count)
            ? Math.max(0, Math.floor(bucket.count))
            : Number(bucket.count);
        if (!key || !label || !Number.isFinite(count) || count < 0) return null;
        const avgPrice =
          bucket.avgPrice == null
            ? null
            : typeof bucket.avgPrice === "number" && Number.isFinite(bucket.avgPrice)
              ? bucket.avgPrice
              : Number(bucket.avgPrice);
        const avgSurfaceM2 =
          bucket.avgSurfaceM2 == null
            ? null
            : typeof bucket.avgSurfaceM2 === "number" && Number.isFinite(bucket.avgSurfaceM2)
              ? bucket.avgSurfaceM2
              : Number(bucket.avgSurfaceM2);
        return {
          key,
          label,
          count: Math.max(0, Math.floor(count)),
          avgPrice: Number.isFinite(avgPrice) ? avgPrice : null,
          avgSurfaceM2: Number.isFinite(avgSurfaceM2) ? avgSurfaceM2 : null,
        };
      })
      .filter((bucket): bucket is SanitizedAggregateBucket => Boolean(bucket))
      .slice(0, 10);
    return buckets.length > 0 ? buckets : undefined;
  };

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
              status: typeof item.status === "string" ? item.status.trim().slice(0, 40) : "unknown",
              dataQualityWarning:
                typeof item.dataQualityWarning === "string" ? item.dataQualityWarning.trim().slice(0, 200) : null,
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

    if (candidate.kind === "stats_summary") {
      const metricsCandidate =
        data.metrics && typeof data.metrics === "object" ? (data.metrics as Record<string, unknown>) : null;
      if (!metricsCandidate) continue;
      const count =
        typeof metricsCandidate.count === "number" && Number.isFinite(metricsCandidate.count)
          ? Math.max(0, Math.floor(metricsCandidate.count))
          : Number(metricsCandidate.count);
      if (!Number.isFinite(count) || count < 0) continue;
      const numericOrNull = (value: unknown): number | null | undefined => {
        if (value == null) return null;
        if (typeof value === "number" && Number.isFinite(value)) return value;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };
      const metrics = {
        count: Math.max(0, Math.floor(count)),
        excludedSurfaceCount:
          typeof metricsCandidate.excludedSurfaceCount === "number" && Number.isFinite(metricsCandidate.excludedSurfaceCount)
            ? Math.max(0, Math.floor(metricsCandidate.excludedSurfaceCount))
            : undefined,
        avgSurfaceM2: numericOrNull(metricsCandidate.avgSurfaceM2),
        medianSurfaceM2: numericOrNull(metricsCandidate.medianSurfaceM2),
        minSurfaceM2: numericOrNull(metricsCandidate.minSurfaceM2),
        maxSurfaceM2: numericOrNull(metricsCandidate.maxSurfaceM2),
        avgPrice: numericOrNull(metricsCandidate.avgPrice),
        medianPrice: numericOrNull(metricsCandidate.medianPrice),
        minPrice: numericOrNull(metricsCandidate.minPrice),
        maxPrice: numericOrNull(metricsCandidate.maxPrice),
      };
      const scope =
        data.scope === "current_filtered" || data.scope === "global_active_inventory" || data.scope === "selected_properties"
          ? data.scope
          : null;
      const scopeLabel = typeof data.scopeLabel === "string" ? data.scopeLabel.trim().slice(0, 80) : "";
      const criteriaSummary =
        typeof data.criteriaSummary === "string" ? data.criteriaSummary.trim().slice(0, 300) : "Statistiques";
      const sampleSizeLabel = typeof data.sampleSizeLabel === "string" ? data.sampleSizeLabel.trim().slice(0, 120) : "";
      if (!scope || !scopeLabel || !sampleSizeLabel) continue;
      const breakdownsCandidate =
        data.breakdowns && typeof data.breakdowns === "object" ? (data.breakdowns as Record<string, unknown>) : null;
      const selectedPropertyIds = Array.isArray(data.selectedPropertyIds)
        ? data.selectedPropertyIds
            .map((value) => (typeof value === "number" ? value : Number(value)))
            .filter((value) => Number.isInteger(value) && value > 0)
            .slice(0, 50)
        : undefined;

      actions.push({
        ...base,
        kind: "stats_summary",
        data: {
          scope,
          scopeLabel,
          criteriaSummary,
          searchParams: sanitizeToolSearchParams(data.searchParams),
          selectedPropertyIds: selectedPropertyIds && selectedPropertyIds.length > 0 ? selectedPropertyIds : undefined,
          metrics,
          breakdowns: breakdownsCandidate
            ? {
                byTransaction: sanitizeBucketList(breakdownsCandidate.byTransaction),
                byType: sanitizeBucketList(breakdownsCandidate.byType),
                topCities: sanitizeBucketList(breakdownsCandidate.topCities),
              }
            : undefined,
          sampleSizeLabel,
          lowSampleWarning:
            typeof data.lowSampleWarning === "string" && data.lowSampleWarning.trim().length > 0
              ? data.lowSampleWarning.trim().slice(0, 240)
              : undefined,
        },
      });
      continue;
    }

    if (candidate.kind === "facet_refine") {
      const searchParams = sanitizeToolSearchParams(data.searchParams) ?? {};
      const suggestions = Array.isArray(data.suggestions)
        ? data.suggestions
            .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
            .map((item): SanitizedFacetSuggestion | null => {
              const label = typeof item.label === "string" ? item.label.trim().slice(0, 80) : "";
              const patch = sanitizeToolSearchParams(item.patch) ?? {};
              const removeKeys = sanitizeFilterPatchKeys(item.removeKeys);
              if (!label) return null;
              if (Object.keys(patch).length === 0 && (!removeKeys || removeKeys.length === 0)) return null;
              return { label, patch, removeKeys };
            })
            .filter((item): item is SanitizedFacetSuggestion => Boolean(item))
            .slice(0, 8)
        : [];
      if (suggestions.length === 0) continue;
      actions.push({
        ...base,
        kind: "facet_refine",
        data: {
          searchParams,
          suggestions,
        },
      });
      continue;
    }

    if (candidate.kind === "apply_filter_patch") {
      const label = typeof data.label === "string" ? data.label.trim().slice(0, 80) : "";
      const searchParamsPatch = sanitizeToolSearchParams(data.searchParamsPatch) ?? {};
      const removeKeys = sanitizeFilterPatchKeys(data.removeKeys);
      if (!label) continue;
      if (Object.keys(searchParamsPatch).length === 0 && (!removeKeys || removeKeys.length === 0)) continue;
      actions.push({
        ...base,
        kind: "apply_filter_patch",
        data: {
          label,
          searchParamsPatch,
          removeKeys,
          syntheticPrompt:
            typeof data.syntheticPrompt === "string" && data.syntheticPrompt.trim().length > 0
              ? data.syntheticPrompt.trim().slice(0, 160)
              : undefined,
        },
      });
      continue;
    }

    if (candidate.kind === "clarify_scope") {
      const options = Array.isArray(data.options)
        ? data.options
            .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
            .map((item): SanitizedScopeOption | null => {
              const scope: SanitizedScopeOption["scope"] | null =
                item.scope === "current_filtered" ||
                item.scope === "global_active_inventory" ||
                item.scope === "selected_properties"
                  ? item.scope as SanitizedScopeOption["scope"]
                  : null;
              const label = typeof item.label === "string" ? item.label.trim().slice(0, 80) : "";
              if (!scope || !label) return null;
              return {
                scope,
                label,
                description:
                  typeof item.description === "string" && item.description.trim().length > 0
                    ? item.description.trim().slice(0, 160)
                    : undefined,
                searchParams: sanitizeToolSearchParams(item.searchParams),
              };
            })
            .filter((item): item is SanitizedScopeOption => Boolean(item))
            .slice(0, 3)
        : [];
      if (options.length === 0) continue;
      actions.push({
        ...base,
        kind: "clarify_scope",
        data: {
          options,
          defaultScope:
            data.defaultScope === "current_filtered" ||
            data.defaultScope === "global_active_inventory" ||
            data.defaultScope === "selected_properties"
              ? data.defaultScope
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

function normalizeReplyOutput(reply: ChatbotReply, language: "fr" | "en" = "fr"): ChatbotReply {
  const answer = typeof reply.answer === "string" && reply.answer.trim().length > 0 ? reply.answer.trim() : buildFallbackReply().answer;
  const prompts = normalizePromptList(reply.suggestedPrompts ?? []);
  const citations = sanitizeCitations(reply.citations);
  const edgeProvider =
    reply.edgeProvider === "gemini" || reply.edgeProvider === "fallback"
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
  const containsRentalOutput = containsRentalLanguage([
    answer,
    ...prompts,
    ...((citations ?? []).flatMap((citation) => [citation.title ?? "", citation.path, citation.sourceUrl ?? ""])),
    JSON.stringify(actions ?? []),
    JSON.stringify(analysisCards ?? []),
    JSON.stringify(reply.propertySuggestions ?? []),
  ].join(" "), language);
  const purchaseOnlyRedirect = containsRentalOutput ? buildPurchaseOnlyRedirectAnswer(language) : undefined;
  const memory = sanitizeMemoryMeta(reply.memory);
  const costHints = sanitizeCostHints(reply.costHints);
  const streamSupported = typeof reply.streamSupported === "boolean" ? reply.streamSupported : undefined;
  const pageContextUsed = typeof reply.pageContextUsed === "boolean" ? reply.pageContextUsed : undefined;
  const pageContextMode = reply.pageContextMode === "http" || reply.pageContextMode === "headless" ? reply.pageContextMode : undefined;
  const pageContextCacheHit = typeof reply.pageContextCacheHit === "boolean" ? reply.pageContextCacheHit : undefined;
  const webSearchUsed = typeof reply.webSearchUsed === "boolean" ? reply.webSearchUsed : undefined;
  const webSearchStatus = reply.webSearchStatus === "used" ||
      reply.webSearchStatus === "no_usable_sources" ||
      reply.webSearchStatus === "unavailable"
    ? reply.webSearchStatus
    : undefined;
  const webSearchProvider = reply.webSearchProvider === "tavily_search" ||
      reply.webSearchProvider === "official_dvf_dataset"
    ? reply.webSearchProvider
    : undefined;
  const webSearchQueries = Array.isArray(reply.webSearchQueries)
    ? reply.webSearchQueries
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim().slice(0, 240))
        .slice(0, 3)
    : undefined;

  return {
    ...reply,
    answer: purchaseOnlyRedirect?.answer ?? answer,
    suggestedPrompts: purchaseOnlyRedirect?.suggestedPrompts ?? (prompts.length > 0 ? prompts : normalizePromptList(chatbotExamplePrompts)),
    citations: purchaseOnlyRedirect ? undefined : citations,
    edgeProvider,
    retrievalMode,
    routeCategory,
    routeDecision: routeDecision && routeDecision.length > 0 ? routeDecision : undefined,
    requestId: requestId && requestId.length > 0 ? requestId : undefined,
    agentMode,
    actions: purchaseOnlyRedirect ? undefined : actions,
    conversationStatePatch,
    toolTrace,
    planner,
    analysisCards: purchaseOnlyRedirect ? undefined : analysisCards,
    propertySuggestions: purchaseOnlyRedirect ? undefined : reply.propertySuggestions,
    memory,
    pageContextUsed,
    pageContextMode,
    pageContextCacheHit,
    costHints,
    webSearchUsed,
    webSearchStatus,
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

export const chatbotServiceTestInternals = {
  sanitizeToolSearchParams,
  sanitizeToolTrace,
  sanitizePlannerMeta,
  sanitizeActions,
};

export async function askAgencyChatbot(request: ChatbotRequest): Promise<ChatbotReply> {
  const text = request.question.trim();
  if (text.length < 2 || text.length > 1200) throw new Error(request.language === "en" ? "Use between 2 and 1200 characters." : "Utilisez entre 2 et 1200 caractères.");
  if (!request.actionRequest && !isSearchLocationFollowUp(text, request.conversationState)) {
    const geographic = geographyReply(text, request.language);
    if (geographic) return { ...geographic, source: "local" };
  }
  const context = buildConversationContext(text, request.chatHistory, request.conversationState);
  if (isRentalQuestion(request.question, request.language)) {
    return normalizeReplyOutput(buildPurchaseOnlyRedirectAnswer(request.language), request.language);
  }

  const edgeRagForWebsiteQuestionsEnabled =
    (import.meta.env.VITE_CHATBOT_ENABLE_EDGE_RAG as string | undefined)?.toLowerCase() === "true" ||
    (request.language === "en" && isEdgeApiEnabled());
  const edgeAgentToolsEnabled =
    ((import.meta.env.VITE_CHATBOT_ENABLE_EDGE_AGENT_TOOLS as string | undefined) ?? "false").toLowerCase() === "true";
  const routerV2Enabled = request.language === "en"
    ? false
    : ((import.meta.env.VITE_CHATBOT_ROUTER_V2 as string | undefined) ?? "true").toLowerCase() !== "false";
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
      localReplyCache = normalizeReplyOutput(await buildLocalReply(request.question, context, request.language), request.language);
    }
    return localReplyCache;
  };

  if (routeDecision.target === "local") {
    return normalizeReplyOutput(applyRouteMetadata(await getLocalReply(), routeDecision), request.language);
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
        request.language,
      );
    }

    const inferredEdgeProvider = responsePayload.edgeProvider ?? getLegacyEdgeProvider(responsePayload);

    return normalizeReplyOutput(
      applyRouteMetadata(
        {
          ...responsePayload,
          source: "edge",
          edgeProvider: inferredEdgeProvider,
        },
        routeDecision,
      ),
      request.language,
    );
  } catch {
    return normalizeReplyOutput(
      applyRouteMetadata({ source: "local", answer: request.language === "en" ? "The live assistant is temporarily unavailable. Please retry; your search has not been updated." : "L’assistant en direct est temporairement indisponible. Réessayez ; votre recherche n’a pas été modifiée.", suggestedPrompts: [] }, {
        ...routeDecision,
        target: "local",
        category: "fallback",
        reason: "edge_request_failed",
      }),
      request.language,
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
  language: "fr" | "en" = "fr",
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
            edgeProvider: maybeReply.edgeProvider ?? getLegacyEdgeProvider(maybeReply),
          }, language);
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
    buffer = `${buffer}${decoder.decode(value, { stream: true })}`.replace(/\r\n/g, "\n");
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
  const text = request.question.trim();
  if (text.length < 2 || text.length > 1200) throw new Error(request.language === "en" ? "Use between 2 and 1200 characters." : "Utilisez entre 2 et 1200 caractères.");
  if (!request.actionRequest && !isSearchLocationFollowUp(text, request.conversationState)) {
    const geographic = geographyReply(text, request.language);
    if (geographic) return { ...geographic, source: "local" };
  }
  const context = buildConversationContext(text, request.chatHistory, request.conversationState);
  if (isRentalQuestion(request.question, request.language)) {
    return normalizeReplyOutput(buildPurchaseOnlyRedirectAnswer(request.language), request.language);
  }

  const edgeRagForWebsiteQuestionsEnabled =
    (import.meta.env.VITE_CHATBOT_ENABLE_EDGE_RAG as string | undefined)?.toLowerCase() === "true" ||
    (request.language === "en" && isEdgeApiEnabled());
  const edgeAgentToolsEnabled =
    ((import.meta.env.VITE_CHATBOT_ENABLE_EDGE_AGENT_TOOLS as string | undefined) ?? "false").toLowerCase() === "true";
  const routerV2Enabled = request.language === "en"
    ? false
    : ((import.meta.env.VITE_CHATBOT_ROUTER_V2 as string | undefined) ?? "true").toLowerCase() !== "false";
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
      localReplyCache = normalizeReplyOutput(await buildLocalReply(request.question, context, request.language), request.language);
    }
    return localReplyCache;
  };

  if (routeDecision.target === "local") {
    return normalizeReplyOutput(applyRouteMetadata(await getLocalReply(), routeDecision), request.language);
  }

  const { signal, ...requestPayload } = request;
  try {
    const response = await edgeApiFetch(streamEndpointPath(), {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });
    const streamedReply = await parseSseResponseStream(response, handlers, request.language);
    return normalizeReplyOutput(applyRouteMetadata(streamedReply, routeDecision), request.language);
  } catch {
    return normalizeReplyOutput(
      applyRouteMetadata({ source: "local", answer: request.language === "en" ? "The live assistant is temporarily unavailable. Please retry; your search has not been updated." : "L’assistant en direct est temporairement indisponible. Réessayez ; votre recherche n’a pas été modifiée.", suggestedPrompts: [] }, {
        ...routeDecision,
        target: "local",
        category: "fallback",
        reason: "edge_stream_failed",
      }),
      request.language,
    );
  }
}
