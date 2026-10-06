import { placeEntity } from "@/lib/seo/entities";
import { atLocation, ofLocation } from "@/lib/utils/frenchLocation";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cityBySlug } from "@/features/cities/data/cities";
import { getCityBySlug } from "@/features/cities/api/cities.service";
import { getPropertiesByCitySlug, searchProperties } from "@/features/listings/api/properties.service";
import { ListingCard } from "@/features/listings/components/ListingCard";
import { toSearchItem } from "@/features/listings/utils/mappers";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import { cn } from "@/lib/utils";
import { getPlaceImageMotionPreset, inferPlaceImageMood } from "@/lib/visuals/placeImageMotion";
import { PlaceAtmosphereLayer } from "@/components/visuals/PlaceAtmosphereLayer";
import { ContextAwareParallax } from "@/components/visuals/ContextAwareParallax";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { getMotionDirectorProfile } from "@/lib/visuals/motionDirector";
import { geographyGuides, type GeographyPhotoCredit } from "@/features/content/data/geographyGuides";
import { GeographyGuideDetails } from "@/features/content/components/GeographyGuideDetails";
import { PhotoAttribution } from "@/features/content/components/PhotoAttribution";

type LocationHeroProps = {
  pageTitle: string;
  locationName: string;
  locationSlug: string;
  locationLabel: string;
  imageUrl: string;
  imageAlt: string;
  imagePosition?: string;
  credit?: GeographyPhotoCredit;
  reducedMotion: boolean;
};

function getLocationLabel(guide?: (typeof geographyGuides)[number]) {
  if (guide?.placeType === "quartier" || ["la-plage", "gobelins", "saint-michel"].includes(guide?.id ?? "")) return "Quartier";
  return "Commune";
}

