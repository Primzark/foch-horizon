import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, useScroll } from "framer-motion";
import { useRef } from "react";
import { Bath, BedDouble, Car, Copy, Heart, MapPin, Maximize, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cityById } from "@/features/cities/data/cities";
import { getPropertyById, getSimilarProperties } from "@/features/listings/api/properties.service";
import { ListingGallery } from "@/features/listings/components/ListingGallery";
import { ListingCard } from "@/features/listings/components/ListingCard";
import { agentById } from "@/features/listings/data/agents";
import { toSearchItem } from "@/features/listings/utils/mappers";
import { LeadForm } from "@/features/leads/components/LeadForm";
import {
  formatPrice,
  formatPropertyTypeLabel,
  sanitizePropertySlug,
  toCanonicalPropertyPath,
} from "@/features/listings/utils/formatting";
import { useFavoritesStore } from "@/features/favorites/useFavoritesStore";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import { trackEvent } from "@/lib/analytics/events";

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

export default function ListingDetailPage() {
  const reducedMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const params = useParams();
  const favoriteIds = useFavoritesStore((state) => state.ids);
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const parsedRoute = parseRouteIdAndSlug(params.idSlug);
  const propertyId = parsedRoute?.id ?? null;
  const siteUrl = getSiteUrl();
  const { scrollYProgress } = useScroll({
    target: contentRef,
    offset: ["start start", "end end"],
  });

  const propertyQuery = useQuery({
    queryKey: ["property", propertyId],
    enabled: propertyId != null,
    queryFn: () => getPropertyById(propertyId as number),
  });

  const similarQuery = useQuery({
    queryKey: ["similar", propertyId],
    enabled: Boolean(propertyQuery.data),
    queryFn: () => getSimilarProperties(propertyQuery.data!, 3),
  });

  const property = propertyQuery.data;
  const isFavorite = property ? favoriteIds.includes(property.id) : false;

  const canonicalPath = property ? toCanonicalPropertyPath({ id: property.id, slug: property.slug }) : null;

  useSeo(
    property
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
            floorSize: {
              "@type": "QuantitativeValue",
              value: property.surfaceM2,
              unitCode: "MTK",
            },
            numberOfRooms: property.rooms ?? undefined,
            numberOfBedrooms: property.bedrooms ?? undefined,
            address: {
              "@type": "PostalAddress",
              addressLocality: cityById.get(property.cityId)?.name ?? "Le Havre",
              postalCode: property.postalCode,
              addressCountry: "FR",
            },
            offers: {
              "@type": "Offer",
              priceCurrency: "EUR",
              price: property.priceAmount,
              availability: property.status === "active" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
            },
          },
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

  if (propertyQuery.isLoading) {
    return (
      <section className="container mx-auto px-4 py-8">
        <div className="h-[420px] animate-pulse rounded-2xl bg-muted/60" />
      </section>
    );
  }

  if (!property) {
    return (
      <section className="container mx-auto px-4 py-14">
        <h1 className="font-display text-3xl">Annonce indisponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cette annonce a pu être vendue ou retirée.</p>
        <Button className="mt-4" asChild>
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
  const sectionReveal = (delay = 0) =>
    reducedMotion
      ? { initial: { opacity: 1 }, whileInView: { opacity: 1 }, viewport: { once: true, amount: 0.2 } }
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.24, delay, ease: "easeOut" as const },
        };

  const quickFacts = [
    { icon: Maximize, label: "Surface", value: `${property.surfaceM2} m²` },
    { icon: BedDouble, label: "Chambres", value: `${property.bedrooms ?? "-"}` },
    { icon: Bath, label: "Sdb", value: `${property.bathrooms ?? "-"}` },
    { icon: Car, label: "Garage", value: `${property.garageCount ?? 0}` },
  ];

  return (
    <section className="container mx-auto px-4 py-8">
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
          <motion.div {...sectionReveal(0)}>
            <ListingGallery images={property.images} title={property.title} />
          </motion.div>

          <motion.div {...sectionReveal(0.04)} className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Réf du bien {property.id}</p>
              <h1 className="mt-1 font-display text-4xl">{property.title}</h1>
              <p className="mt-2 inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/90">
                Type : {propertyTypeLabel}
              </p>
              <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {city?.name} ({property.postalCode})
              </p>
            </div>

            <div className="text-right">
              <p className="font-display text-4xl">{formatPrice(property.priceAmount, property.transactionType)}</p>
              <div className="mt-2 flex items-center justify-end gap-2">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    trackEvent("listing_viewed", { propertyId: property.id, action: "copy_link" });
                  }}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" /> Lien
                </Button>
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
            </div>
          </motion.div>

          <motion.div
            {...sectionReveal(0.08)}
            className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4"
          >
            {quickFacts.map((fact) => (
              <div key={fact.label} className="rounded-xl border border-border p-3 text-center">
                <fact.icon className="mx-auto h-4 w-4" />
                <p className="mt-2 text-sm font-medium">{fact.value}</p>
                <p className="text-xs text-muted-foreground">{fact.label}</p>
              </div>
            ))}
          </motion.div>

          <motion.article {...sectionReveal(0.12)} className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{property.description}</p>
          </motion.article>

          <motion.article {...sectionReveal(0.16)} className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Caractéristiques</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {property.features.map((feature) => (
                <li key={feature.featureKey} className="rounded-full border border-border px-3 py-1 text-xs">
                  {feature.labelFr}
                </li>
              ))}
            </ul>
          </motion.article>

          <motion.article {...sectionReveal(0.2)} className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Performance énergétique</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">DPE</p>
                <p className="mt-1 text-lg">
                  {property.dpeLabel ?? "N.C."} {property.dpeValue ? `· ${property.dpeValue} kWh/m².an` : ""}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">GES</p>
                <p className="mt-1 text-lg">
                  {property.gesLabel ?? "N.C."} {property.gesValue ? `· ${property.gesValue} kgCO2/m².an` : ""}
                </p>
              </div>
            </div>
          </motion.article>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Votre interlocuteur</p>
            <p className="mt-2 font-display text-2xl">{agent?.fullName ?? "Foch Immobilier"}</p>
            <p className="text-sm text-muted-foreground">{agent?.role ?? "Transaction et administration de biens"}</p>
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

          <LeadForm
            source="property_page"
            propertyId={property.id}
            cityId={property.cityId}
            title="Demander une visite"
            description="Indiquez vos disponibilités, nous revenons vers vous rapidement."
            ctaLabel="Envoyer ma demande"
            showAppointmentFields
          />
        </aside>
      </div>

      {(similarQuery.data ?? []).length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-3xl">Biens similaires</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {similarQuery.data?.map((item, index) => (
              <ListingCard key={item.id} item={toSearchItem(item)} revealIndex={index} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
