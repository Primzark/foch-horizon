import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin } from "lucide-react";
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
            <div className="mt-6 grid overflow-hidden rounded-2xl border border-border bg-background md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <figure className={`relative isolate overflow-hidden bg-slate-900 ${compact ? "min-h-64 md:min-h-72" : "min-h-72 md:min-h-[26rem]"}`}>
                <img
                  src="/images/geography/panorama-le-havre.webp"
                  alt="Panorama du Havre, entre front de mer et quartiers résidentiels"
                  className="absolute inset-0 -z-10 h-full w-full object-cover object-[52%_48%]"
                  loading="lazy"
                />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/65 via-slate-950/5 to-transparent" />
                <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/30 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5" /> Le Havre et le littoral
                </div>
                <div className="absolute bottom-5 right-5 hidden w-36 overflow-hidden rounded-xl border-4 border-white shadow-xl sm:block md:w-40">
                  <img
                    src="/images/geography/architecture-perret.webp"
                    alt="Architecture Perret au Havre"
                    className="aspect-[4/3] w-full object-cover"
                    loading="lazy"
                  />
                  <p className="bg-white px-2 py-1.5 text-[10px] font-medium text-slate-800">Le centre reconstruit</p>
                </div>
                <figcaption className="absolute bottom-5 left-5 max-w-[55%] text-[10px] leading-relaxed text-white/90 drop-shadow">
                  <a
                    href="https://commons.wikimedia.org/wiki/File:Panorama_of_Le_Havre,_September_2019.jpg"
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-white/50 underline-offset-2 hover:decoration-white"
                  >
                    Panorama du Havre · Martin Falbisoner · CC BY-SA 4.0
                  </a>
                </figcaption>
              </figure>
              <div className="flex flex-col justify-center p-6 md:p-8 lg:p-10">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-strong">À vos côtés depuis 1972</p>
                <h3 className="mt-3 font-display text-2xl md:text-3xl">Des ventes à découvrir avec notre équipe</h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Découvrez nos références de vente auprès de notre équipe et parlons de votre projet.</p>
                <Link to="/contact" className="mt-6 inline-flex items-center gap-2 self-start text-sm font-medium text-brand-strong hover:underline">Échanger avec le cabinet <ArrowRight className="h-4 w-4" /></Link>
              </div>
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
