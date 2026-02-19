import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCityBySlug } from "@/features/cities/api/cities.service";
import { getPropertiesByCitySlug } from "@/features/listings/api/properties.service";
import { ListingCard } from "@/features/listings/components/ListingCard";
import { toSearchItem } from "@/features/listings/utils/mappers";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import { cn } from "@/lib/utils";
import { getPlaceImageMotionPreset, inferPlaceImageMood } from "@/lib/visuals/placeImageMotion";

export default function CityHubPage() {
  const { ville } = useParams();
  const citySlug = ville ?? "";
  const reducedMotion = useReducedMotion();

  const cityQuery = useQuery({
    queryKey: ["city", citySlug],
    enabled: citySlug.length > 0,
    queryFn: () => getCityBySlug(citySlug),
  });

  const propertiesQuery = useQuery({
    queryKey: ["city-properties", citySlug],
    enabled: citySlug.length > 0,
    queryFn: () => getPropertiesByCitySlug(citySlug),
  });

  const city = cityQuery.data;
  const siteUrl = getSiteUrl();

  useSeo(
    city
      ? {
          title: `Immobilier ${city.name} | Foch Immobilier`,
          description: `Découvrez les biens à ${city.name} et les services d'accompagnement de Foch Immobilier.`,
          canonicalPath: `/immobilier/${city.slug}`,
          jsonLd: [
            {
              "@context": "https://schema.org",
              "@type": "Place",
              name: city.name,
              address: {
                "@type": "PostalAddress",
                postalCode: city.postalCodes[0] ?? "",
                addressLocality: city.name,
                addressCountry: "FR",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: `Immobilier ${city.name}`,
              url: `${siteUrl}/immobilier/${city.slug}`,
            },
          ],
        }
      : {
          title: "Ville introuvable | Foch Immobilier",
          description: "La page ville demandée n'est pas disponible.",
          canonicalPath: "/biens",
          noIndex: true,
        },
  );

  if (!ville) {
    return <Navigate to="/biens" replace />;
  }

  if (cityQuery.isLoading || propertiesQuery.isLoading) {
    return (
      <section className="container mx-auto px-4 py-10">
        <div className="h-72 animate-pulse rounded-2xl bg-muted/50" />
      </section>
    );
  }

  if (!city) {
    return <Navigate to="/biens" replace />;
  }

  const cityProperties = propertiesQuery.data ?? [];
  const heroMood = inferPlaceImageMood(city.name, city.slug);
  const heroMotionPreset = getPlaceImageMotionPreset(heroMood);

  return (
    <section className="container mx-auto px-4 py-10">
      <header className="relative overflow-hidden rounded-2xl border border-border">
        <motion.img
          src={city.heroImageUrl}
          alt={`Immobilier à ${city.name}`}
          className="h-64 w-full object-cover md:h-80"
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
                  opacity: { duration: 0.56, ease: [0.22, 1, 0.36, 1] },
                  scale: { duration: heroMotionPreset.floatDuration, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
                  y: { duration: heroMotionPreset.floatDuration, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
                }
          }
        />
        <motion.div
          className={cn("absolute inset-0 bg-gradient-to-br", heroMotionPreset.overlayClassName)}
          animate={reducedMotion ? { opacity: 0.66 } : { opacity: [0.6, 0.74, 0.6] }}
          transition={{
            duration: heroMotionPreset.floatDuration - 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6 text-white md:p-8">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-white/85">
            <MapPin className="h-3.5 w-3.5" /> Ville
          </p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Immobilier à {city.name}</h1>
          <p className="mt-2 text-sm text-white/85">
            Sélection de biens disponibles et accompagnement local pour vendre, acheter ou louer dans ce secteur.
          </p>
        </div>
      </header>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">Biens à {city.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{cityProperties.length} annonce{cityProperties.length > 1 ? "s" : ""} actuellement disponible{cityProperties.length > 1 ? "s" : ""}.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/biens?city=${city.slug}`}>Voir tous les résultats</Link>
          </Button>
        </div>

        {cityProperties.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Aucune annonce active pour le moment sur cette ville. Contactez-nous pour recevoir une alerte personnalisée.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cityProperties.map((property, index) => (
              <ListingCard key={property.id} item={toSearchItem(property)} revealIndex={index} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-3xl">Vendre à {city.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Préparez votre estimation avec un conseiller local et obtenez une stratégie de mise en marché adaptée à votre bien.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link to={`/estimation?ville=${city.slug}`}>Estimer mon bien à {city.name}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/contact">Parler à l'agence</Link>
          </Button>
        </div>
      </section>
    </section>
  );
}
