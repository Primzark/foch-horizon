import { LeadForm } from "@/features/leads/components/LeadForm";
import { useSeo } from "@/lib/seo/useSeo";
import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";
import { motion } from "framer-motion";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";

const valuationSteps = [
  {
    number: "01",
    title: "Votre bien, dans le détail",
    description: "Surface, adresse, état et prestations : chaque caractéristique compte.",
  },
  {
    number: "02",
    title: "Le marché autour de vous",
    description: "Nous étudions les transactions comparables au Havre et sur le littoral.",
  },
  {
    number: "03",
    title: "Un avis clair et argumenté",
    description: "Vous recevez une fourchette de prix et un positionnement adapté à votre projet.",
  },
];

function ValuationJourney() {
  const { reducedMotion } = useMotionPreference();

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-secondary/55 p-6 sm:p-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-strong">Notre méthode</p>
        <h2 className="mt-2 font-display text-3xl text-foreground">Comment cela fonctionne</h2>
        <p className="mt-2 text-sm text-muted-foreground">Une estimation argumentée, en trois temps.</p>
      </div>

      <div className="relative mt-6 min-h-[238px] flex-1 overflow-hidden rounded-2xl bg-primary px-4 py-5 text-primary-foreground sm:mt-7 sm:min-h-[252px] sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 z-10 w-20 bg-gradient-to-r from-transparent via-brand/20 to-transparent sm:w-28"
          initial={reducedMotion ? { left: "48%", opacity: 0.08 } : { left: "-20%", opacity: 0.7 }}
          animate={reducedMotion ? { left: "48%", opacity: 0.08 } : { left: ["-20%", "110%"] }}
          transition={reducedMotion ? { duration: 0 } : { duration: 4.4, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
        />

        <div className="relative z-20 flex items-center justify-between gap-3 text-[9px] font-medium uppercase tracking-[0.16em] text-white/65 sm:text-[10px]">
          <span>Lecture du marché</span>
          <span>Le Havre · Littoral</span>
        </div>

        <svg aria-hidden="true" viewBox="0 0 1000 160" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-[42px] h-[calc(100%-75px)] w-full">
          <path d="M160 80 H835" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2" strokeDasharray="5 9" />
          <motion.path
            d="M160 80 H835"
            fill="none"
            stroke="hsl(var(--color-brand))"
            strokeWidth="3"
            initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 1.3, delay: 0.35, ease: "easeOut" }}
          />
          {!reducedMotion && (
            <motion.circle
              r="7"
              cy="80"
              fill="hsl(var(--color-brand))"
              initial={{ cx: 160, opacity: 0 }}
              animate={{ cx: [160, 835], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2.8, delay: 1.4, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
            />
          )}
        </svg>

        <div className="relative z-20 mt-8 grid min-h-[155px] grid-cols-3 items-center gap-1 sm:mt-9 sm:gap-3">
          <div className="flex flex-col items-center text-center">
            <motion.div
              className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] sm:h-[72px] sm:w-[72px]"
              initial={reducedMotion ? false : { scale: 0.72, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 16, delay: 0.1 }}
            >
              {!reducedMotion && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border border-brand/70"
                  animate={{ scale: [1, 1.45], opacity: [0.65, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.6, ease: "easeOut" }}
                />
              )}
              <svg aria-hidden="true" viewBox="0 0 64 64" className="h-9 w-9 overflow-visible sm:h-11 sm:w-11">
                <motion.path
                  d="M8 29 32 9l24 20v27H8Z M23 56V39h18v17 M17 32h7v7h-7z M40 32h7v7h-7z"
                  fill="none"
                  stroke="hsl(var(--color-brand))"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 1.15, delay: 0.2, ease: "easeInOut" }}
                />
              </svg>
            </motion.div>
            <span className="mt-3 text-[9px] font-medium text-white/80 sm:text-xs">Votre bien</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 items-end justify-center gap-1.5 sm:h-[72px] sm:gap-2">
              {[0.42, 0.74, 0.55, 1, 0.66].map((height, index) => (
                <motion.span
                  key={index}
                  aria-hidden="true"
                  className="w-2 rounded-t-sm bg-brand sm:w-3"
                  style={{ height: `${height * 100}%`, transformOrigin: "bottom" }}
                  initial={reducedMotion ? { scaleY: 1 } : { scaleY: 0.08 }}
                  animate={reducedMotion ? { scaleY: 1 } : { scaleY: [0.08, 1, 0.76, 1] }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 2.8, delay: 0.6 + index * 0.14, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
                />
              ))}
            </div>
            <span className="mt-3 text-[9px] font-medium text-white/80 sm:text-xs">Ventes comparables</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <motion.div
              className="w-full max-w-[120px] rounded-lg border border-white/15 bg-white/[0.08] p-2.5 text-left sm:max-w-[160px] sm:p-3"
              initial={reducedMotion ? false : { y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.65, delay: 1, ease: "easeOut" }}
            >
              <span className="block text-[8px] uppercase tracking-[0.13em] text-white/55 sm:text-[9px]">Avis argumenté</span>
              <span className="mt-1.5 block font-display text-xs sm:text-base">Fourchette de valeur</span>
              <span className="relative mt-2 block h-1.5 overflow-hidden rounded-full bg-white/20">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full bg-brand"
                  initial={reducedMotion ? { width: "58%" } : { width: "0%" }}
                  animate={{ width: "58%" }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 1.15, delay: 1.45, ease: "easeOut" }}
                />
                {!reducedMotion && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-primary bg-white shadow-[0_0_12px_hsl(var(--brand)/0.85)]"
                    animate={{ left: ["16%", "72%"] }}
                    transition={{ duration: 2.1, delay: 2.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                  />
                )}
              </span>
            </motion.div>
            <span className="mt-3 text-[9px] font-medium text-white/80 sm:text-xs">Votre positionnement</span>
          </div>
        </div>
      </div>

      <ol className="mt-5 grid gap-4 border-t border-border/70 pt-5 sm:grid-cols-3 sm:gap-5 sm:pt-6">
        {valuationSteps.map((step, index) => (
          <motion.li
            key={step.number}
            className="flex gap-3 sm:block"
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.45, delay: 1.6 + index * 0.12, ease: "easeOut" }}
          >
            <span className="font-display text-lg text-brand-strong sm:text-base">{step.number}</span>
            <div>
              <h3 className="font-display text-lg leading-tight text-foreground sm:mt-1">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </article>
  );
}

export default function EstimationPageV2() {
  useSeo({
    title: "Avis de valeur | Foch Immobilier",
    description: "Demandez un avis de valeur argumenté pour votre bien avec un conseiller Foch Immobilier.",
    canonicalPath: "/estimation",
  });

  return (
    <>
      <StorefrontPageHero
        eyebrow="Votre projet de vente"
        title="Avis de valeur"
        description="Décrivez votre bien et vos contraintes de calendrier. Un conseiller dédié vous recontacte avec un avis de valeur argumenté."
      />

      <section className="container mx-auto px-4 py-10">
        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <ValuationJourney />
          <LeadForm
            source="estimation"
            title="Demander un avis de valeur"
            description="Nous revenons vers vous sous 24h ouvrées."
            ctaLabel="Recevoir mon avis de valeur"
            showAppointmentFields
          />
        </div>
      </section>
    </>
  );
}
