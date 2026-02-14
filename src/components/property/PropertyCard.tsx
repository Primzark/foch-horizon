import { Link } from "react-router-dom";
import { MapPin, BedDouble, Bath, Maximize, Heart } from "lucide-react";
import { Property, formatPrice, getAgentById } from "@/data/mock-data";
import DpeBadge from "./DpeBadge";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PropertyCardProps {
  property: Property;
  variant?: "grid" | "list";
}

const PropertyCard = ({ property, variant = "grid" }: PropertyCardProps) => {
  const [isFav, setIsFav] = useState(false);
  const agent = getAgentById(property.agent_id);

  const statusLabels: Record<string, string> = {
    under_offer: "Sous offre",
    sold: "Vendu",
    rented: "Loué",
  };

  const statusLabel = statusLabels[property.status];

  if (variant === "list") {
    return (
      <Link
        to={`/property/${property.slug}`}
        className="group flex overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover"
      >
        <div className="relative h-48 w-64 shrink-0 overflow-hidden md:h-auto md:w-72">
          <img
            src={property.images[0]?.url}
            alt={property.images[0]?.alt || property.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {statusLabel && (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {statusLabel}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Réf. {property.ref_id}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold text-foreground group-hover:text-accent">
                  {property.title}
                </h3>
              </div>
              <span className="font-display text-xl font-bold text-accent">
                {formatPrice(property.price, property.transaction_type)}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {property.city} · {property.area}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Maximize className="h-4 w-4" /> {property.surface_m2} m²</span>
            <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" /> {property.bedrooms} ch.</span>
            <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {property.bathrooms} sdb</span>
            <DpeBadge label={property.dpe_class} />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover">
      <Link to={`/property/${property.slug}`}>
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={property.images[0]?.url}
            alt={property.images[0]?.alt || property.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          {statusLabel && (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {statusLabel}
            </span>
          )}
          <span className="absolute bottom-3 left-3 rounded-md bg-card/90 px-2 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
            {property.transaction_type === "buy" ? "À vendre" : "À louer"}
          </span>
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); setIsFav(!isFav); }}
        className="absolute right-3 top-3 rounded-full bg-card/80 p-2 backdrop-blur-sm transition-colors hover:bg-card"
        aria-label="Ajouter aux favoris"
      >
        <Heart className={cn("h-4 w-4", isFav ? "fill-accent text-accent" : "text-muted-foreground")} />
      </button>
      <Link to={`/property/${property.slug}`} className="block p-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Réf. {property.ref_id}
        </p>
        <h3 className="mt-1 font-display text-base font-semibold text-foreground group-hover:text-accent transition-colors">
          {property.title}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {property.city}
        </p>
        <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" /> {property.surface_m2} m²</span>
          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {property.bedrooms}</span>
          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {property.bathrooms}</span>
          <DpeBadge label={property.dpe_class} size="sm" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-display text-lg font-bold text-accent">
            {formatPrice(property.price, property.transaction_type)}
          </span>
          {agent && <span className="text-xs text-muted-foreground">{agent.name}</span>}
        </div>
      </Link>
    </div>
  );
};

export default PropertyCard;
