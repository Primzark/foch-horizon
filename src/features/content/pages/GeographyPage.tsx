import { Link } from "react-router-dom";
import { ArrowRight, MapPin, MoveUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeo, getSiteUrl } from "@/lib/seo/useSeo";
import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";

const sectors = [
  {
    number: "01",
    title: "Le Havre et Sainte-Adresse",
    description: "Explorez les quartiers havrais et le littoral tout proche.",
    places: [
      { name: "Sainte-Adresse", query: "Sainte-Adresse", city: "sainte-adresse", cityPage: true },
      { name: "La plage", query: "plage", city: "le-havre" },
      { name: "Les Gobelins", query: "Les Gobelins", city: "le-havre" },
      { name: "Saint-Michel", query: "Saint-Michel", city: "le-havre" },
    ],
  },
  {
    number: "02",
    title: "Autour du Havre",
    description: "Des communes voisines où l’agence présente également des biens.",
    places: [
      { name: "Octeville-sur-Mer", query: "Octeville-sur-Mer" },
      { name: "Montivilliers", query: "Montivilliers", city: "montivilliers", cityPage: true },
      { name: "Manéglise", query: "Manéglise", city: "maneglise", cityPage: true },
      { name: "Gainneville", query: "Gainneville", city: "gainneville", cityPage: true },
    ],
  },
  {
    number: "03",
    title: "De Saint-Romain à Étretat",
    description: "Un axe entre l’intérieur des terres et la côte d’Albâtre.",
    places: [
      { name: "Saint-Romain-de-Colbosc", query: "Saint-Romain-de-Colbosc" },
      { name: "Étretat", query: "Étretat" },
    ],
  },
  {
    number: "04",
    title: "Deauville et Trouville-sur-Mer",
    description: "Retrouvez aussi ces deux communes parmi les secteurs cités par l’agence.",
    places: [
      { name: "Deauville", query: "Deauville" },
      { name: "Trouville-sur-Mer", query: "Trouville-sur-Mer" },
    ],
  },
];

const havrePhotos = [
  {
    src: "/images/geography/architecture-perret.webp",
    alt: "Façades de l’architecture Perret au Havre",
    caption: "Le centre reconstruit",
    author: "Philippe Roudaut · CC0",
    href: "https://commons.wikimedia.org/wiki/File:Architecture_Perret_Au_Havre_(180697579).jpeg",
    query: "Perret",
    width: 1000,
    height: 750,
  },
  {
    src: "/images/geography/saint-francois.webp",
    alt: "Le quartier Saint-François et le bassin du Roy au Havre",
    caption: "Saint-François et le bassin du Roy",
    author: "Philippe Ales · CC BY-SA 3.0",
    href: "https://commons.wikimedia.org/wiki/File:Le_Havre_(France),_quarter_Saint-Fran%C3%A7ois_and_Bassin_du_Roy.JPG",
    query: "Saint-François",
    width: 1000,
    height: 664,
  },
  {
    src: "/images/geography/saint-vincent.webp",
    alt: "Place Saint-Vincent au Havre, près de la plage",
    caption: "Saint-Vincent, près de la plage",
    author: "Philippe Ales · CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:Place_Saint-Vincent_(France).jpg",
    query: "Saint-Vincent",
    width: 1000,
    height: 664,
  },
];

