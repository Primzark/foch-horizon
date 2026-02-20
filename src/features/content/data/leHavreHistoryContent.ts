export interface HistoryPhotoAsset {
  id: string;
  src: string;
  alt: string;
  caption: string;
  author: string;
  license: string;
  sourceUrl: string;
}

export interface DistrictHistorySection {
  id: string;
  name: string;
  headline: string;
  summary: string;
  marketFocus: string;
  investmentAngle: string;
  timeline: string[];
  keywordTags: string[];
  photoIds: string[];
}

export const leHavreHistoryPhotos: HistoryPhotoAsset[] = [
  {
    id: "perret-architecture",
    src: "/images/le-havre-history/architecture-perret.jpg",
    alt: "Architecture Perret au Havre, façades reconstruites et trame urbaine moderne",
    caption: "Trame architecturale du quartier Perret, cœur du marché immobilier du centre reconstruit.",
    author: "Philippe Roudaut",
    license: "CC0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Architecture_Perret_Au_Havre_(180697579).jpeg",
  },
  {
    id: "saint-francois-bassin",
    src: "/images/le-havre-history/saint-francois-bassin-du-roy.jpg",
    alt: "Quartier Saint-Francois et Bassin du Roy au Havre",
    caption: "Saint-François conjugue patrimoine maritime, immeubles anciens et forte demande locative.",
    author: "Philippe Ales",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Le_Havre_(France),_quarter_Saint-Fran%C3%A7ois_and_Bassin_du_Roy.JPG",
  },
  {
    id: "saint-vincent-place",
    src: "/images/le-havre-history/place-saint-vincent.jpg",
    alt: "Place Saint-Vincent au Havre, architecture résidentielle près de la plage",
    caption: "Saint-Vincent attire les acquéreurs en quête d'un appartement proche de la mer.",
    author: "Philippe Ales",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Place_Saint-Vincent_(France).jpg",
  },
  {
    id: "hotel-ville",
    src: "/images/le-havre-history/hotel-de-ville.jpg",
    alt: "Hôtel de ville du Havre dans le secteur Perret",
    caption: "Le secteur Hôtel de Ville reste une référence pour l'achat d'appartements au Havre centre.",
    author: "Ronan L.",
    license: "CC BY-SA 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Le_Havre_-_l%27h%C3%B4tel_de_ville.jpg",
  },
  {
    id: "docks-vauban",
    src: "/images/le-havre-history/docks-vauban.jpg",
    alt: "Docks Vauban au Havre, reconversion urbaine et commerces",
    caption: "Le quartier de l'Eure et les Docks Vauban structurent un nouveau pôle immobilier au Havre.",
    author: "Philippe Ales",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Docks_Vauban_au_Havre.jpg",
  },
  {
    id: "bassin-commerce",
    src: "/images/le-havre-history/bassin-du-commerce.jpg",
    alt: "Bassin du Commerce au Havre avec front urbain reconstruit",
    caption: "Autour du Bassin du Commerce, la demande reste soutenue pour l'investissement locatif havrais.",
    author: "Gfmorin",
    license: "Public domain",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Le_Havre_Bassin_du_Commerce.jpg",
  },
  {
    id: "saint-joseph",
    src: "/images/le-havre-history/eglise-saint-joseph.jpg",
    alt: "Église Saint-Joseph du Havre, symbole du patrimoine Perret",
    caption: "Le patrimoine Perret autour de Saint-Joseph soutient la valeur immobilière du centre-ville.",
    author: "Aerith (transfer to Commons)",
    license: "Public domain",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Eglise_saint_joseph_du_Havre.jpg",
  },
  {
    id: "panorama-havre",
    src: "/images/le-havre-history/panorama-le-havre.jpg",
    alt: "Panorama urbain du Havre, front de mer, bassins et quartiers résidentiels",
    caption: "Vue d'ensemble du marché immobilier havrais, entre centre reconstruit, mer et côte.",
    author: "Martin Falbisoner",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Panorama_of_Le_Havre,_September_2019.jpg",
  },
];

