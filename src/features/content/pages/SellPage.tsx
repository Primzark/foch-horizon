import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Camera, CheckCircle2, FileCheck2, Megaphone, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cityById } from "@/features/cities/data/cities";
import { getFeaturedProperties } from "@/features/listings/api/properties.service";
import {
  formatPrice,
  formatPropertyTypeLabel,
  toCanonicalPropertyPath,
} from "@/features/listings/utils/formatting";
import { useSeo } from "@/lib/seo/useSeo";

const fallbackImages = [
  "https://www.fochimmobilier.com/static/img/fochimmobilier-agence-immobiliere-le-havre-76_1.jpg",
  "https://www.fochimmobilier.com/static/img/fochimmobilier-agence-immobiliere-le-havre-76_2.jpg",
];

const commitments = [
  "Avis de valeur argumenté avec analyse locale.",
  "Mise en marché premium: photos, descriptif, diffusion ciblée.",
  "Qualification acheteurs et organisation des visites.",
  "Accompagnement administratif jusqu'à la signature.",
];

const workflow = [
  {
    title: "Estimation précise",
    description:
      "Croisement des ventes comparables, état du bien et dynamique du secteur pour définir un prix de mise en marché cohérent.",
    Icon: Camera,
  },
  {
    title: "Valorisation éditoriale",
    description:
      "Sélection photos, angle narratif de l'annonce et diffusion multi-supports pour attirer des acquéreurs qualifiés.",
    Icon: Sparkles,
  },
  {
    title: "Pilotage des visites",
    description:
      "Préqualification, retours structurés après visite et ajustements tactiques selon la réaction du marché.",
    Icon: Users,
  },
  {
    title: "Sécurisation juridique",
    description:
      "Suivi du compromis, coordination notaire et contrôle des pièces jusqu'à la signature définitive.",
    Icon: FileCheck2,
  },
];

