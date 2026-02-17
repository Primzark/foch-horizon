import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  Building2,
  Compass,
  Download,
  ExternalLink,
  Facebook,
  Handshake,
  KeyRound,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cityById } from "@/features/cities/data/cities";
import { getFeaturedProperties } from "@/features/listings/api/properties.service";
import { agents } from "@/features/listings/data/agents";
import { formatPrice, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { useSeo } from "@/lib/seo/useSeo";

const aboutImageOne = "https://www.fochimmobilier.com/static/img/fochimmobilier-agence-immobiliere-le-havre-76_1.jpg";
const aboutImageTwo = "https://www.fochimmobilier.com/static/img/fochimmobilier-agence-immobiliere-le-havre-76_2.jpg";
const feesPdfUrl = "https://www.fochimmobilier.com/static/pdf/honoraires-fochimmobilier-le-havre-76.pdf";

const trustPoints = [
  {
    title: "Depuis 1972",
    description: "Une présence locale continue sur le marché immobilier havrais.",
    Icon: ShieldCheck,
  },
  {
    title: "Réseau UNIS",
    description: "Une pratique alignée avec les standards professionnels du secteur.",
    Icon: Landmark,
  },
  {
    title: "Transaction & location",
    description: "Un accompagnement complet pour vendre, acheter ou louer.",
    Icon: Handshake,
  },
  {
    title: "Administration de biens",
    description: "Gestion locative et suivi opérationnel des actifs immobiliers.",
    Icon: Building2,
  },
];

const serviceCards = [
  {
    title: "Estimation",
    description: "Évaluation argumentée de votre bien à partir de notre connaissance du marché local.",
    href: "/estimation",
    Icon: Compass,
  },
  {
    title: "Vente",
    description: "Mise en valeur, qualification des acquéreurs et suivi jusqu'à l'acte.",
    href: "/vendre",
    Icon: Handshake,
  },
  {
    title: "Location et gestion",
    description: "Recherche locataire, constitution du dossier, suivi administratif et technique.",
    href: "/services",
    Icon: KeyRound,
  },
];

export default function AboutPageV2() {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const imageShift = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : -20]);
  const accentShift = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : 48]);
  const reveal = (delay = 0) =>
    reducedMotion
      ? { initial: { opacity: 1 }, whileInView: { opacity: 1 }, viewport: { once: true, amount: 0.2 } }
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.3, delay, ease: "easeOut" as const },
        };

  const featuredQuery = useQuery({
    queryKey: ["about-featured"],
    queryFn: () => getFeaturedProperties(3),
  });

  const showcaseProperties = useMemo(
    () => (featuredQuery.data ?? []).filter((property) => property.images[0]?.sourceUrl).slice(0, 3),
    [featuredQuery.data],
  );

  useSeo({
    title: "À propos | Foch Immobilier",
    description:
      "Professionnels de l'immobilier au Havre depuis 1972. Conseils de professionnels et réseau UNIS.",
    canonicalPath: "/apropos",
  });

  return (
    <section className="relative overflow-hidden py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(188,165,132,0.14),transparent_42%),radial-gradient(circle_at_82%_86%,rgba(14,29,44,0.09),transparent_40%)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
        style={{ y: accentShift }}
      />

      <div className="container relative mx-auto px-4">
        <motion.header {...reveal()} className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">L'agence</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Professionnels de l'immobilier au Havre</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Agence immobilière depuis <strong>1972</strong>. Conseils de <strong>Professionnels</strong> et réseau{" "}
            <strong>UNIS</strong>.
          </p>
        </motion.header>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {trustPoints.map((point, index) => (
            <motion.article
              key={point.title}
              {...reveal(Math.min(index * 0.05, 0.18))}
              className="rounded-2xl border border-border bg-card/90 p-4"
            >
              <point.Icon className="h-4 w-4 text-accent" />
              <h2 className="mt-3 font-display text-2xl">{point.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{point.description}</p>
            </motion.article>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <motion.figure
            {...reveal(0.02)}
            style={{ y: imageShift }}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_64px_-48px_rgba(12,20,30,0.75)]"
          >
            <img
              src={aboutImageOne}
              alt="Agence immobilière Foch Immobilier au Havre, réseau UNIS"
              className="h-[330px] w-full bg-muted/20 object-contain object-center transition-transform duration-500 group-hover:scale-[1.01] md:h-[400px]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
            <figcaption className="absolute bottom-0 p-5 text-sm text-white/90">Agence immobilière depuis 1972.</figcaption>
          </motion.figure>

          <motion.article
            {...reveal(0.05)}
            className="rounded-3xl border border-border bg-card/85 p-7 shadow-[0_18px_40px_-34px_rgba(22,35,50,0.6)]"
          >
            <h2 className="font-display text-3xl">
              L'agence <span className="text-accent">Foch</span> Immobilier au Havre
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Vous souhaitez vendre votre bien immobilier en toute tranquillité, n'hésitez pas à nous contacter, notre
                équipe commerciale se tient à votre disposition pour estimer gratuitement votre bien.
              </p>
              <p>
                Notre parfaite connaissance de la région Havraise et du marché de l'immobilier nous permet de vous proposer
                des estimations gratuites réalistes.
              </p>
              <p>
                Vous recherchez un bien immobilier, vous pouvez le trouver sur notre site immobilier ou venir le découvrir
                du lundi au samedi dans notre agence du Havre. N'hésitez pas à nous contacter pour visiter un bien, ou pour
                toute autre information. Si vous recherchez un bien nous trouverons avec vous la meilleure solution.
              </p>
              <p>
                Vous recherchez une location, vous pouvez la trouver sur notre site immobilier ou venir la découvrir du
                lundi au samedi dans notre agence du Havre. N'hésitez pas à nous contacter pour visiter un bien, ou pour
                toute autre information. Si vous recherchez une location nous trouverons avec vous la meilleure solution.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/contact">Nous contacter</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/honoraires">Consulter les honoraires</Link>
              </Button>
              <Button variant="ghost" asChild>
                <a href={feesPdfUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  PDF officiel
                </a>
              </Button>
            </div>
          </motion.article>
        </div>

        <motion.section {...reveal(0.08)} className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prestations</p>
              <h2 className="mt-1 font-display text-3xl">Nos accompagnements</h2>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/services" className="inline-flex items-center gap-1">
                Voir tous les services
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {serviceCards.map((service, index) => (
              <motion.article
                key={service.title}
                {...reveal(Math.min(index * 0.05, 0.16))}
                className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-[0_22px_46px_-34px_rgba(11,24,35,0.45)]"
              >
                <service.Icon className="h-5 w-5 text-accent" />
                <h3 className="mt-4 font-display text-2xl">{service.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
                <Button variant="link" asChild className="mt-3 px-0">
                  <Link to={service.href}>Découvrir</Link>
                </Button>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section {...reveal(0.12)} className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">En vitrine</p>
              <h2 className="mt-1 font-display text-3xl">Sélection du moment</h2>
            </div>
            <Button variant="ghost" asChild>
              <Link to="/biens">Voir les biens</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
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
                      {...reveal(Math.min(index * 0.05, 0.16))}
                      className="group overflow-hidden rounded-2xl border border-border bg-card"
                    >
                      <Link to={toCanonicalPropertyPath({ id: property.id, slug: property.slug })}>
                        <div className="relative overflow-hidden">
                          <img
                            src={cover}
                            alt={property.title}
                            className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                          <p className="absolute bottom-3 left-3 font-display text-lg text-white">
                            {formatPrice(property.priceAmount, property.transactionType)}
                          </p>
                        </div>
                        <div className="p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Réf {property.id}</p>
                          <h3 className="mt-1 font-display text-xl">{property.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{city?.name ?? "Le Havre"}</p>
                        </div>
                      </Link>
                    </motion.article>
                  );
                })
              : [aboutImageOne, aboutImageTwo].map((imageUrl, index) => (
                  <motion.article
                    key={`fallback-${index}`}
                    {...reveal(Math.min(index * 0.05, 0.16))}
                    className="group overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={imageUrl}
                        alt="Foch Immobilier Le Havre"
                        className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-xl">Accompagnement local</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Vente, location et administration de biens.</p>
                    </div>
                  </motion.article>
                ))}
            {featuredQuery.isLoading &&
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-[270px] animate-pulse rounded-2xl bg-muted/60" />
              ))}
          </div>
        </motion.section>

        <motion.figure {...reveal(0.16)} className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
          <img
            src={aboutImageTwo}
            alt="Agence immobilière Foch Immobilier au Havre"
            className="h-[280px] w-full bg-muted/20 object-contain object-center transition-transform duration-500 hover:scale-[1.01] md:h-[340px]"
            loading="lazy"
          />
        </motion.figure>

        <motion.section {...reveal(0.2)} className="mt-12">
          <h2 className="font-display text-3xl">
            <a
              href="https://www.economie.gouv.fr/dgccrf/Publications/Vie-pratique/Fiches-pratiques/Agent-immobilier"
              target="_blank"
              rel="noreferrer noopener"
              className="underline-offset-4 hover:underline"
            >
              Nos agents immobiliers au Havre
            </a>
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {agents.map((agent, index) => (
              <motion.article
                key={agent.id}
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.05, 0.22), ease: "easeOut" }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_58px_-42px_rgba(20,33,46,0.7)]"
              >
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-accent/10 via-transparent to-accent/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <img src={agent.portraitUrl} alt={agent.fullName} className="relative h-16 w-16 rounded-full object-cover" loading="lazy" />
                <h3 className="mt-3 font-display text-2xl">{agent.fullName}</h3>
                <p className="text-sm text-muted-foreground">{agent.role}</p>
                <p className="mt-3 text-sm text-muted-foreground">{agent.bio}</p>
                <div className="mt-4 text-sm">
                  <a href={`tel:${agent.phone.replace(/\s+/g, "")}`} className="block hover:underline">
                    {agent.phone}
                  </a>
                  {agent.mobile && (
                    <a href={`tel:${agent.mobile.replace(/\s+/g, "")}`} className="block hover:underline">
                      {agent.mobile}
                    </a>
                  )}
                  <a href={`mailto:${agent.email}`} className="block hover:underline">
                    {agent.email}
                  </a>
                </div>
                {agent.facebookUrl && (
                  <a
                    href={agent.facebookUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-4 inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </motion.article>
            ))}
          </div>
        </motion.section>
      </div>
    </section>
  );
}