export const leHavreHistoryTimeline = [
  {
    period: "1517-1789",
    title: "Fondation du Havre et premiers tissus urbains",
    description:
      "Fondée en 1517, la ville se structure autour du port et des activités marchandes. Les premiers îlots proches de l'actuel Saint-François installent un marché immobilier portuaire, composé de maisons de négoce, d'habitats d'artisans et de commerces de quai.",
  },
  {
    period: "XIXe siècle",
    title: "Expansion industrielle et nouveaux quartiers",
    description:
      "L'essor maritime et industriel augmente la population et stimule l'immobilier havrais : création de logements ouvriers, d'immeubles bourgeois côté ville haute, et extension vers Graville, Sanvic et les axes de tramways historiques.",
  },
  {
    period: "1944-1964",
    title: "Reconstruction Perret et modernité urbaine",
    description:
      "Après les destructions de 1944, la reconstruction conduite par Auguste Perret redéfinit le centre. Ce plan cohérent crée aujourd'hui un segment très recherché pour l'achat d'appartements au Havre centre, reconnu par l'UNESCO.",
  },
  {
    period: "1965-2000",
    title: "Structuration résidentielle et mobilités",
    description:
      "La ville consolide ses quartiers résidentiels : Saint-Vincent côté mer, Sanvic familial, Graville mixte. Les agences immobilières du Havre déploient des services de transaction, gestion locative et syndic à grande échelle.",
  },
  {
    period: "2000-aujourd'hui",
    title: "Renouvellement des docks et attractivité locative",
    description:
      "Les Docks Vauban, le front de mer et les opérations de rénovation énergétique renforcent l'investissement locatif au Havre. Le marché combine rendement, cadre de vie et diversification entre résidences principales et patrimoine à valoriser.",
  },
];

