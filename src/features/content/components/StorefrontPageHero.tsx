import type { ReactNode } from "react";

type StorefrontPageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

/** Full-bleed storefront hero shared by the primary navigation pages. */
export function StorefrontPageHero({ eyebrow, title, description, children }: StorefrontPageHeroProps) {
  const backgroundImage = "/images/geography/foch-storefront.webp";

  return (
    <section className="storefront-page-hero relative isolate overflow-hidden bg-slate-950">
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        width={1448}
        height={678}
        loading="eager"
        decoding="async"
        fetchpriority="high"
        className="storefront-page-hero__background absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div aria-hidden="true" className="storefront-page-hero__scrim pointer-events-none absolute inset-0 -z-[5]" />
      <div className="page-banner storefront-page-hero__content container mx-auto flex items-center px-4 py-6 md:py-8">
        <header className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.22em] text-white/80">{eyebrow}</p>
          <h1 className="mt-4 font-display text-3xl leading-tight text-white md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85">{description}</p>
          {children}
        </header>
      </div>
    </section>
  );
}
