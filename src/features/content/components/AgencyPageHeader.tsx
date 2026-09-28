import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";

type AgencyPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

/** The agency photograph supplied by Foch, kept separate from text for legibility. */
export function AgencyPageHeader({ eyebrow, title, description, children, className }: AgencyPageHeaderProps) {
  const { reducedMotion } = useMotionPreference();

  return (
    <header className={cn("grid items-center gap-7 border-b border-border pb-8 md:grid-cols-[1.15fr_1fr] md:gap-12", className)}>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
        {children}
      </motion.div>
      <figure className="overflow-hidden rounded-xl bg-muted">
        <img
          src="/images/agence-foch.jpg"
          alt="Façade de l'agence Foch Immobilier, avenue Foch au Havre"
          width={1600}
          height={1200}
          className="aspect-[4/3] max-h-80 w-full object-cover object-[center_56%]"
          decoding="async"
        />
      </figure>
    </header>
  );
}
