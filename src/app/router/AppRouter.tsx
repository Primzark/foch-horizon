import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from "react";
import { Building2, ChevronLeft, Hand, Maximize2 } from "lucide-react";
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useNavigationType, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PropertyModalRouteState } from "@/features/listings/navigation/propertyModalNavigation";
import { formatPrice, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";
import { AppLayout } from "@/layout/AppLayout";
import { CookieConsentManager } from "@/layout/CookieConsentManager";
import { routePageLoaders } from "@/app/router/routePageLoaders";
import { RouteIntentPrefetcher } from "@/app/router/RouteIntentPrefetcher";
import type { PropertySearchResponse, PropertySearchItem } from "@/types/api";

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
  const queryClient = useQueryClient();
  const routeParams = useParams();
  const routeState = location.state as PropertyModalRouteState | null;
  const detailsScrollRef = useRef<HTMLDivElement>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [navigationDirection, setNavigationDirection] = useState<-1 | 1>(1);
  const [stickySummaryPortalElement, setStickySummaryPortalElement] = useState<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const propertyModalDepth = routeState?.propertyModalDepth ?? 0;
  const hasPreviousPropertyModal = propertyModalDepth > 0;
  const propertyId = Number(routeParams.idSlug?.split("-")[0]);
  const budgetItems = routeState?.budgetFinderFilters
    ? queryClient.getQueryData<PropertySearchResponse>(["budget-finder", routeState.budgetFinderFilters])?.items ?? null
    : null;
  const announcementItems = routeState?.announcementItems ?? budgetItems;
  const propertyIndex = announcementItems?.findIndex((item) => item.id === propertyId) ?? -1;
  const previousProperty = announcementItems && propertyIndex > 0 ? announcementItems[propertyIndex - 1] : null;
  const nextProperty = announcementItems && propertyIndex >= 0 && propertyIndex < announcementItems.length - 1
    ? announcementItems[propertyIndex + 1]
    : null;
  const canBrowseAnnouncements = Boolean(previousProperty || nextProperty);
  const announcementSwipeHint = canBrowseAnnouncements ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground lg:hidden">
      <span>Glissez à gauche ou à droite</span>
      <span className="relative inline-flex h-9 w-14 shrink-0 items-center justify-center text-brand-strong/70" aria-hidden="true">
        <span className={`absolute h-6 w-6 rounded-full bg-brand/10 blur-md${prefersReducedMotion ? "" : " announcement-swipe-glow"}`} />
        <span className={`relative${prefersReducedMotion ? "" : " announcement-swipe-hand"}`}>
          <Hand className="h-8 w-8" strokeWidth={1.7} />
        </span>
      </span>
      <span className="sr-only">Vous pouvez aussi utiliser les flèches du clavier.</span>
    </span>
  ) : null;
  const announcementNavigationControls = canBrowseAnnouncements ? (
    <div className="mt-4 hidden justify-end lg:flex">
      <div className="flex items-center gap-2" role="group" aria-label="Navigation entre les annonces">
        {previousProperty && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full border-border bg-background/90 p-0 shadow-sm"
            aria-label="Annonce précédente"
            title="Annonce précédente"
            onClick={() => openProperty(previousProperty, -1)}
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </Button>
        )}
        {nextProperty && (
          <button
            type="button"
            aria-label={`Annonce suivante : ${nextProperty.title}, ${nextProperty.city.name}, ${formatPrice(nextProperty.priceAmount, nextProperty.transaction)}`}
            title="Découvrir l’annonce suivante"
            onClick={() => openProperty(nextProperty, 1)}
            className="flex h-[3.75rem] w-64 items-center gap-2 rounded-xl border border-border bg-background/90 p-1.5 text-left shadow-sm transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-border hover:bg-brand-soft/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {nextProperty.coverImageUrl ? (
              <img
                src={getPropertyImageUrl(nextProperty.coverImageUrl, 200)}
                srcSet={getPropertyImageSrcSet(nextProperty.coverImageUrl, [200, 400])}
                sizes="64px"
                alt=""
                className="h-12 w-16 shrink-0 rounded-lg object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span aria-hidden="true" className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">À suivre</span>
              <span className="block truncate text-xs font-semibold text-foreground">{nextProperty.title}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {nextProperty.city.name} · {formatPrice(nextProperty.priceAmount, nextProperty.transaction)}
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  ) : null;

  const openProperty = (item: PropertySearchItem, direction: -1 | 1) => {
    setNavigationDirection(direction);
    navigate(toCanonicalPropertyPath(item), {
      replace: true,
      state: {
        propertyPreview: item,
        propertyModal: true,
        backgroundLocation: routeState?.backgroundLocation,
        announcementItems,
        announcementTotal: routeState?.announcementTotal,
        announcementMode: routeState?.announcementMode,
        announcementStartPage: routeState?.announcementStartPage,
        announcementEndPage: routeState?.announcementEndPage,
        announcementPageSize: routeState?.announcementPageSize,
        budgetFinderFilters: routeState?.budgetFinderFilters,
        propertyModalDepth,
      },
    });
  };

  useEffect(() => {
    if (detailsScrollRef.current) detailsScrollRef.current.scrollTop = 0;
  }, [location.pathname]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("[data-property-gallery], button, a, input, textarea, select, [contenteditable='true'], [role='button']")
    ) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.changedTouches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

    if (deltaX < 0 && nextProperty) openProperty(nextProperty, 1);
    if (deltaX > 0 && previousProperty) openProperty(previousProperty, -1);
  };

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) navigate(-(propertyModalDepth + 1));
    }}>
      <DialogContent
        ref={dialogContentRef}
        largeCloseButton
        data-menu-swipe-ignore
        onKeyDown={(event) => {
          if (!(event.target instanceof Node) || !dialogContentRef.current?.contains(event.target)) return;
          if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
          if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true']")) return;

          if (event.key === "ArrowLeft" && previousProperty) {
            event.preventDefault();
            openProperty(previousProperty, -1);
          } else if (event.key === "ArrowRight" && nextProperty) {
            event.preventDefault();
            openProperty(nextProperty, 1);
          }
        }}
        className="left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:left-[50%] sm:top-[50%] sm:h-[min(92dvh,60rem)] sm:max-h-[92dvh] sm:w-[calc(100%-2rem)] sm:max-w-none sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border"
      >
        <div className="relative flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4 pr-16 sm:gap-3 sm:px-6 sm:pr-20">
          <DialogHeader className="min-w-0 max-w-[50%] space-y-0 text-left sm:max-w-none">
            <DialogTitle className="sr-only">{routeState?.propertyPreview?.title ?? "Annonce immobilière"}</DialogTitle>
            <DialogDescription className="sr-only">Fiche complète du bien. Ouvrez-la en plein écran pour accéder à toute la page.</DialogDescription>
          </DialogHeader>
          <Button variant="outline" size="sm" className="absolute left-1/2 top-1/2 z-[1] shrink-0 -translate-x-1/2 -translate-y-1/2" asChild>
            <Link
              to={`${location.pathname}${location.search}`}
              replace
              state={routeState ? { ...routeState, propertyModal: false } : null}
              aria-label="Ouvrir l’annonce en plein écran"
            >
              <Maximize2 aria-hidden="true" className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Plein écran</span>
            </Link>
          </Button>
          <div className="ml-auto flex shrink-0 items-center">
            {hasPreviousPropertyModal && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 px-2 sm:px-3"
                aria-label="Revenir à l’annonce précédente"
                title="Revenir à l’annonce précédente"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4 sm:-ml-1" />
                <span className="hidden sm:inline">Retour</span>
              </Button>
            )}
          </div>
        </div>
        <div ref={setStickySummaryPortalElement} className="pointer-events-none absolute inset-0 z-50" />
        <div
          ref={detailsScrollRef}
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => { touchStartRef.current = null; }}
        >
          <AnimatePresence mode="wait" initial={false} custom={navigationDirection}>
            <motion.div
              key={location.pathname}
              custom={navigationDirection}
              variants={{
                enter: (direction: number) => ({ opacity: 0, x: direction * 36 }),
                center: { opacity: 1, x: 0 },
                exit: (direction: number) => ({ opacity: 0, x: direction * -36 }),
              }}
              initial={prefersReducedMotion ? "center" : "enter"}
              animate="center"
              exit={prefersReducedMotion ? "center" : "exit"}
              transition={{ duration: prefersReducedMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <Suspense
                fallback={(
                  <section className="container mx-auto min-h-[60vh] px-4 pt-4 pb-8" aria-busy="true" aria-label="Chargement de l’annonce">
                    <div className="mb-4 h-4 w-44 rounded bg-muted" aria-hidden="true" />
                    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
                      <div>
                        <div className="aspect-[16/9] rounded-2xl bg-muted" aria-hidden="true" />
                        <div className="mt-6 h-8 w-2/3 rounded bg-muted" aria-hidden="true" />
                        <div className="mt-3 h-5 w-1/3 rounded bg-muted" aria-hidden="true" />
                      </div>
                      <div className="h-56 rounded-2xl bg-muted" aria-hidden="true" />
                    </div>
                    <span className="sr-only">Chargement de l’annonce…</span>
                  </section>
                )}
              >
                <ListingDetailPage
                  announcementSwipeHint={announcementSwipeHint}
                  announcementNavigationControls={announcementNavigationControls}
                  stickySummaryPortalElement={stickySummaryPortalElement}
                  stickySummaryTop={64}
                  previewLayout
                />
              </Suspense>
            </motion.div>
          </AnimatePresence>
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
