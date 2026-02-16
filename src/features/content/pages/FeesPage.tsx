import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo/useSeo";

const feesPdfUrl = "https://www.fochimmobilier.com/static/pdf/honoraires-fochimmobilier-le-havre-76.pdf";

export default function FeesPage() {
  useSeo({
    title: "Honoraires | Foch Immobilier",
    description: "Barème des honoraires de Foch Immobilier et accès direct au document PDF officiel.",
    canonicalPath: "/honoraires",
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Transparence</p>
        <h1 className="mt-2 font-display text-4xl">Honoraires</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Le barème officiel reste consultable en permanence et téléchargeable directement depuis cette page.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild>
          <a href={feesPdfUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2">
            <Download className="h-4 w-4" /> Télécharger le PDF officiel
          </a>
        </Button>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl">Synthèse du barème</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Valeurs présentées à titre de lecture rapide. Le PDF officiel ci-dessus fait foi.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-medium">Tranche de prix</th>
                <th className="px-4 py-3 font-medium">Honoraires TTC</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-4 py-3">Jusqu'à 100 000 €</td>
                <td className="px-4 py-3">6 % TTC</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3">100 001 € à 200 000 €</td>
                <td className="px-4 py-3">5,5 % TTC</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3">200 001 € à 400 000 €</td>
                <td className="px-4 py-3">5 % TTC</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3">Au-delà de 400 000 €</td>
                <td className="px-4 py-3">4 % TTC</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border">
        <iframe title="PDF Honoraires" src={feesPdfUrl} className="h-[760px] w-full" />
      </section>
    </section>
  );
}
