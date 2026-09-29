export interface PriceHints {
  priceMin?: number;
  priceMax?: number;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseBedroomsMin(question: string): number | undefined {
  const normalized = normalizeText(question);
  const tMatch = normalized.match(/\bt([1-9])\b/);
  if (tMatch) {
    const rooms = Number(tMatch[1]);
    return clamp(Math.max(0, rooms - 1), 0, 8);
  }

  const bedroomMatch = normalized.match(/\b(\d{1,2}|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)\s*chambres?\b/);
  if (!bedroomMatch) return undefined;

  const bedroomWords: Record<string, number> = {
    un: 1,
    une: 1,
    deux: 2,
    trois: 3,
    quatre: 4,
    cinq: 5,
    six: 6,
    sept: 7,
    huit: 8,
    neuf: 9,
    dix: 10,
    onze: 11,
    douze: 12,
  };
  const bedroomCount = bedroomWords[bedroomMatch[1]] ?? Number(bedroomMatch[1]);
  return clamp(bedroomCount, 0, 12);
}

export function parsePriceHints(question: string): PriceHints {
  const normalized = normalizeText(question);
  const extract = (value: string) => Number(value.replace(/\s+/g, ""));
  const compactQuestion = question.replace(/\u00a0/g, " ");

  const betweenMatch = compactQuestion.match(
    /entre\s+([0-9][0-9\s.,]{2,})\s*(?:€|eur|euros)?\s+et\s+([0-9][0-9\s.,]{2,})/i,
  );
  if (betweenMatch) {
    const a = extract(betweenMatch[1].replace(/[^\d]/g, ""));
    const b = extract(betweenMatch[2].replace(/[^\d]/g, ""));
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    return {
      priceMin: Number.isFinite(min) ? min : undefined,
      priceMax: Number.isFinite(max) ? max : undefined,
    };
  }

  const maxMatch = compactQuestion.match(
    /(?:budget(?:\s+max(?:imum)?)?|max(?:imum)?|moins de|jusqu(?:e|')?a)\s*(?:de\s+|d['’]\s*)?[:-]?\s*([0-9][0-9\s.,]{2,})/i,
  );
  if (maxMatch) {
    const max = extract(maxMatch[1].replace(/[^\d]/g, ""));
    return { priceMax: Number.isFinite(max) ? max : undefined };
  }

  const minMatch = compactQuestion.match(/(min(?:imum)?|au moins|a partir de|plus de)\s*[:-]?\s*([0-9][0-9\s.,]{2,})/i);
  if (minMatch) {
    const min = extract(minMatch[2].replace(/[^\d]/g, ""));
    return { priceMin: Number.isFinite(min) ? min : undefined };
  }

  const euroMatches = [...compactQuestion.matchAll(/([0-9][0-9\s.,]{2,})\s*(?:€|eur|euros)\b/gi)];
  if (euroMatches.length > 0) {
    const parsed = euroMatches
      .map((match) => extract(match[1].replace(/[^\d]/g, "")))
      .filter((value) => Number.isFinite(value) && value >= 1000);
    if (parsed.length >= 2) {
      return { priceMin: Math.min(...parsed), priceMax: Math.max(...parsed) };
    }
    if (parsed.length === 1) {
      if (/\bentre\b/.test(normalized)) return { priceMin: parsed[0] };
      return { priceMax: parsed[0] };
    }
  }

  return {};
}
