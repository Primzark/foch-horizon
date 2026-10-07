import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useScroll } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Bath, BedDouble, Car, ChevronLeft, Copy, Heart, MapPin, Maximize, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cityById, cityBySlug } from "@/features/cities/data/cities";
import { getPropertyById, getSimilarProperties, searchProperties } from "@/features/listings/api/properties.service";
import { ListingGallery } from "@/features/listings/components/ListingGallery";
import { PropertyPreviewLink } from "@/features/listings/components/PropertyPreviewLink";
import { ListingShareButton } from "@/features/listings/components/ListingShareButton";
import { PropertyCompareToggle } from "@/features/listings/components/PropertyCompareToggle";
import DpeBadge from "@/components/property/DpeBadge";
import { agentById } from "@/features/listings/data/agents";
import { geographyGuideOptions } from "@/features/content/data/geographyGuideOptions";
import { toSearchItem } from "@/features/listings/utils/mappers";
import { LeadForm } from "@/features/leads/components/LeadForm";
import {
  formatPrice,
  formatPropertyTypeLabel,
  getPropertyStatusLabel,
  normalizeKeyword,
  sanitizePropertySlug,
  toCanonicalPropertyPath,
} from "@/features/listings/utils/formatting";
import { useFavoritesStore } from "@/features/favorites/useFavoritesStore";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import { trackEvent } from "@/lib/analytics/events";
import { useUiStore } from "@/lib/state/useUiStore";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";
import { buildSearchParams, parseSearchParams } from "@/features/listings/utils/query";
import type { PropertySearchItem } from "@/types/api";
import type { Property } from "@/types/domain";
import type { PropertyModalRouteState } from "@/features/listings/navigation/propertyModalNavigation";

function parseRouteIdAndSlug(rawIdSlug?: string): { id: number; slug: string | null } | null {
  if (!rawIdSlug) {
    return null;
  }

  const [rawId, ...slugParts] = rawIdSlug.split("-");
  const id = Number(rawId);

  if (!Number.isInteger(id)) {
    return null;
  }

  const slug = slugParts.length > 0 ? slugParts.join("-") : null;
  return { id, slug };
}

function getNavigationPreview(state: unknown, propertyId: number | null): PropertySearchItem | null {
  if (!state || typeof state !== "object" || propertyId == null) return null;

  const preview = (state as { propertyPreview?: unknown }).propertyPreview;
  if (!preview || typeof preview !== "object") return null;

  const item = preview as Partial<PropertySearchItem>;
  if (
    item.id !== propertyId ||
    typeof item.title !== "string" ||
    typeof item.slug !== "string" ||
    (item.transaction !== "vente" && item.transaction !== "location") ||
    (item.type !== "appartement" && item.type !== "maison_villa" && item.type !== "autre") ||
    !item.status ||
    (item.status !== "active" && item.status !== "under_offer" && item.status !== "sold" && item.status !== "rented" && item.status !== "off_market") ||
    typeof item.priceAmount !== "number" ||
    item.currency !== "EUR" ||
    typeof item.surfaceM2 !== "number" ||
    typeof item.coverImageUrl !== "string" ||
    !item.city ||
    typeof item.city.name !== "string" ||
    typeof item.city.slug !== "string" ||
    typeof item.city.postalCode !== "string"
  ) {
    return null;
  }

  return item as PropertySearchItem;
}

function toPropertyPreview(item: PropertySearchItem): Property {
  const imageUrl = item.coverImageUrl.trim();

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    transactionType: item.transaction,
    propertyType: item.type,
    status: item.status,
    sourceStatus: null,
    priceAmount: item.priceAmount,
    priceCurrency: item.currency,
    surfaceM2: item.surfaceM2,
    terrainM2: null,
    rooms: item.rooms ?? null,
    bedrooms: item.bedrooms ?? null,
    bathrooms: item.bathrooms ?? null,
    parkingCount: item.parking ?? null,
    garageCount: item.garage ?? null,
    dpeLabel: item.dpeLabel ?? null,
    dpeValue: null,
    gesLabel: null,
    gesValue: null,
    description: "",
    cityId: cityBySlug.get(item.city.slug)?.id ?? "city-le-havre",
    postalCode: item.city.postalCode,
    lat: null,
    lng: null,
    agentId: "",
    publishedAt: "",
    updatedAt: "",
    isFeatured: false,
    images: imageUrl
      ? [{ id: `${item.id}-preview`, propertyId: item.id, sourceUrl: imageUrl, sortOrder: 0, altText: item.title }]
      : [],
    features: [],
  };
}

