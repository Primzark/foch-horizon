import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Compass, Handshake, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFeaturedProperties } from "@/features/listings/api/properties.service";
import { ListingCard } from "@/features/listings/components/ListingCard";
import { agents } from "@/features/listings/data/agents";
import { toSearchItem } from "@/features/listings/utils/mappers";
import { cities } from "@/features/cities/data/cities";
import { useUiStore } from "@/lib/state/useUiStore";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import { MarketCounters } from "@/features/content/components/MarketCounters";
import { getAgencyReviews } from "@/features/content/api/googleReviews.service";

const serviceCards = [
  {
    title: "Estimation",
    description: "Obtenez une estimation argumentée de votre bien à partir de notre connaissance locale.",
    href: "/estimation",
    icon: Compass,
  },
  {
    title: "Vente",
    description: "Mise en valeur, qualification acheteurs et suivi de la négociation jusqu'à l'acte.",
    href: "/vendre",
    icon: Handshake,
  },
  {
    title: "Location",
    description: "Recherche locataire, constitution dossier et accompagnement de la gestion courante.",
    href: "/services",
    icon: Building2,
  },
];

const HERO_ROTATE_MS = 6500;

export default function HomePage() {
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);
  const featuredQuery = useQuery({ queryKey: ["featured-properties"], queryFn: () => getFeaturedProperties(6) });
  const reviewsQuery = useQuery({ queryKey: ["agency-google-reviews-home"], queryFn: getAgencyReviews });
  const reducedMotion = useReducedMotion();
  const siteUrl = getSiteUrl();
  const heroSlides = useMemo(
    () =>
      (featuredQuery.data ?? [])
        .map((property) => ({
          id: property.id,
          title: property.title,
          imageUrl: property.images[0]?.sourceUrl ?? "",
        }))
        .filter((slide) => slide.imageUrl.length > 0),
    [featuredQuery.data],
  );
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  useEffect(() => {
    setActiveHeroIndex(0);
  }, [heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroSlides.length);
    }, HERO_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  useSeo({
    title: "Foch Immobilier | Immobilier d'exception au Havre",
    description:
      "Foch Immobilier vous accompagne depuis 1972 pour vos projets de vente, location et administration de biens au Havre.",
    canonicalPath: "/",
    image: heroSlides[0]?.imageUrl,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Foch Immobilier",
        url: siteUrl,
        address: {
          "@type": "PostalAddress",
          streetAddress: "109 Av. Foch",
          postalCode: "76600",
          addressLocality: "Le Havre",
          addressCountry: "FR",
        },
        telephone: "+33235425176",
      },
      {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        name: "Foch Immobilier",
        url: siteUrl,
        areaServed: ["Le Havre", "Sainte-Adresse", "Montivilliers"],
        serviceType: ["Achat immobilier", "Vente immobiliere", "Location", "Gestion locative", "Estimation immobiliere"],
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Foch Immobilier",
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/biens?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  });

  return (
    <>
      <section className="relative min-h-[68vh] overflow-hidden">
        <AnimatePresence initial={false}>
          {heroSlides.length > 0 && (
            <motion.img
              key={`${heroSlides[activeHeroIndex].id}-${activeHeroIndex}`}
              src={heroSlides[activeHeroIndex].imageUrl}
              alt={heroSlides[activeHeroIndex].title}
              className="absolute inset-0 h-full w-full object-cover"
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.03 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1.09 }}
              exit={{ opacity: 0 }}
              transition={
                reducedMotion
                  ? { duration: 0.4, ease: "easeOut" }
                  : {
                      opacity: { duration: 1.1, ease: "easeInOut" },
                      scale: { duration: HERO_ROTATE_MS / 1000 + 0.8, ease: "linear" },
                    }
              }
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/35 to-black/55" />
        <div className="container relative mx-auto flex min-h-[68vh] flex-col justify-center px-4 py-16">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-4xl font-display text-4xl text-white md:text-6xl"
          >
            Immobilier d'exception au Havre et sur la côte
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="mt-4 max-w-2xl text-base text-white/85 md:text-lg"
          >
            Depuis 1972, notre équipe accompagne les vendeurs, acquéreurs, bailleurs et locataires avec une approche sur-mesure.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button size="lg" asChild>
              <Link to="/biens">Explorer les biens</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/estimation">Estimer mon bien</Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                setSearchDrawerOpen(true);
              }}
              className="gap-2"
            >
              <Search className="h-4 w-4" /> Rechercher un bien
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <MarketCounters />
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">Sélection du moment</h2>
            <p className="mt-1 text-sm text-muted-foreground">Une sélection de biens actifs à la vente et à la location.</p>
          </div>
          <Link to="/biens" className="inline-flex items-center gap-1 text-sm hover:underline">
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(featuredQuery.data ?? []).map((property, index) => (
            <ListingCard key={property.id} item={toSearchItem(property)} revealIndex={index} />
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14">
        <h2 className="font-display text-3xl">Explorer par ville</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pages locales dédiées pour faciliter votre recherche immobilière par secteur.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {cities.map((city) => (
            <Link
              key={city.id}
              to={`/immobilier/${city.slug}`}
              className="rounded-full border border-border px-4 py-2 text-sm transition hover:bg-card"
            >
              Immobilier {city.name}
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/histoire-immobilier-le-havre" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-card">
            Histoire de l'immobilier au Havre
          </Link>
          <Link to="/avis" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-card">
            Lire les avis clients Google
          </Link>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto grid gap-6 px-4 py-14 md:grid-cols-3">
          {serviceCards.map((card) => (
            <Link key={card.title} to={card.href} className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5">
              <card.icon className="h-5 w-5" />
              <h3 className="mt-4 font-display text-2xl">{card.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {reviewsQuery.data && (
        <section className="container mx-auto px-4 py-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl">Avis Google</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Note moyenne {reviewsQuery.data.rating.toFixed(1)} / 5 ({reviewsQuery.data.userRatingCount} avis).
              </p>
            </div>
            <Link to="/avis" className="inline-flex items-center gap-1 text-sm hover:underline">
              Voir tous les avis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {reviewsQuery.data.reviews.slice(0, 3).map((review) => (
              <article key={review.id} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{review.authorName}</p>
                <p className="mt-2 text-sm text-muted-foreground">{review.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-16">
        <h2 className="font-display text-3xl">L'équipe</h2>
        <p className="mt-1 text-sm text-muted-foreground">Des interlocuteurs identifiés pour chaque projet.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {agents.map((agent) => (
            <article key={agent.id} className="rounded-2xl border border-border p-5">
              <img src={agent.portraitUrl} alt={agent.fullName} className="h-16 w-16 rounded-full object-cover" />
              <h3 className="mt-3 font-display text-xl">{agent.fullName}</h3>
              <p className="text-sm text-muted-foreground">{agent.role}</p>
              <a className="mt-2 block text-sm hover:underline" href={`tel:${agent.phone.replace(/\s+/g, "")}`}>
                {agent.phone}
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
