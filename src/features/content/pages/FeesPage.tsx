import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo/useSeo";

const feesPdfUrl = "https://www.fochimmobilier.com/static/pdf/honoraires-fochimmobilier-le-havre-76.pdf";

export default function FeesPage() {
  useSeo({
    title: "Honoraires | Foch Immobilier",
    description: "Consultez le barème d’honoraires publié par Foch Immobilier et vérifiez sa date avant votre projet.",
    canonicalPath: "/honoraires",
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Transparence</p>
        <h1 className="mt-2 font-display text-4xl">Honoraires</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Le document actuellement publié par l’agence est daté de 2022. Il indique un forfait de 4 000 € TTC jusqu’à 50 000 €, puis 4 000 € TTC plus 4 % du prix de vente au-delà. Ces montants sont ceux du PDF daté ; demandez à l’agence le barème applicable à votre mandat avant tout engagement.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild>
          <a href={feesPdfUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2">
            <Download className="h-4 w-4" /> Consulter le barème PDF (2022)
          </a>
        </Button>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border">
        <iframe title="Barème d’honoraires de Foch Immobilier, document daté de 2022" src={feesPdfUrl} className="h-[760px] w-full" />
      </section>
    </section>
  );
}
