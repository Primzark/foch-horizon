import communeLocations from "@/features/content/data/communeLocations.json";
import { geographyGuides } from "@/features/content/data/geographyGuides";

export const communeByGuideId = new Map(Object.entries(communeLocations));

export const agency = {
  name: "Foch Immobilier",
  streetAddress: "109 Av. Foch",
  postalCode: "76600",
  city: "Le Havre",
  telephone: "+33235425176",
  email: "vendre@fochimmobilier.com",
};

export function isHavreNeighborhood(guide: (typeof geographyGuides)[number]): boolean {
  return guide.placeType === "quartier" || ["la-plage", "gobelins", "saint-michel"].includes(guide.id);
}

export function placeEntity(guide: (typeof geographyGuides)[number], siteUrl: string) {
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
      url: `${siteUrl}/`,
      image: `${siteUrl}/images/agence-foch.jpg`,
      foundingDate: "1972",
      telephone: agency.telephone,
      email: agency.email,
      address: { "@type": "PostalAddress", streetAddress: agency.streetAddress, postalCode: agency.postalCode, addressLocality: agency.city, addressRegion: "Normandie", addressCountry: "FR" },
      areaServed: geographyGuides.filter((guide) => !isHavreNeighborhood(guide)).map((guide) => ({ "@id": `${siteUrl}/immobilier/${guide.id}#place`, "@type": "City", name: guide.name })),
      openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:30", closes: "12:00" }, { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "14:00", closes: "18:30" }],
    },
    { "@type": "WebSite", "@id": `${siteUrl}/#website`, name: agency.name, url: `${siteUrl}/`, inLanguage: "fr-FR", publisher: { "@id": `${siteUrl}/#agency` } },
  ];
}

const pageNames: Record<string, string> = {
  "/biens": "Biens immobiliers", "/geographie": "Géographie", "/vendre": "Vendre", "/estimation": "Estimer un bien", "/services": "Services", "/apropos": "L’agence", "/contact": "Contact", "/avis": "Avis clients", "/honoraires": "Honoraires", "/nos-dernieres-ventes": "Dernières ventes", "/reglementation-immobiliere": "Réglementation immobilière", "/histoire-immobilier-le-havre": "Histoire de l’immobilier au Havre", "/plan-du-site": "Plan du site", "/mentions-legales": "Mentions légales", "/confidentialite": "Confidentialité", "/cookies": "Cookies", "/accessibilite": "Accessibilité",
};

export function pageBreadcrumbs(path: string, title?: string) {
  if (path === "/") return [];
  const guide = geographyGuides.find((item) => path === `/immobilier/${item.id}`);
  const crumbs = [{ name: "Accueil", path: "/" }];
  if (guide) {
    crumbs.push({ name: "Géographie", path: "/geographie" });
    if (isHavreNeighborhood(guide)) crumbs.push({ name: "Le Havre", path: "/immobilier/le-havre" });
  } else if (path.startsWith("/biens/")) crumbs.push({ name: "Biens immobiliers", path: "/biens" });
  crumbs.push({ name: guide?.name ?? pageNames[path] ?? title?.split(" | ")[0] ?? "Bien immobilier", path });
  return crumbs;
}
