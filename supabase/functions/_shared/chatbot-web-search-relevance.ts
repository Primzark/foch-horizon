export interface TavilyRelevanceCandidate {
  title?: unknown;
  content?: unknown;
  score?: unknown;
}

export const DEFAULT_TAVILY_MIN_RELEVANCE_SCORE = 0.45;

const STOP_WORDS: ReadonlySet<string> = new Set([
  "a", "about", "an", "and", "are", "as", "at", "au", "aux", "avec", "be", "because", "by", "can",
  "ce", "ces", "cette", "dans", "de", "des", "do", "does", "du", "en", "est", "et", "for", "from",
  "give", "how", "in", "internet", "is", "it", "la", "le", "les", "me", "my", "of", "on", "or", "please",
  "pour", "recherche", "rechercher", "recherchez", "cherche", "chercher", "sur", "tell", "the", "to", "un",
  "une", "web", "what", "when", "where", "which", "who", "why", "with", "would", "could", "should",
  "search", "browse", "look", "up", "online", "live", "latest", "recent", "current", "today", "todays",
  "aujourdhui", "aujourd", "hui", "maintenant", "actuellement", "actualite", "actualites", "information",
  "informations", "info", "quelle", "quelles", "quel", "quels", "sont", "dernier", "derniere", "dernieres",
  "derniers",
]);

const TERM_ALIASES: Record<string, string> = {
  climate: "weather",
  climat: "weather",
  forecast: "weather",
  forecasts: "weather",
  meteo: "weather",
  meteorology: "weather",
  meteorological: "weather",
  precipitation: "weather",
  prevision: "weather",
  previsions: "weather",
  temperature: "weather",
  temperatures: "weather",
  temps: "weather",
  immobilier: "property",
  immobiliere: "property",
  immobiliers: "property",
  logement: "property",
  logements: "property",
  housing: "property",
  homes: "property",
  house: "property",
  houses: "property",
  properties: "property",
  locatif: "rent",
  locative: "rent",
  location: "rent",
  locations: "rent",
  loyer: "rent",
  loyers: "rent",
  rental: "rent",
  rentals: "rent",
  renting: "rent",
  selling: "sale",
  ventes: "sale",
  vente: "sale",
  transactions: "sale",
  transaction: "sale",
  prices: "price",
  prix: "price",
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ");
}

function canonicalizeTerm(term: string): string {
  const normalized = TERM_ALIASES[term] ?? term;
  if (normalized.length > 5 && normalized.endsWith("s")) return normalized.slice(0, -1);
  return normalized;
}

function extractQueryTerms(question: string): string[] {
  const query = buildTavilySearchQuery(question);
  const tokens: string[] = normalizeText(query).match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(tokens
    .filter((token) => !STOP_WORDS.has(token) && (token.length >= 3 || /^\d{4}$/.test(token)))
    .map(canonicalizeTerm))];
}

function tokenMatches(queryTerm: string, sourceTerms: Set<string>): boolean {
  if (sourceTerms.has(queryTerm)) return true;
  if (queryTerm.length < 6) return false;
  for (const sourceTerm of sourceTerms) {
    if (sourceTerm.length >= 6 && (sourceTerm.startsWith(queryTerm) || queryTerm.startsWith(sourceTerm))) {
      return true;
    }
  }
  return false;
}

/** Removes only a leading web-search command, keeping the user's actual search topic. */
export function buildTavilySearchQuery(question: string): string {
  const commandPrefix = /^(?:(?:please|s'il vous plait)\s+)?(?:(?:recherche|rechercher|recherchez|cherche|chercher)\s+(?:sur\s+)?(?:le\s+)?(?:web|internet)|(?:search|browse|look\s+up)\s+(?:the\s+)?(?:web|internet))(?:\s+(?:for|about|sur|pour))?\s*[:,\-]?\s*/iu;
  return question.trim().replace(commandPrefix, "").replace(/\s+/g, " ").trim().slice(0, 400);
}

/**
 * Requires a Tavily relevance score and topical overlap before exposing a generic
 * web result as a citation. Official price searches keep their stricter host and
 * evidence checks in the caller.
 */
export function isTavilyResultRelevant(
  question: string,
  candidate: TavilyRelevanceCandidate,
  minimumScore = DEFAULT_TAVILY_MIN_RELEVANCE_SCORE,
): boolean {
  const score = typeof candidate.score === "number" ? candidate.score : Number.NaN;
  if (!Number.isFinite(score) || score < minimumScore || score > 1) return false;

  const queryTerms = extractQueryTerms(question);
  if (queryTerms.length === 0) return false;

  const sourceText = [candidate.title, candidate.content]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  const sourceTerms = new Set((normalizeText(sourceText).match(/[\p{L}\p{N}]+/gu) ?? []).map(canonicalizeTerm));
  const matchCount = queryTerms.filter((term) => tokenMatches(term, sourceTerms)).length;

  if (queryTerms.length === 1) return score >= 0.75 && matchCount === 1;
  return matchCount >= Math.min(2, queryTerms.length);
}
