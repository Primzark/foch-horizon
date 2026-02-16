import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bath, BedDouble, Car, Copy, MapPin, Maximize, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cityById } from "@/features/cities/data/cities";
import { getPropertyById, getSimilarProperties } from "@/features/listings/api/properties.service";
import { ListingGallery } from "@/features/listings/components/ListingGallery";
import { ListingCard } from "@/features/listings/components/ListingCard";
import { toSearchItem } from "@/features/listings/utils/mappers";
import { LeadForm } from "@/features/leads/components/LeadForm";
import { formatPrice, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { useSeo } from "@/lib/seo/useSeo";
import { trackEvent } from "@/lib/analytics/events";

function parseRouteIdAndSlug(rawIdSlug?: string): { id: number; slug: string | null } | null {
  if (!rawIdSlug) {
    return null;
  }

  const [rawId, ...slugParts] = rawIdSlug.split("-");
  const id = Number(rawId);

  if (!Number.isInteger(id)) {
    return null;
  }

  const slug = slugParts.length > 0 ? slugParts.join("-") : null;
  return { id, slug };
}

export default function ListingDetailPage() {
  const params = useParams();
  const parsedRoute = parseRouteIdAndSlug(params.idSlug);
  const propertyId = parsedRoute?.id ?? null;

  const propertyQuery = useQuery({
    queryKey: ["property", propertyId],
    enabled: propertyId != null,
    queryFn: () => getPropertyById(propertyId as number),
  });

  const similarQuery = useQuery({
    queryKey: ["similar", propertyId],
    enabled: Boolean(propertyQuery.data),
    queryFn: () => getSimilarProperties(propertyQuery.data!, 3),
  });

  const property = propertyQuery.data;

  const canonicalPath = property ? toCanonicalPropertyPath({ id: property.id, slug: property.slug }) : null;

  useSeo(
    property
      ? {
          title: `${property.title} – ${cityById.get(property.cityId)?.name ?? "Le Havre"} – Prix ${formatPrice(
            property.priceAmount,
            property.transactionType,
          )} – Réf ${property.id}`,
          description: `${property.description.slice(0, 150)}…`,
          canonicalPath,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: property.title,
            url: `https://www.foch-immobilier.fr${canonicalPath}`,
            identifier: String(property.id),
            offers: {
              "@type": "Offer",
              priceCurrency: "EUR",
              price: property.priceAmount,
              availability: property.status === "active" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
            },
          },
        }
      : {
          title: "Bien introuvable | Foch Immobilier",
          description: "Cette annonce n'est plus disponible.",
          canonicalPath: "/biens",
          noIndex: true,
        },
  );

  if (propertyId == null) {
    return <Navigate to="/biens" replace />;
  }

  if (propertyQuery.isLoading) {
    return (
      <section className="container mx-auto px-4 py-8">
        <div className="h-[420px] animate-pulse rounded-2xl bg-muted/60" />
      </section>
    );
  }

  if (!property) {
    return (
      <section className="container mx-auto px-4 py-14">
        <h1 className="font-display text-3xl">Annonce indisponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">Cette annonce a pu être vendue ou retirée.</p>
        <Button className="mt-4" asChild>
          <Link to="/biens">Voir des biens comparables</Link>
        </Button>
      </section>
    );
  }

  if (parsedRoute?.slug !== property.slug) {
    return <Navigate to={canonicalPath!} replace />;
  }

  const city = cityById.get(property.cityId);

  const quickFacts = [
    { icon: Maximize, label: "Surface", value: `${property.surfaceM2} m²` },
    { icon: BedDouble, label: "Chambres", value: `${property.bedrooms ?? "-"}` },
    { icon: Bath, label: "Sdb", value: `${property.bathrooms ?? "-"}` },
    { icon: Car, label: "Garage", value: `${property.garageCount ?? 0}` },
  ];

  return (
    <section className="container mx-auto px-4 py-8">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link to="/" className="hover:underline">
          Accueil
        </Link>{" "}
        /{" "}
        <Link to="/biens" className="hover:underline">
          Biens
        </Link>{" "}
        / <span className="text-foreground">Réf {property.id}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <ListingGallery images={property.images} title={property.title} />

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Réf du bien {property.id}</p>
              <h1 className="mt-1 font-display text-4xl">{property.title}</h1>
              <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {city?.name} ({property.postalCode})
              </p>
            </div>

            <div className="text-right">
              <p className="font-display text-4xl">{formatPrice(property.priceAmount, property.transactionType)}</p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    trackEvent("listing_viewed", { propertyId: property.id, action: "copy_link" });
                  }}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" /> Lien
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(String(property.id));
                    trackEvent("listing_viewed", { propertyId: property.id, action: "copy_reference" });
                  }}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" /> Réf
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
            {quickFacts.map((fact) => (
              <div key={fact.label} className="rounded-xl border border-border p-3 text-center">
                <fact.icon className="mx-auto h-4 w-4" />
                <p className="mt-2 text-sm font-medium">{fact.value}</p>
                <p className="text-xs text-muted-foreground">{fact.label}</p>
              </div>
            ))}
          </div>

          <article className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{property.description}</p>
          </article>

          <article className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Caractéristiques</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {property.features.map((feature) => (
                <li key={feature.featureKey} className="rounded-full border border-border px-3 py-1 text-xs">
                  {feature.labelFr}
                </li>
              ))}
            </ul>
          </article>

          <article className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Performance énergétique</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">DPE</p>
                <p className="mt-1 text-lg">
                  {property.dpeLabel ?? "N.C."} {property.dpeValue ? `· ${property.dpeValue} kWh/m².an` : ""}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">GES</p>
                <p className="mt-1 text-lg">
                  {property.gesLabel ?? "N.C."} {property.gesValue ? `· ${property.gesValue} kgCO2/m².an` : ""}
                </p>
              </div>
            </div>
          </article>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Votre interlocuteur</p>
            <p className="mt-2 font-display text-2xl">{property.agentId === "agent-lucas-bernard" ? "Lucas Bernard" : property.agentId === "agent-clara-durand" ? "Clara Durand" : "Jeanne Morel"}</p>
            <p className="text-sm text-muted-foreground">Foch Immobilier</p>
            <a
              href="tel:0235420001"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm"
              onClick={() => trackEvent("phone_clicked", { source: "property_sidebar", propertyId: property.id })}
            >
              <Phone className="h-4 w-4" /> 02 35 42 00 01
            </a>
          </section>

          <LeadForm
            source="property_page"
            propertyId={property.id}
            cityId={property.cityId}
            title="Demander une visite"
            description="Indiquez vos disponibilités, nous revenons vers vous rapidement."
            ctaLabel="Envoyer ma demande"
            showAppointmentFields
          />
        </aside>
      </div>

      {(similarQuery.data ?? []).length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-3xl">Biens similaires</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {similarQuery.data?.map((item) => <ListingCard key={item.id} item={toSearchItem(item)} />)}
          </div>
        </section>
      )}
    </section>
  );
}
