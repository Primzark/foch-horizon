import { Suspense, lazy, useLayoutEffect, useRef } from "react";
import { Maximize2 } from "lucide-react";
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useNavigationType, type Location } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppLayout } from "@/layout/AppLayout";
import { CookieConsentManager } from "@/layout/CookieConsentManager";
import { routePageLoaders } from "@/app/router/routePageLoaders";
import { RouteIntentPrefetcher } from "@/app/router/RouteIntentPrefetcher";

const LegacyAnnonceRedirect = lazy(routePageLoaders.legacyAnnonce);
const LegacyPropertySlugRedirect = lazy(routePageLoaders.legacyProperty);
const HomePage = lazy(routePageLoaders.home);
const ListingsIndexPage = lazy(routePageLoaders.listings);
const ListingDetailPage = lazy(routePageLoaders.listingDetail);
const AboutPageV2 = lazy(routePageLoaders.about);
const CityHubPage = lazy(routePageLoaders.city);
const ContactPageV2 = lazy(routePageLoaders.contact);
const FeesPage = lazy(routePageLoaders.fees);
const RealEstateRegulationsPage = lazy(routePageLoaders.regulations);
const SellPage = lazy(routePageLoaders.sell);
const EstimationPageV2 = lazy(routePageLoaders.estimation);
const ServicesPage = lazy(routePageLoaders.services);
const ReviewsPage = lazy(routePageLoaders.reviews);
const GeographyPage = lazy(routePageLoaders.geography);
const RecentSalesPage = lazy(routePageLoaders.recentSales);
const LegalTextPage = lazy(routePageLoaders.legalText);
const SiteMapPage = lazy(routePageLoaders.siteMap);
const SelectionPage = lazy(routePageLoaders.selection);
const AdminMarketCountersPage = lazy(routePageLoaders.admin);
const NotFoundPage = lazy(routePageLoaders.notFound);

interface PropertyModalRouteState {
  propertyModal?: boolean;
  backgroundLocation?: Location;
  propertyPreview?: unknown;
}

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

function PropertyDetailRouteModal() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as PropertyModalRouteState | null;

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) navigate(-1);
    }}>
      <DialogContent className="left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:left-[50%] sm:top-[50%] sm:h-[min(92dvh,60rem)] sm:max-h-[92dvh] sm:w-[calc(100%-2rem)] sm:max-w-6xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border">
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 pr-16 sm:px-6 sm:pr-20">
          <DialogHeader className="min-w-0 space-y-0 text-left">
            <DialogTitle className="truncate font-display text-lg font-normal sm:text-xl">Aperçu de l’annonce</DialogTitle>
            <DialogDescription className="sr-only">Fiche complète du bien. Ouvrez-la en plein écran pour accéder à toute la page.</DialogDescription>
          </DialogHeader>
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link
              to={`${location.pathname}${location.search}`}
              replace
              state={routeState?.propertyPreview ? { propertyPreview: routeState.propertyPreview } : null}
              aria-label="Ouvrir l’annonce en plein écran"
            >
              <Maximize2 aria-hidden="true" className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Plein écran</span>
            </Link>
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <Suspense
            fallback={(
              <section className="container mx-auto min-h-[60vh] px-4 py-8" aria-busy="true" aria-label="Chargement de l’annonce">
                <div className="mb-4 h-4 w-44 rounded bg-muted" aria-hidden="true" />
                <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
                  <div>
                    <div className="aspect-[16/10] rounded-2xl bg-muted" aria-hidden="true" />
                    <div className="mt-6 h-8 w-2/3 rounded bg-muted" aria-hidden="true" />
                    <div className="mt-3 h-5 w-1/3 rounded bg-muted" aria-hidden="true" />
                  </div>
                  <div className="h-56 rounded-2xl bg-muted" aria-hidden="true" />
                </div>
                <span className="sr-only">Chargement de l’annonce…</span>
              </section>
            )}
          >
            <ListingDetailPage />
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AppRoutes() {
  const location = useLocation();
  const routeState = location.state as PropertyModalRouteState | null;
  const backgroundLocation = routeState?.propertyModal ? routeState.backgroundLocation : undefined;

  return (
    <>
      <Suspense fallback={null}>
        <Routes location={backgroundLocation ?? location}>
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
      {backgroundLocation && routeState?.propertyModal && (
        <Routes>
          <Route path="/biens/:idSlug/*" element={<PropertyDetailRouteModal />} />
        </Routes>
      )}
    </>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <RouteIntentPrefetcher />
      <RouteScrollManager />
      <CookieConsentManager />
      <AppRoutes />
    </BrowserRouter>
  );
}