export const leHavreDistrictHistory: DistrictHistorySection[] = [
  {
    id: "perret",
    name: "Quartier Perret",
    headline: "Le centre reconstruit, référence patrimoniale du Havre UNESCO",
    summary:
      "Le quartier Perret concentre une demande soutenue en centre-ville. Les immeubles de la reconstruction, les vues dégagées et la cohérence architecturale attirent acquéreurs occupants, investisseurs et professions libérales. Dans ce secteur, l'accompagnement se joue sur la maîtrise des copropriétés anciennes, la lecture énergétique et la valorisation patrimoniale.",
    marketFocus:
      "Marché : appartements familiaux et biens de caractère au cœur du Havre, avec des valeurs stables et une forte profondeur d'acheteurs.",
    investmentAngle:
      "Pour un investissement locatif, Perret offre une demande régulière, une bonne liquidité à la revente et une lisibilité durable des valeurs au m².",
    timeline: [
      "1945-1954 : lancement des grands îlots en béton armé",
      "2005 : inscription UNESCO et accélération de la demande patrimoniale",
      "2015-2026 : montée des rénovations énergétiques et des requalifications intérieures",
    ],
    keywordTags: [
      "Immobilier Le Havre Perret",
      "Appartement centre Perret",
      "Prix m² Perret",
      "Estimation Perret",
      "Patrimoine UNESCO",
    ],
    photoIds: ["perret-architecture", "hotel-ville", "saint-joseph"],
  },
  {
    id: "saint-francois",
    name: "Quartier Saint-Francois",
    headline: "Le secteur maritime historique, tension locative forte",
    summary:
      "Saint-François est l'un des secteurs les plus singuliers du Havre, entre bassins, patrimoine et vie de quartier. Son parc immobilier mêle immeubles anciens, petites surfaces et biens atypiques avec vues sur l'eau. La demande locative y reste active, portée par les jeunes actifs et les métiers liés à l'économie maritime.",
    marketFocus:
      "Marché : studios, deux-pièces et appartements de charme dans un environnement à forte identité portuaire.",
    investmentAngle:
      "Le quartier conserve, sur certaines rues, des tickets d'entrée mesurés avec une rentabilité locative compétitive face aux zones les plus premium du front de mer.",
    timeline: [
      "XVIe-XVIIIe : formation du noyau portuaire",
      "XIXe : densification commerciale et habitat de négoce",
      "Depuis 2000 : revalorisation touristique et résidentielle autour des bassins",
    ],
    keywordTags: [
      "Immobilier Saint-François",
      "Appartement vue bassin",
      "Location meublée port",
      "Investissement locatif",
      "Quartier maritime",
    ],
    photoIds: ["saint-francois-bassin", "bassin-commerce"],
  },
  {
    id: "saint-vincent",
    name: "Quartier Saint-Vincent",
    headline: "L'adresse balnéaire pour un immobilier résidentiel premium",
    summary:
      "Entre plage, commerces de proximité et immeubles de caractère, Saint-Vincent demeure une adresse recherchée pour les appartements familiaux et les maisons proches du littoral. Le marché valorise fortement les extérieurs, la luminosité et la proximité immédiate de la promenade maritime.",
    marketFocus:
      "Marché : biens résidentiels à fort confort de vie, avec une demande soutenue sur les adresses les mieux situées.",
    investmentAngle:
      "Le quartier combine sécurité patrimoniale et rareté foncière, ce qui soutient la valeur à long terme et facilite la revente.",
    timeline: [
      "Fin XIXe : essor des résidences de bord de mer",
      "Années 1960-1990 : consolidation résidentielle",
      "Depuis 2010 : regain d'attractivité grâce au cadre de vie littoral",
    ],
    keywordTags: [
      "Appartement Saint-Vincent",
      "Maison proche plage",
      "Front de mer Le Havre",
      "Estimation Saint-Vincent",
      "Adresse littorale",
    ],
    photoIds: ["saint-vincent-place", "panorama-havre"],
  },
  {
    id: "graville",
    name: "Graville et ville basse",
    headline: "Un marché mixte, résidentiel et patrimonial",
    summary:
      "Graville offre un positionnement équilibré : maisons de ville, petits collectifs et parc locatif établi. Le secteur attire les ménages recherchant un budget plus contenu tout en restant connecté aux zones d'emploi et aux axes de mobilité.",
    marketFocus:
      "Marché : biens familiaux et opportunités de rénovation, adaptés à la primo-accession comme à l'investissement raisonné.",
    investmentAngle:
      "La profondeur de marché et le niveau de prix d'entrée permettent des stratégies diversifiées : résidence principale, location nue ou meublée longue durée.",
    timeline: [
      "XIXe : intégration progressive au tissu havrais",
      "1950-1980 : urbanisation résidentielle continue",
      "Depuis 2015 : regain d'intérêt pour les biens à rénover",
    ],
    keywordTags: [
      "Immobilier Graville",
      "Maison de ville",
      "Achat Graville",
      "Ville basse Le Havre",
      "Estimation Graville",
    ],
    photoIds: ["bassin-commerce", "panorama-havre"],
  },
  {
    id: "sanvic",
    name: "Sanvic",
    headline: "Le pôle familial de la ville haute",
    summary:
      "Sanvic reste central pour la recherche de maisons avec jardin et garage, à proximité des établissements scolaires. Le marché y est porté par une demande familiale continue, une qualité de vie reconnue et un parc de maisons individuelles bien entretenu.",
    marketFocus:
      "Marché : maisons familiales, surfaces extérieures et transactions sécurisées sur des horizons patrimoniaux long terme.",
    investmentAngle:
      "Moins spéculatif que les secteurs hyper-centraux, Sanvic offre une bonne stabilité de valeur et un rythme de rotation sain.",
    timeline: [
      "Début XXe : urbanisation de la ville haute",
      "1960-2000 : extension du parc pavillonnaire",
      "Depuis 2018 : forte demande pour les maisons rénovées énergétiquement",
    ],
    keywordTags: [
      "Immobilier Sanvic",
      "Maison familiale",
      "Pavillon Sanvic",
      "Estimation maison",
      "Ville haute Le Havre",
    ],
    photoIds: ["panorama-havre", "hotel-ville"],
  },
  {
    id: "eure-docks",
    name: "Eure - Docks Vauban",
    headline: "Le Havre en renouvellement urbain et rendement locatif",
    summary:
      "Le secteur Eure - Docks Vauban incarne le nouveau cycle immobilier havrais : programmes récents, commerces, mobilités et mixité habitat-activités. La location y est soutenue par les actifs mobiles et les étudiants, avec une demande régulière sur les petites surfaces proches des transports.",
    marketFocus:
      "Marché : studios, T2 et résidences récentes dans un secteur en transformation continue.",
    investmentAngle:
      "La zone combine potentiel de valorisation à moyen terme et stratégie de revenus, notamment pour un portefeuille locatif diversifié.",
    timeline: [
      "1990-2010 : lancement des reconversions de friches portuaires",
      "2010-2020 : accélération des commerces et résidences récentes",
      "2020-2026 : renforcement de l'attractivité locative et des projets mixtes",
    ],
    keywordTags: [
      "Immobilier Eure",
      "Docks Vauban",
      "Location appartement",
      "Gestion locative",
      "Investissement locatif",
    ],
    photoIds: ["docks-vauban", "panorama-havre"],
  },
];

export const leHavreFaq = [
  {
    question: "Quel quartier choisir pour acheter un appartement au Havre ?",
    answer:
      "Pour un achat en centre-ville, Perret reste une référence. Pour un cadre maritime, Saint-Vincent et Saint-François sont très demandés. Avec un budget plus modulable, Graville et certains secteurs de l'Eure offrent de belles opportunités.",
  },
  {
    question: "Le Havre est-il pertinent pour un investissement locatif ?",
    answer:
      "Oui. Le marché havrais combine une demande locative active, des prix d'entrée encore accessibles sur plusieurs secteurs et des typologies variées. Le choix du quartier et de la surface reste déterminant pour sécuriser le rendement.",
  },
  {
    question: "Comment optimiser une estimation immobilière au Havre ?",
    answer:
      "Une estimation performante repose sur les ventes récentes du micro-secteur, l'état énergétique, la copropriété, la vue, l'étage, les extérieurs et la liquidité de la typologie dans le quartier ciblé.",
  },
];
