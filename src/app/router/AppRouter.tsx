import { Suspense, lazy, useLayoutEffect, useRef } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { CookieConsentManager } from "@/layout/CookieConsentManager";
import { RouteLoadingScreen } from "@/components/ui/RouteLoadingScreen";

const LegacyAnnonceRedirect = lazy(() =>
  import("@/app/router/LegacyRedirects").then((module) => ({ default: module.LegacyAnnonceRedirect })),
);
const LegacyPropertySlugRedirect = lazy(() =>
  import("@/app/router/LegacyRedirects").then((module) => ({ default: module.LegacyPropertySlugRedirect })),
);
const HomePage = lazy(() => import("@/features/content/pages/HomePage"));
const ListingsIndexPage = lazy(() => import("@/features/listings/pages/ListingsIndexPage"));
const ListingDetailPage = lazy(() => import("@/features/listings/pages/ListingDetailPage"));
const AboutPageV2 = lazy(() => import("@/features/content/pages/AboutPageV2"));
const CityHubPage = lazy(() => import("@/features/cities/pages/CityHubPage"));
const ContactPageV2 = lazy(() => import("@/features/content/pages/ContactPageV2"));
const FeesPage = lazy(() => import("@/features/content/pages/FeesPage"));
const RealEstateRegulationsPage = lazy(() => import("@/features/content/pages/RealEstateRegulationsPage"));
const SellPage = lazy(() => import("@/features/content/pages/SellPage"));
const EstimationPageV2 = lazy(() => import("@/features/content/pages/EstimationPageV2"));
const ServicesPage = lazy(() => import("@/features/content/pages/ServicesPage"));
const ReviewsPage = lazy(() => import("@/features/content/pages/ReviewsPage"));
const GeographyPage = lazy(() => import("@/features/content/pages/GeographyPage"));
const RecentSalesPage = lazy(() => import("@/features/content/pages/RecentSalesPage"));
const LegalTextPage = lazy(() => import("@/features/content/pages/LegalTextPage"));
const SiteMapPage = lazy(() => import("@/features/content/pages/SiteMapPage"));
const SelectionPage = lazy(() => import("@/features/favorites/pages/SelectionPage"));
const AdminMarketCountersPage = lazy(() => import("@/features/admin/pages/AdminMarketCountersPage"));
const NotFoundPage = lazy(() => import("@/features/content/pages/NotFoundPage"));

function LayoutShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function RouteScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousLocation = useRef(location);
  const scrollPositions = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    window.history.scrollRestoration = "manual";

    const previous = previousLocation.current;
    if (previous.key === location.key) return;

    scrollPositions.current.set(previous.key, window.scrollY);
    if (navigationType === "POP") {
      window.scrollTo(0, scrollPositions.current.get(location.key) ?? 0);
    } else if (previous.pathname !== location.pathname) {
      window.scrollTo(0, 0);
    }
    previousLocation.current = location;
  }, [location, navigationType]);

  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <RouteScrollManager />
      <CookieConsentManager />
      <Suspense fallback={<RouteLoadingScreen fullscreen />}>
        <Routes>
          <Route path="/admin" element={<AdminMarketCountersPage />} />
          <Route element={<LayoutShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/biens" element={<ListingsIndexPage />} />
            <Route path="/biens/:idSlug/*" element={<ListingDetailPage />} />
            <Route path="/annonce/:id" element={<LegacyAnnonceRedirect />} />
            <Route path="/biens-immobiliers" element={<Navigate to="/biens" replace />} />
            <Route path="/buy" element={<Navigate to="/biens?transaction=vente" replace />} />
            <Route path="/rent" element={<Navigate to="/biens?transaction=vente" replace />} />
            <Route path="/property/:slug" element={<LegacyPropertySlugRedirect />} />

            <Route path="/apropos" element={<AboutPageV2 />} />
            <Route path="/immobilier/:ville" element={<CityHubPage />} />
            <Route path="/contact" element={<ContactPageV2 />} />
            <Route path="/vendre" element={<SellPage />} />
            <Route path="/estimation" element={<EstimationPageV2 />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/avis" element={<ReviewsPage />} />
            <Route path="/geographie" element={<GeographyPage />} />
            <Route path="/nos-dernieres-ventes" element={<RecentSalesPage />} />
            <Route path="/histoire-immobilier-le-havre" element={<Navigate to="/geographie" replace />} />
            <Route path="/honoraires" element={<FeesPage />} />
            <Route path="/reglementation-immobiliere" element={<RealEstateRegulationsPage />} />
            <Route path="/biens-sauvegardes" element={<SelectionPage />} />
            <Route path="/my-selection" element={<Navigate to="/biens-sauvegardes" replace />} />

            <Route path="/mentions-legales" element={<LegalTextPage page="mentions-legales" />} />
            <Route path="/confidentialite" element={<LegalTextPage page="confidentialite" />} />
            <Route path="/cookies" element={<LegalTextPage page="cookies" />} />
            <Route path="/accessibilite" element={<LegalTextPage page="accessibilite" />} />
            <Route path="/plan-du-site" element={<SiteMapPage />} />

            <Route path="/legal/fees" element={<Navigate to="/honoraires" replace />} />
            <Route path="/legal/privacy" element={<Navigate to="/confidentialite" replace />} />
            <Route path="/legal/cookies" element={<Navigate to="/cookies" replace />} />
            <Route path="/legal/notice" element={<Navigate to="/mentions-legales" replace />} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
