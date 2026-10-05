import { communeByGuideId, placeEntity } from "@/lib/seo/entities";
import { Link } from "react-router-dom";
import { ArrowRight, MoveUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeo, getSiteUrl } from "@/lib/seo/useSeo";
import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";
import { geographyGuides, geographyPhotoCredits, geographyPriceMethod } from "@/features/content/data/geographyGuides";
import { PhotoAttribution } from "@/features/content/components/PhotoAttribution";
import { GeographyGuideDetails } from "@/features/content/components/GeographyGuideDetails";
import { GeographyMap } from "@/features/content/components/GeographyMap";

const guideSections = [
  { number: "01", title: "Le Havre et ses quartiers", description: "Du centre reconstruit aux quartiers historiques, résidentiels et au front de mer.", guideIds: ["le-havre", "centre-ville", "avenue-foch", "halles-centrales", "hotel-de-ville", "notre-dame", "saint-francois", "perrey", "danton", "bleville", "la-plage", "gobelins", "saint-michel"] },
  { number: "02", title: "Le littoral et les coteaux", description: "Des communes résidentielles à la côte d’Albâtre.", guideIds: ["sainte-adresse", "octeville-sur-mer", "etretat"] },
  { number: "03", title: "L’agglomération havraise", description: "Villes et communes proches, reliées au Havre par les transports et les services du quotidien.", guideIds: ["montivilliers", "harfleur", "gainneville", "gonfreville-l-orcher", "rogerville", "saint-laurent-de-brevedent", "maneglise"] },
  { number: "04", title: "Entre Le Havre et Saint-Romain", description: "Des bourgs et villages du pays de Caux, à découvrir selon les trajets et les services recherchés.", guideIds: ["saint-romain", "etainhus", "epretot", "saint-aubin-routot", "la-remuee", "gommerville", "la-cerlangue", "les-trois-pierres"] },
  { number: "05", title: "Deauville et Trouville-sur-Mer", description: "Deux stations balnéaires également citées dans les secteurs de l’agence.", guideIds: ["deauville", "trouville"] },
];

const mapPoints: Record<string, [number, number]> = {
  "halles-centrales": [49.4897, 0.1089], "hotel-de-ville": [49.493132, 0.10811], "le-havre": [49.4944, 0.1072], "centre-ville": [49.4984, 0.116], "avenue-foch": [49.4934, 0.1005], "notre-dame": [49.487, 0.108333],
  "saint-francois": [49.4895, 0.120], perrey: [49.488611, 0.099467], danton: [49.494242, 0.121804], bleville: [49.520324, 0.099586], "la-plage": [49.495, 0.080],
  gobelins: [49.4905, 0.094], "saint-michel": [49.500, 0.098], "sainte-adresse": [49.5055, 0.084],
  "octeville-sur-mer": [49.554, 0.145], montivilliers: [49.545, 0.188], maneglise: [49.552, 0.299],
  gainneville: [49.505, 0.25], harfleur: [49.507, 0.20], "gonfreville-l-orcher": [49.506, 0.232],
  rogerville: [49.516, 0.28], "saint-laurent-de-brevedent": [49.535, 0.23], "saint-romain": [49.531, 0.357],
  etainhus: [49.552, 0.321], epretot: [49.559, 0.296], "saint-aubin-routot": [49.551, 0.322],
  "la-remuee": [49.557, 0.399], gommerville: [49.57, 0.348], "la-cerlangue": [49.51, 0.416],
  "les-trois-pierres": [49.563, 0.371], etretat: [49.707, 0.205], deauville: [49.358, 0.075],
  trouville: [49.366, 0.083],
};

const geographyMapLocations = geographyGuides.flatMap((guide) => {
  const commune = communeByGuideId.get(guide.id);
  const coordinates: [number, number] | undefined = commune ? [commune.latitude, commune.longitude] : mapPoints[guide.id];
  return coordinates ? [{ id: guide.id, name: guide.name, coordinates }] : [];
});