function RelatedGeographyLinks({ guide, listingHref, estimateCity }: { guide: (typeof geographyGuides)[number]; listingHref: string; estimateCity: string }) {
  const nearby = (guide.nearbyGuideIds ?? [])
    .map((id) => geographyGuides.find((item) => item.id === id))
    .filter((item): item is (typeof geographyGuides)[number] => Boolean(item));

  return (
    <section className="mt-8 border-y border-border py-5" aria-labelledby={`related-geography-${guide.id}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Continuer la visite</p>
          <h2 id={`related-geography-${guide.id}`} className="mt-1 font-display text-2xl">À proximité {ofLocation(guide.name)}</h2>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to={listingHref} className="font-medium text-brand-strong underline underline-offset-4">Annonces immobilières : {guide.name}</Link>
          <Link to={`/estimation?ville=${encodeURIComponent(estimateCity)}`} className="font-medium text-brand-strong underline underline-offset-4">Estimer un bien {atLocation(guide.name)}</Link>
          <Link to="/vendre" className="font-medium text-brand-strong underline underline-offset-4">Vendre avec l’agence</Link>
        </div>
      </div>
      {nearby.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {nearby.map((place) => (
            <li key={place.id}><Link to={`/immobilier/${place.id}`} className="text-muted-foreground underline decoration-border underline-offset-4 hover:text-brand-strong">{place.name}</Link></li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LocationHero({ pageTitle, locationName, locationSlug, locationLabel, imageUrl, imageAlt, imagePosition, credit, reducedMotion }: LocationHeroProps) {
  const heroMood = inferPlaceImageMood(locationName, locationSlug);
  const heroMotionPreset = getPlaceImageMotionPreset(heroMood);
  const motionDirector = getMotionDirectorProfile(heroMood);

  return (
    <header className="page-banner relative overflow-hidden rounded-2xl border border-border">
      <ContextAwareParallax mood={heroMood} reducedMotion={reducedMotion} intensity="immersive" scrollReactive className="z-[0]">
        <motion.img
          src={imageUrl}
          alt={imageAlt}
          className="h-full w-full object-cover"
          style={imagePosition ? { objectPosition: imagePosition } : undefined}
          initial={reducedMotion ? { opacity: 0.9 } : { opacity: 0, scale: heroMotionPreset.enterScale, y: heroMotionPreset.enterY }}
          animate={
            reducedMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: [1, heroMotionPreset.hoverScale - 0.01, 1], y: [0, heroMotionPreset.hoverY, 0] }
          }
          transition={
            reducedMotion
              ? { duration: 0.34, ease: "easeOut" }
              : {
                  opacity: { duration: motionDirector.revealDuration + 0.16, ease: [0.22, 1, 0.36, 1] },
                  scale: { duration: heroMotionPreset.floatDuration, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
                  y: { duration: heroMotionPreset.floatDuration, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
                }
          }
        />
      </ContextAwareParallax>
      <PlaceAtmosphereLayer mood={heroMood} animated={!reducedMotion} className="z-[1]" />
      <motion.div
        className={cn("absolute inset-0 z-[2] bg-gradient-to-br", heroMotionPreset.overlayClassName)}
        animate={reducedMotion ? { opacity: 0.66 } : { opacity: [0.6, 0.74, 0.6] }}
        transition={{
          duration: Math.max(heroMotionPreset.floatDuration - 2, motionDirector.revealDuration + 8),
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
      {credit && <PhotoAttribution credit={credit} />}
      <div className="absolute inset-0 z-[3] flex flex-col justify-end p-6 text-white md:p-8">
        <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-white/85">
          <MapPin className="h-3.5 w-3.5" /> {locationLabel}
        </p>
        <h1 className="mt-2 break-words font-display text-3xl sm:text-4xl md:text-5xl">{pageTitle}</h1>
        <p className="mt-2 text-sm text-white/85">
          Une sélection de biens et un accompagnement local sur mesure pour vendre ou acheter dans ce secteur.
        </p>
      </div>
    </header>
  );
}

export default function CityHubPage() {
  const { ville } = useParams();
  const [searchParams] = useSearchParams();
  const citySlug = ville ?? "";
  const requestedGuideId = searchParams.get("guide");
  const cityGuide = geographyGuides.find((guide) => guide.id === requestedGuideId)
    ?? geographyGuides.find((guide) => guide.id === citySlug);
  const { reducedMotion } = useMotionPreference();

  const cityQuery = useQuery({
    queryKey: ["city", citySlug],
    enabled: cityBySlug.has(citySlug),
    queryFn: () => getCityBySlug(citySlug),
  });

  const propertiesQuery = useQuery({
    queryKey: ["city-properties", citySlug, cityGuide?.id],
    enabled: Boolean(cityGuide || cityBySlug.has(citySlug)),
    queryFn: async () => {
      const listingSearch = cityGuide?.listingSearch ?? { city: citySlug };
      if (listingSearch.city && !listingSearch.query) {
        const properties = await getPropertiesByCitySlug(listingSearch.city);
        return properties.map(toSearchItem);
      }

      const response = await searchProperties({
        city: listingSearch.city,
        q: listingSearch.query,
        page: 1,
        pageSize: 48,
        sort: "newest",
      });
      return response.items;
    },
  });

  const city = cityQuery.data ?? cityBySlug.get(citySlug);
  const siteUrl = getSiteUrl();
  const pageTitle = cityGuide?.pageTitle ?? `Immobilier ${atLocation(city?.name ?? "")}`;

  useSeo({
    title: cityGuide || city ? `${pageTitle} | Foch Immobilier` : "Ville introuvable | Foch Immobilier",
    description: cityGuide ? `${cityGuide.subtitle}. Habitat, écoles, commerces, déplacements et repères immobiliers.` : `Découvrez nos biens et notre accompagnement immobilier ${atLocation(city?.name ?? "Le Havre")}.`,
    canonicalPath: `/immobilier/${cityGuide?.id ?? citySlug}`,
    image: "/images/agence-foch.jpg",
    noIndex: !cityGuide && !city,
    jsonLd: cityGuide ? {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${siteUrl}/immobilier/${cityGuide.id}#webpage`,
      name: cityGuide.pageTitle,
      description: cityGuide.subtitle,
      url: `${siteUrl}/immobilier/${cityGuide.id}`,
      inLanguage: "fr-FR",
      publisher: { "@id": `${siteUrl}/#agency` },
      about: placeEntity(cityGuide, siteUrl),
      spatialCoverage: { "@id": `${siteUrl}/immobilier/${cityGuide.id}#place` },
      citation: [cityGuide.link.href, cityGuide.priceLink.href],
      ...(cityGuide.reviewedAt ? { dateModified: cityGuide.reviewedAt } : {}),
    } : undefined,
  });

  if (!ville) {
    return <Navigate to="/biens" replace />;
  }

  if (!cityGuide && !city && cityQuery.isLoading) {
    return (
      <section className="container mx-auto px-4 py-10">
        <div className="h-72 animate-pulse rounded-2xl bg-muted/50" />
      </section>
    );
  }

  const cityProperties = propertiesQuery.data ?? [];
  const allResultsParams = new URLSearchParams({
    ...(cityGuide?.listingSearch.city ? { city: cityGuide.listingSearch.city } : city?.slug ? { city: city.slug } : {}),
    ...(cityGuide?.listingSearch.query ? { q: cityGuide.listingSearch.query } : {}),
    ...(cityGuide ? { guide: cityGuide.id } : {}),
  });
  if (!city) {
    if (!cityGuide) return <Navigate to="/biens" replace />;

    return (
      <section className="container mx-auto px-4 py-10">
        <LocationHero
          pageTitle={cityGuide.pageTitle}
          locationName={cityGuide.name}
          locationSlug={cityGuide.id}
          locationLabel={getLocationLabel(cityGuide)}
          imageUrl={cityGuide.heroImage.src}
          imageAlt={cityGuide.heroImage.alt}
          imagePosition={cityGuide.heroImage.objectPosition}
          credit={cityGuide.heroImage.credit}
          reducedMotion={reducedMotion}
        />

        <section className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8" aria-labelledby="city-guide-title">
          <header className="mb-6 max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-strong">Repères sur le secteur · {cityGuide.area}</p>
            <h2 id="city-guide-title" className="mt-2 font-display text-3xl">Vivre {atLocation(cityGuide.name)}</h2>
          </header>
          <GeographyGuideDetails guide={cityGuide} />
        </section>

        <RelatedGeographyLinks
          guide={cityGuide}
          listingHref={`/biens?${allResultsParams.toString()}`}
          estimateCity={cityGuide.listingSearch.city ?? cityGuide.name}
        />

        <div data-live-content={`/biens?${allResultsParams.toString()}`}>
        {cityProperties.length === 0 ? (
          <p aria-live="polite" className="mt-6 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            {propertiesQuery.isLoading
              ? "Chargement des annonces du secteur…"
              : propertiesQuery.isError
              ? "Les annonces ne sont pas disponibles pour le moment. Retrouvez ci-dessous les repères sur le secteur."
              : `Aucune annonce active pour le moment ${atLocation(cityGuide.name)}. Retrouvez ci-dessous les repères sur le secteur.`}
          </p>
        ) : (
          <section className="mt-8" aria-labelledby="city-properties-title">
            <h2 id="city-properties-title" className="mb-4 font-display text-3xl">Biens {atLocation(cityGuide.name)}</h2>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {cityProperties.map((item, index) => (
                <ListingCard key={item.id} item={item} browseItems={cityProperties} revealIndex={index} />
              ))}
            </div>
          </section>
        )}

        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="outline" asChild><Link to="/geographie">Tous les secteurs</Link></Button>
          <Button variant="brand" asChild className="h-auto min-h-10 whitespace-normal text-center"><Link to="/contact">Contacter l’agence</Link></Button>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-10">
      <LocationHero
        pageTitle={pageTitle}
        locationName={cityGuide?.name ?? city.name}
        locationSlug={cityGuide?.id ?? city.slug}
        locationLabel={getLocationLabel(cityGuide)}
        imageUrl={cityGuide?.heroImage.src ?? city.heroImageUrl}
        imageAlt={cityGuide?.heroImage.alt ?? `Illustration originale du cadre de vie à ${city.name}`}
        credit={cityGuide?.heroImage.credit}
        reducedMotion={reducedMotion}
      />

      {cityGuide && (
        <section className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8" aria-labelledby="city-guide-title">
          <header className="mb-6 max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-strong">Repères sur le secteur · {cityGuide.area}</p>
            <h2 id="city-guide-title" className="mt-2 font-display text-3xl">Vivre {atLocation(cityGuide.name)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cityGuide.subtitle}</p>
          </header>
          <GeographyGuideDetails guide={cityGuide} />
        </section>
      )}

      {cityGuide && (
        <RelatedGeographyLinks
          guide={cityGuide}
          listingHref={`/biens?${allResultsParams.toString()}`}
          estimateCity={cityGuide.listingSearch.city ?? cityGuide.name}
        />
      )}

      <section data-live-content={`/biens?${allResultsParams.toString()}`} className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">Biens {atLocation(city.name)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {cityProperties.length} annonce{cityProperties.length > 1 ? "s" : ""} actuellement disponible{cityProperties.length > 1 ? "s" : ""}.
            </p>
          </div>
          <Button variant="brand" asChild className="h-auto min-h-10 whitespace-normal text-center">
            <Link to={`/biens?${allResultsParams.toString()}`}>Voir tous les résultats</Link>
          </Button>
        </div>

        {cityProperties.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            {propertiesQuery.isLoading
              ? "Chargement des annonces du secteur…"
              : propertiesQuery.isError
              ? "Les annonces ne sont pas disponibles pour le moment. Réessayez un peu plus tard."
              : `Aucune annonce active pour le moment ${atLocation(cityGuide?.name ?? city.name)}. Contactez-nous pour recevoir une alerte personnalisée.`}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cityProperties.map((item, index) => (
              <ListingCard key={item.id} item={item} browseItems={cityProperties} revealIndex={index} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-3xl">Vendre {atLocation(city.name)}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Préparez votre estimation avec un conseiller local et obtenez une stratégie de mise en marché adaptée à votre bien.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="brand" className="h-auto min-h-10 whitespace-normal text-center">
            <Link to={`/estimation?ville=${city.slug}`}>Estimer mon bien {atLocation(city.name)}</Link>
          </Button>
          <Button variant="brand" asChild className="h-auto min-h-10 whitespace-normal text-center">
            <Link to="/contact">Contacter l’agence</Link>
          </Button>
        </div>
      </section>
    </section>
  );
}
