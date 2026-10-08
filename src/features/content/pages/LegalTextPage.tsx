import type { ReactNode } from "react";
import { useSeo } from "@/lib/seo/useSeo";

export type LegalPageKey = "mentions-legales" | "confidentialite" | "cookies" | "accessibilite";

const legalContent: Record<LegalPageKey, { title: string; description: string; sections: Array<{ heading: string; body: ReactNode[] }> }> = {
  "mentions-legales": {
    title: "Mentions légales",
    description: "Informations légales de l'éditeur du site Foch Immobilier.",
    sections: [
      {
        heading: "Éditeur",
        body: [
          "FOCH IMMOBILIER, société par actions simplifiée (SAS).",
          "Siège social : 109 avenue Foch, 76600 Le Havre, France.",
          <>SIREN : 911 561 504 · SIRET du siège : 911 561 504 00034 · RCS Le Havre : 911 561 504. <a className="underline underline-offset-4" href="https://annuaire-entreprises.data.gouv.fr/entreprise/911561504" target="_blank" rel="noreferrer">Consulter l’Annuaire des Entreprises</a>.</>,
          "Contact : vendre@fochimmobilier.com · +33 2 35 42 51 76.",
        ],
      },
      {
        heading: "Carte professionnelle",
        body: ["Carte professionnelle CPI 7605 2023 000 000 010 pour les activités Transaction et Syndic, enregistrée auprès de la CCI Seine Estuaire."],
      },
      {
        heading: "Hébergement",
        body: [
          <>Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. <a className="underline underline-offset-4" href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Coordonnées légales de Vercel</a>.</>,
        ],
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
            {section.body.map((line, index) => (
              <p key={`${section.heading}-${index}`}>{line}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