function getSimilarSearchHref(property: Property): string {
  const priceMin = Math.floor((property.priceAmount * 0.75) / 1_000) * 1_000;
  const priceMax = Math.ceil((property.priceAmount * 1.25) / 1_000) * 1_000;
  const params = buildSearchParams({
    transaction: property.transactionType,
    type: property.propertyType,
    city: cityById.get(property.cityId)?.slug,
    priceMin,
    priceMax,
    page: 1,
    sort: "newest",
  });

  return `/biens?${params.toString()}`;
}

function getRecommendationFacts(item: PropertySearchItem): string {
  const roomFact = item.rooms != null && item.rooms > 0
    ? `${item.rooms} pièce${item.rooms > 1 ? "s" : ""}`
    : item.bedrooms != null
      ? `${item.bedrooms} chambre${item.bedrooms > 1 ? "s" : ""}`
      : null;
  const facts = [roomFact, item.surfaceM2 > 0 ? `${item.surfaceM2} m²` : null].filter(Boolean);

  return facts.join(" · ");
}

function getRecommendationLocation(item: PropertySearchItem): string {
  const propertyWords = normalizeKeyword(`${item.title} ${item.slug}`).replace(/[^a-z0-9]+/g, " ").trim();
  const matchingGuide = geographyGuideOptions
    .map((guide) => ({ guide, phrase: "query" in guide && guide.query ? guide.query : guide.name }))
    .filter(({ phrase }) => phrase.length >= 4 && propertyWords.includes(normalizeKeyword(phrase).replace(/[^a-z0-9]+/g, " ").trim()))
    .sort((left, right) => right.phrase.length - left.phrase.length)[0];
  const sector = matchingGuide?.guide.id === "la-plage"
    ? "Saint-Vincent"
    : matchingGuide?.guide.name.replace(/^(Le|La|Les)\s+/i, "");

  return `${sector ?? item.city.name}${item.city.postalCode ? ` · ${item.city.postalCode}` : ""}`;
}

