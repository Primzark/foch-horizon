export const routePageLoaders = {
  legacyAnnonce: () => import("@/app/router/LegacyRedirects").then((module) => ({ default: module.LegacyAnnonceRedirect })),
  legacyProperty: () => import("@/app/router/LegacyRedirects").then((module) => ({ default: module.LegacyPropertySlugRedirect })),
  home: () => import("@/features/content/pages/HomePage"),
  listings: () => import("@/features/listings/pages/ListingsIndexPage"),
  listingDetail: () => import("@/features/listings/pages/ListingDetailPage"),
  about: () => import("@/features/content/pages/AboutPageV2"),
  city: () => import("@/features/cities/pages/CityHubPage"),
  contact: () => import("@/features/content/pages/ContactPageV2"),
  fees: () => import("@/features/content/pages/FeesPage"),
  regulations: () => import("@/features/content/pages/RealEstateRegulationsPage"),
  sell: () => import("@/features/content/pages/SellPage"),
  estimation: () => import("@/features/content/pages/EstimationPageV2"),
  services: () => import("@/features/content/pages/ServicesPage"),
  reviews: () => import("@/features/content/pages/ReviewsPage"),
  geography: () => import("@/features/content/pages/GeographyPage"),
  recentSales: () => import("@/features/content/pages/RecentSalesPage"),
  legalText: () => import("@/features/content/pages/LegalTextPage"),
  siteMap: () => import("@/features/content/pages/SiteMapPage"),
  selection: () => import("@/features/favorites/pages/SelectionPage"),
  admin: () => import("@/features/admin/pages/AdminMarketCountersPage"),
  notFound: () => import("@/features/content/pages/NotFoundPage"),
} as const;

export type RoutePageKey = keyof typeof routePageLoaders;

export function getRoutePageKey(pathname: string): RoutePageKey {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (/^\/biens\/\d+(?:-|\/|$)/.test(normalizedPath)) return "listingDetail";
  if (/^\/immobilier\/[^/]+$/.test(normalizedPath)) return "city";
  if (/^\/annonce\/\d+$/.test(normalizedPath)) return "legacyAnnonce";
  if (/^\/property\/[^/]+$/.test(normalizedPath)) return "legacyProperty";

  switch (normalizedPath) {
    case "/": return "home";
    case "/biens":
    case "/biens-immobiliers":
    case "/buy":
    case "/rent": return "listings";
    case "/apropos": return "about";
    case "/contact": return "contact";
    case "/honoraires":
    case "/legal/fees": return "fees";
    case "/reglementation-immobiliere": return "regulations";
    case "/vendre": return "sell";
    case "/estimation": return "estimation";
    case "/services": return "services";
    case "/avis": return "reviews";
    case "/geographie":
    case "/histoire-immobilier-le-havre": return "geography";
    case "/nos-dernieres-ventes": return "recentSales";
    case "/mentions-legales":
    case "/confidentialite":
    case "/cookies":
    case "/accessibilite":
    case "/legal/privacy":
    case "/legal/cookies":
    case "/legal/notice": return "legalText";
    case "/plan-du-site": return "siteMap";
    case "/biens-sauvegardes":
    case "/my-selection": return "selection";
    case "/admin": return "admin";
    default: return "notFound";
  }
}
