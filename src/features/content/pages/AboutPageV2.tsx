import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Download, ExternalLink, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agents } from "@/features/listings/data/agents";
import { useSeo } from "@/lib/seo/useSeo";

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
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const imageShift = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : -22]);

  useSeo({
    title: "À propos | Foch Immobilier",
    description:
      "Professionnels de l'immobilier au Havre depuis 1972. Conseils de professionnels et réseau UNIS.",
    canonicalPath: "/apropos",
  });

  return (
    <section className="relative overflow-hidden py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(188,165,132,0.14),transparent_42%),radial-gradient(circle_at_82%_86%,rgba(14,29,44,0.09),transparent_40%)]" />

      <div className="container relative mx-auto px-4">
        <motion.header {...fadeUp} className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">L'agence</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Professionnels de l'immobilier au Havre</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Agence immobilière depuis <strong>1972</strong>. Conseils de <strong>Professionnels</strong> et réseau <strong>UNIS</strong>.
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
              className="h-full min-h-[300px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
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
                Vous souhaitez vendre votre bien immobilier en toute tranquillité, n'hésitez pas à nous contacter, notre
                équipe commerciale se tient à votre disposition pour estimer gratuitement votre bien.
              </p>
              <p>
                Notre parfaite connaissance de la région Havraise et du marché de l'immobilier nous permet de vous proposer
                des estimations gratuites réalistes.
              </p>
              <p>
                Vous recherchez un bien immobilier, vous pouvez le trouver sur notre site immobilier ou venir le découvrir du
                lundi au samedi dans notre agence du Havre. N'hésitez pas à nous contacter pour visiter un bien, ou pour
                toute autre information. Si vous recherchez un bien nous trouverons avec vous la meilleure solution.
              </p>
              <p>
                Vous recherchez une location, vous pouvez la trouver sur notre site immobilier ou venir la découvrir du lundi
                au samedi dans notre agence du Havre. N'hésitez pas à nous contacter pour visiter un bien, ou pour toute
                autre information. Si vous recherchez une location nous trouverons avec vous la meilleure solution.
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

        <motion.figure {...fadeUp} className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
          <img
            src={aboutImageTwo}
            alt="Agence immobilière Foch Immobilier au Havre"
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
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
              Nos agents immobiliers au Havre
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
