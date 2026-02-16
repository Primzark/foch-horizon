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
import { useSeo } from "@/lib/seo/useSeo";

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
  const reducedMotion = useReducedMotion();
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
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Foch Immobilier",
        url: "https://www.fochimmobilier.com",
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
        "@type": "WebSite",
        name: "Foch Immobilier",
        url: "https://www.fochimmobilier.com",
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
          {(featuredQuery.data ?? []).map((property) => (
            <ListingCard key={property.id} item={toSearchItem(property)} />
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
