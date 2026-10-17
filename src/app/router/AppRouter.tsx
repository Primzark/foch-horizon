import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useNavigationType, useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { PropertyModalRouteState } from "@/features/listings/navigation/propertyModalNavigation";
import { AppLayout } from "@/layout/AppLayout";
import { CookieConsentManager } from "@/layout/CookieConsentManager";
import { routePageLoaders } from "@/app/router/routePageLoaders";
import { RouteIntentPrefetcher } from "@/app/router/RouteIntentPrefetcher";
import { useIsMobileOrTablet } from "@/hooks/use-mobile";

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
const AdminPropertiesPage = lazy(routePageLoaders.admin);
const NotFoundPage = lazy(routePageLoaders.notFound);

function LayoutShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const SCROLL_POSITIONS_STORAGE_KEY = "foch:scroll-positions:v1";

function readSavedScrollPositions(): Map<string, number> {
  if (typeof window === "undefined") return new Map();

  try {
    const stored = window.sessionStorage.getItem(SCROLL_POSITIONS_STORAGE_KEY);
    if (!stored) return new Map();
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    return new Map(
      Object.entries(parsed)
        .filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]))
        .slice(-80),
    );
  } catch {
    return new Map();
  }
}

function rememberScrollPosition(positions: Map<string, number>, key: string, top: number) {
  positions.delete(key);
  positions.set(key, top);
  while (positions.size > 80) {
    const oldestKey = positions.keys().next().value;
    if (oldestKey === undefined) break;
    positions.delete(oldestKey);
  }
}

function saveScrollPositions(positions: Map<string, number>) {
  try {
    window.sessionStorage.setItem(SCROLL_POSITIONS_STORAGE_KEY, JSON.stringify(Object.fromEntries(positions)));
  } catch {
    // Scroll restoration remains available in memory if storage is unavailable.
  }
}

function RouteScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousLocation = useRef(location);
  const scrollPositions = useRef(readSavedScrollPositions());
  const activeLocationKey = useRef(location.key);
  const restoreTimer = useRef<number | null>(null);
  const isRestoringScroll = useRef(false);

  useEffect(() => {
    let animationFrame: number | null = null;
    const saveCurrentPosition = () => {
      if (isRestoringScroll.current) return;
      rememberScrollPosition(scrollPositions.current, activeLocationKey.current, window.scrollY);
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        saveScrollPositions(scrollPositions.current);
      });
    };
    const saveBeforePageHide = () => {
      rememberScrollPosition(scrollPositions.current, activeLocationKey.current, window.scrollY);
      saveScrollPositions(scrollPositions.current);
    };
    const cancelRestoreOnUserInput = () => {
      if (restoreTimer.current !== null) {
        window.clearTimeout(restoreTimer.current);
        restoreTimer.current = null;
      }
      isRestoringScroll.current = false;
    };

    window.addEventListener("scroll", saveCurrentPosition, { passive: true });
    window.addEventListener("pagehide", saveBeforePageHide);
    window.addEventListener("wheel", cancelRestoreOnUserInput, { passive: true });
    window.addEventListener("touchstart", cancelRestoreOnUserInput, { passive: true });
    window.addEventListener("keydown", cancelRestoreOnUserInput);

    return () => {
      window.removeEventListener("scroll", saveCurrentPosition);
      window.removeEventListener("pagehide", saveBeforePageHide);
      window.removeEventListener("wheel", cancelRestoreOnUserInput);
      window.removeEventListener("touchstart", cancelRestoreOnUserInput);
      window.removeEventListener("keydown", cancelRestoreOnUserInput);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      if (restoreTimer.current !== null) window.clearTimeout(restoreTimer.current);
      restoreTimer.current = null;
      isRestoringScroll.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    window.history.scrollRestoration = "manual";

    const previous = previousLocation.current;
    if (previous.key === location.key) return;

    activeLocationKey.current = location.key;
    previousLocation.current = location;

    if (restoreTimer.current !== null) {
      window.clearTimeout(restoreTimer.current);
      restoreTimer.current = null;
    }
    isRestoringScroll.current = false;

    if (navigationType === "POP") {
      const savedTop = scrollPositions.current.get(location.key) ?? 0;
      let attempts = 0;
      isRestoringScroll.current = true;
      const restorePosition = () => {
        const root = document.documentElement;
        const previousScrollBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        window.scrollTo(0, savedTop);
        root.style.scrollBehavior = previousScrollBehavior;

        if (Math.abs(window.scrollY - savedTop) <= 1 || attempts >= 24) {
          if (Math.abs(window.scrollY - savedTop) <= 1) {
            rememberScrollPosition(scrollPositions.current, location.key, savedTop);
            saveScrollPositions(scrollPositions.current);
          }
          restoreTimer.current = null;
          isRestoringScroll.current = false;
          return;
        }

        attempts += 1;
        restoreTimer.current = window.setTimeout(restorePosition, 100);
      };
      restorePosition();
    } else if (previous.pathname !== location.pathname) {
      window.scrollTo(0, 0);
    }
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
        hideCloseButton
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
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pb-[calc(6rem_+_env(safe-area-inset-bottom))] desktop:pb-0"
        >
          <Suspense
            key={propertyReference}
            fallback={(
              <section className="container mx-auto min-h-[60vh] px-4 pt-4 pb-8" aria-busy="true" aria-label="Chargement de l’annonce">
                <div className="mb-4 h-4 w-44 rounded bg-muted" aria-hidden="true" />
                <div className="grid min-w-0 grid-cols-1 gap-8 desktop:grid-cols-[minmax(0,1fr)_340px]">
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
              scrollContainerRef={detailsScrollRef}
            />
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isMobileOrTablet = useIsMobileOrTablet();
  const routeState = location.state as PropertyModalRouteState | null;
  const showPropertyModal = isMobileOrTablet && Boolean(routeState?.propertyModal && routeState.backgroundLocation);
  const backgroundLocation = showPropertyModal ? routeState?.backgroundLocation : undefined;

  return (
    <>
      <Suspense fallback={null}>
        <Routes location={backgroundLocation ?? location}>
          <Route path="/admin" element={<AdminPropertiesPage />} />
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
      {showPropertyModal && backgroundLocation && (
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
