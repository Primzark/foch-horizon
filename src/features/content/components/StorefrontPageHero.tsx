import type { ReactNode } from "react";

type StorefrontPageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

/** Full-bleed storefront hero shared by the primary navigation pages. */
export function StorefrontPageHero({ eyebrow, title, description, children }: StorefrontPageHeroProps) {
  const backgroundImage = "url('/images/geography/foch-storefront.png')";

  return (
    <section className="relative isolate overflow-hidden bg-slate-950">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-cover bg-no-repeat"
        style={{ backgroundImage, backgroundPosition: "center top" }}
      />
      <div className="page-banner container mx-auto flex items-center px-4 py-6 md:py-8">
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
