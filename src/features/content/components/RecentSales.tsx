import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/visuals/ScrollReveal";
import { getRecentSales } from "@/features/content/api/recentSales.service";

export function RecentSales({ compact = false }: { compact?: boolean }) {
  const query = useQuery({ queryKey: ["recent-sales"], queryFn: getRecentSales, staleTime: 300_000 });
  const sales = compact ? query.data?.slice(0, 3) : query.data;

  return (
    <section className={compact ? "border-b border-border bg-card" : ""}>
      <div className={compact ? "container mx-auto px-4 py-10 md:py-12" : "py-10"}>
        <ScrollReveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-strong">Des projets accompagnés</p>
              <h2 className="mt-2 font-display text-3xl md:text-4xl">Nos belles ventes</h2>
            </div>
            {compact && <Link to="/nos-dernieres-ventes" className="inline-flex items-center gap-2 text-sm hover:underline">Nos dernières ventes <ArrowRight className="h-4 w-4" /></Link>}
          </div>
          {query.isLoading && <p className="mt-6 text-sm text-muted-foreground" role="status">Chargement de nos dernières ventes…</p>}
          {query.isError && (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <p className="text-sm text-muted-foreground">Nos dernières ventes ne sont pas disponibles pour le moment.</p>
              <Button variant="outline" onClick={() => query.refetch()}>Réessayer</Button>
            </div>
          )}
          {!query.isLoading && !query.isError && sales?.length === 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-5">
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">Découvrez nos références de vente auprès de notre équipe et parlons de votre projet.</p>
              <Link to="/contact" className="inline-flex items-center gap-2 text-sm font-medium text-brand-strong hover:underline">Échanger avec le cabinet <ArrowRight className="h-4 w-4" /></Link>
            </div>
          )}
          {sales && sales.length > 0 && (
            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sales.map((sale) => (
                <article key={sale.id}>
                  <div className="relative overflow-hidden rounded-xl bg-muted">
                    <img src={sale.coverImageUrl} alt={sale.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    <span className="absolute left-3 top-3 rounded-full bg-background px-3 py-1 text-xs font-medium">Vendu</span>
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{sale.city.name} · {sale.surfaceM2} m²</p>
                  <h3 className="mt-1 font-display text-2xl">{sale.title}</h3>
                </article>
              ))}
            </div>
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
