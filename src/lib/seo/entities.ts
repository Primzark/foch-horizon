import communeLocations from "@/features/content/data/communeLocations.json";
import { geographyGuideIndex, isHavreNeighborhood } from "@/features/content/data/geographyGuideIndex";
export { isHavreNeighborhood };
export { pageBreadcrumbs } from "@/lib/seo/breadcrumbs";

export const communeByGuideId = new Map(Object.entries(communeLocations));

export const agency = {
  name: "Foch Immobilier",
  legalName: "FOCH IMMOBILIER",
  siren: "911561504",
  streetAddress: "109 avenue Foch",
  postalCode: "76600",
  city: "Le Havre",
  telephone: "+33235425176",
  email: "vendre@fochimmobilier.com",
};

export function placeEntity(guide: { id: string; name: string; placeType?: "quartier" | "commune"; subtitle: string; area: string }, siteUrl: string) {
  const neighborhood = isHavreNeighborhood(guide);
  const commune = communeByGuideId.get(guide.id);
  return {
    "@type": neighborhood ? "Place" : "City",
    "@id": `${siteUrl}/immobilier/${guide.id}#place`,
    name: guide.name,
    ...(commune ? { identifier: { "@type": "PropertyValue", propertyID: "INSEE", value: commune.code }, geo: { "@type": "GeoCoordinates", latitude: commune.latitude, longitude: commune.longitude }, sameAs: commune.source } : {}),
    description: guide.subtitle,
    url: `${siteUrl}/immobilier/${guide.id}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: neighborhood ? agency.city : guide.name,
      addressRegion: "Normandie",
      addressCountry: "FR",
    },
    containedInPlace: neighborhood
      ? { "@id": `${siteUrl}/immobilier/le-havre#place`, "@type": "City", name: agency.city }
      : { "@type": "AdministrativeArea", name: guide.area.includes("Calvados") ? "Calvados" : "Seine-Maritime", containedInPlace: { "@type": "AdministrativeArea", name: "Normandie" } },
  };
}

export function siteEntities(siteUrl: string) {
  return [
    {
      "@type": "RealEstateAgent",
      "@id": `${siteUrl}/#agency`,
      name: agency.name,
      legalName: agency.legalName,
      identifier: { "@type": "PropertyValue", propertyID: "SIREN", value: agency.siren },
      sameAs: [`https://annuaire-entreprises.data.gouv.fr/entreprise/${agency.siren}`],
      url: `${siteUrl}/`,
      image: `${siteUrl}/images/agence-foch.jpg`,
      foundingDate: "1972",
      telephone: agency.telephone,
      email: agency.email,
      address: { "@type": "PostalAddress", streetAddress: agency.streetAddress, postalCode: agency.postalCode, addressLocality: agency.city, addressRegion: "Normandie", addressCountry: "FR" },
      areaServed: geographyGuideIndex.filter((guide) => !isHavreNeighborhood(guide)).map((guide) => ({ "@id": `${siteUrl}/immobilier/${guide.id}#place`, "@type": "City", name: guide.name })),
      openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:30", closes: "12:00" }, { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "14:00", closes: "18:30" }],
    },
    { "@type": "WebSite", "@id": `${siteUrl}/#website`, name: agency.name, url: `${siteUrl}/`, inLanguage: "fr-FR", publisher: { "@id": `${siteUrl}/#agency` } },
  ];
}
