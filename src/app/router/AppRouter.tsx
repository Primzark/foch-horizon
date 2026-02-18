import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { LegacyAnnonceRedirect, LegacyPropertySlugRedirect, QueryRedirect } from "@/app/router/LegacyRedirects";
import { RouteLoadingScreen } from "@/components/ui/RouteLoadingScreen";

const HomePage = lazy(() => import("@/features/content/pages/HomePage"));
const ListingsIndexPage = lazy(() => import("@/features/listings/pages/ListingsIndexPage"));
const ListingDetailPage = lazy(() => import("@/features/listings/pages/ListingDetailPage"));
const AboutPageV2 = lazy(() => import("@/features/content/pages/AboutPageV2"));
const CityHubPage = lazy(() => import("@/features/cities/pages/CityHubPage"));
const ContactPageV2 = lazy(() => import("@/features/content/pages/ContactPageV2"));
const FeesPage = lazy(() => import("@/features/content/pages/FeesPage"));
const SellPage = lazy(() => import("@/features/content/pages/SellPage"));
const EstimationPageV2 = lazy(() => import("@/features/content/pages/EstimationPageV2"));
const ServicesPage = lazy(() => import("@/features/content/pages/ServicesPage"));
const LegalTextPage = lazy(() => import("@/features/content/pages/LegalTextPage"));
const SiteMapPage = lazy(() => import("@/features/content/pages/SiteMapPage"));
const SelectionPage = lazy(() => import("@/features/favorites/pages/SelectionPage"));
const NotFoundPage = lazy(() => import("@/features/content/pages/NotFoundPage"));

function LayoutShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingScreen fullscreen />}>
        <Routes>
          <Route element={<LayoutShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/biens" element={<ListingsIndexPage />} />
            <Route path="/biens/:idSlug/*" element={<ListingDetailPage />} />
            <Route path="/annonce/:id" element={<LegacyAnnonceRedirect />} />
            <Route path="/biens-immobiliers" element={<Navigate to="/biens" replace />} />
            <Route path="/buy" element={<QueryRedirect to="/biens?transaction=vente" />} />
            <Route path="/rent" element={<QueryRedirect to="/biens?transaction=location" />} />
            <Route path="/property/:slug" element={<LegacyPropertySlugRedirect />} />

            <Route path="/apropos" element={<AboutPageV2 />} />
            <Route path="/immobilier/:ville" element={<CityHubPage />} />
            <Route path="/contact" element={<ContactPageV2 />} />
            <Route path="/vendre" element={<SellPage />} />
            <Route path="/estimation" element={<EstimationPageV2 />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/honoraires" element={<FeesPage />} />
            <Route path="/my-selection" element={<SelectionPage />} />

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
