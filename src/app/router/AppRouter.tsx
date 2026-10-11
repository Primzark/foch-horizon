import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useNavigationType, useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { PropertyModalRouteState } from "@/features/listings/navigation/propertyModalNavigation";
import { AppLayout } from "@/layout/AppLayout";
import { CookieConsentManager } from "@/layout/CookieConsentManager";
import { routePageLoaders } from "@/app/router/routePageLoaders";
import { RouteIntentPrefetcher } from "@/app/router/RouteIntentPrefetcher";

const LegacyAnnonceRedirect = lazy(routePageLoaders.legacyAnnonce);
const LegacyPropertySlugRedirect = lazy(routePageLoaders.legacyProperty);
const HomePage = lazy(routePageLoaders.home);
const ListingsIndexPage = lazy(routePageLoaders.listings);
const ListingDetailPage = lazy(routePageLoaders.listingDetail);
const PropertyComparePage = lazy(routePageLoaders.propertyCompare);
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
  const routeParams = useParams();
  const routeState = location.state as PropertyModalRouteState | null;
  const detailsScrollRef = useRef<HTMLDivElement>(null);
  const [stickySummaryPortalElement, setStickySummaryPortalElement] = useState<HTMLDivElement | null>(null);
  const propertyModalDepth = routeState?.propertyModalDepth ?? 0;
  const propertyId = Number(routeParams.idSlug?.split("-")[0]);
  const propertyReference = Number.isInteger(propertyId) && propertyId > 0 ? propertyId : null;

  useEffect(() => {
    if (detailsScrollRef.current) detailsScrollRef.current.scrollTop = 0;
  }, [location.pathname]);

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) navigate(-(propertyModalDepth + 1));
    }}>
      <DialogContent
        largeCloseButton
        overlayClassName="bg-black/45"
        data-menu-swipe-ignore
        className="left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:left-[50%] sm:top-[50%] sm:h-[min(92dvh,64rem)] sm:max-h-[92dvh] sm:w-[calc(100%-1rem)] sm:max-w-none lg:w-[min(92vw,88rem)] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border"
      >
        <DialogTitle className="sr-only">Annonce · Réf {propertyReference ?? "—"}</DialogTitle>
        <DialogDescription className="sr-only">
          Fiche annonce avec photos, description, caractéristiques et contact agence.
        </DialogDescription>
        <div ref={setStickySummaryPortalElement} className="pointer-events-none absolute inset-0 z-50" />
        <div
          ref={detailsScrollRef}
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain"
        >
          <Suspense
            key={propertyReference}
            fallback={(
              <section className="container mx-auto min-h-[60vh] px-4 pt-4 pb-8" aria-busy="true" aria-label="Chargement de l’annonce">
                <div className="mb-4 h-4 w-44 rounded bg-muted" aria-hidden="true" />
                <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0">
                    <div className="aspect-[16/9] rounded-2xl bg-muted" aria-hidden="true" />
                    <div className="mt-6 h-8 w-2/3 rounded bg-muted" aria-hidden="true" />
                    <div className="mt-3 h-5 w-1/3 rounded bg-muted" aria-hidden="true" />
                  </div>
                  <div className="h-56 min-w-0 rounded-2xl bg-muted" aria-hidden="true" />
                </div>
                <span className="sr-only">Chargement de l’annonce…</span>
              </section>
            )}
          >
            <ListingDetailPage
              stickySummaryPortalElement={stickySummaryPortalElement}
              stickySummaryTop={0}
              previewLayout
            />
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
            <Route path="/biens/comparer" element={<PropertyComparePage />} />
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
