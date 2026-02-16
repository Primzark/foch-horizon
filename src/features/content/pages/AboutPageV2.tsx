import { agents } from "@/features/listings/data/agents";
import { useSeo } from "@/lib/seo/useSeo";

export default function AboutPageV2() {
  useSeo({
    title: "À propos | Foch Immobilier",
    description: "Foch Immobilier accompagne les projets immobiliers au Havre depuis 1972.",
    canonicalPath: "/apropos",
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">L'agence</p>
        <h1 className="mt-2 font-display text-4xl">Depuis 1972, au service du Havre</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Foch Immobilier intervient en transaction, location et administration de biens. Notre accompagnement est porté par
          une équipe locale, avec un suivi de bout en bout pour les vendeurs, acquéreurs, bailleurs et locataires.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Référence du <strong>réseau UNIS</strong>, l'agence maintient une exigence constante sur la transparence, la
          conformité et la qualité de service.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="font-display text-3xl">L'équipe</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {agents.map((agent) => (
            <article key={agent.id} className="rounded-2xl border border-border bg-card p-5">
              <img src={agent.portraitUrl} alt={agent.fullName} className="h-16 w-16 rounded-full object-cover" />
              <h3 className="mt-3 font-display text-2xl">{agent.fullName}</h3>
              <p className="text-sm text-muted-foreground">{agent.role}</p>
              <p className="mt-3 text-sm text-muted-foreground">{agent.bio}</p>
              <div className="mt-4 text-sm">
                <a href={`tel:${agent.phone.replace(/\s+/g, "")}`} className="block hover:underline">
                  {agent.phone}
                </a>
                <a href={`mailto:${agent.email}`} className="block hover:underline">
                  {agent.email}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-3xl">En savoir plus sur la profession</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Informations officielles sur les obligations et responsabilités des professionnels de l'immobilier.
        </p>
        <a
          href="https://www.service-public.fr/particuliers/vosdroits/F32990"
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-flex text-sm underline-offset-4 hover:underline"
        >
          Consulter la page Service-Public.fr
        </a>
      </section>
    </section>
  );
}
