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

      <ol className="relative mt-7 space-y-5 sm:mt-8 sm:space-y-6">
        <motion.span
          aria-hidden="true"
          className="absolute bottom-7 left-[19px] top-7 w-px origin-top bg-brand/35"
          initial={reducedMotion ? false : { scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        {valuationSteps.map((step, index) => (
          <motion.li
            key={step.number}
            className="relative flex gap-4 sm:gap-5"
            initial={reducedMotion ? false : { opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.42, delay: reducedMotion ? 0 : index * 0.12, ease: "easeOut" }}
          >
            <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-background font-display text-base text-brand-strong shadow-sm">
              {step.number}
            </span>
            <div className="pt-0.5">
              <h3 className="font-display text-xl leading-tight text-foreground">{step.title}</h3>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          </motion.li>
        ))}
      </ol>

      <div className="relative mt-7 overflow-hidden rounded-xl bg-primary px-5 py-4 text-primary-foreground sm:mt-auto sm:pt-5">
        <svg
          aria-hidden="true"
          viewBox="0 0 620 90"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 top-0 h-full w-full opacity-70"
        >
          <path d="M0 17 C90 7 116 32 209 18 S343 9 412 25 S538 27 620 11" fill="none" stroke="rgba(255,255,255,.09)" />
          <path d="M0 37 C75 27 136 52 210 38 S326 29 412 45 S536 47 620 31" fill="none" stroke="rgba(255,255,255,.11)" />
          <path d="M0 57 C81 47 132 72 210 58 S328 49 412 65 S542 67 620 51" fill="none" stroke="rgba(255,255,255,.12)" />
          <path d="M0 77 C81 67 132 92 210 78 S328 69 412 85 S542 87 620 71" fill="none" stroke="rgba(255,255,255,.1)" />
          <motion.path
            d="M42 62 C140 62 152 28 254 28 S371 62 470 62 S540 39 578 39"
            fill="none"
            stroke="hsl(var(--color-brand))"
            strokeWidth="2"
            strokeDasharray="5 7"
            initial={false}
            animate={reducedMotion ? { strokeDashoffset: 0 } : { strokeDashoffset: [24, 0] }}
            transition={reducedMotion ? { duration: 0 } : { duration: 2.8, repeat: Infinity, ease: "linear" }}
          />
          {[42, 254, 470, 578].map((cx, index) => (
            <g key={cx}>
              <circle cx={cx} cy={[62, 28, 62, 39][index]} r="5" fill="hsl(var(--color-brand))" />
              <motion.circle
                cx={cx}
                cy={[62, 28, 62, 39][index]}
                r="10"
                fill="none"
                stroke="hsl(var(--color-brand))"
                strokeWidth="1"
                initial={false}
                animate={reducedMotion ? { opacity: 0.2, r: 10 } : { opacity: [0.45, 0], r: [7, 15] }}
                transition={reducedMotion ? { duration: 0 } : { duration: 2.2, delay: index * 0.3, repeat: Infinity, ease: "easeOut" }}
              />
            </g>
          ))}
        </svg>
        <div className="relative z-10 flex items-center justify-between gap-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">Lecture du marché local</p>
          <span className="text-[10px] tracking-wide text-white/60">LE HAVRE · LITTORAL</span>
        </div>
        <div className="relative z-10 mt-10 grid grid-cols-3 gap-2 text-[10px] font-medium text-white/85 sm:mt-11 sm:text-xs">
          <span>Votre bien</span>
          <span className="text-center">Ventes comparables</span>
          <span className="text-right">Positionnement</span>
        </div>
      </div>
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
