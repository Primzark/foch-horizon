import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { cities } from "@/features/cities/data/cities";
import { geographyGuides } from "@/features/content/data/geographyGuides";
import { searchProperties } from "@/features/listings/api/properties.service";
import { toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { primaryLinks } from "@/layout/navigation";
import { useSeo } from "@/lib/seo/useSeo";

const secondaryPages = [
  { href: "/avis", label: "Avis clients" },
  { href: "/services", label: "Services" },
  { href: "/immobilier/le-havre", label: "Immobilier au Havre" },
  { href: "/apropos", label: "À propos" },
  { href: "/biens/comparer", label: "Comparer des biens" },
  { href: "/biens-sauvegardes", label: "Biens sauvegardés" },
];

const legalPages = [
  { href: "/honoraires", label: "Honoraires" },
  { href: "/reglementation-immobiliere", label: "Réglementation immobilière" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
  { href: "/accessibilite", label: "Accessibilité" },
  { href: "/plan-du-site", label: "Plan du site" },
];

async function getAllPropertyPages() {
  const requestedPageSize = 100;
  const firstPage = await searchProperties({ transaction: "vente", page: 1, pageSize: requestedPageSize, sort: "newest" });
  const pageSize = Math.max(firstPage.pageSize || requestedPageSize, 1);
  const pageCount = Math.ceil(firstPage.total / pageSize);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
      searchProperties({ transaction: "vente", page: index + 2, pageSize, sort: "newest" }),
    ),
  );

  return [firstPage, ...remainingPages]
    .flatMap((page) => page.items)
    .filter((property, index, items) => items.findIndex((item) => item.id === property.id) === index);
}

function SitemapLinkList({ pages }: { pages: Array<{ href: string; label: string }> }) {
  return (
    <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
      {pages.map((page) => (
        <li key={page.href}>
          <Link to={page.href} className="text-sm text-foreground/85 underline-offset-4 hover:text-brand-strong hover:underline">
            {page.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SiteMapPage() {
  const propertyPagesQuery = useQuery({
    queryKey: ["sitemap-property-pages"],
    queryFn: getAllPropertyPages,
    staleTime: 300_000,
  });

  useSeo({
    title: "Plan du site | Foch Immobilier",
    description: "Liste complète des pages, secteurs et biens immobiliers de Foch Immobilier.",
    canonicalPath: "/plan-du-site",
  });

  const mainPages = primaryLinks.map(({ to, label }) => ({ href: to, label }));
  const guidePages = geographyGuides
    .filter((guide) => guide.id !== "le-havre")
    .map((guide) => ({ href: `/immobilier/${guide.id}`, label: guide.pageTitle }));
  const knownPagePaths = new Set([
    ...mainPages.map((page) => page.href),
    ...secondaryPages.map((page) => page.href),
    ...guidePages.map((page) => page.href),
  ]);
  const cityPages = cities
    .filter((city) => city.isActive && !knownPagePaths.has(`/immobilier/${city.slug}`))
    .map((city) => ({ href: `/immobilier/${city.slug}`, label: `Immobilier ${city.name}` }));
  const sectorPages = [...guidePages, ...cityPages];
  const propertyPages = (propertyPagesQuery.data ?? []).map((property) => ({
    href: toCanonicalPropertyPath(property),
    label: `${property.title} · Réf ${property.id}`,
  }));

  return (
    <section className="container mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Navigation</p>
      <h1 className="mt-2 font-display text-4xl">Plan du site</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Retrouvez les pages du site dans l’ordre de navigation, puis accédez à nos secteurs et aux annonces publiées.
      </p>

      <div className="mt-8 space-y-8">
        <section aria-labelledby="sitemap-main-navigation">
          <h2 id="sitemap-main-navigation" className="font-display text-2xl">Navigation principale</h2>
          <SitemapLinkList pages={mainPages} />
        </section>

        <section aria-labelledby="sitemap-more-pages">
          <h2 id="sitemap-more-pages" className="font-display text-2xl">Autres pages</h2>
          <SitemapLinkList pages={secondaryPages} />
        </section>

        <section aria-labelledby="sitemap-sectors">
          <h2 id="sitemap-sectors" className="font-display text-2xl">Nos secteurs</h2>
          <SitemapLinkList pages={sectorPages} />
        </section>

        <section aria-labelledby="sitemap-properties">
          <h2 id="sitemap-properties" className="font-display text-2xl">Biens publiés</h2>
          {propertyPagesQuery.isLoading && <p className="mt-3 text-sm text-muted-foreground">Chargement des annonces…</p>}
          {propertyPagesQuery.isError && (
            <p className="mt-3 text-sm text-muted-foreground">
              Les annonces ne sont pas disponibles pour le moment. <Link to="/biens" className="underline underline-offset-4">Parcourir tous les biens</Link>.
            </p>
          )}
          {propertyPages.length > 0 && <SitemapLinkList pages={propertyPages} />}
          {propertyPagesQuery.isSuccess && propertyPages.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">Aucune annonce publiée actuellement. <Link to="/biens" className="underline underline-offset-4">Consulter nos biens</Link>.</p>
          )}
        </section>

        <section aria-labelledby="sitemap-legal">
          <h2 id="sitemap-legal" className="font-display text-2xl">Informations légales</h2>
          <SitemapLinkList pages={legalPages} />
        </section>
      </div>
    </section>
  );
}