const havrePhotos = [
  {
    src: "/images/geography/architecture-perret.webp",
    alt: "Façades de l’architecture Perret au Havre",
    caption: "Le centre reconstruit",
    credit: geographyPhotoCredits.perret,
    guideId: "le-havre",
    width: 1000,
    height: 750,
  },
  {
    src: "/images/geography/saint-francois.webp",
    alt: "Le quartier Saint-François et le bassin du Roy au Havre",
    caption: "Saint-François et le bassin du Roy",
    credit: geographyPhotoCredits.saintFrancois,
    guideId: "saint-francois",
    width: 1000,
    height: 664,
  },
  {
    src: "/images/geography/saint-vincent.webp",
    alt: "Place Saint-Vincent au Havre, près de la plage",
    caption: "Saint-Vincent, près de la plage",
    credit: geographyPhotoCredits.saintVincent,
    guideId: "la-plage",
    width: 1000,
    height: 664,
  },
  {
    src: "/images/geography/hotel-de-ville.webp",
    alt: "Jardins et place de l’Hôtel de Ville du Havre",
    caption: "La place de l’Hôtel de Ville",
    credit: geographyPhotoCredits.hotelDeVille,
    guideId: "hotel-de-ville",
    width: 1000,
    height: 643,
  },
  {
    src: "/images/geography/notre-dame-cathedral.webp",
    alt: "Façade occidentale de la cathédrale Notre-Dame du Havre",
    caption: "La cathédrale Notre-Dame",
    credit: geographyPhotoCredits.notreDame,
    guideId: "notre-dame",
    width: 900,
    height: 1182,
  },
  {
    src: "/images/geography/perrey-residence-de-france.webp",
    alt: "La Résidence de France dans le quartier Perrey au Havre",
    caption: "La Résidence de France, au Perrey",
    credit: geographyPhotoCredits.perrey,
    guideId: "perrey",
    width: 1000,
    height: 666,
  },
  {
    src: "/images/geography/danton-simone-veil-construction.webp",
    alt: "Chantier du pôle Simone-Veil, rue Lesueur, dans le quartier Danton en 2019",
    caption: "Le pôle Simone-Veil en construction (2019), à Danton",
    credit: geographyPhotoCredits.danton,
    guideId: "danton",
    width: 1000,
    height: 666,
  },
  {
    src: "/images/geography/bleville-home.webp",
    alt: "Maison individuelle rue du Maréchal-Lyautey, dans le quartier du Bois de Bléville au Havre",
    caption: "Une maison du Bois de Bléville",
    credit: geographyPhotoCredits.bleVille,
    guideId: "bleville",
    width: 1000,
    height: 563,
  },
];

