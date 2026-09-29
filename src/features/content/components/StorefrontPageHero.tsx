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
        className="absolute inset-0 -z-10 bg-[length:100%_auto] bg-top bg-no-repeat lg:bg-cover lg:bg-center"
        style={{ backgroundImage }}
      />
      <div className="container mx-auto flex min-h-[min(62svh,620px)] items-start px-4 pb-12 pt-[calc(100vw/2.14+1.5rem)] lg:pt-56">
        <header className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.22em] text-white/80">{eyebrow}</p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-white md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/85">{description}</p>
          {children}
        </header>
      </div>
    </section>
  );
}
