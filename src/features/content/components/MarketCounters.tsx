import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileCheck2, HandCoins } from "lucide-react";
import { getMarketCountersSnapshot } from "@/features/listings/api/properties.service";

function useCountUp(target: number, start: boolean, durationMs = 1100): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) {
      return;
    }

    const animationStart = performance.now();
    let frame = 0;

    const run = (timestamp: number) => {
      const elapsed = timestamp - animationStart;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));

      if (progress < 1) {
        frame = window.requestAnimationFrame(run);
      }
    };

    frame = window.requestAnimationFrame(run);
    return () => window.cancelAnimationFrame(frame);
  }, [durationMs, start, target]);

  return value;
}

function Counter({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Building2 }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const animated = useCountUp(value, visible);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.45 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <article
      ref={ref}
      className="rounded-2xl border border-border bg-card p-5 text-center"
      itemScope
      itemType="https://schema.org/QuantitativeValue"
    >
      <Icon className="mx-auto h-5 w-5 text-brand" aria-hidden="true" />
      <p className="mt-3 font-display text-4xl" itemProp="value">
        {animated.toLocaleString("fr-FR")}
      </p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground" itemProp="name">
        {label}
      </p>
    </article>
  );
}

export function MarketCounters() {
  const query = useQuery({ queryKey: ["market-counters"], queryFn: getMarketCountersSnapshot });

  if (query.isLoading || !query.data) {
    return (
      <section className="container mx-auto px-4" aria-label="Statistiques immobilier Le Havre">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted/55" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="container mx-auto px-4"
      aria-label="Statistiques immobilier Le Havre"
      itemScope
      itemType="https://schema.org/ItemList"
    >
      <div className="mb-4 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Performance agence</p>
        <h2 className="mt-1 font-display text-3xl">Activite immobiliere Le Havre</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Counter label="Biens vendus" value={query.data.soldCount} icon={Building2} />
        <Counter label="Biens sous offre" value={query.data.underOfferCount} icon={HandCoins} />
        <Counter label="Compromis en cours" value={query.data.underContractCount} icon={FileCheck2} />
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Mise à jour {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(query.data.updatedAt))}
      </p>
    </section>
  );
}