export default function GeographyPage() {
  const siteUrl = getSiteUrl();

  useSeo({
    title: "Nos secteurs immobiliers au Havre et alentours | Foch Immobilier",
    description:
      "Découvrez l’histoire, l’architecture, les écoles, les projets, les transports et les repères de prix au Havre, à Sainte-Adresse, dans les communes voisines et sur le littoral normand.",
    canonicalPath: "/geographie",
    image: "/images/geography/foch-storefront.png",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${siteUrl}/geographie#webpage`,
        publisher: { "@id": `${siteUrl}/#agency` },
        name: "Nos secteurs immobiliers au Havre et alentours",
        description:
          "Guides de vie locale et repères immobiliers pour les villes et quartiers autour du Havre, de Sainte-Adresse et du littoral normand.",
        url: `${siteUrl}/geographie`,
        inLanguage: "fr-FR",
        mainEntity: {
          "@type": "ItemList",
          itemListElement: guideSections.flatMap((sector) => sector.guideIds).map((guideId, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: placeEntity(geographyGuides.find((guide) => guide.id === guideId)!, siteUrl),
            })),
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
            <Link to="/contact">Contacter l’agence</Link>
          </Button>
        </div>
      </StorefrontPageHero>

      <section className="border-y border-border bg-card/40" aria-labelledby="sectors-heading">
        <div className="container mx-auto grid gap-10 px-4 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Nos guides locaux</p>
            <h2 id="sectors-heading" className="mt-3 font-display text-3xl md:text-4xl">Explorez nos secteurs</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Quartiers, villes et communes autour du Havre : ouvrez un guide pour voir les repères de vie locale et d’immobilier.
            </p>
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-background">
              <GeographyMap locations={geographyMapLocations} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{geographyMapLocations.length} villes et quartiers · Pour une commune, le repère indique la mairie ; dans un quartier, il est indicatif. Sélectionnez un point pour ouvrir son guide.</p>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {guideSections.map((sector) => (
              <article key={sector.number} className="py-7 md:py-8">
                <div className="flex gap-5 md:gap-7">
                  <span className="pt-1 text-xs tracking-[0.18em] text-brand-strong">{sector.number}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-2xl md:text-3xl">{sector.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sector.description}</p>
                    <ul className="mt-5 flex flex-wrap gap-2.5" aria-label={`Guides par lieu : ${sector.title}`}>
                      {sector.guideIds.map((guideId) => {
                        const place = geographyGuides.find((guide) => guide.id === guideId);
                        if (!place) return null;
                        return (
                        <li key={place.id}>
                          <Link
                            to={`/immobilier/${place.id}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm transition-colors hover:border-brand-border hover:bg-brand-soft hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {place.name}<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                          </Link>
                        </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="geography-guides-heading">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bien choisir son secteur</p>
          <h2 id="geography-guides-heading" className="mt-2 font-display text-3xl md:text-4xl">Vivre et acheter dans nos secteurs</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Histoire, formes de logements, écoles, commerces, déplacements et projets : ouvrez un guide pour comprendre le quotidien et les repères immobiliers de chaque ville ou quartier.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-brand-border bg-brand-soft/50 p-5 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="font-medium">{geographyPriceMethod.title}</h3>
              <p className="mt-1 max-w-4xl text-sm leading-relaxed text-muted-foreground">{geographyPriceMethod.description}</p>
            </div>
            <p className="shrink-0 text-xs text-muted-foreground">{geographyPriceMethod.date}</p>
          </div>
          <a className="mt-3 inline-flex items-center gap-1 text-sm text-brand-strong underline underline-offset-4" href={geographyPriceMethod.dvfLink.href} target="_blank" rel="noreferrer">
            {geographyPriceMethod.dvfLink.label}<MoveUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-10 space-y-10">
          {guideSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 border-b border-border pb-3 font-display text-2xl">{section.title}</h3>
              <div className="grid items-start gap-4 xl:grid-cols-2">
                {section.guideIds.map((guideId) => {
                  const guide = geographyGuides.find((item) => item.id === guideId);
                  if (!guide) return null;

                  return (
                    <details key={guide.id} className="group overflow-hidden rounded-2xl border border-border bg-card open:shadow-sm">
                      <summary className="flex min-h-24 cursor-pointer list-none items-center justify-between gap-4 p-5 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                          <h4 className="font-display text-xl md:text-2xl">{guide.name}</h4>
                          <span className="mt-1 block text-sm text-muted-foreground">{guide.subtitle}</span>
                          <span className="mt-3 block text-xs text-muted-foreground">{guide.area}</span>
                        </div>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-brand-strong transition-transform group-open:rotate-180" aria-hidden="true">
                          <ArrowRight className="h-4 w-4 rotate-90" />
                        </span>
                      </summary>

                      <GeographyGuideDetails headingLevel={5} guide={guide} className="border-t border-border px-5 pb-5 pt-4" />
                    </details>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16" aria-labelledby="havre-neighborhoods-heading">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quelques repères</p>
            <h2 id="havre-neighborhoods-heading" className="mt-2 font-display text-3xl md:text-4xl">Quartiers du Havre en images</h2>
          </div>
          <Link to="/immobilier/le-havre" className="inline-flex items-center gap-2 text-sm text-brand-strong underline-offset-4 hover:underline">
            Immobilier au Havre <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {havrePhotos.map((photo) => (
            <figure key={photo.src} className="group overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative">
                <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
                <PhotoAttribution credit={photo.credit} />
              </div>
              <figcaption className="flex items-start justify-between gap-3 p-4">
                <div>
                  <h3 className="font-medium">{photo.caption}</h3>
                </div>
                <Link to={`/immobilier/${photo.guideId}`} aria-label={`Voir les informations sur ${photo.caption}`} className="rounded-full p-2 text-brand-strong hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
            <Button asChild variant="brand"><Link to="/contact">Contacter l’agence <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
