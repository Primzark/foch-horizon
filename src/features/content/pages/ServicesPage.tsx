import { Link } from "react-router-dom";
import { BriefcaseBusiness, Building2, KeyRound } from "lucide-react";
import { useSeo } from "@/lib/seo/useSeo";

const services = [
  {
    title: "Transaction",
    description:
      "Vente et acquisition de biens résidentiels avec pilotage commercial, technique et juridique de bout en bout.",
    icon: BriefcaseBusiness,
    links: [{ href: "/biens?transaction=vente", label: "Biens à acheter" }, { href: "/vendre", label: "Vendre un bien" }, { href: "/estimation", label: "Estimer votre bien" }],
  },
  {
    title: "Location",
    description:
      "Mise en location, sélection des candidats, rédaction des baux et suivi administratif d'entrée et de sortie.",
    icon: KeyRound,
    links: [{ href: "/biens?transaction=location", label: "Locations disponibles" }, { href: "/reglementation-immobiliere", label: "Diagnostics et obligations" }],
  },
  {
    title: "Administration de biens",
    description:
      "Gestion locative complète, reporting propriétaire et coordination rigoureuse des intervenants.",
    icon: Building2,
    links: [{ href: "/contact", label: "Confier votre gestion locative" }, { href: "/honoraires", label: "Consulter les honoraires" }],
  },
];

export default function ServicesPage() {
  useSeo({
    title: "Services | Foch Immobilier",
    description: "Découvrez nos services immobiliers premium en transaction, location et gestion locative.",
    canonicalPath: "/services",
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prestations</p>
        <h1 className="mt-2 font-display text-4xl">Nos services immobiliers</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Une offre complète pensée pour sécuriser vos décisions et valoriser durablement votre patrimoine immobilier.
        </p>
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {services.map((service) => (
          <article key={service.title} className="rounded-2xl border border-border bg-card p-6">
            <service.icon className="h-5 w-5" />
            <h2 className="mt-4 font-display text-2xl">{service.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
            <ul className="mt-4 space-y-2 text-sm">{service.links.map((link) => <li key={link.href}><Link to={link.href} className="text-brand-strong underline underline-offset-4">{link.label}</Link></li>)}</ul>
          </article>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">Comparez nos <Link to="/geographie" className="underline underline-offset-4">villes et quartiers au Havre et sur le littoral normand</Link> pour situer votre projet.</p>
    </section>
  );
}
