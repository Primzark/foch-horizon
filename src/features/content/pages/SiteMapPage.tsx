import { Link } from "react-router-dom";
import { geographyGuides } from "@/features/content/data/geographyGuides";
import { useSeo } from "@/lib/seo/useSeo";

const pages = [
  { href: "/", label: "Accueil" },
  { href: "/biens", label: "Nos biens" },
  { href: "/vendre", label: "Vendre" },
  { href: "/estimation", label: "Avis de valeur" },
  { href: "/services", label: "Services" },
  { href: "/geographie", label: "Géographie" },
  { href: "/nos-dernieres-ventes", label: "Nos dernières ventes" },
  { href: "/avis", label: "Avis clients" },
  { href: "/apropos", label: "À propos" },
  { href: "/contact", label: "Contact" },
  { href: "/honoraires", label: "Honoraires" },
  { href: "/reglementation-immobiliere", label: "Réglementation immobilière" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
  { href: "/accessibilite", label: "Accessibilité" },
];

export default function SiteMapPage() {
  useSeo({
    title: "Plan du site | Foch Immobilier",
    description: "Liste complète des pages principales du site Foch Immobilier.",
    canonicalPath: "/plan-du-site",
  });

  return (
    <section className="container mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Navigation</p>
      <h1 className="mt-2 font-display text-4xl">Plan du site</h1>
      <p className="mt-3 text-sm text-muted-foreground">Retrouvez rapidement l'ensemble de nos pages de services et de biens immobiliers.</p>

      <ul className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
        {pages.map((page) => (
          <li key={page.href}>
            <Link to={page.href} className="text-sm hover:underline">
              {page.label}
            </Link>
          </li>
        ))}
        {geographyGuides.map((guide) => (
          <li key={guide.id}>
            <Link to={`/immobilier/${guide.id}`} className="text-sm hover:underline">
              {guide.pageTitle}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
