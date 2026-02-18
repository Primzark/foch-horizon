import { cityById } from "@/features/cities/data/cities";
import { leHavreDistrictHistory, leHavreFaq } from "@/features/content/data/leHavreHistoryContent";
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

export const chatbotExamplePrompts = [
  "Je cherche un appartement a vendre dans le quartier Perret avec 2 chambres.",
  "Quel quartier du Havre est le plus adapte pour un investissement locatif ?",
  "Comment se passe un compromis de vente avec votre agence ?",
  "Quels services proposez-vous pour la gestion locative au Havre ?",
  "Je ne trouve pas de bien adapte, pouvez-vous me rappeler ?",
];

const processIntentPattern = /compromis|notaire|process|etape|signature|acte|financement/;
const propertyIntentPattern = /appartement|maison|bien|acheter|achat|louer|vente|investissement|studio|t2|t3|quartier/;
const serviceIntentPattern = /service|gestion|location|vendre|estimation|syndic|accompagnement/;
const contactIntentPattern = /contact|telephone|tel|appeler|email|mail|adresse|horaire|ouvert|ouverture|rdv|rendez vous/;
const reviewsIntentPattern = /avis|review|google|note|reputation|temoignage/;
const feesIntentPattern = /honoraire|bareme|frais|commission|pdf/;
const historyIntentPattern = /histoire|historique|fondation|unesco|perret|saint francois|saint-vincent|saint vincent|sanvic|graville|docks vauban|eure/;
const aboutIntentPattern = /agence|equipe|apropos|a propos|depuis 1972|unis/;
const siteNavigationIntentPattern = /site|page|rubrique|navigation|plan du site|ou trouver|ou puis je|ou puis-je|lien/;
const directLeadCapturePattern = /ne trouve pas|introuvable|aucun bien|pas de bien|pas adapte|rappeler|etre contacte|etre rappele|laisser mon email|alerte email/;
const districtComparisonPattern = /(quel quartier|quels quartiers|meilleur quartier|meilleurs quartiers).*(investissement|locatif|rendement)|investissement locatif/;

function normalizePromptList(prompts: string[]): string[] {
  return prompts.map((prompt) => prompt.trim()).filter((prompt) => prompt.length > 0).slice(0, 6);
}

function buildPropertySuggestions(question: string): ChatbotPropertySuggestion[] {
  const normalized = normalizeKeyword(question);
  const wantsRental = /location|louer|locatif|loyer/.test(normalized);
  const wantsSale = /vente|acheter|achat|acquerir/.test(normalized);
  const bedroomsNeedle = normalized.match(/(\d+)\s*chambre/);
  const bedroomsMin = bedroomsNeedle ? Number(bedroomsNeedle[1]) : null;
  const budgetNeedle = normalized.match(/(\d[\d\s]{2,})\s*(e|euros|€)/);
  const budgetMax = budgetNeedle ? Number(budgetNeedle[1].replace(/\s+/g, "")) : null;

  const districtNeedles = ["perret", "saint francois", "saint-vincent", "saint vincent", "sanvic", "graville", "eure"];
  const matchingDistrict = districtNeedles.find((needle) => normalized.includes(needle));
  const requestSpecificity = Number(Boolean(matchingDistrict)) + Number(Boolean(bedroomsMin)) + Number(Boolean(budgetMax));

  return properties
    .filter((property) => property.status === "active")
    .filter((property) => {
      if (wantsRental && property.transactionType !== "location") return false;
      if (wantsSale && property.transactionType !== "vente") return false;
      if (bedroomsMin != null && (property.bedrooms ?? 0) < bedroomsMin) return false;
      if (budgetMax != null && property.priceAmount > budgetMax) return false;
      return true;
    })
    .map((property) => {
      const city = cityById.get(property.cityId)?.name ?? "Le Havre";
      const haystack = normalizeKeyword(`${property.title} ${property.description} ${city}`);
      let score = 0;

      if (matchingDistrict && haystack.includes(matchingDistrict)) score += 3;
      if (bedroomsMin != null && (property.bedrooms ?? 0) >= bedroomsMin) score += 2;
      if (budgetMax != null && property.priceAmount <= budgetMax) score += 2;
      if (normalized.includes("vue mer") && haystack.includes("vue mer")) score += 2;
      if (normalized.includes("maison") && property.propertyType === "maison_villa") score += 2;
      if (normalized.includes("appartement") && property.propertyType === "appartement") score += 2;
      if (normalized.includes("investissement") && (property.surfaceM2 <= 55 || property.priceAmount <= 170000)) score += 2;
      if (haystack.includes("le havre")) score += 1;

      return { property, score };
    })
    .filter(({ score }) => score >= (requestSpecificity >= 2 ? 3 : 1))
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

function buildLeadCaptureAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!directLeadCapturePattern.test(normalized)) {
    return null;
  }

  return {
    source: "local",
    answer:
      "Bien note. Si vous ne trouvez pas le bon bien, je peux transmettre vos criteres directement a l'agence. Laissez votre email, votre budget, le secteur souhaite et la typologie (ex: T3 Perret, maison Sanvic).",
    suggestedPrompts: normalizePromptList([
      "Je veux laisser mon email pour etre rappelle",
      "Je cherche un T3 a Perret avec balcon",
      "Je cherche une maison familiale a Sanvic",
    ]),
    needsLeadCapture: true,
  };
}

function buildProcessAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!processIntentPattern.test(normalized)) {
    return null;
  }

  return {
    source: "local",
    answer:
      "Processus type: 1) offre acceptee, 2) verification du financement et des pieces, 3) signature du compromis de vente, 4) delai legal et conditions suspensives, 5) acte authentique chez le notaire. L'agence suit la coordination entre vendeur, acquereur, banque et notaire.",
    suggestedPrompts: normalizePromptList([
      "Quel delai moyen entre compromis et acte ?",
      "Quels documents faut-il pour vendre ?",
      "Pouvez-vous m'accompagner sur un achat avec pret ?",
    ]),
  };
}

function buildContactAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!contactIntentPattern.test(normalized)) {
    return null;
  }

  return {
    source: "local",
    answer:
      "Coordonnees agence: 109 Av. Foch, 76600 Le Havre, tel 02 35 42 51 76, email vendre@fochimmobilier.com. Horaires: lundi-vendredi 09:30-12:00 et 14:00-18:30, samedi sur rendez-vous. La page complete est /contact.",
    suggestedPrompts: normalizePromptList([
      "Pouvez-vous me rappeler demain matin ?",
      "Je veux envoyer une demande d'estimation",
      "Ou est situee l'agence exactement ?",
    ]),
  };
}

function buildReviewsAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!reviewsIntentPattern.test(normalized)) {
    return null;
  }

  return {
    source: "local",
    answer:
      "Les avis clients sont disponibles sur la page /avis avec la note Google, le volume d'avis et les derniers retours transaction/location/gestion locative.",
    suggestedPrompts: normalizePromptList([
      "Montrez-moi les derniers avis clients",
      "Quelle est la note Google actuelle ?",
      "Je veux parler a un conseiller apres lecture des avis",
    ]),
  };
}

function buildFeesAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!feesIntentPattern.test(normalized)) {
    return null;
  }

  return {
    source: "local",
    answer:
      "Les honoraires sont detailes sur /honoraires avec un acces direct au PDF officiel. Le bareme synthese presente les tranches de prix et pourcentages TTC.",
    suggestedPrompts: normalizePromptList([
      "Je veux ouvrir la page honoraires",
      "Comment sont calcules les frais de vente ?",
      "Pouvez-vous m'expliquer le bareme TTC ?",
    ]),
  };
}

function buildHistoryAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!historyIntentPattern.test(normalized)) {
    return null;
  }

  const faqMatch = leHavreFaq.find((faq) => {
    const faqQuestion = normalizeKeyword(faq.question);
    return faqQuestion.split(" ").some((token) => token.length > 4 && normalized.includes(token));
  });

  if (faqMatch) {
    return {
      source: "local",
      answer: faqMatch.answer,
      suggestedPrompts: normalizePromptList([
        "Quels quartiers suivre pour investir au Havre ?",
        "Resumez-moi Perret, Saint-Francois et Saint-Vincent",
        "Ou trouver la page historique complete ?",
      ]),
    };
  }

  return {
    source: "local",
    answer:
      "La page /histoire-immobilier-le-havre couvre l'evolution du marche de 1517 a aujourd'hui avec focus sur Perret, Saint-Francois, Saint-Vincent, Sanvic, Graville et Eure-Docks.",
    suggestedPrompts: normalizePromptList([
      "Quels sont les atouts du quartier Perret ?",
      "Quel secteur viser pour un investissement locatif ?",
      "Je veux une estimation dans un quartier historique",
    ]),
  };
}

function buildAboutAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!aboutIntentPattern.test(normalized)) {
    return null;
  }

  return {
    source: "local",
    answer:
      "Foch Immobilier est une agence du Havre active depuis 1972 (reseau UNIS). L'equipe couvre transaction, location et administration de biens. Vous pouvez consulter la presentation sur /apropos.",
    suggestedPrompts: normalizePromptList([
      "Quels services propose l'agence ?",
      "Comment contacter un conseiller ?",
      "Je veux voir les biens disponibles",
    ]),
  };
}

function buildDistrictComparisonAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!districtComparisonPattern.test(normalized)) {
    return null;
  }

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
      `Pour un investissement locatif au Havre, trois secteurs ressortent souvent: ${rankedDistricts[0].name} (demande locative active), ${rankedDistricts[1].name} (renouvellement urbain et petites surfaces), ${rankedDistricts[2].name} (liquidite patrimoniale forte).`,
    suggestedPrompts: normalizePromptList([
      "Quels biens avez-vous dans ces quartiers ?",
      "Je veux un comparatif rendement / budget",
      "Pouvez-vous transmettre ma recherche a un conseiller ?",
    ]),
  };
}

function buildDistrictAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);

  const district = leHavreDistrictHistory.find((item) => {
    const districtName = normalizeKeyword(item.name);
    return normalized.includes(districtName) || item.keywordTags.some((tag) => normalized.includes(normalizeKeyword(tag)));
  });

  if (!district) {
    return null;
  }

  return {
    source: "local",
    answer: `${district.name}: ${district.summary} ${district.investmentAngle}`,
    suggestedPrompts: normalizePromptList([
      `Quels biens avez-vous actuellement dans ${district.name} ?`,
      `Quelle strategie de vente recommandez-vous dans ${district.name} ?`,
      "Pouvez-vous me proposer une estimation dans ce quartier ?",
    ]),
  };
}

function buildServiceAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!serviceIntentPattern.test(normalized)) {
    return null;
  }

  return {
    source: "local",
    answer:
      "Les services du site couvrent la transaction (achat/vente), la location, la gestion locative et l'estimation. Vous pouvez aller sur /vendre, /services, /estimation et /contact selon votre besoin.",
    suggestedPrompts: normalizePromptList([
      "Comment se deroule une estimation ?",
      "Je veux vendre mon bien au Havre",
      "Pouvez-vous gerer mon bien en location ?",
    ]),
  };
}

function buildPropertyAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!propertyIntentPattern.test(normalized)) {
    return null;
  }

  const suggestions = buildPropertySuggestions(question);

  if (suggestions.length === 0) {
    return {
      source: "local",
      answer:
        "Je n'ai pas trouve de bien parfaitement aligne avec votre recherche actuelle. Laissez votre email et vos criteres pour que l'agence vous envoie une selection ciblee des qu'un bien compatible arrive.",
      suggestedPrompts: normalizePromptList([
        "Je veux laisser mon email pour etre contacte",
        "Je cherche un T2 proche centre-ville",
        "Je cherche une maison familiale a Sanvic",
      ]),
      needsLeadCapture: true,
    };
  }

  return {
    source: "local",
    answer:
      "Voici une premiere selection de biens correspondant a votre demande. Je peux aussi transmettre vos criteres a un conseiller pour une recherche plus ciblee.",
    suggestedPrompts: normalizePromptList([
      "Affinez sur un budget precis",
      "Je veux prioriser les quartiers proches mer",
      "Je ne trouve pas le bon bien, je veux etre rappelle",
    ]),
    propertySuggestions: suggestions,
  };
}

function buildSiteNavigationAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!siteNavigationIntentPattern.test(normalized)) {
    return null;
  }

  return {
    source: "local",
    answer:
      "Pages principales du site: /biens (annonces), /vendre, /estimation, /services, /histoire-immobilier-le-havre, /avis, /honoraires et /contact.",
    suggestedPrompts: normalizePromptList([
      "Je veux voir les biens a vendre",
      "Je veux consulter les avis clients",
      "Je veux contacter l'agence",
    ]),
  };
}

function buildFallbackReply(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Je peux vous aider sur les biens disponibles, les quartiers du Havre, les services de l'agence, les etapes de vente/achat, les avis clients et les informations de contact.",
    suggestedPrompts: normalizePromptList(chatbotExamplePrompts),
  };
}

function buildLocalReply(question: string): ChatbotReply {
  const normalized = normalizeKeyword(question);

  if (directLeadCapturePattern.test(normalized)) {
    return buildLeadCaptureAnswer(question) ?? buildFallbackReply();
  }

  if (processIntentPattern.test(normalized)) {
    return buildProcessAnswer(question) ?? buildFallbackReply();
  }

  if (contactIntentPattern.test(normalized)) {
    return buildContactAnswer(question) ?? buildFallbackReply();
  }

  if (reviewsIntentPattern.test(normalized)) {
    return buildReviewsAnswer(question) ?? buildFallbackReply();
  }

  if (feesIntentPattern.test(normalized)) {
    return buildFeesAnswer(question) ?? buildFallbackReply();
  }

  if (propertyIntentPattern.test(normalized)) {
    return (
      buildDistrictComparisonAnswer(question) ??
      buildPropertyAnswer(question) ??
      buildDistrictAnswer(question) ??
      buildServiceAnswer(question) ??
      buildFallbackReply()
    );
  }

  if (serviceIntentPattern.test(normalized)) {
    return buildServiceAnswer(question) ?? buildFallbackReply();
  }

  return (
    buildHistoryAnswer(question) ??
    buildAboutAnswer(question) ??
    buildDistrictAnswer(question) ??
    buildSiteNavigationAnswer(question) ??
    buildFallbackReply()
  );
}

function isWebsiteContentQuestion(question: string): boolean {
  const normalized = normalizeKeyword(question);

  return [
    processIntentPattern,
    propertyIntentPattern,
    serviceIntentPattern,
    contactIntentPattern,
    reviewsIntentPattern,
    feesIntentPattern,
    historyIntentPattern,
    aboutIntentPattern,
    siteNavigationIntentPattern,
    directLeadCapturePattern,
    districtComparisonPattern,
  ].some((pattern) => pattern.test(normalized));
}

function isEdgeReplyUsable(payload: unknown): payload is ChatbotReply {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const maybeReply = payload as Partial<ChatbotReply>;
  return (
    typeof maybeReply.answer === "string" &&
    maybeReply.answer.trim().length > 0 &&
    Array.isArray(maybeReply.suggestedPrompts)
  );
}

export async function askAgencyChatbot(request: ChatbotRequest): Promise<ChatbotReply> {
  const localReply = buildLocalReply(request.question);

  if (!isEdgeApiEnabled() || isWebsiteContentQuestion(request.question)) {
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

    return {
      ...responsePayload,
      suggestedPrompts:
        normalizePromptList(responsePayload.suggestedPrompts).length > 0
          ? normalizePromptList(responsePayload.suggestedPrompts)
          : localReply.suggestedPrompts,
      source: "edge",
    };
  } catch {
    return localReply;
  }
}
