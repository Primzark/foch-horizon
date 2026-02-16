import { BriefcaseBusiness, Building2, KeyRound } from "lucide-react";
import { useSeo } from "@/lib/seo/useSeo";

const services = [
  {
    title: "Transaction",
    description:
      "Vente et acquisition de biens résidentiels avec accompagnement commercial, technique et juridique.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Location",
    description:
      "Mise en location, sélection des candidats, rédaction des baux et suivi administratif d'entrée/sortie.",
    icon: KeyRound,
  },
  {
    title: "Administration de biens",
    description:
      "Gestion locative courante, encaissements, reporting propriétaire et coordination des intervenants.",
    icon: Building2,
  },
];

export default function ServicesPage() {
  useSeo({
    title: "Services | Foch Immobilier",
    description: "Découvrez nos prestations en transaction, location et administration de biens.",
    canonicalPath: "/services",
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prestations</p>
        <h1 className="mt-2 font-display text-4xl">Nos services immobiliers</h1>
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {services.map((service) => (
          <article key={service.title} className="rounded-2xl border border-border bg-card p-6">
            <service.icon className="h-5 w-5" />
            <h2 className="mt-4 font-display text-2xl">{service.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
