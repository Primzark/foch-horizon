import type { ReactNode } from "react";

type StorefrontPageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

/** Full-bleed storefront hero with an uncropped facade and a separate copy band. */
export function StorefrontPageHero({ eyebrow, title, description, children }: StorefrontPageHeroProps) {
  return (
    <section className="storefront-page-hero bg-slate-950">
      <img
        aria-hidden="true"
        alt=""
        className="storefront-page-hero__photo block h-auto w-full"
        decoding="async"
        fetchPriority="high"
        height={678}
        src="/images/geography/foch-storefront.png"
        width={1448}
      />
      <div className="storefront-page-hero__content border-t border-white/10">
        <div className="container mx-auto grid gap-3 px-4 py-5 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] md:items-end md:gap-10 md:py-7">
          <header>
            <p className="text-xs uppercase tracking-[0.22em] text-white/80">{eyebrow}</p>
            <h1 className="mt-3 font-display text-3xl leading-tight text-white md:mt-4 md:text-5xl">{title}</h1>
          </header>
          <div className="max-w-xl md:justify-self-end">
            <p className="text-base leading-relaxed text-white/85">{description}</p>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
