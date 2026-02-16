import { useSeo } from "@/lib/seo/useSeo";

export type LegalPageKey = "mentions-legales" | "confidentialite" | "cookies" | "accessibilite";

const legalContent: Record<LegalPageKey, { title: string; description: string; sections: Array<{ heading: string; body: string[] }> }> = {
  "mentions-legales": {
    title: "Mentions légales",
    description: "Informations légales de l'éditeur du site Foch Immobilier.",
    sections: [
      {
        heading: "Éditeur",
        body: ["Foch Immobilier", "109 Av. Foch, 76600 Le Havre", "RCS et informations d'immatriculation sur demande."],
      },
      {
        heading: "Carte professionnelle",
        body: ["Carte CPI - Transaction et Gestion immobilière.", "Détails disponibles à l'agence."],
      },
      {
        heading: "Hébergement",
        body: ["Application déployée sur infrastructure Lovable Cloud."],
      },
    ],
  },
  confidentialite: {
    title: "Politique de confidentialité",
    description: "Traitement des données personnelles conformément au RGPD.",
    sections: [
      {
        heading: "Données collectées",
        body: ["Identité, coordonnées, contenu de message et métadonnées techniques minimales de sécurité."],
      },
      {
        heading: "Finalités",
        body: ["Réponse aux demandes de contact, estimation ou visite.", "Suivi opérationnel des leads par l'agence."],
      },
      {
        heading: "Durée de conservation",
        body: ["Les données sont conservées selon les obligations légales et la relation commerciale."],
      },
      {
        heading: "Vos droits",
        body: ["Accès, rectification, opposition, effacement et limitation via vendre@fochimmobilier.com."],
      },
    ],
  },
  cookies: {
    title: "Gestion des cookies",
    description: "Préférences de cookies et informations de consentement.",
    sections: [
      {
        heading: "Cookies essentiels",
        body: ["Nécessaires au fonctionnement du site et à la sécurité des formulaires."],
      },
      {
        heading: "Cookies de mesure",
        body: ["Soumis à consentement utilisateur et limités aux mesures d'audience utiles."],
      },
      {
        heading: "Gestion",
        body: ["Vous pouvez modifier vos préférences à tout moment depuis le pied de page."],
      },
    ],
  },
  accessibilite: {
    title: "Déclaration d'accessibilité",
    description: "Engagement d'accessibilité numérique et plan d'amélioration continue.",
    sections: [
      {
        heading: "Référentiel",
        body: ["Objectif WCAG 2.2 niveau AA appliqué à la navigation, aux formulaires et aux médias."],
      },
      {
        heading: "Fonctionnalités prises en charge",
        body: ["Navigation clavier complète.", "Contrastes renforcés.", "Gestion des animations via prefers-reduced-motion."],
      },
      {
        heading: "Contact accessibilité",
        body: ["Signalement: vendre@fochimmobilier.com"],
      },
    ],
  },
};

interface LegalTextPageProps {
  page: LegalPageKey;
}

export default function LegalTextPage({ page }: LegalTextPageProps) {
  const content = legalContent[page];

  useSeo({
    title: `${content.title} | Foch Immobilier`,
    description: content.description,
    canonicalPath: `/${page}`,
  });

  return (
    <section className="container mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Informations</p>
      <h1 className="mt-2 font-display text-4xl">{content.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{content.description}</p>

      <div className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-6">
        {content.sections.map((section) => (
          <article key={section.heading}>
            <h2 className="font-display text-2xl">{section.heading}</h2>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              {section.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
