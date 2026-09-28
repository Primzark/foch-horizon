import { describe, expect, it } from "vitest";
import { buildSearchParams, parseSearchParams } from "@/features/listings/utils/query";
import {
  formatPropertyTypeLabel,
  getPropertyCardLabels,
  parseReferenceFromQuery,
  sanitizePropertySlug,
  toCanonicalPropertyPath,
} from "@/features/listings/utils/formatting";

describe("listing query helpers", () => {
  it("serializes and parses filter params consistently", () => {
    const input = {
      transaction: "vente" as const,
      type: "appartement" as const,
      city: "le-havre",
      q: "Réf 5139",
      bedroomsMin: 2,
      bathroomsMin: 1,
      garagesMin: 0,
      priceMin: 200000,
      priceMax: 700000,
      surfaceMin: 80,
      terrainMin: 0,
      features: ["ascenseur", "balcon"],
      page: 2,
      pageSize: 24,
      sort: "price_desc" as const,
    };

    const serialized = buildSearchParams(input);
    const parsed = parseSearchParams(serialized);

    expect(parsed).toEqual(input);
  });
});

describe("listing formatting helpers", () => {
  it("parses reference id in user query", () => {
    expect(parseReferenceFromQuery("Réf 5139")).toBe(5139);
    expect(parseReferenceFromQuery("5139")).toBe(5139);
    expect(parseReferenceFromQuery("aucune ref")).toBeNull();
  });

  it("builds canonical property path", () => {
    expect(toCanonicalPropertyPath({ id: 5139, slug: "a-deux-pas-de-la-plage" })).toBe(
      "/biens/5139-a-deux-pas-de-la-plage",
    );
  });

  it("sanitizes unsafe slugs", () => {
    expect(sanitizePropertySlug("Maison / Vue Mer !!")).toBe("maison-vue-mer");
    expect(toCanonicalPropertyPath({ id: 6001, slug: "Maison / Vue Mer !!" })).toBe("/biens/6001-maison-vue-mer");
  });

  it("formats property type labels in French", () => {
    expect(formatPropertyTypeLabel("appartement")).toBe("Appartement");
    expect(formatPropertyTypeLabel("maison_villa")).toBe("Maison / Villa");
    expect(formatPropertyTypeLabel("autre")).toBe("Autre");
  });

  it("uses explicit listing labels without inventing statuses", () => {
    expect(getPropertyCardLabels({ status: "active", title: "EXCLUSIVITÉ - NOUVEAUTÉ Sainte-Adresse" })).toEqual([
      "Exclusivité",
      "Nouveautés",
    ]);
    expect(getPropertyCardLabels({ status: "active", title: "SOUS COMPROMIS — Maison au Havre" })).toEqual([
      "Sous compromis",
    ]);
    expect(getPropertyCardLabels({ status: "active", title: "Sous offre : appartement" })).toEqual(["Sous offre"]);
    expect(getPropertyCardLabels({ status: "active", title: "Maison avec une nouvelle cuisine" })).toEqual([]);
    expect(getPropertyCardLabels({ status: "active", title: "Maison sans exclusivité" })).toEqual([]);
  });

  it("prefers structured status and omits newness on unavailable properties", () => {
    expect(getPropertyCardLabels({ status: "under_offer", title: "NOUVEAUTÉ EXCLUSIVITÉ Appartement" })).toEqual([
      "Sous offre",
      "Exclusivité",
    ]);
    expect(getPropertyCardLabels({ status: "sold", title: "NOUVEAUTÉ EXCLUSIVITÉ Maison" })).toEqual(["Vendu"]);
  });
});
