import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { AgencyPageHeader } from "@/features/content/components/AgencyPageHeader";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo/useSeo";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";

const sectors = [
  {
    title: "Le Havre et Sainte-Adresse",
    description: "La ville et le bord de mer.",
    places: ["Sainte-Adresse", "La plage", "Les gobelins", "Saint Michel"],
  },
  {
    title: "Autour du Havre",
    description: "Les communes voisines et la campagne.",
    places: ["Octeville sur mer", "La campagne dans un rayon de 30 km du Havre"],
  },
  {
    title: "De Saint-Romain à Etretat",
    description: "Un secteur qui s'étend de l'intérieur des terres au littoral.",
    places: ["Saint-Romain", "Etretat"],
  },
  {
    title: "Deauville–Trouville",
    description: "De l'autre côté de l'eau.",
    places: ["Deauville", "Trouville"],
  },
];

export default function GeographyPage() {
  const { reducedMotion } = useMotionPreference();

  useSeo({
    title: "Géographie | Foch Immobilier",
    description:
      "Le Havre, Sainte-Adresse, Octeville sur mer, la campagne à 30 km, de Saint-Romain à Etretat et Deauville–Trouville : les secteurs de votre projet immobilier.",
    canonicalPath: "/geographie",
    image: "/images/agence-foch.jpg",
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <AgencyPageHeader
        eyebrow="Nos secteurs"
        title="Géographie"
        description="Du Havre à ses environs, de la campagne au littoral, notre cabinet accompagne votre projet immobilier."
      />

      <div className="mt-4 grid gap-x-14 md:grid-cols-2">
        {sectors.map((sector, index) => (
          <motion.section
            key={sector.title}
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35, delay: reducedMotion ? 0 : (index % 2) * 0.06 }}
            className="border-b border-border py-8"
          >
            <p className="text-xs tracking-[0.2em] text-brand-strong">0{index + 1}</p>
            <h2 className="mt-3 font-display text-3xl">{sector.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{sector.description}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {sector.places.map((place) => (
                <li key={place} className="flex items-baseline gap-3">
                  <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-brand" />
                  {place}
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </div>

      <section className="mt-10 flex flex-wrap items-center justify-between gap-6 py-3">
        <div>
          <h2 className="font-display text-3xl">Votre projet, votre secteur</h2>
          <p className="mt-2 text-sm text-muted-foreground">Échangeons sur le lieu où vous souhaitez vendre ou acheter.</p>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <Link to="/biens" className="group inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline">
            Nos biens
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <Button asChild variant="brand">
            <Link to="/contact">Parlons de votre projet</Link>
          </Button>
        </div>
      </section>
    </section>
  );
}
