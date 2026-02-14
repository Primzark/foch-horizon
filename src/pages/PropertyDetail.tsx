import { useParams, Link } from "react-router-dom";
import { MapPin, BedDouble, Bath, Maximize, Car, Phone, Mail, ArrowLeft, Share2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import DpeBadge from "@/components/property/DpeBadge";
import PropertyCard from "@/components/property/PropertyCard";
import { getPropertyBySlug, getAgentById, properties, formatPrice } from "@/data/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";

const PropertyDetail = () => {
  const { slug } = useParams();
  const property = getPropertyBySlug(slug || "");
  const [selectedImage, setSelectedImage] = useState(0);

  if (!property) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Bien introuvable</h1>
          <Link to="/buy" className="mt-4 inline-block text-accent hover:underline">← Retour aux annonces</Link>
        </div>
      </Layout>
    );
  }

  const agent = getAgentById(property.agent_id);
  const similar = properties
    .filter(p => p.id !== property.id && p.transaction_type === property.transaction_type && p.status === "available")
    .slice(0, 3);

  const handleInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Votre demande a bien été envoyée. Nous vous recontacterons rapidement.");
  };

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/30 py-3">
        <div className="container mx-auto flex items-center gap-2 px-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-accent">Accueil</Link>
          <span>/</span>
          <Link to={`/${property.transaction_type}`} className="hover:text-accent">
            {property.transaction_type === "buy" ? "Acheter" : "Louer"}
          </Link>
          <span>/</span>
          <span className="text-foreground">{property.title}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Link to={`/${property.transaction_type}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2">
            {/* Gallery */}
            <div className="overflow-hidden rounded-xl">
              <img
                src={property.images[selectedImage]?.url}
                alt={property.images[selectedImage]?.alt}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
            {property.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {property.images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(i)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                      i === selectedImage ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Info */}
            <div className="mt-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Réf. {property.ref_id}</p>
                  <h1 className="mt-1 font-display text-2xl font-bold text-foreground lg:text-3xl">{property.title}</h1>
                  <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {property.city} — {property.area} ({property.postcode})
                  </p>
                </div>
                <button className="rounded-full border border-border p-2.5 text-muted-foreground hover:text-accent" aria-label="Partager">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 font-display text-3xl font-bold text-accent">
                {formatPrice(property.price, property.transaction_type)}
              </div>

              {/* Facts */}
              <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/30 p-5 sm:grid-cols-4">
                <div className="text-center">
                  <Maximize className="mx-auto h-5 w-5 text-accent" />
                  <p className="mt-1 text-lg font-bold text-foreground">{property.surface_m2} m²</p>
                  <p className="text-xs text-muted-foreground">Surface</p>
                </div>
                <div className="text-center">
                  <BedDouble className="mx-auto h-5 w-5 text-accent" />
                  <p className="mt-1 text-lg font-bold text-foreground">{property.bedrooms}</p>
                  <p className="text-xs text-muted-foreground">Chambres</p>
                </div>
                <div className="text-center">
                  <Bath className="mx-auto h-5 w-5 text-accent" />
                  <p className="mt-1 text-lg font-bold text-foreground">{property.bathrooms}</p>
                  <p className="text-xs text-muted-foreground">Salle(s) de bain</p>
                </div>
                <div className="text-center">
                  <Car className="mx-auto h-5 w-5 text-accent" />
                  <p className="mt-1 text-lg font-bold text-foreground">{property.parking}</p>
                  <p className="text-xs text-muted-foreground">Parking</p>
                </div>
              </div>

              {/* DPE */}
              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">DPE</span>
                  <DpeBadge label={property.dpe_class} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">GES</span>
                  <DpeBadge label={property.ges_class} type="GES" />
                </div>
              </div>

              {/* Description */}
              <div className="mt-8">
                <h2 className="font-display text-xl font-semibold text-foreground">Description</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{property.description}</p>
              </div>

              {/* Features */}
              {property.features.length > 0 && (
                <div className="mt-8">
                  <h2 className="font-display text-xl font-semibold text-foreground">Prestations</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {property.features.map(f => (
                      <span key={f} className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Agent card */}
            {agent && (
              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Votre interlocuteur</p>
                <h3 className="mt-2 font-display text-lg font-semibold text-foreground">{agent.name}</h3>
                <p className="text-sm text-muted-foreground">{agent.role}</p>
                <div className="mt-4 space-y-2">
                  <a href={`tel:${agent.phone.replace(/\s/g, "")}`}>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Phone className="h-4 w-4 text-accent" /> {agent.phone}
                    </Button>
                  </a>
                  <a href={`mailto:${agent.email}`}>
                    <Button variant="outline" className="w-full justify-start gap-2 mt-2">
                      <Mail className="h-4 w-4 text-accent" /> Email
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {/* Inquiry form */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="font-display text-lg font-semibold text-foreground">Demande d'information</h3>
              <form onSubmit={handleInquiry} className="mt-4 space-y-3">
                <Input placeholder="Nom complet" required />
                <Input type="email" placeholder="Email" required />
                <Input type="tel" placeholder="Téléphone" />
                <Textarea placeholder="Votre message…" rows={3} />
                <div className="flex items-start gap-2">
                  <Checkbox id="consent" required />
                  <label htmlFor="consent" className="text-xs leading-tight text-muted-foreground">
                    J'accepte que mes données soient traitées pour répondre à ma demande. 
                    <Link to="/legal/privacy" className="text-accent hover:underline"> Politique de confidentialité</Link>
                  </label>
                </div>
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-gold">
                  Envoyer ma demande
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold text-foreground">Biens similaires</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {similar.map(p => <PropertyCard key={p.id} property={p} />)}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PropertyDetail;
