import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";

interface LegalPageProps {
  page: "fees" | "privacy" | "cookies" | "notice";
}

const legalContent: Record<string, { title: string; content: React.ReactNode }> = {
  fees: {
    title: "Barème d'honoraires",
    content: (
      <div className="space-y-6">
        <p>Conformément à la réglementation en vigueur, voici le barème des honoraires pratiqués par Foch Immobilier.</p>
        <h3 className="font-display text-lg font-semibold">Vente</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-semibold">Tranche de prix</th>
                <th className="px-4 py-3 text-left font-semibold">Honoraires TTC</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border"><td className="px-4 py-3">Jusqu'à 100 000 €</td><td className="px-4 py-3">6 % TTC</td></tr>
              <tr className="border-b border-border"><td className="px-4 py-3">De 100 001 € à 200 000 €</td><td className="px-4 py-3">5.5 % TTC</td></tr>
              <tr className="border-b border-border"><td className="px-4 py-3">De 200 001 € à 400 000 €</td><td className="px-4 py-3">5 % TTC</td></tr>
              <tr><td className="px-4 py-3">Au-delà de 400 000 €</td><td className="px-4 py-3">4 % TTC</td></tr>
            </tbody>
          </table>
        </div>
        <h3 className="font-display text-lg font-semibold">Location</h3>
        <p>Honoraires de location conformes au plafonnement légal (loi ALUR) :</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Zone très tendue : 12 €/m²</li>
          <li>Visite, constitution du dossier et rédaction du bail</li>
          <li>État des lieux : 3 €/m² (partagé locataire/bailleur)</li>
        </ul>
        <p className="text-sm text-muted-foreground italic">Barème en vigueur au 1er janvier 2025. Honoraires à la charge du vendeur sauf mention contraire.</p>
      </div>
    ),
  },
  privacy: {
    title: "Politique de confidentialité",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>Foch Immobilier, 42 avenue Foch, 76600 Le Havre, s'engage à protéger vos données personnelles conformément au RGPD.</p>
        <h3 className="font-display text-lg font-semibold text-foreground">Données collectées</h3>
        <p>Nous collectons les données que vous nous transmettez via nos formulaires : nom, email, téléphone, message. Ces données sont nécessaires au traitement de votre demande.</p>
        <h3 className="font-display text-lg font-semibold text-foreground">Finalités</h3>
        <p>Vos données sont utilisées pour répondre à vos demandes, vous proposer des biens correspondant à vos critères, et améliorer nos services.</p>
        <h3 className="font-display text-lg font-semibold text-foreground">Durée de conservation</h3>
        <p>Vos données sont conservées 3 ans maximum après votre dernier contact avec notre agence.</p>
        <h3 className="font-display text-lg font-semibold text-foreground">Vos droits</h3>
        <p>Vous disposez des droits d'accès, rectification, suppression, portabilité et opposition. Contactez-nous à : dpo@foch-immobilier.fr</p>
      </div>
    ),
  },
  cookies: {
    title: "Gestion des cookies",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>Notre site utilise des cookies pour améliorer votre expérience de navigation et analyser l'audience.</p>
        <h3 className="font-display text-lg font-semibold text-foreground">Cookies essentiels</h3>
        <p>Nécessaires au fonctionnement du site (session, préférences). Ils ne peuvent pas être désactivés.</p>
        <h3 className="font-display text-lg font-semibold text-foreground">Cookies analytiques</h3>
        <p>Google Analytics (GA4) nous aide à comprendre comment les visiteurs interagissent avec notre site. Ces cookies sont soumis à votre consentement.</p>
        <h3 className="font-display text-lg font-semibold text-foreground">Paramétrer vos préférences</h3>
        <p>Vous pouvez modifier vos préférences de cookies à tout moment via le lien en pied de page.</p>
      </div>
    ),
  },
  notice: {
    title: "Mentions légales",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <h3 className="font-display text-lg font-semibold text-foreground">Éditeur</h3>
        <p>Foch Immobilier SARL<br />42 avenue Foch, 76600 Le Havre<br />SIRET : 123 456 789 00012<br />RCS Le Havre</p>
        <h3 className="font-display text-lg font-semibold text-foreground">Carte professionnelle</h3>
        <p>CPI 7602 2024 000 000 – Transaction et Gestion immobilière<br />Délivrée par la CCI Le Havre<br />Garantie financière : GALIAN</p>
        <h3 className="font-display text-lg font-semibold text-foreground">Directeur de la publication</h3>
        <p>Marie Dupont</p>
        <h3 className="font-display text-lg font-semibold text-foreground">Hébergeur</h3>
        <p>Lovable / Netlify — San Francisco, USA</p>
        <h3 className="font-display text-lg font-semibold text-foreground">Médiation</h3>
        <p>En cas de litige, vous pouvez saisir le médiateur de la consommation : Médiation Tourisme et Voyage — www.mtv.travel</p>
      </div>
    ),
  },
};

const LegalPage = ({ page }: LegalPageProps) => {
  const { title, content } = legalContent[page];

  return (
    <Layout>
      <div className="border-b border-border bg-muted/30 py-3">
        <div className="container mx-auto flex items-center gap-2 px-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-accent">Accueil</Link>
          <span>/</span>
          <span className="text-foreground">{title}</span>
        </div>
      </div>
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
        <div className="mt-8">{content}</div>
      </div>
    </Layout>
  );
};

export default LegalPage;
