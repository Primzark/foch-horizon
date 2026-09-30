import { describe, expect, it } from "vitest";
import { atLocation, ofLocation } from "@/lib/utils/frenchLocation";
import { isHavreNeighborhood, pageBreadcrumbs, placeEntity, siteEntities } from "@/lib/seo/entities";
import { geographyGuides } from "@/features/content/data/geographyGuides";

const origin = "https://example.test";

describe("French location labels and geography entities", () => {
  it("contracts city names and identifies neighborhood labels", () => {
    expect(atLocation("Le Havre")).toBe("au Havre");
    expect(ofLocation("LE HAVRE")).toBe("du HAVRE");
    expect(atLocation("Les Trois-Pierres")).toBe("aux Trois-Pierres");
    expect(atLocation("Halles Centrales")).toBe("aux Halles Centrales");
    expect(ofLocation("Hôtel de Ville")).toBe("de l’Hôtel de Ville");
    expect(atLocation("Sainte-Adresse")).toBe("à Sainte-Adresse");
  });

  it("never assigns a Havre neighborhood its own city address", () => {
    geographyGuides.filter(isHavreNeighborhood).forEach(guide => {
      const place = placeEntity(guide, origin);
      expect(place.address.addressLocality).toBe("Le Havre");
      expect(place.containedInPlace).toMatchObject({ "@id": `${origin}/immobilier/le-havre#place` });
    });
  });

  it("keeps every related guide resolvable with no duplicate slugs", () => {
    const ids = geographyGuides.map(guide => guide.id);
    expect(new Set(ids).size).toBe(ids.length);
    geographyGuides.forEach(guide => guide.nearbyGuideIds?.forEach(id => expect(ids).toContain(id)));
    expect(ids).toContain("halles-centrales");
    expect(ids).toContain("hotel-de-ville");
  });

  it("connects neighborhood breadcrumbs to city and geography pages", () => {
    expect(pageBreadcrumbs("/immobilier/halles-centrales").map(crumb => crumb.path)).toEqual(["/", "/geographie", "/immobilier/le-havre", "/immobilier/halles-centrales"]);
  });

  it("describes one business identity with its actual address and contact", () => {
    const entity = siteEntities(origin)[0];
    expect(entity).toMatchObject({ "@type": "RealEstateAgent", "@id": `${origin}/#agency`, telephone: "+33235425176", email: "vendre@fochimmobilier.com", address: { streetAddress: "109 Av. Foch", addressLocality: "Le Havre" } });
  });
});
