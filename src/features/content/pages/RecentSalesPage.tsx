import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";
import { RecentSales } from "@/features/content/components/RecentSales";
import { useSeo } from "@/lib/seo/useSeo";

export default function RecentSalesPage() {
  useSeo({ title: "Nos dernières ventes | Foch Immobilier", description: "Ventes réalisées par Foch Immobilier au Havre et dans ses environs. Les biens actuellement disponibles sont identifiés séparément.", canonicalPath: "/nos-dernieres-ventes" });
  return (
    <>
      <StorefrontPageHero eyebrow="Depuis 1972" title="Nos dernières ventes" description="Découvrez les ventes enregistrées par le cabinet Foch Immobilier au Havre. Les biens actuellement à vendre sont identifiés séparément." />
      <div className="container mx-auto px-4 py-10">
      <RecentSales />
      </div>
    </>
  );
}
