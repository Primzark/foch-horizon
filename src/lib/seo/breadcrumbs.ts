import { geographyGuideIndex, isHavreNeighborhood } from "@/features/content/data/geographyGuideIndex";

const pageNames: Record<string, string> = {
  "/biens": "Biens immobiliers",
  "/geographie": "Géographie",
  "/vendre": "Vendre",
  "/estimation": "Estimer un bien",
  "/services": "Services",
  "/apropos": "L’agence",
  "/contact": "Contact",
  "/avis": "Avis clients",
  "/honoraires": "Honoraires",
  "/nos-dernieres-ventes": "Dernières ventes",
  "/reglementation-immobiliere": "Réglementation immobilière",
  "/histoire-immobilier-le-havre": "Histoire de l’immobilier au Havre",
  "/plan-du-site": "Plan du site",
  "/mentions-legales": "Mentions légales",
  "/confidentialite": "Confidentialité",
  "/cookies": "Cookies",
  "/accessibilite": "Accessibilité",
};

export function pageBreadcrumbs(path: string, title?: string) {
  if (path === "/") return [];
  const guide = geographyGuideIndex.find((item) => path === `/immobilier/${item.id}`);
  const crumbs = [{ name: "Accueil", path: "/" }];

  if (guide) {
    crumbs.push({ name: "Géographie", path: "/geographie" });
    if (isHavreNeighborhood(guide)) crumbs.push({ name: "Le Havre", path: "/immobilier/le-havre" });
  } else if (path.startsWith("/biens/")) {
    crumbs.push({ name: "Biens immobiliers", path: "/biens" });
  }

  crumbs.push({ name: guide?.name ?? pageNames[path] ?? title?.split(" | ")[0] ?? "Bien immobilier", path });
  return crumbs;
}
