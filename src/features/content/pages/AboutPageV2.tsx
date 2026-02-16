import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Download, ExternalLink, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agents } from "@/features/listings/data/agents";
import { useSeo } from "@/lib/seo/useSeo";

const legacyAboutImageUrl = "https://www.foch-immobilier.fr/images/cro/1.jpg";
const feesPdfUrl = "https://www.foch-immobilier.fr/static/pdf/honoraires-fochimmobilier-le-havre-76.pdf";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.32, ease: "easeOut" as const },
};

export default function AboutPageV2() {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const imageShift = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : -26]);

  useSeo({
    title: "L'agence | Foch Immobilier",
    description: "Foch Immobilier vous accompagne au Havre depuis 1972 en vente, location et administration de biens.",
    canonicalPath: "/apropos",
  });

  return (
    <section className="relative overflow-hidden py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(196,171,134,0.12),transparent_42%),radial-gradient(circle_at_88%_84%,rgba(20,33,46,0.08),transparent_40%)]" />

      <div className="container relative mx-auto px-4">
        <motion.header {...fadeUp} className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">L'agence</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Foch Immobilier vous accompagne</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Foch Immobilier est une agence familiale en constante évolution, implantée au Havre et active sur l'ensemble de
            la côte. Depuis 1972, notre équipe accompagne les vendeurs, acquéreurs, bailleurs et locataires avec un suivi
            précis à chaque étape.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            En tant que membre du <strong>réseau UNIS</strong>, nous défendons une pratique exigeante: transparence,
            disponibilité, conformité et conseil local concret.
          </p>
        </motion.header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.article {...fadeUp} className="rounded-3xl border border-border bg-card/80 p-7 shadow-[0_14px_42px_-38px_rgba(21,28,38,0.6)]">
            <h2 className="font-display text-3xl">Les services proposés par Foch Immobilier</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                <strong>Estimation et transaction immobilière.</strong> Vous souhaitez vendre votre bien au Havre ou sur le
                littoral ? Nous réalisons une estimation argumentée puis un accompagnement complet, de la mise en marché
                jusqu'à la signature.
              </p>
              <p>
                <strong>Logement à louer et gestion locative.</strong> Nous proposons des biens en location et assurons la
                gestion propriétaire-locataire avec une communication continue et un suivi administratif rigoureux.
              </p>
              <p>
                <strong>Administration de biens.</strong> Notre équipe coordonne la gestion courante, le relationnel
                prestataires et les obligations réglementaires pour sécuriser la durée.
              </p>
              <p>
                <strong>Prendre rendez-vous avec Foch Immobilier.</strong> Notre agence vous accompagne dans vos projets
                immobiliers au Havre. Contactez-nous pour définir une stratégie claire et adaptée à votre bien.
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

          <motion.figure
            {...fadeUp}
            style={{ y: imageShift }}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_60px_-44px_rgba(8,14,24,0.7)]"
          >
            <img
              src={legacyAboutImageUrl}
              alt="Façade historique de l'agence Foch Immobilier"
              className="h-full w-full min-h-[320px] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
            <figcaption className="absolute bottom-0 p-5 text-sm text-white/90">
              Agence Foch Immobilier, 109 Av. Foch à Le Havre.
            </figcaption>
          </motion.figure>
        </div>

        <motion.section {...fadeUp} className="mt-12">
          <h2 className="font-display text-3xl">L'équipe</h2>
          <p className="mt-2 text-sm text-muted-foreground">Des interlocuteurs identifiés, joignables directement, projet par projet.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {agents.map((agent, index) => (
              <motion.article
                key={agent.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.28, delay: index * 0.06, ease: "easeOut" }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_-38px_rgba(22,35,50,0.65)]"
              >
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-accent/8 via-transparent to-accent/8 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <img src={agent.portraitUrl} alt={agent.fullName} className="relative h-16 w-16 rounded-full object-cover" loading="lazy" />
                <h3 className="mt-3 font-display text-2xl">{agent.fullName}</h3>
                <p className="text-sm text-muted-foreground">{agent.role}</p>
                <p className="mt-3 text-sm text-muted-foreground">{agent.bio}</p>
                <div className="mt-4 text-sm">
                  <a href={`tel:${agent.phone.replace(/\s+/g, "")}`} className="block hover:underline">
                    {agent.phone}
                  </a>
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

        <motion.section {...fadeUp} className="mt-10 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-3xl">En savoir plus sur la profession</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Informations officielles sur les obligations et responsabilités des professionnels de l'immobilier.
          </p>
          <a
            href="https://www.service-public.fr/particuliers/vosdroits/F32990"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
          >
            Consulter la page Service-Public.fr
            <ExternalLink className="h-4 w-4" />
          </a>
        </motion.section>
      </div>
    </section>
  );
}
