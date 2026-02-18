import { cityById } from "@/features/cities/data/cities";
import { leHavreDistrictHistory } from "@/features/content/data/leHavreHistoryContent";
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
}

export const chatbotExamplePrompts = [
  "Je cherche un appartement a vendre dans le quartier Perret avec 2 chambres.",
  "Quel quartier du Havre est le plus adapte pour un investissement locatif ?",
  "Comment se passe un compromis de vente avec votre agence ?",
  "Quels services proposez-vous pour la gestion locative au Havre ?",
  "Je ne trouve pas de bien adapte, pouvez-vous me rappeler ?",
];

function buildPropertySuggestions(question: string): ChatbotPropertySuggestion[] {
  const normalized = normalizeKeyword(question);
  const wantsRental = /location|louer|locatif|loyer/.test(normalized);
  const wantsSale = /vente|acheter|achat|acquerir/.test(normalized);

  const districtNeedles = ["perret", "saint francois", "saint-vincent", "saint vincent", "sanvic", "graville", "eure"];
  const matchingDistrict = districtNeedles.find((needle) => normalized.includes(needle));

  const scored = properties
    .filter((property) => property.status === "active")
    .filter((property) => {
      if (wantsRental && property.transactionType !== "location") return false;
      if (wantsSale && property.transactionType !== "vente") return false;
      return true;
    })
    .map((property) => {
      const city = cityById.get(property.cityId)?.name ?? "Le Havre";
      const haystack = normalizeKeyword(`${property.title} ${property.description} ${city}`);
      let score = 0;

      if (matchingDistrict && haystack.includes(matchingDistrict)) {
        score += 3;
      }

      if (normalized.includes("2 chambre") && (property.bedrooms ?? 0) >= 2) {
        score += 2;
      }

      if (normalized.includes("3 chambre") && (property.bedrooms ?? 0) >= 3) {
        score += 2;
      }

      if (normalized.includes("vue mer") && haystack.includes("vue mer")) {
        score += 2;
      }

      if (normalized.includes("maison") && property.propertyType === "maison_villa") {
        score += 2;
      }

      if (normalized.includes("appartement") && property.propertyType === "appartement") {
        score += 2;
      }

      if (normalized.includes("investissement") && (property.surfaceM2 <= 55 || property.priceAmount <= 170000)) {
        score += 2;
      }

      if (haystack.includes("le havre")) {
        score += 1;
      }

      return { property, score };
    })
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

  return scored;
}

function buildDistrictAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);

  const district = leHavreDistrictHistory.find((item) => {
    const districtName = normalizeKeyword(item.name);
    return normalized.includes(districtName) || district.keywordTags.some((tag) => normalized.includes(normalizeKeyword(tag)));
  });

  if (!district) {
    return null;
  }

  return {
    source: "local",
    answer: `${district.name}: ${district.summary} ${district.investmentAngle}`,
    suggestedPrompts: [
      `Quels biens avez-vous actuellement dans ${district.name} ?`,
      `Quelle est la strategie de vente dans ${district.name} ?`,
      "Pouvez-vous me proposer une estimation dans ce quartier ?",
    ],
  };
}

function buildServiceAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!/service|gestion|location|vendre|estimation|syndic|accompagnement/.test(normalized)) {
    return null;
  }

  return {
    source: "local",
    answer:
      "Nous couvrons tout le cycle immobilier au Havre: estimation immobiliere argumentee, vente (mise en marche + visites + negotiation), location (selection dossiers + bail), et gestion locative (suivi administratif, encaissements, reporting proprietaire).",
    suggestedPrompts: [
      "Comment se deroule une estimation de mon appartement ?",
      "Quels sont vos delais moyens de mise en vente ?",
      "Pouvez-vous prendre en charge la gestion locative complete ?",
    ],
  };
}

function buildProcessAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!/compromis|notaire|process|etape|signature|acte|financement/.test(normalized)) {
    return null;
  }

  return {
    source: "local",
    answer:
      "Processus type: 1) offre acceptee, 2) verification du financement et des pieces juridiques, 3) signature du compromis de vente, 4) delai legal et conditions suspensives, 5) signature de l'acte authentique chez le notaire. L'agence coordonne chaque etape avec vendeurs, acquereurs et notaire.",
    suggestedPrompts: [
      "Quel delai entre compromis et acte definitif ?",
      "Quels documents dois-je preparer pour vendre ?",
      "Pouvez-vous m'accompagner sur un achat avec pret immobilier ?",
    ],
  };
}

function buildPropertyAnswer(question: string): ChatbotReply | null {
  const normalized = normalizeKeyword(question);
  if (!/appartement|maison|bien|acheter|achat|louer|vente|investissement|studio|t2|t3|quartier/.test(normalized)) {
    return null;
  }

  const suggestions = buildPropertySuggestions(question);

  if (suggestions.length === 0) {
    return {
      source: "local",
      answer:
        "Je n'ai pas trouve de bien parfaitement aligne avec votre recherche dans l'inventaire actuel. Laissez votre email et vos criteres: l'agence vous enverra une selection ciblee des qu'un bien compatible arrive.",
      suggestedPrompts: [
        "Je veux laisser mon email pour etre contacte",
        "Je cherche un T2 proche centre-ville",
        "Je cherche une maison familiale a Sanvic",
      ],
      needsLeadCapture: true,
    };
  }

  return {
    source: "local",
    answer:
      "Voici une premiere selection de biens qui correspondent a votre demande. Je peux aussi transmettre vos criteres a un conseiller pour une recherche off-market.",
    suggestedPrompts: [
      "Affinez sur un budget precis",
      "Je veux une estimation de rendement locatif",
      "Je prefere un secteur proche mer",
    ],
    propertySuggestions: suggestions,
  };
}

function buildFallbackReply(): ChatbotReply {
  return {
    source: "local",
    answer:
      "Je peux vous aider sur les biens disponibles, les quartiers du Havre (Perret, Saint-Francois, Saint-Vincent, Sanvic, Graville, Eure), les services de l'agence et les etapes du processus immobilier.",
    suggestedPrompts: chatbotExamplePrompts,
  };
}

function buildLocalReply(question: string): ChatbotReply {
  return (
    buildDistrictAnswer(question) ??
    buildServiceAnswer(question) ??
    buildProcessAnswer(question) ??
    buildPropertyAnswer(question) ??
    buildFallbackReply()
  );
}

export async function askAgencyChatbot(request: ChatbotRequest): Promise<ChatbotReply> {
  if (isEdgeApiEnabled()) {
    try {
      const payload = await apiJson<ChatbotReply>("/api/chatbot-assistant", {
        method: "POST",
        body: JSON.stringify(request),
      });

      return {
        ...payload,
        source: "edge",
      };
    } catch {
      // Continue with local fallback.
    }
  }

  return buildLocalReply(request.question);
}
