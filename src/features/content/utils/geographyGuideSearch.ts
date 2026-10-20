import { geographyGuideIndex, type GeographyGuideLabel } from "@/features/content/data/geographyGuideIndex";

const MAX_GUIDE_SUGGESTIONS = 5;

function normalizeGuideSearchText(value: string): string {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getGuideMatchRank(guide: GeographyGuideLabel, query: string, queryTerms: string[]): number | null {
  const normalizedName = normalizeGuideSearchText(guide.name);
  const normalizedId = normalizeGuideSearchText(guide.id);
  const searchableText = `${normalizedName} ${normalizedId}`;

  if (normalizedName === query) return 0;
  if (normalizedName.startsWith(query)) return 1;
  if (normalizedName.includes(query)) return 2;
  if (queryTerms.every((term) => searchableText.includes(term))) return 3;
  return null;
}

/** Finds local guide pages for the public quick-search autocompletes. */
export function searchGeographyGuides(queryText: string, limit = MAX_GUIDE_SUGGESTIONS): GeographyGuideLabel[] {
  const query = normalizeGuideSearchText(queryText);
  if (query.length < 2 || limit <= 0) return [];

  const queryTerms = query.split(" ").filter(Boolean);

  return geographyGuideIndex
    .map((guide, index) => ({ guide, index, rank: getGuideMatchRank(guide, query, queryTerms) }))
    .filter((match): match is { guide: GeographyGuideLabel; index: number; rank: number } => match.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map(({ guide }) => guide);
}
