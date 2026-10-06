import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useScroll } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Bath, BedDouble, Car, Copy, Heart, MapPin, Maximize, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cityById, cityBySlug } from "@/features/cities/data/cities";
import { getPropertyById, getSimilarProperties } from "@/features/listings/api/properties.service";
import { ListingGallery } from "@/features/listings/components/ListingGallery";
import { PropertyPreviewLink } from "@/features/listings/components/PropertyPreviewLink";
import { ListingShareButton } from "@/features/listings/components/ListingShareButton";
import DpeBadge from "@/components/property/DpeBadge";
import { agentById } from "@/features/listings/data/agents";
import { toSearchItem } from "@/features/listings/utils/mappers";
import { LeadForm } from "@/features/leads/components/LeadForm";
import {
  formatPrice,
  formatPropertyTypeLabel,
  getPropertyStatusLabel,
  sanitizePropertySlug,
  toCanonicalPropertyPath,
} from "@/features/listings/utils/formatting";
import { useFavoritesStore } from "@/features/favorites/useFavoritesStore";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import { trackEvent } from "@/lib/analytics/events";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";
import type { PropertySearchItem } from "@/types/api";
import type { Property } from "@/types/domain";

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
    rooms: null,
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

export default function ListingDetailPage({
  announcementSwipeHint,
  announcementNavigationControls,
  stickySummaryPortalElement = null,
  stickySummaryTop = 88,
}: {
  announcementSwipeHint?: ReactNode;
  announcementNavigationControls?: ReactNode;
  stickySummaryPortalElement?: HTMLElement | null;
  stickySummaryTop?: number;
} = {}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef<HTMLDivElement | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [contactVisible, setContactVisible] = useState(false);
  const location = useLocation();
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
    () => (similarQuery.data ?? []).map(toSearchItem),
    [similarQuery.data],
  );

  const property = propertyQuery.data;
  const isFavorite = property ? favoriteIds.includes(property.id) : false;
  const nextPropertyToDiscover = similarItems[0];

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
            <div className="aspect-[16/10] rounded-2xl bg-muted" aria-hidden="true" />
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
    return <Navigate to={canonicalPath!} replace />;
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
    <section className="container mx-auto px-4 py-8 pb-28 lg:pb-8">
      <div className="pointer-events-none fixed right-5 top-1/2 z-20 hidden h-36 -translate-y-1/2 lg:block">
        <div className="h-full w-1 rounded-full bg-border/70">
          <motion.span
            className="block h-full w-full origin-top rounded-full bg-accent"
            style={{ scaleY: scrollYProgress }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          />
        </div>
      </div>

      <nav className="mb-4 text-sm text-muted-foreground">
        <Link to="/" className="hover:underline">
          Accueil
        </Link>{" "}
        /{" "}
        <Link to="/biens" className="hover:underline">
          Biens
        </Link>{" "}
        / <span className="text-foreground">Réf {property.id}</span>
      </nav>

      <div ref={contentRef} className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <ListingGallery images={property.images} title={property.title} />
          {announcementSwipeHint && (
            <div className="mt-1 flex justify-end pr-1 lg:hidden">{announcementSwipeHint}</div>
          )}

          <div ref={summaryRef} className={`${announcementSwipeHint ? "mt-2 lg:mt-6" : "mt-6"} flex flex-wrap items-start justify-between gap-4`}>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Réf du bien {property.id}</p>
              <h1 className="mt-1 font-display text-4xl">{property.title}</h1>
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

            <div className="w-full text-left sm:ml-auto sm:w-auto sm:text-right">
              <p className="font-display text-5xl leading-tight tracking-tight text-brand-strong sm:text-6xl">{formatPrice(property.priceAmount, property.transactionType)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:justify-end">
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

          <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
            {quickFacts.map((fact) => (
              <div key={fact.label} className="rounded-xl border border-border p-3 text-center">
                <fact.icon className="mx-auto h-4 w-4" />
                <p className="mt-2 text-sm font-medium">{fact.value}</p>
                <p className="text-xs text-muted-foreground">{fact.label}</p>
              </div>
            ))}
          </div>

          <article className="mt-8 rounded-2xl border border-border bg-card p-6">
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

        <aside className="space-y-4 lg:sticky lg:top-[calc(145px+env(safe-area-inset-top))] lg:h-fit">
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Votre interlocuteur</p>
            <p className="mt-2 font-display text-2xl">{agent?.fullName ?? "Foch Immobilier"}</p>
            <p className="text-sm text-muted-foreground">{agent?.role ?? "Transactions immobilières"}</p>
            <a
              href={`tel:${(agent?.phone ?? "02 35 42 51 76").replace(/\s+/g, "")}`}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm"
              onClick={() => trackEvent("phone_clicked", { source: "property_sidebar", propertyId: property.id })}
            >
              <Phone className="h-4 w-4" /> {agent?.phone ?? "02 35 42 51 76"}
            </a>
            {agent?.email && (
              <a href={`mailto:${agent.email}`} className="mt-2 block text-sm text-muted-foreground hover:underline">
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
        <section className="mt-12">
          <h2 className="font-display text-3xl">Prochain bien à découvrir</h2>
          <PropertyPreviewLink
            item={nextPropertyToDiscover}
            browseItems={similarItems}
            className="group relative mt-4 flex min-h-[18rem] flex-col justify-end overflow-hidden rounded-2xl bg-neutral-950 p-6 text-white shadow-sm transition-shadow duration-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-[22rem] sm:p-9"
            aria-label={`Découvrir le bien suivant : ${nextPropertyToDiscover.title}, ${nextPropertyToDiscover.city.name}, ${formatPrice(nextPropertyToDiscover.priceAmount, nextPropertyToDiscover.transaction)}`}
          >
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
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">{nextPropertyToDiscover.city.name} · {nextPropertyToDiscover.surfaceM2} m²</p>
                <h3 className="mt-2 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">{nextPropertyToDiscover.title}</h3>
                <p className="mt-2 text-lg font-medium text-white/90">{formatPrice(nextPropertyToDiscover.priceAmount, nextPropertyToDiscover.transaction)}</p>
              </div>
              <span className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-background px-5 text-sm font-semibold text-foreground transition-colors duration-300 group-hover:bg-brand-soft group-focus-visible:bg-brand-soft sm:self-auto">
                Next property
                <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
              </span>
            </div>
          </PropertyPreviewLink>
        </section>
      )}
      {stickySummaryPortalElement ? stickySummary && createPortal(stickySummary, stickySummaryPortalElement) : stickySummary}
    </section>
  );
}
