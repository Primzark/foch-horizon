import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { ArrowRight, MoveUpRight } from "lucide-react";
import { useSeo, getSiteUrl } from "@/lib/seo/useSeo";

const sources = {
  diagnostics: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10798",
  dpe: "https://www.service-public.gouv.fr/particuliers/vosdroits/F16096",
  dpeMethod: "https://www.ecologie.gouv.fr/presse/evolution-du-calcul-du-dpe-1er-janvier-2026-favoriser-lelectrification-du-chauffage",
  rentalStandards: "https://www.service-public.gouv.fr/particuliers/vosdroits/F35978/0_0_1",
  audit: "https://www.service-public.gouv.fr/particuliers/vosdroits/F37110",
  risks: "https://www.georisques.gouv.fr/information-des-acquereurs-et-des-locataires",
  coownership: "https://www.service-public.gouv.fr/particuliers/vosdroits/F37190",
  notary: "https://www.notaires.fr/fr/immobilier-fiscalite/achat-et-vente",
  ademe: "https://observatoire-dpe-audit.ademe.fr/accueil",
};

const faq = [
  {
    question: "Quels diagnostics fournir pour vendre un logement ?",
    answer: "Le dossier de diagnostic technique réunit les diagnostics applicables selon le logement, son âge, ses équipements et sa situation. Il comprend généralement le DPE et peut inclure le plomb, l’amiante, le gaz, l’électricité, les termites, l’assainissement, les risques ou le bruit.",
  },
  {
    question: "Quelle est la règle du DPE depuis 2026 ?",
    answer: "Depuis le 1er janvier 2026, le coefficient de conversion de l’électricité employé dans le calcul du DPE est passé de 2,3 à 1,9. Les DPE antérieurs peuvent, sous conditions, obtenir une attestation de nouvelle étiquette auprès de l’Observatoire DPE-Audit de l’Ademe.",
  },
  {
    question: "Un audit énergétique est-il nécessaire pour vendre ?",
    answer: "En France métropolitaine, un audit énergétique réglementaire s’ajoute au DPE pour la vente d’une maison individuelle ou d’un immeuble détenu par un propriétaire unique classé E, F ou G. Le champ doit être vérifié selon le type de bien et la date de la vente.",
  },
  {
    question: "Quels documents consulter avant d’acheter en copropriété ?",
    answer: "L’acquéreur reçoit notamment les documents relatifs au fonctionnement, à la situation financière et aux travaux de la copropriété, ainsi que les diagnostics applicables. La liste et les modalités sont précisées par Service-Public.",
  },
];

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-strong underline decoration-brand/50 underline-offset-4 hover:decoration-brand">
      {children}<MoveUpRight aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" />
    </a>
  );
}