export default function ListingDetailPage({
  announcementSwipeHint,
  announcementNavigationControls,
  stickySummaryPortalElement = null,
  stickySummaryTop = 88,
  previewLayout = false,
}: {
  announcementSwipeHint?: ReactNode;
  announcementNavigationControls?: ReactNode;
  stickySummaryPortalElement?: HTMLElement | null;
  stickySummaryTop?: number;
  previewLayout?: boolean;
} = {}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef<HTMLDivElement | null>(null);
  const trackedPropertyViewId = useRef<number | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [contactVisible, setContactVisible] = useState(false);
  const cookieConsent = useUiStore((state) => state.cookieConsent);
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as PropertyModalRouteState | null;
  const backgroundListingSearch = routeState?.backgroundLocation?.pathname === "/biens"
    ? routeState.backgroundLocation.search
    : null;
  const sourceSearchParams = useMemo(
    () => backgroundListingSearch != null ? parseSearchParams(new URLSearchParams(backgroundListingSearch)) : null,
    [backgroundListingSearch],
  );
  const comparisonOrigin = (location.state as { comparisonOrigin?: unknown } | null)?.comparisonOrigin === true;
  const params = useParams();
  const favoriteIds = useFavoritesStore((state) => state.ids);
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const { reducedMotion } = useMotionPreference();
  const parsedRoute = parseRouteIdAndSlug(params.idSlug);
  const propertyId = parsedRoute?.id ?? null;
  const siteUrl = getSiteUrl();
  const { scrollYProgress } = useScroll({
    target: contentRef,
    offset: ["start start", "end end"],
  });

  const navigationPreview = getNavigationPreview(location.state, propertyId);
  const previewProperty = useMemo(
    () => (navigationPreview ? toPropertyPreview(navigationPreview) : undefined),
    [navigationPreview],
  );
  const propertyQuery = useQuery({
    queryKey: ["property", propertyId],
    enabled: propertyId != null,
    queryFn: () => getPropertyById(propertyId as number),
    placeholderData: previewProperty,
  });

  const similarQuery = useQuery({
    queryKey: ["similar", propertyId],
    queryFn: () =>
      propertyQuery.data && !propertyQuery.isPlaceholderData
        ? getSimilarProperties(propertyQuery.data, 3)
        : Promise.resolve([]),
    enabled: Boolean(propertyQuery.data && !propertyQuery.isPlaceholderData),
  });
  const similarItems = useMemo(
    () => (similarQuery.data ?? []).map(({ property: similarProperty }) => toSearchItem(similarProperty)),
    [similarQuery.data],
  );
  const similarReasons = useMemo(
    () => new Map((similarQuery.data ?? []).map(({ property: similarProperty, reason }) => [similarProperty.id, reason])),
    [similarQuery.data],
  );

  const property = propertyQuery.data;
  const announcementItems = routeState?.announcementItems;
  const announcementIndex = announcementItems?.findIndex((item) => item.id === propertyId) ?? -1;
  const hasAnnouncementPosition = Boolean(announcementItems && announcementIndex >= 0);
  const navigationMode: "selection" | "similar" = hasAnnouncementPosition && routeState?.announcementMode !== "similar"
    ? "selection"
    : "similar";
  const similarBrowseItems = property ? [toSearchItem(property), ...similarItems] : similarItems;
  const navigationItems = hasAnnouncementPosition && announcementItems ? announcementItems : similarBrowseItems;
  const navigationIndex = navigationItems.findIndex((item) => item.id === propertyId);
  const startPage = routeState?.announcementStartPage ?? sourceSearchParams?.page ?? 1;
  const endPage = routeState?.announcementEndPage ?? sourceSearchParams?.page ?? 1;
  const pageSize = routeState?.announcementPageSize ?? sourceSearchParams?.pageSize ?? 12;
  const navigationTotal = routeState?.announcementTotal ?? navigationItems.length;
  const shouldLoadPreviousPage = !previewLayout
    && navigationMode === "selection"
    && sourceSearchParams != null
    && navigationIndex >= 0
    && navigationIndex <= 1
    && startPage > 1;
  const shouldLoadNextPage = !previewLayout
    && navigationMode === "selection"
    && sourceSearchParams != null
    && navigationIndex >= Math.max(0, navigationItems.length - 2)
    && endPage * pageSize < navigationTotal;
  const previousPageParams = shouldLoadPreviousPage && sourceSearchParams
    ? { ...sourceSearchParams, page: startPage - 1, pageSize }
    : null;
  const nextPageParams = shouldLoadNextPage && sourceSearchParams
    ? { ...sourceSearchParams, page: endPage + 1, pageSize }
    : null;
  const previousPageQuery = useQuery({
    queryKey: ["property-detail-navigation-page", "previous", previousPageParams],
    queryFn: () => searchProperties(previousPageParams!),
    enabled: previousPageParams != null,
    staleTime: 5 * 60 * 1000,
  });
  const nextPageQuery = useQuery({
    queryKey: ["property-detail-navigation-page", "next", nextPageParams],
    queryFn: () => searchProperties(nextPageParams!),
    enabled: nextPageParams != null,
    staleTime: 5 * 60 * 1000,
  });
  const previousPageItems = previousPageQuery.data?.items ?? [];
  const nextPageItems = nextPageQuery.data?.items ?? [];
  const previousPageProperty = previousPageItems[previousPageItems.length - 1];
  const nextPageProperty = nextPageItems[0];
  const previousProperty = navigationIndex > 0
    ? navigationItems[navigationIndex - 1]
    : navigationMode === "selection" ? previousPageProperty : undefined;
  const nextProperty = navigationIndex >= 0 && navigationIndex < navigationItems.length - 1
    ? navigationItems[navigationIndex + 1]
    : navigationMode === "selection" ? nextPageProperty : undefined;
  const nextPropertyToDiscover = nextProperty;
  const discoveryBrowseItems = navigationItems;
  const navigationPosition = navigationMode === "selection"
    ? Math.min(navigationTotal, (startPage - 1) * pageSize + navigationIndex + 1)
    : navigationIndex + 1;
  const navigationCount = navigationMode === "selection" ? navigationTotal : navigationItems.length;
  const navigationContextReady = navigationItems.length > 1 || previousPageQuery.isFetching || nextPageQuery.isFetching;

  const getFullPageNavigationState = (item: PropertySearchItem): PropertyModalRouteState => {
    const isPreviousPageItem = previousPageProperty?.id === item.id;
    const isNextPageItem = nextPageProperty?.id === item.id;
    const mergedItems = isPreviousPageItem
      ? [...previousPageItems, ...navigationItems.filter((existing) => !previousPageItems.some((previous) => previous.id === existing.id))]
      : isNextPageItem
        ? [...navigationItems, ...nextPageItems.filter((next) => !navigationItems.some((existing) => existing.id === next.id))]
        : navigationItems;
    const nextStartPage = isPreviousPageItem ? previousPageQuery.data?.page ?? Math.max(1, startPage - 1) : startPage;
    const nextEndPage = isNextPageItem ? nextPageQuery.data?.page ?? endPage + 1 : endPage;

    return {
      propertyModal: false,
      propertyPreview: item,
      ...(routeState?.backgroundLocation ? { backgroundLocation: routeState.backgroundLocation } : {}),
      announcementItems: mergedItems,
      announcementTotal: previousPageQuery.data?.total ?? nextPageQuery.data?.total ?? navigationTotal,
      announcementMode: navigationMode,
      ...(navigationMode === "selection" ? {
        announcementStartPage: nextStartPage,
        announcementEndPage: nextEndPage,
        announcementPageSize: previousPageQuery.data?.pageSize ?? nextPageQuery.data?.pageSize ?? pageSize,
      } : {}),
      ...(routeState?.budgetFinderFilters ? { budgetFinderFilters: routeState.budgetFinderFilters } : {}),
    };
  };

  const navigationStatus = navigationMode === "selection" ? "Dans votre sélection" : "Biens similaires";
  const fullPageNavigationControls = !previewLayout && navigationContextReady ? (
    <section className="mt-4 rounded-2xl border border-border bg-muted/20 p-3 sm:p-4" aria-label="Navigation entre les annonces">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{navigationStatus}</p>
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {navigationPosition > 0 ? `${navigationPosition} / ${navigationCount}` : ""}
        </p>
      </div>
      <div className="mt-3 flex items-stretch gap-2">
        {previousProperty && (
          <Link
            to={toCanonicalPropertyPath(previousProperty)}
            replace
            state={getFullPageNavigationState(previousProperty)}
            aria-label="Annonce précédente"
            className="inline-flex min-h-[4.25rem] w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:border-brand-border hover:bg-brand-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto sm:gap-2 sm:px-4"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            <span className="hidden text-sm font-medium sm:inline">Précédent</span>
          </Link>
        )}
        {nextProperty ? (
          <Link
            to={toCanonicalPropertyPath(nextProperty)}
            replace
            state={getFullPageNavigationState(nextProperty)}
            aria-label={`Annonce suivante : ${nextProperty.title}, ${nextProperty.city.name}, ${formatPrice(nextProperty.priceAmount, nextProperty.transaction)}`}
            className="group flex min-h-[4.25rem] min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-background p-2 text-left transition-[border-color,background-color,box-shadow] duration-200 hover:border-brand-border hover:bg-brand-soft/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              <span aria-hidden="true" className="h-12 w-16 shrink-0 rounded-lg bg-muted" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">À suivre</span>
              <span className="block truncate text-sm font-semibold text-foreground">{nextProperty.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {nextProperty.city.name} · {formatPrice(nextProperty.priceAmount, nextProperty.transaction)}
              </span>
            </span>
            <ArrowRight aria-hidden="true" className="mr-1 h-4 w-4 shrink-0 text-brand-strong transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : previousPageQuery.isFetching || nextPageQuery.isFetching ? (
          <div className="flex min-h-[4.25rem] min-w-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground" aria-live="polite">
            Chargement de la suite…
          </div>
        ) : navigationMode === "selection" && navigationPosition > 0 ? (
          <div className="flex min-h-[4.25rem] min-w-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            Fin de la sélection
          </div>
        ) : null}
      </div>
    </section>
  ) : null;
  useEffect(() => {
    if (cookieConsent !== "accepted" || !property || property.status !== "active" || propertyQuery.isPlaceholderData) return;
    if (trackedPropertyViewId.current === property.id) return;

    trackedPropertyViewId.current = property.id;
    trackEvent("property_view", { property_id: property.id });
  }, [cookieConsent, property, propertyQuery.isPlaceholderData]);

  const trackComparisonContactClick = (method: "sticky_contact" | "phone" | "email") => {
    if (!comparisonOrigin || !property) return;
    trackEvent("comparison_contact_click", { property_id: property.id, method });
  };
  const isFavorite = property ? favoriteIds.includes(property.id) : false;
  const secondarySimilarItems = similarItems
    .filter((item) => item.id !== nextPropertyToDiscover?.id)
    .slice(0, 3);
  const similarSearchHref = property ? getSimilarSearchHref(property) : null;

  useEffect(() => {
    const summary = summaryRef.current;
    const contact = contactRef.current;
    if (!summary || !contact) return;

    if (typeof IntersectionObserver === "undefined") {
      setSummaryVisible(false);
      setContactVisible(false);
      return;
    }

    setSummaryVisible(true);
    setContactVisible(false);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === summary) setSummaryVisible(entry.isIntersecting);
          if (entry.target === contact) setContactVisible(entry.isIntersecting);
        });
      },
      { rootMargin: `-${stickySummaryTop}px 0px 0px 0px`, threshold: 0 },
    );

    observer.observe(summary);
    observer.observe(contact);
    return () => observer.disconnect();
  }, [property?.id, stickySummaryTop]);

  const canonicalPath = property ? toCanonicalPropertyPath({ id: property.id, slug: property.slug }) : null;
  const showStickySummary = Boolean(property && !summaryVisible && !contactVisible);

  const discoveryCardContent = nextPropertyToDiscover ? (
    <>
      {nextPropertyToDiscover.coverImageUrl && (
        <img
          src={getPropertyImageUrl(nextPropertyToDiscover.coverImageUrl, 1200)}
          srcSet={getPropertyImageSrcSet(nextPropertyToDiscover.coverImageUrl)}
          sizes="(max-width: 767px) calc(100vw - 2rem), 1000px"
          alt=""
          className="absolute inset-0 h-full w-full scale-[1.015] object-cover opacity-45 saturate-[0.82] transition-[opacity,transform,filter] duration-1000 ease-out group-hover:scale-100 group-hover:opacity-80 group-hover:saturate-100 motion-reduce:transition-none"
          loading="lazy"
          decoding="async"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/38 to-black/15 transition-opacity duration-700 group-hover:opacity-70 motion-reduce:transition-none" />
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">{getRecommendationLocation(nextPropertyToDiscover)} · {nextPropertyToDiscover.surfaceM2} m²</p>
          <h3 className="mt-2 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">{nextPropertyToDiscover.title}</h3>
          <p className="mt-2 text-lg font-medium text-white/90">{formatPrice(nextPropertyToDiscover.priceAmount, nextPropertyToDiscover.transaction)}</p>
        </div>
        <span className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-background px-5 text-sm font-semibold text-foreground transition-colors duration-300 group-hover:bg-brand-soft group-focus-visible:bg-brand-soft sm:self-auto">
          Découvrir
          <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
        </span>
      </div>
    </>
  ) : null;

  const stickySummary = property && showStickySummary ? (
    <div className="pointer-events-auto fixed inset-x-3 bottom-[calc(4rem_+_env(safe-area-inset-bottom))] z-[105] mx-auto max-w-3xl lg:hidden">
      <div className="flex min-w-0 items-center gap-2 rounded-full border border-border/80 bg-background/95 p-1.5 pl-3 shadow-lg backdrop-blur-md">
        <p className="shrink-0 text-[13px] font-semibold tracking-tight text-brand-strong">
          {formatPrice(property.priceAmount, property.transactionType)}
        </p>
        <span aria-hidden="true" className="h-4 shrink-0 border-l border-border" />
        <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
          {[
            property.rooms != null ? `${property.rooms} pièce${property.rooms > 1 ? "s" : ""}` : null,
            `${property.surfaceM2} m²`,
          ].filter(Boolean).join(" · ")}
        </p>
        <Button
          type="button"
          variant="brand"
          size="sm"
          className="h-9 shrink-0 rounded-full px-3 text-xs"
          onClick={() => {
            contactRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
            trackEvent("listing_viewed", { propertyId: property.id, action: "sticky_contact" });
            trackComparisonContactClick("sticky_contact");
          }}
        >
          Contacter
        </Button>
      </div>
    </div>
  ) : null;

  useSeo(
    property && !propertyQuery.isPlaceholderData
      ? {
          title: `${property.title} – ${cityById.get(property.cityId)?.name ?? "Le Havre"} – Prix ${formatPrice(
            property.priceAmount,
            property.transactionType,
          )} – Réf ${property.id}`,
          description: `${property.description.slice(0, 150)}…`,
          canonicalPath,
          image: property.images[0]?.sourceUrl,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: property.title,
            url: `${siteUrl}${canonicalPath}`,
            identifier: String(property.id),
            image: property.images.map((image) => image.sourceUrl),
            description: property.description,
            datePosted: property.publishedAt,
            dateModified: property.updatedAt,
            publisher: { "@id": `${siteUrl}/#agency` },
            about: cityById.get(property.cityId) ? { "@id": `${siteUrl}/immobilier/${cityById.get(property.cityId)!.slug}#place`, "@type": "City", name: cityById.get(property.cityId)!.name } : undefined,
            mainEntity: {
              "@type": property.propertyType === "appartement" ? "Apartment" : property.propertyType === "maison_villa" ? "House" : "Accommodation",
              "@id": `${siteUrl}${canonicalPath}#property`,
              name: property.title,
              floorSize: { "@type": "QuantitativeValue", value: property.surfaceM2, unitCode: "MTK" },
              numberOfRooms: property.rooms ?? undefined,
              numberOfBedrooms: property.bedrooms ?? undefined,
              address: {
                "@type": "PostalAddress",
                addressLocality: cityById.get(property.cityId)?.name,
                postalCode: property.postalCode,
                addressCountry: "FR",
              },
              ...(property.lat != null && property.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: property.lat, longitude: property.lng } } : {}),
            },
            offers: {
              "@type": "Offer",
              url: `${siteUrl}${canonicalPath}`,
              priceCurrency: property.priceCurrency,
              price: property.priceAmount,
              seller: { "@id": `${siteUrl}/#agency` },
              businessFunction: "http://purl.org/goodrelations/v1#Sell",
              itemOffered: { "@id": `${siteUrl}${canonicalPath}#property` },
              availability: property.status === "active" ? "https://schema.org/InStock" : property.status === "under_offer" ? "https://schema.org/LimitedAvailability" : property.status === "off_market" ? "https://schema.org/Discontinued" : "https://schema.org/SoldOut",
            },
          },
        }
      : property && propertyQuery.isPlaceholderData
        ? {
            title: `${property.title} – ${cityById.get(property.cityId)?.name ?? "Le Havre"} – Foch Immobilier`,
            description: `Découvrez l’annonce ${property.title} au Havre et consultez ses photos et caractéristiques.`,
            canonicalPath,
            image: property.images[0]?.sourceUrl,
          }
        : propertyQuery.isPending
          ? {
              title: "Annonce immobilière | Foch Immobilier",
              description: "Consultez les annonces immobilières de Foch Immobilier au Havre.",
              canonicalPath: propertyId == null ? "/biens" : `/biens/${propertyId}`,
            }
      : {
          title: "Bien introuvable | Foch Immobilier",
          description: "Cette annonce n'est plus disponible.",
          canonicalPath: "/biens",
          noIndex: true,
        },
  );

  if (propertyId == null) {
    return <Navigate to="/biens" replace />;
  }

  if (!property && propertyQuery.isPending) {
    return (
      <section className="container mx-auto min-h-[60vh] px-4 py-8" aria-busy="true" aria-label="Chargement de l’annonce">
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
    );
  }

  if (!property) {
    return (
      <section className="container mx-auto px-4 py-14">
        <h1 className="font-display text-3xl">Annonce indisponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette annonce a pu être vendue ou retirée. Nous vous invitons à consulter des biens comparables.
        </p>
        <Button className="mt-4" variant="brand" asChild>
          <Link to="/biens">Voir des biens comparables</Link>
        </Button>
      </section>
    );
  }

  const canonicalSlug = sanitizePropertySlug(property.slug);
  const routeSlug = parsedRoute?.slug ? sanitizePropertySlug(parsedRoute.slug) : null;

  if (routeSlug !== canonicalSlug) {
    return <Navigate to={canonicalPath!} replace state={location.state} />;
  }

  const city = cityById.get(property.cityId);
  const agent = agentById.get(property.agentId);
  const propertyTypeLabel = formatPropertyTypeLabel(property.propertyType);
  const statusLabel = getPropertyStatusLabel(property.status) ?? "À vendre";
  const quickFacts = [
    { icon: Maximize, label: "Surface", value: `${property.surfaceM2} m²` },
    { icon: BedDouble, label: "Chambres", value: `${property.bedrooms ?? "-"}` },
    { icon: Bath, label: "Sdb", value: `${property.bathrooms ?? "-"}` },
    { icon: Car, label: "Garage", value: `${property.garageCount ?? 0}` },
  ];

  return (
    <section className={`container mx-auto px-4 ${previewLayout ? "pt-4" : "pt-8"} pb-28 lg:pb-8`}>
      <div className="pointer-events-none fixed right-5 top-1/2 z-20 hidden h-36 -translate-y-1/2 lg:block">
        <div className="h-full w-1 rounded-full bg-border/70">
          <motion.span
            className="block h-full w-full origin-top rounded-full bg-accent"
            style={{ scaleY: scrollYProgress }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          />
        </div>
      </div>

      {!previewLayout && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {routeState?.backgroundLocation && (
            <Button type="button" variant="ghost" size="sm" className="-ml-2 h-9 shrink-0 px-2 text-brand-strong" onClick={() => navigate(-1)}>
              <ChevronLeft aria-hidden="true" className="mr-1 h-4 w-4" />
              {routeState.backgroundLocation.pathname === "/biens" ? "Retour aux résultats" : "Retour"}
            </Button>
          )}
          <nav aria-label="Fil d’Ariane" className="text-sm text-muted-foreground">
            <Link to="/" className="hover:underline">
              Accueil
            </Link>{" "}
            /{" "}
            <Link to="/biens" className="hover:underline">
              Biens
            </Link>{" "}
            / <span className="text-foreground" aria-current="page">Réf {property.id}</span>
          </nav>
        </div>
      )}

      <div ref={contentRef} className="grid gap-7 lg:grid-cols-[1fr_340px] lg:gap-8">
        <div>
          <ListingGallery images={property.images} title={property.title} propertyId={property.id} />
          {announcementSwipeHint && (
            <div className="mt-1 flex justify-end pr-1 lg:hidden">{announcementSwipeHint}</div>
          )}

          <div ref={summaryRef} className={`${announcementSwipeHint ? "mt-2 lg:mt-5" : "mt-5"} grid grid-cols-1 items-start gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_auto]`}>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Réf du bien {property.id}</p>
              <h1 className="mt-1 font-display text-4xl leading-[1.08]">{property.title}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <p className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/90">
                  Type : {propertyTypeLabel}
                </p>
                <p className="inline-flex rounded-full border border-brand-border bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
                  {statusLabel}
                </p>
              </div>
              <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {city ? <Link to={`/immobilier/${city.slug}`} className="underline underline-offset-4">{city.name}</Link> : "Localisation"} ({property.postalCode})
              </p>
            </div>

            <div className="min-w-0 text-left lg:w-auto lg:min-w-[16rem] lg:text-right">
              <p className="font-display text-5xl leading-tight tracking-tight text-brand-strong sm:text-6xl">{formatPrice(property.priceAmount, property.transactionType)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-3 sm:justify-end">
                {property.status === "active" && property.transactionType === "vente" && (
                  <PropertyCompareToggle propertyId={property.id} />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className={
                    isFavorite
                      ? "border-brand-border bg-brand-soft text-brand-strong hover:bg-brand-soft/70 hover:text-brand-strong"
                      : undefined
                  }
                  onClick={() => {
                    const action = isFavorite ? "favorite_removed" : "favorite_added";
                    toggleFavorite(property.id);
                    trackEvent("listing_viewed", { propertyId: property.id, action });
                  }}
                  aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <Heart className={isFavorite ? "fill-brand text-brand" : undefined} />
                  {isFavorite ? "Sauvegardé" : "Sauvegarder"}
                </Button>
                <ListingShareButton key={property.id} propertyId={property.id} title={property.title} path={canonicalPath!} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(String(property.id));
                    trackEvent("listing_viewed", { propertyId: property.id, action: "copy_reference" });
                  }}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" /> Réf
                </Button>
              </div>
              {announcementNavigationControls}
            </div>
          </div>

          {fullPageNavigationControls}

          <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
            {quickFacts.map((fact) => (
              <div key={fact.label} className="rounded-xl border border-border p-3 text-center">
                <fact.icon className="mx-auto h-4 w-4" />
                <p className="mt-2 text-sm font-medium">{fact.value}</p>
                <p className="text-xs text-muted-foreground">{fact.label}</p>
              </div>
            ))}
          </div>

          <article className="mt-9 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{property.description}</p>
          </article>

          <article className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Caractéristiques</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {property.features.map((feature) => (
                <li key={feature.featureKey} className="rounded-full border border-border px-3 py-1 text-xs">
                  {feature.labelFr}
                </li>
              ))}
            </ul>
          </article>

          <article className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Performance énergétique</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">DPE</p>
                <div className="mt-2 flex items-center gap-4">
                  <DpeBadge label={property.dpeLabel} size="md" value={property.dpeValue} />
                  <p className="text-sm text-muted-foreground">{property.dpeValue ? `${property.dpeValue} kWh/m².an` : "Consommation non renseignée"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">GES</p>
                <div className="mt-2 flex items-center gap-4">
                  <DpeBadge label={property.gesLabel} size="md" type="GES" value={property.gesValue} />
                  <p className="text-sm text-muted-foreground">{property.gesValue ? `${property.gesValue} kgCO₂/m².an` : "Émissions non renseignées"}</p>
                </div>
              </div>
            </div>
          </article>
        </div>

        <aside className={`space-y-4 lg:sticky ${previewLayout ? "lg:top-0" : "lg:top-[calc(145px+env(safe-area-inset-top))]"} lg:h-fit`}>
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Votre interlocuteur</p>
            <p className="mt-2 font-display text-2xl">{agent?.fullName ?? "Foch Immobilier"}</p>
            <p className="text-sm text-muted-foreground">{agent?.role ?? "Transactions immobilières"}</p>
            <a
              href={`tel:${(agent?.phone ?? "02 35 42 51 76").replace(/\s+/g, "")}`}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm"
              onClick={() => {
                trackEvent("phone_clicked", { source: "property_sidebar", propertyId: property.id });
                trackComparisonContactClick("phone");
              }}
            >
              <Phone className="h-4 w-4" /> {agent?.phone ?? "02 35 42 51 76"}
            </a>
            {agent?.email && (
              <a
                href={`mailto:${agent.email}`}
                className="mt-2 block text-sm text-muted-foreground hover:underline"
                onClick={() => trackComparisonContactClick("email")}
              >
                {agent.email}
              </a>
            )}
          </section>

          <div ref={contactRef} id="property-contact-form" className="scroll-mt-28">
            <LeadForm
              source="property_page"
              propertyId={property.id}
              cityId={property.cityId}
              title="Demander une visite"
              description="Indiquez vos disponibilités, nous revenons vers vous rapidement."
              ctaLabel="Envoyer ma demande"
              showAppointmentFields
            />
          </div>
        </aside>
      </div>

      {nextPropertyToDiscover && (
        <section className="mt-16">
          <h2 className="font-display text-3xl">Prochain bien à découvrir</h2>
          {previewLayout ? (
            <PropertyPreviewLink
              item={nextPropertyToDiscover}
              browseItems={discoveryBrowseItems}
              browseTotal={navigationCount}
              browseMode={navigationMode}
              className="group relative mt-4 flex min-h-[18rem] flex-col justify-end overflow-hidden rounded-2xl bg-neutral-950 p-6 text-white shadow-sm transition-shadow duration-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-[22rem] sm:p-9"
              aria-label={`Découvrir le bien suivant : ${nextPropertyToDiscover.title}, ${getRecommendationLocation(nextPropertyToDiscover)}, ${formatPrice(nextPropertyToDiscover.priceAmount, nextPropertyToDiscover.transaction)}`}
            >
              {discoveryCardContent}
            </PropertyPreviewLink>
          ) : (
            <Link
              to={toCanonicalPropertyPath(nextPropertyToDiscover)}
              replace
              state={getFullPageNavigationState(nextPropertyToDiscover)}
              className="group relative mt-4 flex min-h-[18rem] flex-col justify-end overflow-hidden rounded-2xl bg-neutral-950 p-6 text-white shadow-sm transition-shadow duration-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-[22rem] sm:p-9"
              aria-label={`Découvrir le bien suivant : ${nextPropertyToDiscover.title}, ${getRecommendationLocation(nextPropertyToDiscover)}, ${formatPrice(nextPropertyToDiscover.priceAmount, nextPropertyToDiscover.transaction)}`}
            >
              {discoveryCardContent}
            </Link>
          )}
        </section>
      )}
      {secondarySimilarItems.length > 0 && (
        <section className="mt-14" aria-labelledby="similar-properties-heading">
          <h2 id="similar-properties-heading" className="font-display text-2xl sm:text-3xl">Biens similaires</h2>
          <div className="mt-4 grid grid-flow-col auto-cols-[84%] snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:auto-cols-[46%] lg:auto-cols-[32%] lg:justify-center lg:overflow-visible lg:pb-0 lg:pr-0">
            {secondarySimilarItems.map((item) => {
              const favorite = favoriteIds.includes(item.id);
              const roomAndSurface = getRecommendationFacts(item);

              return (
                <article key={item.id} className="group relative min-w-0 snap-start">
                  <PropertyPreviewLink
                    item={item}
                    browseItems={similarBrowseItems}
                    browseTotal={similarBrowseItems.length}
                    browseMode="similar"
                    className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                    aria-label={`Voir ${item.title}, ${getRecommendationLocation(item)}, ${formatPrice(item.priceAmount, item.transaction)}${roomAndSurface ? `, ${roomAndSurface}` : ""}`}
                  >
                    <div className="aspect-[1.9/1] overflow-hidden rounded-xl bg-muted">
                      <img
                        src={getPropertyImageUrl(item.coverImageUrl, 600)}
                        srcSet={getPropertyImageSrcSet(item.coverImageUrl)}
                        sizes="(max-width: 639px) 84vw, (max-width: 1023px) 46vw, 30vw"
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035] motion-reduce:transition-none"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="pt-3">
                      <p className="font-display text-xl font-semibold tracking-tight text-brand-strong">
                        {formatPrice(item.priceAmount, item.transaction)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{getRecommendationLocation(item)}</p>
                      {roomAndSurface && <p className="mt-1 text-sm text-foreground/80">{roomAndSurface}</p>}
                      {similarReasons.get(item.id) && (
                        <p className="mt-1.5 text-xs text-muted-foreground">{similarReasons.get(item.id)}</p>
                      )}
                    </div>
                  </PropertyPreviewLink>
                  <button
                    type="button"
                    className={`absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-background/70 bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background ${favorite ? "text-brand-strong" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      const action = favorite ? "favorite_removed" : "favorite_added";
                      toggleFavorite(item.id);
                      trackEvent("listing_viewed", { propertyId: item.id, action });
                    }}
                    aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                    aria-pressed={favorite}
                  >
                    <Heart className={`h-4 w-4 ${favorite ? "fill-brand text-brand" : ""}`} aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
          {similarSearchHref && (
            <div className="mt-3 flex justify-end">
              <Link
                to={similarSearchHref}
                className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-brand-strong underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Voir les biens similaires
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
      )}
      {stickySummaryPortalElement ? stickySummary && createPortal(stickySummary, stickySummaryPortalElement) : stickySummary}
    </section>
  );
}
