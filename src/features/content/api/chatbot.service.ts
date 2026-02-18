import { cities, cityById } from "@/features/cities/data/cities";
import { leHavreDistrictHistory, leHavreFaq } from "@/features/content/data/leHavreHistoryContent";
import { agencyReviewsFallbackSnapshot } from "@/features/content/api/googleReviews.service";
import { properties } from "@/features/listings/data/properties";
import { formatPrice, normalizeKeyword, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { apiJson, isEdgeApiEnabled } from "@/lib/api/client";

export interface ChatbotPropertySuggestion {
  id: number;
  title: string;
  city: string;
  price: string;
  path: string;
}

export interface ChatbotReply {
  answer: string;
  suggestedPrompts: string[];
  needsLeadCapture?: boolean;
  propertySuggestions?: ChatbotPropertySuggestion[];
  source: "local" | "edge";
}

export interface ChatbotRequest {
  question: string;
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  signal?: AbortSignal;
}

type ChatbotIntent =
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

interface DistrictDescriptor {
  id: string;
  label: string;
  aliases: string[];
}

interface CityRouteDescriptor {
  slug: string;
  name: string;
  aliases: string[];
}

interface ConversationContext {
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
const greetingPattern = /^(bonjour|salut|hello|bonsoir|coucou)\b/;
const thanksPattern = /\bmerci\b|^\s*top\b|^\s*parfait\b/;
const capabilityPattern = /qui es tu|qui etes vous|que peux tu|que pouvez vous|aide moi|help/;
const listingsPagePattern = /toutes les annonces|voir les annonces|catalogue|liste des biens|biens disponibles|parcourir les biens|tous les biens/;
const sellPagePattern = /vendre|mise en vente|mettre en vente|mandat|vente de mon bien/;
const estimationPagePattern = /estimer|estimation|avis de valeur|combien vaut|valeur de mon bien/;
const legalIntentPattern = /mentions legales|confidentialite|rgpd|donnees personnelles|cookies|accessibilite|privacy|legal/;
const selectionIntentPattern = /ma selection|my selection|favoris|wishlist|selection sauvegardee/;
const cityPageIntentPattern = /immobilier|prix|marche|quartier|investissement|annonce|bien|achat|vente|location|estimation/;
const followPathRequestPattern = /ouvre|ouvrir|aller|go|cette page|ce lien|redirige/;
const internalPathPattern = /(\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:\?[a-z0-9=&_-]+)?)/i;

const knownInternalPaths = [
  "/",
  "/biens",
  "/apropos",
  "/contact",
  "/vendre",
  "/estimation",
  "/services",
  "/avis",
  "/histoire-immobilier-le-havre",
  "/honoraires",
  "/my-selection",
  "/mentions-legales",
  "/confidentialite",
  "/cookies",
  "/accessibilite",
  "/plan-du-site",
];

const knownInternalPathPrefixes = ["/biens", "/immobilier/"];

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

function buildConversationContext(question: string, chatHistory: ChatbotRequest["chatHistory"]): ConversationContext {
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
  const requestedPath =
    explicitRequestedPath ??
    (followPathRequestPattern.test(normalizedQuestion) ? extractRequestedPath(normalizedFullHistory) : null);

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

function buildReviewsAnswer(): ChatbotReply {
  const rating = `${agencyReviewsFallbackSnapshot.rating.toFixed(1)} / 5`;
  const count = `${agencyReviewsFallbackSnapshot.userRatingCount} avis`;
  const highlights = agencyReviewsFallbackSnapshot.reviews
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
      "Votre selection sauvegardee est accessible sur /my-selection. Vous pouvez y retrouver les biens favoris puis partager la selection.",
    suggestedPrompts: normalizePromptList([
      "Ouvrir /my-selection",
      "Je veux ajouter des biens a ma selection",
      "Ouvrir /biens",
    ]),
  };
}

function buildDirectPathAnswer(path: string): ChatbotReply {
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

function buildLocalReply(question: string, context: ConversationContext): ChatbotReply {
  if (context.requestedPath) return buildDirectPathAnswer(context.requestedPath);
  if (context.inferredIntent === "lead_capture") return buildLeadCaptureAnswer(context);
  if (context.inferredIntent === "process") return buildProcessAnswer();
  if (context.inferredIntent === "contact") return buildContactAnswer();
  if (context.inferredIntent === "reviews") return buildReviewsAnswer();
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
  if (context.inferredIntent === "navigation") return buildSiteNavigationAnswer();

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

  return buildDistrictAnswer(context) ?? buildFallbackReply();
}

function isWebsiteContentQuestion(context: ConversationContext): boolean {
  return (
    context.requestedPath !== null ||
    context.inferredIntent !== "unknown" ||
    greetingPattern.test(context.normalizedQuestion) ||
    thanksPattern.test(context.normalizedQuestion) ||
    capabilityPattern.test(context.normalizedQuestion) ||
    legalIntentPattern.test(context.normalizedQuestion) ||
    selectionIntentPattern.test(context.normalizedQuestion) ||
    sellPagePattern.test(context.normalizedQuestion) ||
    estimationPagePattern.test(context.normalizedQuestion) ||
    listingsPagePattern.test(context.normalizedQuestion) ||
    Boolean(context.cityRoute && cityPageIntentPattern.test(context.normalizedQuestion)) ||
    hasPropertyContext(context)
  );
}

function isEdgeReplyUsable(payload: unknown): payload is ChatbotReply {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const maybeReply = payload as Partial<ChatbotReply>;
  return typeof maybeReply.answer === "string" && maybeReply.answer.trim().length > 0;
}

function normalizeReplyOutput(reply: ChatbotReply): ChatbotReply {
  const answer = typeof reply.answer === "string" && reply.answer.trim().length > 0 ? reply.answer.trim() : buildFallbackReply().answer;
  const prompts = normalizePromptList(reply.suggestedPrompts ?? []);

  return {
    ...reply,
    answer,
    suggestedPrompts: prompts.length > 0 ? prompts : normalizePromptList(chatbotExamplePrompts),
  };
}

export async function askAgencyChatbot(request: ChatbotRequest): Promise<ChatbotReply> {
  const context = buildConversationContext(request.question, request.chatHistory);
  const localReply = normalizeReplyOutput(buildLocalReply(request.question, context));

  if (!isEdgeApiEnabled() || isWebsiteContentQuestion(context)) {
    return localReply;
  }

  const { signal, ...requestPayload } = request;

  try {
    const responsePayload = await apiJson<ChatbotReply>("/api/chatbot-assistant", {
      method: "POST",
      body: JSON.stringify(requestPayload),
      signal,
    });

    if (!isEdgeReplyUsable(responsePayload)) {
      return localReply;
    }

    return normalizeReplyOutput({ ...responsePayload, source: "edge" });
  } catch {
    return localReply;
  }
}