export default function SellPage() {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const heroShift = useTransform(scrollYProgress, [0, 1], [reducedMotion ? 0 : 34, reducedMotion ? 0 : -32]);
  const accentShift = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : 56]);

  const featuredQuery = useQuery({
    queryKey: ["sell-featured"],
    queryFn: () => getFeaturedProperties(6),
  });

  const showcaseProperties = useMemo(
    () => (featuredQuery.data ?? []).filter((property) => property.images[0]?.sourceUrl).slice(0, 3),
    [featuredQuery.data],
  );

  const heroImage = showcaseProperties[0]?.images[0]?.sourceUrl ?? fallbackImages[0];
  const ambientImage = showcaseProperties[1]?.images[0]?.sourceUrl ?? fallbackImages[1];

  useSeo({
    title: "Vendre | Foch Immobilier",
    description: "Un accompagnement structuré et premium pour vendre votre bien dans la région du Havre.",
    canonicalPath: "/vendre",
  });

  return (
    <section className="relative overflow-hidden py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_14%,rgba(46,202,106,0.12),transparent_38%),radial-gradient(circle_at_80%_84%,rgba(14,29,44,0.12),transparent_44%)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-28 top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        style={{ y: accentShift }}
      />

      <div ref={sectionRef} className="container relative mx-auto px-4">
        <div className="grid gap-7 xl:grid-cols-[1.08fr_0.92fr]">
          <motion.header
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vendre</p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl">Vendre avec méthode, du mandat à l'acte</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Notre équipe construit une stratégie de mise en vente cohérente avec votre bien, votre calendrier et le
              marché local. L'objectif: défendre votre prix et sécuriser le délai de vente.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {commitments.map((point, index) => (
                <motion.p
                  key={point}
                  initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.24, delay: Math.min(index * 0.05, 0.2), ease: "easeOut" }}
                  className="inline-flex rounded-full border border-border bg-card px-3 py-2 text-xs text-foreground/90"
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-accent" />
                  {point}
                </motion.p>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/estimation">Demander une estimation</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contact">Parler à un conseiller</Link>
              </Button>
            </div>
          </motion.header>

          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.34, ease: "easeOut" }}
            className="grid gap-4"
          >
            <motion.figure
              style={{ y: heroShift }}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_26px_56px_-36px_rgba(9,22,34,0.55)]"
            >
              <img
                src={heroImage}
                alt="Mise en vente par Foch Immobilier"
                className="h-[320px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] md:h-[380px]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 p-5">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white backdrop-blur">
                  <ShieldCheck className="h-3.5 w-3.5" /> Pilotage premium de la vente
                </p>
                <p className="mt-2 text-sm text-white/90">Depuis 1972, une lecture fine du marché havrais.</p>
              </figcaption>
            </motion.figure>

            <figure className="overflow-hidden rounded-2xl border border-border bg-card">
              <img
                src={ambientImage}
                alt="Valorisation d'annonce immobilière"
                className="h-40 w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                loading="lazy"
              />
            </figure>
          </motion.div>
        </div>

        <section className="mt-14">
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="flex flex-wrap items-end justify-between gap-3"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Processus</p>
              <h2 className="mt-1 font-display text-3xl">Notre méthode de vente en 4 étapes</h2>
            </div>
            <p className="text-sm text-muted-foreground">Une exécution claire, lisible et suivie du début à la fin.</p>
          </motion.div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workflow.map((step, index) => (
              <motion.article
                key={step.title}
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.24, delay: Math.min(index * 0.05, 0.2), ease: "easeOut" }}
                className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-[0_22px_46px_-34px_rgba(11,24,35,0.45)]"
              >
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/40 text-xs font-medium">
                  {index + 1}
                </div>
                <step.Icon className="mt-4 h-5 w-5 text-accent" />
                <h3 className="mt-3 font-display text-2xl">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-6 xl:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mise en lumière</p>
                <h2 className="mt-1 font-display text-3xl">Exemples de biens en vitrine</h2>
              </div>
              <Button variant="ghost" asChild>
                <Link to="/biens" className="inline-flex items-center gap-1">
                  Voir toutes les annonces
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {featuredQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-[280px] animate-pulse rounded-2xl bg-muted/60" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {showcaseProperties.length > 0
                  ? showcaseProperties.map((property, index) => {
                      const cover = property.images[0]?.sourceUrl;
                      const city = cityById.get(property.cityId);
                      if (!cover) {
                        return null;
                      }

                      return (
                        <motion.article
                          key={property.id}
                          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.25 }}
                          transition={{ duration: 0.24, delay: Math.min(index * 0.05, 0.2), ease: "easeOut" }}
                          className="group overflow-hidden rounded-2xl border border-border bg-card"
                        >
                          <Link to={toCanonicalPropertyPath({ id: property.id, slug: property.slug })}>
                            <div className="relative overflow-hidden">
                              <img
                                src={cover}
                                alt={property.title}
                                className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
                              <span className="absolute left-3 top-3 rounded-full bg-background/95 px-2 py-1 text-xs">
                                {formatPropertyTypeLabel(property.propertyType)}
                              </span>
                              <p className="absolute bottom-3 left-3 font-display text-xl text-white">
                                {formatPrice(property.priceAmount, property.transactionType)}
                              </p>
                            </div>
                            <div className="p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                Réf {property.id}
                              </p>
                              <h3 className="mt-1 font-display text-xl">{property.title}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">{city?.name ?? "Le Havre"}</p>
                            </div>
                          </Link>
                        </motion.article>
                      );
                    })
                  : fallbackImages.map((imageUrl, index) => (
                      <motion.article
                        key={`fallback-${index}`}
                        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.24, delay: Math.min(index * 0.05, 0.2), ease: "easeOut" }}
                        className="group overflow-hidden rounded-2xl border border-border bg-card"
                      >
                        <div className="relative overflow-hidden">
                          <img
                            src={imageUrl}
                            alt="Vitrine Foch Immobilier"
                            className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                          <p className="absolute bottom-3 left-3 font-display text-lg text-white">Foch Immobilier · Le Havre</p>
                        </div>
                        <div className="p-4">
                          <h3 className="font-display text-xl">Mise en vente accompagnée</h3>
                          <p className="mt-1 text-sm text-muted-foreground">Préparation, diffusion et négociation.</p>
                        </div>
                      </motion.article>
                    ))}
              </div>
            )}
          </div>

          <motion.aside
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="h-fit rounded-3xl border border-border bg-card p-6 xl:sticky xl:top-24"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              <Megaphone className="h-3.5 w-3.5" />
              Stratégie de commercialisation
            </div>
            <h3 className="mt-4 font-display text-3xl">Lancer votre projet de vente</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Recevez un plan de vente adapté à votre bien: positionnement prix, plan média, timing et accompagnement
              notarial.
            </p>
            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              <p>• Analyse de marché locale</p>
              <p>• Pilotage des visites et des offres</p>
              <p>• Suivi complet jusqu'à l'acte</p>
            </div>
            <div className="mt-6 grid gap-2">
              <Button asChild>
                <Link to="/estimation">Estimer mon bien</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contact">Échanger avec l'agence</Link>
              </Button>
            </div>
          </motion.aside>
        </section>
      </div>
    </section>
  );
}
