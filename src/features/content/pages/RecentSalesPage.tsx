import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";
import { RecentSales } from "@/features/content/components/RecentSales";
import { useSeo } from "@/lib/seo/useSeo";

export default function RecentSalesPage() {
  useSeo({ title: "Nos dernières ventes | Foch Immobilier", description: "Nos belles ventes au Havre et dans ses environs. Échangez avec le cabinet Foch Immobilier sur votre projet de vente.", canonicalPath: "/nos-dernieres-ventes" });
  return (
    <>
      <StorefrontPageHero eyebrow="Depuis 1972" title="Nos dernières ventes" description="Chaque vente est une rencontre entre un bien, un projet et un accompagnement sur mesure." />
      <div className="container mx-auto px-4 py-10">
      <RecentSales />
      </div>
    </>
  );
}
