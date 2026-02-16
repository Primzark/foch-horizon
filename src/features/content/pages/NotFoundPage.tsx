import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo/useSeo";

export default function NotFoundPage() {
  useSeo({
    title: "Page introuvable | Foch Immobilier",
    description: "La page demandée est introuvable.",
    canonicalPath: "/404",
    noIndex: true,
  });

  return (
    <section className="container mx-auto px-4 py-20 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Erreur 404</p>
      <h1 className="mt-2 font-display text-5xl">Page introuvable</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
        Cette page n'existe plus ou a été déplacée. Vous pouvez revenir aux annonces actives.
      </p>
      <Button className="mt-6" asChild>
        <Link to="/biens">Voir les biens</Link>
      </Button>
    </section>
  );
}
