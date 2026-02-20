import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Download, ExternalLink, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agents } from "@/features/listings/data/agents";
import { useSeo } from "@/lib/seo/useSeo";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";

const aboutImageOne = "https://www.fochimmobilier.com/static/img/fochimmobilier-agence-immobiliere-le-havre-76_1.jpg";
const aboutImageTwo = "https://www.fochimmobilier.com/static/img/fochimmobilier-agence-immobiliere-le-havre-76_2.jpg";
const feesPdfUrl = "https://www.fochimmobilier.com/static/pdf/honoraires-fochimmobilier-le-havre-76.pdf";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.32, ease: "easeOut" as const },
};

export default function AboutPageV2() {
  const { reducedMotion } = useMotionPreference();
  const { scrollYProgress } = useScroll();
  const imageShift = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : -22]);

  useSeo({
    title: "À propos | Foch Immobilier",
    description:
      "Foch Immobilier accompagne vos projets immobiliers au Havre depuis 1972, avec un service haut de gamme et sur mesure.",
    canonicalPath: "/apropos",
  });

  return (
    <section className="relative overflow-hidden py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(188,165,132,0.14),transparent_42%),radial-gradient(circle_at_82%_86%,rgba(14,29,44,0.09),transparent_40%)]" />

      <div className="container relative mx-auto px-4">
        <motion.header {...fadeUp} className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">L'agence</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">L'exigence immobilière depuis 1972</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Foch Immobilier conseille et accompagne ses clients au Havre avec la rigueur d'une maison indépendante, membre du réseau <strong>UNIS</strong>.
          </p>
        </motion.header>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <motion.figure
            {...fadeUp}
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
            {...fadeUp}
            className="rounded-3xl border border-border bg-card/85 p-7 shadow-[0_18px_40px_-34px_rgba(22,35,50,0.6)]"
          >
            <h2 className="font-display text-3xl">
              L'agence <span className="text-accent">Foch</span> Immobilier au Havre
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Nous pilotons chaque projet avec méthode: analyse de marché, valorisation du bien, sélection des acquéreurs
                et suivi jusqu'à l'acte.
              </p>
              <p>
                Notre connaissance fine du marché havrais nous permet de proposer des estimations fiables, une stratégie de
                commercialisation cohérente et un accompagnement réellement sur mesure.
              </p>
              <p>
                Pour un achat, une vente ou une location, vous bénéficiez d'un interlocuteur dédié, disponible à chaque étape.
              </p>
              <p>
                Notre objectif reste constant: défendre vos intérêts, sécuriser les décisions et offrir une expérience premium,
                claire et sereine.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="brand">
                <Link to="/contact">Nous contacter</Link>
              </Button>
              <Button variant="brand" asChild>
                <Link to="/honoraires">Consulter les honoraires</Link>
              </Button>
              <Button variant="brand" asChild>
                <a href={feesPdfUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  PDF officiel
                </a>
              </Button>
            </div>
          </motion.article>
        </div>

        <motion.figure {...fadeUp} className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
          <img
            src={aboutImageTwo}
            alt="Agence immobilière Foch Immobilier au Havre"
            className="h-[280px] w-full bg-muted/20 object-contain object-center transition-transform duration-500 hover:scale-[1.01] md:h-[340px]"
            loading="lazy"
          />
        </motion.figure>

        <motion.section {...fadeUp} className="mt-12">
          <h2 className="font-display text-3xl">
              <a
                href="https://www.economie.gouv.fr/dgccrf/Publications/Vie-pratique/Fiches-pratiques/Agent-immobilier"
                target="_blank"
                rel="noreferrer noopener"
                className="underline-offset-4 hover:underline"
              >
                Nos conseillers immobiliers au Havre
              </a>
            </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {agents.map((agent, index) => (
              <motion.article
                key={agent.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.28, delay: index * 0.05, ease: "easeOut" }}
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