export default function GeographyPage() {
  const siteUrl = getSiteUrl();

  useSeo({
    title: "Nos secteurs immobiliers au Havre et alentours | Foch Immobilier",
    description:
      "Explorez les secteurs accompagnés par Foch Immobilier : Le Havre, Sainte-Adresse, les communes voisines, Étretat et Deauville–Trouville. Consultez les biens ou parlons de votre projet.",
    canonicalPath: "/geographie",
    image: "/images/geography/foch-storefront.png",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Nos secteurs immobiliers au Havre et alentours",
        description:
          "Les secteurs cités par Foch Immobilier autour du Havre, de Sainte-Adresse et du littoral normand.",
        url: `${siteUrl}/geographie`,
        inLanguage: "fr-FR",
        mainEntity: {
          "@type": "ItemList",
          itemListElement: sectors.flatMap((sector, index) =>
            sector.places.map((place, placeIndex) => ({
              "@type": "ListItem",
              position: index * 10 + placeIndex + 1,
              item: { "@type": "Place", name: place.name },
            })),
          ),
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Géographie", item: `${siteUrl}/geographie` },
        ],
      },
    ],
  });

  return (
    <div>
      <StorefrontPageHero
        eyebrow="Nos secteurs"
        title="Immobilier au Havre et alentours"
        description="Du Havre et de Sainte-Adresse aux communes et stations du littoral citées par notre agence, explorez les lieux de votre projet."
      >
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild variant="brand">
            <Link to="/biens">Explorer les biens <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contact">Parler à l’agence</Link>
          </Button>
        </div>
      </StorefrontPageHero>

      <section className="border-y border-border bg-card/40" aria-labelledby="sectors-heading">
        <div className="container mx-auto grid gap-10 px-4 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Repères géographiques</p>
            <h2 id="sectors-heading" className="mt-3 font-display text-3xl md:text-4xl">Explorez nos secteurs</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Retrouvez les communes et quartiers mentionnés par Foch Immobilier. Sélectionnez un lieu pour consulter les annonces correspondantes lorsqu’elles sont disponibles.
            </p>
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-background">
              <iframe
                title="Carte OpenStreetMap des secteurs autour du Havre, Étretat et Deauville"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-0.15%2C49.24%2C0.5%2C49.76&layer=mapnik&marker=49.494%2C0.107"
                className="h-72 w-full border-0 md:h-80"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2"><MapPin aria-hidden="true" className="h-4 w-4 text-brand" /> Le Havre et le littoral normand</span>
                <a className="inline-flex shrink-0 items-center gap-1 text-brand-strong underline-offset-4 hover:underline" href="https://www.openstreetmap.org/?mlat=49.494&mlon=0.107#map=9/49.494/0.107" target="_blank" rel="noreferrer">
                  Agrandir <MoveUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Carte © contributeurs OpenStreetMap. La carte aide à se repérer et ne délimite pas une zone contractuelle d’intervention.</p>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {sectors.map((sector) => (
              <article key={sector.number} className="py-7 md:py-8">
                <div className="flex gap-5 md:gap-7">
                  <span className="pt-1 text-xs tracking-[0.18em] text-brand-strong">{sector.number}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-2xl md:text-3xl">{sector.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sector.description}</p>
                    <ul className="mt-5 flex flex-wrap gap-2.5" aria-label={`Annonces par lieu : ${sector.title}`}>
                      {sector.places.map((place) => (
                        <li key={place.name}>
                          <Link
                            to={place.cityPage ? `/immobilier/${place.city}` : `/biens?${new URLSearchParams({ ...(place.city ? { city: place.city } : {}), q: place.query }).toString()}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm transition-colors hover:border-brand-border hover:bg-brand-soft hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {place.name}<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="havre-neighborhoods-heading">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quelques repères</p>
            <h2 id="havre-neighborhoods-heading" className="mt-2 font-display text-3xl md:text-4xl">Quartiers du Havre en images</h2>
          </div>
          <Link to="/biens?city=le-havre" className="inline-flex items-center gap-2 text-sm text-brand-strong underline-offset-4 hover:underline">
            Voir les biens au Havre <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {havrePhotos.map((photo) => (
            <figure key={photo.src} className="group overflow-hidden rounded-xl border border-border bg-card">
              <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
              <figcaption className="flex items-start justify-between gap-3 p-4">
                <div>
                  <h3 className="font-medium">{photo.caption}</h3>
                  <a className="mt-1 inline-block text-xs text-muted-foreground underline underline-offset-2" href={photo.href} target="_blank" rel="noreferrer">Photo : {photo.author} · source</a>
                </div>
                <Link to={`/biens?${new URLSearchParams({ city: "le-havre", q: photo.query }).toString()}`} aria-label={`Voir les biens associés à ${photo.caption}`} className="rounded-full p-2 text-brand-strong hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="container mx-auto flex flex-col gap-5 px-4 py-10 md:flex-row md:items-center md:justify-between md:py-12">
          <div>
            <h2 className="font-display text-3xl">Un projet dans l’un de ces secteurs ?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Dites-nous où vous souhaitez acheter ou vendre. Notre équipe pourra vous renseigner sur l’accompagnement proposé dans votre secteur.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline"><Link to="/biens">Tous les biens</Link></Button>
            <Button asChild variant="brand"><Link to="/contact">Parler à l’agence <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
