import { useMemo, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Compass, Handshake } from "lucide-react";
import { GoogleGIcon } from "@/components/branding/GoogleGIcon";
import { BudgetFinder } from "@/features/content/components/BudgetFinder";
import { MainSearchBar } from "@/features/content/components/MainSearchBar";
import { getFeaturedProperties } from "@/features/listings/api/properties.service";
import { ListingCard } from "@/features/listings/components/ListingCard";
import { AgentInitialsAvatar } from "@/features/listings/components/AgentInitialsAvatar";
import { properties } from "@/features/listings/data/properties";
import { agents } from "@/features/listings/data/agents";
import { toSearchItem } from "@/features/listings/utils/mappers";
import { cities } from "@/features/cities/data/cities";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import { getAgencyReviews } from "@/features/content/api/googleReviews.service";
import { inferPlaceImageMood } from "@/lib/visuals/placeImageMotion";
import { ScrollReveal } from "@/components/visuals/ScrollReveal";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { getMotionDirectorProfile } from "@/lib/visuals/motionDirector";
import { PhotoAttribution, type PhotoAttributionCredit } from "@/features/content/components/PhotoAttribution";

const serviceCards = [
  {
    title: "Avis de valeur",
    description: "Une estimation précise, argumentée et alignée avec les attentes du marché havrais.",
    href: "/estimation",
    icon: Compass,
  },
  {
    title: "Vente",
    description: "Valorisation premium, ciblage qualifié des acquéreurs et pilotage jusqu'à la signature.",
    href: "/vendre",
    icon: Handshake,
  },
  {
    title: "Location",
    description: "Sélection rigoureuse des candidats et accompagnement complet de la mise en location.",
    href: "/services",
    icon: Building2,
  },
];

const HERO_IMAGE_URL = "/images/dufy-final-pick.jpg";
const HERO_IMAGE_CREDIT: PhotoAttributionCredit = {
  title: "L’Estacade et la Plage du Havre — œuvre de Raoul Dufy photographiée par Martpan",
  creator: "Raoul Dufy (œuvre), Martpan (photographie)",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Le_Havre_Mus%C3%A9e_d%27art_moderne_Dufy.jpg",
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.fr",
  modification: "Fichier redimensionné et recadré pour la bannière",
};