export default function RealEstateRegulationsPage() {
  const siteUrl = getSiteUrl();
  useSeo({
    title: "Réglementation immobilière : vente et achat | Foch Immobilier",
    description: "DPE, diagnostics, audit énergétique, copropriété, surface Carrez et état des risques : les principaux repères officiels pour acheter ou vendre un logement.",
    canonicalPath: "/reglementation-immobiliere",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Réglementation immobilière : vente et achat",
        dateModified: "2026-09-30",
        inLanguage: "fr-FR",
        url: `${siteUrl}/reglementation-immobiliere`,
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  });

  return (
    <article className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Guide pratique · mis à jour le 30 septembre 2026</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">Réglementation immobilière</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Les documents et obligations d’une vente dépendent du logement, de son ancienneté, de ses équipements et de son adresse. Voici les principaux points à préparer et à vérifier avec un diagnostiqueur certifié et le notaire chargé de la vente.
        </p>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-3" aria-label="À retenir">
        <div className="border-l-2 border-brand px-4 py-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">DPE</p>
          <p className="mt-1 font-display text-xl">Étiquette à jour</p>
          <p className="mt-1 text-sm text-muted-foreground">Le calcul a évolué le 1er janvier 2026.</p>
        </div>
        <div className="border-l-2 border-brand px-4 py-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Vente</p>
          <p className="mt-1 font-display text-xl">Dossier adapté au bien</p>
          <p className="mt-1 text-sm text-muted-foreground">Les diagnostics varient selon l’âge et la situation.</p>
        </div>
        <div className="border-l-2 border-brand px-4 py-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Copropriété</p>
          <p className="mt-1 font-display text-xl">Documents à examiner</p>
          <p className="mt-1 text-sm text-muted-foreground">Charges, travaux votés et procès-verbaux éclairent l’achat.</p>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="space-y-10">
          <section aria-labelledby="reg-diagnostics">
            <h2 id="reg-diagnostics" className="font-display text-2xl md:text-3xl">Diagnostics : constituer le dossier du logement</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Le vendeur fait réaliser les diagnostics qui s’appliquent à son bien et les réunit dans le dossier de diagnostic technique (DDT), annexé à la promesse puis à l’acte de vente. Selon les cas, le dossier comprend le DPE, le constat de risque d’exposition au plomb, l’état amiante, les diagnostics gaz et électricité pour les installations anciennes, l’état relatif aux termites dans les zones concernées, l’assainissement non collectif, l’état des risques et le diagnostic bruit. Les durées de validité diffèrent : vérifiez chaque document avant la mise en vente. La liste officielle est détaillée par <ExternalLink href={sources.diagnostics}>Service-Public : diagnostics immobiliers en cas de vente</ExternalLink>.
            </p>
          </section>

          <section aria-labelledby="reg-dpe">
            <h2 id="reg-dpe" className="font-display text-2xl md:text-3xl">DPE et audit énergétique</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Le DPE informe sur la consommation d’énergie et les émissions de gaz à effet de serre. Il doit être établi par un diagnostiqueur certifié et son classement figure dans les annonces concernées. Depuis le 1er janvier 2026, le coefficient de conversion de l’électricité dans le calcul est passé de 2,3 à 1,9. Un DPE établi antérieurement peut rester valable ; une attestation de nouvelle étiquette peut être téléchargée gratuitement lorsque le logement est concerné, sur le site de l’<ExternalLink href={sources.ademe}>Observatoire DPE-Audit de l’Ademe</ExternalLink>. Le ministère explique cette évolution et les dates d’application dans son <ExternalLink href={sources.dpeMethod}>communiqué sur le calcul du DPE en 2026</ExternalLink>.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Pour la vente en France métropolitaine, un audit énergétique réglementaire complète le DPE pour certaines maisons individuelles et certains immeubles détenus par un propriétaire unique : depuis 2025, les logements classés E, F ou G sont concernés ; la classe D entrera dans le dispositif en 2034. Cette règle ne s’applique pas de la même façon à un appartement vendu dans une copropriété. La <ExternalLink href={sources.audit}>fiche Service-Public sur l’audit énergétique</ExternalLink> précise le champ à vérifier. Pour la location d’habitation, les seuils de décence énergétique évoluent selon le calendrier officiel : classe G depuis 2025, classe F à partir de 2028 puis classe E à partir de 2034, sous réserve des règles et exceptions applicables au bail concerné (<ExternalLink href={sources.rentalStandards}>logement décent et performance énergétique</ExternalLink>).
            </p>
          </section>

          <section aria-labelledby="reg-seller">
            <h2 id="reg-seller" className="font-display text-2xl md:text-3xl">Vendeur : informer clairement et préparer la vente</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Rassemblez les titres, plans, factures et garanties disponibles, les diagnostics à jour, ainsi que les documents sur les travaux et sinistres connus. Les caractéristiques, le prix, la surface et les informations de copropriété doivent être cohérents entre l’annonce et le dossier remis à l’acquéreur. Le notaire vérifie les pièces nécessaires et adapte la promesse à la situation du bien ; une estimation de prix ne remplace pas ces contrôles.
            </p>
          </section>

          <section aria-labelledby="reg-buyer">
            <h2 id="reg-buyer" className="font-display text-2xl md:text-3xl">Acheteur : lire les pièces avant de s’engager</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Avant de signer, rapprochez les diagnostics de votre projet de travaux et de votre budget, vérifiez les limites et surfaces annoncées, et demandez les justificatifs des travaux importants. La promesse peut prévoir des conditions adaptées à l’opération ; lorsque l’achat est financé par un prêt, la condition suspensive de prêt obéit à des règles spécifiques. Le notaire explique les étapes, le délai de rétractation et les clauses utiles à votre dossier (<ExternalLink href={sources.notary}>repères des Notaires de France</ExternalLink>).
            </p>
          </section>

          <section aria-labelledby="reg-coownership">
            <h2 id="reg-coownership" className="font-display text-2xl md:text-3xl">Appartement en copropriété : surface et pièces collectives</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Pour la vente d’un lot de copropriété, la superficie privative dite « loi Carrez » doit être indiquée dans les conditions prévues par les textes. Elle ne correspond pas nécessairement à la surface habitable : certaines surfaces et hauteurs ne sont pas comptées. Demandez le mesurage et faites confirmer les conséquences d’un écart par le notaire.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Les documents de copropriété donnent notamment accès au règlement, aux procès-verbaux d’assemblées générales, aux charges, aux travaux votés ou envisagés, aux impayés et au fonds travaux lorsqu’il existe. Ils aident à comprendre les dépenses futures et les règles d’usage de l’immeuble. La liste des pièces à remettre est précisée par <ExternalLink href={sources.coownership}>Service-Public : acheter un logement en copropriété</ExternalLink>.
            </p>
          </section>

          <section aria-labelledby="reg-risks">
            <h2 id="reg-risks" className="font-display text-2xl md:text-3xl">Risques et situation du terrain</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              L’état des risques est établi à partir de l’adresse et des zonages applicables. Il peut couvrir des risques naturels, miniers ou technologiques, le radon, les sols, le recul du trait de côte ou d’autres informations réglementaires. Il doit être actualisé dans les délais prévus et remis dès la première visite lorsque le bien est concerné. Consultez <ExternalLink href={sources.risks}>Géorisques et le service ERRIAL</ExternalLink> pour rechercher les informations à l’adresse ; la fiche officielle rappelle les obligations du vendeur et du bailleur.
            </p>
          </section>

          <section aria-labelledby="reg-faq">
            <h2 id="reg-faq" className="font-display text-2xl md:text-3xl">Questions fréquentes</h2>
            <div className="mt-4 divide-y divide-border border-y border-border">
              {faq.map((item) => (
                <details key={item.question} className="group py-4">
                  <summary className="cursor-pointer list-none font-medium marker:hidden [&::-webkit-details-marker]:hidden">{item.question}</summary>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit border-t border-border pt-5 lg:sticky lg:top-28 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <h2 className="font-display text-xl">Sources officielles</h2>
          <ul className="mt-3 space-y-3 text-sm">
            <li><ExternalLink href={sources.diagnostics}>Diagnostics à fournir en cas de vente</ExternalLink></li>
            <li><ExternalLink href={sources.dpe}>Diagnostic de performance énergétique</ExternalLink></li>
            <li><ExternalLink href={sources.rentalStandards}>Décence énergétique en location</ExternalLink></li>
            <li><ExternalLink href={sources.coownership}>Achat d’un logement en copropriété</ExternalLink></li>
            <li><ExternalLink href={sources.risks}>Information des acquéreurs et locataires</ExternalLink></li>
          </ul>
        </aside>
      </div>

      <footer className="mt-10 border-t border-border pt-5">
        <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">
          Cette page fournit des repères généraux, pas un avis juridique personnalisé. Les règles peuvent évoluer et leur application dépend du logement et du contrat. Vérifiez les sources officielles à la date de votre projet et rapprochez-vous de votre notaire et des professionnels certifiés concernés.
        </p>
        <Link to="/contact" className="mt-4 inline-flex items-center text-sm font-medium text-brand-strong hover:underline">
          Préparer mon projet avec l’agence <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
        </Link>
      </footer>
    </article>
  );
}