export default function HomePage() {
  const featuredQuery = useQuery({
    queryKey: ["featured-properties"],
    queryFn: () => getFeaturedProperties(24),
    staleTime: 1000 * 60 * 20,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const instantSearchItems = useMemo(
    () => properties.filter((property) => property.status !== "off_market").map((property) => ({
      ...toSearchItem(property),
      description: property.description,
    })),
    [],
  );
  const reviewsQuery = useQuery({ queryKey: ["agency-google-reviews-home"], queryFn: getAgencyReviews });
  const { reducedMotion } = useMotionPreference();
  const siteUrl = getSiteUrl();
  const heroMood = inferPlaceImageMood("Le Havre");
  const heroMotionDirector = useMemo(() => getMotionDirectorProfile(heroMood), [heroMood]);
  const ctaSweepStyle = useMemo(
    () => ({ "--glass-sweep-duration": `${heroMotionDirector.ctaSweepDuration}s` }) as CSSProperties,
    [heroMotionDirector.ctaSweepDuration],
  );

  useSeo({
    title: "Foch Immobilier | Immobilier d'exception au Havre",
    description:
      "Depuis 1972, Foch Immobilier accompagne vos projets de vente, location et gestion locative au Havre et sur le littoral.",
    canonicalPath: "/",
    image: "/images/agence-foch.jpg",

  });

  return (
    <div className="homepage-page w-full min-w-0 overflow-x-clip">
      <section className="relative z-20 overflow-visible">
        <img
          src={HERO_IMAGE_URL}
          alt="Scène de plage au Havre, peinture de Raoul Dufy"
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/38 via-black/16 to-black/0" />
        <div className="page-banner homepage-hero-content container relative z-[5] mx-auto flex flex-col justify-center px-4 py-5 md:py-8">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0.3 : heroMotionDirector.revealDuration }}
            className="max-w-4xl font-display text-3xl text-white md:text-5xl"
          >
            <span className="block text-4xl font-semibold sm:text-5xl md:text-7xl">Depuis 1972</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0.3 : heroMotionDirector.revealDuration, delay: reducedMotion ? 0.08 : heroMotionDirector.revealStagger * 2 }}
            className="mt-3 max-w-2xl text-base text-white drop-shadow-sm md:text-lg"
          >
            Notre cabinet accompagne vendeurs et acquéreurs avec une approche sur mesure.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0.3 : heroMotionDirector.revealDuration, delay: reducedMotion ? 0.12 : heroMotionDirector.revealStagger * 3 }}
            className="mt-6"
            style={ctaSweepStyle}
          >
            <MainSearchBar seedItems={instantSearchItems} />
          </motion.div>
        </div>
      </section>
      <div className="container mx-auto px-4 pt-2 text-muted-foreground">
        <span className="sr-only">Crédit photo : </span>
        <PhotoAttribution credit={HERO_IMAGE_CREDIT} className="max-w-5xl break-words text-[11px] leading-snug sm:text-xs" />
      </div>
      <section data-live-content="/biens" className="container mx-auto px-4 pt-5 pb-12 md:pt-8 md:pb-12">
        <ScrollReveal mood={heroMood}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl">Sélection du moment</h2>
            </div>
            <Link to="/biens" className="inline-flex items-center gap-1 text-sm hover:underline">
              Découvrir tous les biens
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featuredQuery.isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[320px] animate-pulse rounded-2xl bg-muted/60" />
            ))}
          {(featuredQuery.data ?? []).slice(0, 6).map((property, index) => (
            <ListingCard
              key={property.id}
              item={toSearchItem(property)}
              revealIndex={index}
              className="paper-grain [--paper-grain-opacity:0.032] [--paper-grain-mobile-reduction:0.018]"
            />
          ))}
        </div>
      </section>

      <ScrollReveal mood={heroMood}>
        <BudgetFinder />
      </ScrollReveal>

      <section className="container mx-auto px-4 pb-14">
        <ScrollReveal mood={heroMood}>
          <h2 className="font-display text-3xl">Explorer par ville</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Explorez nos pages locales pour affiner votre recherche sur Le Havre et ses communes voisines.
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
            <Link to="/geographie" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-card">
              Géographie
            </Link>
            <Link to="/avis" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-card">
              <GoogleGIcon size={14} decorative />
              Lire les avis clients
            </Link>
          </div>
        </ScrollReveal>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto grid gap-5 px-4 py-10 md:grid-cols-3">
          {serviceCards.map((card, index) => (
            <ScrollReveal key={card.title} mood={heroMood} delay={Math.min(index * heroMotionDirector.revealStagger, 0.24)}>
              <Link
                to={card.href}
                className="paper-grain paper-grain-soft [--paper-grain-mobile-reduction:0.014] group block h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_18px_44px_-30px_hsl(var(--brand)/0.35)]"
              >
                <card.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:text-brand-strong" />
                <h2 className="mt-4 font-display text-2xl">{card.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {reviewsQuery.data && (
        <section className="container mx-auto px-4 py-12">
          <ScrollReveal mood={heroMood}>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/80 shadow-sm">
                    <GoogleGIcon size={16} decorative />
                  </span>
                  <h2 className="font-display text-3xl">Avis Google</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Note moyenne {reviewsQuery.data.rating.toFixed(1)} / 5 ({reviewsQuery.data.userRatingCount} avis).
                </p>
              </div>
              <Link to="/avis" className="inline-flex items-center gap-1.5 text-sm hover:underline">
                <GoogleGIcon size={14} decorative />
                Consulter les avis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </ScrollReveal>

          {reviewsQuery.data.reviews.length === 0 && (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Aucun commentaire n'est actuellement fourni par Google pour cette fiche. La note reste disponible.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {reviewsQuery.data.reviews.slice(0, 3).map((review, index) => (
              <ScrollReveal key={review.id} mood={heroMood} delay={Math.min(index * heroMotionDirector.revealStagger, 0.24)}>
                <article className="rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_18px_40px_-34px_hsl(var(--brand)/0.3)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{review.authorName}</p>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background/80">
                      <GoogleGIcon size={11} decorative />
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.text}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-12">
        <ScrollReveal mood={heroMood}>
          <h2 className="font-display text-3xl">L'équipe</h2>
          <p className="mt-1 text-sm text-muted-foreground">Des interlocuteurs identifiés pour chaque projet.</p>
        </ScrollReveal>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {agents.map((agent, index) => (
            <ScrollReveal key={agent.id} mood={heroMood} delay={Math.min(index * heroMotionDirector.revealStagger, 0.25)}>
              <article className="group rounded-2xl border border-border p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-[0_18px_40px_-34px_hsl(var(--brand)/0.3)]">
                <AgentInitialsAvatar name={agent.fullName} className="h-16 w-16 text-sm transition-transform duration-300 group-hover:scale-105" />
                <h3 className="mt-3 font-display text-xl">{agent.fullName}</h3>
                <p className="text-sm text-muted-foreground">{agent.role}</p>
                <a className="mt-2 block text-sm hover:underline" href={`tel:${agent.phone.replace(/\s+/g, "")}`}>
                  {agent.phone}
                </a>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </div>
  );
}
