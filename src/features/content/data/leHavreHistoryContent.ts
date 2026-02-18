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

export const competitiveKeywordSignals = [
  {
    source: "SeLoger - Le Havre",
    keywordPatterns: [
      "appartement a vendre le havre",
      "maison a vendre le havre",
      "prix immobilier le havre",
      "annonce immobiliere le havre",
    ],
  },
  {
    source: "Bien'ici - Le Havre",
    keywordPatterns: [
      "immobilier le havre centre",
      "achat appartement le havre",
      "location appartement le havre",
      "quartier perret immobilier",
    ],
  },
  {
    source: "LeBonCoin Immobilier - Le Havre",
    keywordPatterns: [
      "vente appartement le havre",
      "vente maison le havre",
      "investissement locatif le havre",
      "studio le havre rendement",
    ],
  },
  {
    source: "Logic-Immo - Le Havre",
    keywordPatterns: [
      "agence immobiliere le havre",
      "estimation immobiliere le havre",
      "gestion locative le havre",
      "syndic le havre",
    ],
  },
];

export const leHavreSeoKeywordBank = [
  "immobilier le havre",
  "agence immobiliere le havre",
  "appartement a vendre le havre",
  "maison a vendre le havre",
  "location appartement le havre",
  "estimation immobiliere le havre",
  "gestion locative le havre",
  "prix immobilier le havre",
  "prix m2 le havre",
  "investissement locatif le havre",
  "quartier perret immobilier",
  "quartier saint-francois le havre",
  "quartier saint-vincent le havre",
  "immobilier centre-ville le havre",
  "compromis de vente le havre",
  "achat appartement perret",
  "vente maison sanvic",
  "immeuble de rapport le havre",
  "studio etudiant le havre",
  "patrimoine perret unesco",
];

export const leHavreHistoryPhotos: HistoryPhotoAsset[] = [
  {
    id: "perret-architecture",
    src: "/images/le-havre-history/architecture-perret.jpg",
    alt: "Architecture Perret au Havre, facades reconstruites et trame urbaine moderne",
    caption: "Trame architecturale du quartier Perret, coeur du marche immobilier du centre reconstruit.",
    author: "Philippe Roudaut",
    license: "CC0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Architecture_Perret_Au_Havre_(180697579).jpeg",
  },
  {
    id: "saint-francois-bassin",
    src: "/images/le-havre-history/saint-francois-bassin-du-roy.jpg",
    alt: "Quartier Saint-Francois et Bassin du Roy au Havre",
    caption: "Saint-Francois combine patrimoine maritime, immeubles anciens et forte demande locative.",
    author: "Philippe Ales",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Le_Havre_(France),_quarter_Saint-Fran%C3%A7ois_and_Bassin_du_Roy.JPG",
  },
  {
    id: "saint-vincent-place",
    src: "/images/le-havre-history/place-saint-vincent.jpg",
    alt: "Place Saint-Vincent au Havre, architecture residentielle pres de la plage",
    caption: "Saint-Vincent attire les acquereurs cherchant un appartement proche mer au Havre.",
    author: "Philippe Ales",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Place_Saint-Vincent_(France).jpg",
  },
  {
    id: "hotel-ville",
    src: "/images/le-havre-history/hotel-de-ville.jpg",
    alt: "Hotel de ville du Havre dans le secteur Perret",
    caption: "Le secteur Hotel de Ville reste une reference pour l'achat appartement Le Havre centre.",
    author: "Ronan L.",
    license: "CC BY-SA 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Le_Havre_-_l%27h%C3%B4tel_de_ville.jpg",
  },
  {
    id: "docks-vauban",
    src: "/images/le-havre-history/docks-vauban.jpg",
    alt: "Docks Vauban au Havre, reconversion urbaine et commerces",
    caption: "Le quartier de l'Eure et les Docks Vauban structurent un nouveau pole immobilier au Havre.",
    author: "Philippe Ales",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Docks_Vauban_au_Havre.jpg",
  },
  {
    id: "bassin-commerce",
    src: "/images/le-havre-history/bassin-du-commerce.jpg",
    alt: "Bassin du Commerce au Havre avec front urbain reconstruit",
    caption: "Autour du Bassin du Commerce, la demande reste soutenue en investissement locatif Le Havre.",
    author: "Gfmorin",
    license: "Public domain",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Le_Havre_Bassin_du_Commerce.jpg",
  },
  {
    id: "saint-joseph",
    src: "/images/le-havre-history/eglise-saint-joseph.jpg",
    alt: "Eglise Saint-Joseph du Havre, symbole du patrimoine Perret",
    caption: "Le patrimoine Perret autour de Saint-Joseph soutient la valeur immobiliere du centre-ville.",
    author: "Aerith (transfer to Commons)",
    license: "Public domain",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Eglise_saint_joseph_du_Havre.jpg",
  },
  {
    id: "panorama-havre",
    src: "/images/le-havre-history/panorama-le-havre.jpg",
    alt: "Panorama urbain du Havre, front de mer, bassins et quartiers residentiels",
    caption: "Vue d'ensemble du marche immobilier Le Havre, entre centre reconstruit, mer et cote.",
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
      "Fondee en 1517, la ville se structure autour du port et des activites marchandes. Les premiers ilots proches de l'actuel Saint-Francois installent un marche immobilier portuaire, compose de maisons de negoce, d'habitats d'artisans et de commerces de quai.",
  },
  {
    period: "XIXe siecle",
    title: "Expansion industrielle et nouveaux quartiers",
    description:
      "L'essor maritime et industriel augmente la population et stimule l'immobilier Le Havre: creation de logements ouvriers, d'immeubles bourgeois cote ville haute, et extension vers Graville, Sanvic et les axes de tramways historiques.",
  },
  {
    period: "1944-1964",
    title: "Reconstruction Perret et modernite urbaine",
    description:
      "Apres les destructions de 1944, la reconstruction conduite par Auguste Perret redefine le centre. Ce plan coherent cree aujourd'hui un segment tres recherche pour l'achat appartement Le Havre centre, reconnu par l'UNESCO.",
  },
  {
    period: "1965-2000",
    title: "Structuration residentielle et mobilites",
    description:
      "La ville consolide ses quartiers residentiels: Saint-Vincent cote mer, Sanvic familial, Graville mixte. Les agences immobilieres du Havre deploient des services de transaction, gestion locative et syndic a grande echelle.",
  },
  {
    period: "2000-aujourd'hui",
    title: "Renouvellement des docks et attractivite locative",
    description:
      "Les Docks Vauban, le front de mer et les operations de renovation energetique renforcent l'investissement locatif Le Havre. Le marche combine rendement, cadre de vie et diversification entre residences principales et patrimoine a valoriser.",
  },
];

export const leHavreDistrictHistory: DistrictHistorySection[] = [
  {
    id: "perret",
    name: "Quartier Perret",
    headline: "Le centre reconstruit, reference de l'immobilier Le Havre UNESCO",
    summary:
      "Le quartier Perret concentre la demande la plus visible en immobilier Le Havre centre-ville. Les appartements Perret, les immeubles avec ascenseur et les vues degagees sur la perspective de l'hotel de ville attirent acquereurs occupants, investisseurs et professions liberales. L'agence immobiliere Le Havre doit ici maitriser les coproprietes anciennes, les audits energetiques et la valorisation patrimoniale.",
    marketFocus:
      "Mots-clés dominants: appartement a vendre Le Havre, prix m2 Le Havre centre, estimation immobiliere Le Havre Perret, compromis de vente Le Havre.",
    investmentAngle:
      "Pour un investissement locatif Le Havre, Perret offre une demande locative stable (actifs et cadres), une excellente liquidite de revente et une forte lisibilite des valeurs au m2.",
    timeline: [
      "1945-1954: lancement des grands ilots en beton arme",
      "2005: inscription UNESCO, acceleration de la demande patrimoniale",
      "2015-2026: montee des projets de renovation energetique et de requalification interieure",
    ],
    keywordTags: [
      "immobilier le havre perret",
      "appartement a vendre le havre centre",
      "agence immobiliere perret",
      "prix m2 perret le havre",
      "estimation appartement perret",
    ],
    photoIds: ["perret-architecture", "hotel-ville", "saint-joseph"],
  },
  {
    id: "saint-francois",
    name: "Quartier Saint-Francois",
    headline: "Le secteur maritime historique, tension locative forte",
    summary:
      "Saint-Francois est l'un des quartiers les plus typiques pour acheter un appartement au Havre proche port et bassins. Le parc immobilier melange immeubles anciens, petites surfaces, duplex atypiques et biens avec vue eau. Pour une agence immobiliere Le Havre, c'est un secteur cle en vente appartement Le Havre et en location appartement Le Havre grace a la demande de jeunes actifs et de profils lies a l'economie maritime.",
    marketFocus:
      "Mots-clés dominants: quartier Saint-Francois Le Havre, studio Le Havre rendement, investissement locatif Le Havre port, annonce immobiliere Le Havre ancien.",
    investmentAngle:
      "Le secteur presente des tickets d'entree encore accessibles sur certaines rues, avec une rentabilite locative souvent competitive face aux zones les plus premium du front de mer.",
    timeline: [
      "XVIe-XVIIIe: formation du noyau portuaire",
      "XIXe: densification commerciale et habitats de negoce",
      "Depuis 2000: revalorisation touristique et residentielle autour des bassins",
    ],
    keywordTags: [
      "immobilier saint-francois le havre",
      "appartement vue bassin le havre",
      "vente appartement saint-francois",
      "location meublée le havre port",
      "investissement locatif saint-francois",
    ],
    photoIds: ["saint-francois-bassin", "bassin-commerce"],
  },
  {
    id: "saint-vincent",
    name: "Quartier Saint-Vincent",
    headline: "L'adresse balneaire pour un immobilier residentiel premium",
    summary:
      "Entre plage, commerces de proximite et batiments de caractere, Saint-Vincent reste un pole majeur pour maison a vendre Le Havre et appartement familial Le Havre bord de mer. Le marche immobilier Le Havre y valorise fortement l'exterieur, la luminosite et la marche a pied vers la promenade littorale. Les delais de vente sont souvent courts pour les biens bien positionnes.",
    marketFocus:
      "Mots-clés dominants: immobilier saint-vincent le havre, appartement mer le havre, maison familiale saint-vincent, agence immobiliere front de mer.",
    investmentAngle:
      "Le quartier combine securite patrimoniale et rarete fonciere, ce qui soutient la valeur sur long terme et facilite la revente.",
    timeline: [
      "Fin XIXe: essor des residences de bord de mer",
      "Annees 1960-1990: consolidation residentielle",
      "Depuis 2010: regain d'attractivite avec cadre de vie littoral",
    ],
    keywordTags: [
      "appartement saint-vincent le havre",
      "maison a vendre proche plage le havre",
      "prix immobilier front de mer le havre",
      "estimation immobiliere saint-vincent",
      "agence immobiliere plage le havre",
    ],
    photoIds: ["saint-vincent-place", "panorama-havre"],
  },
  {
    id: "graville",
    name: "Graville et ville basse",
    headline: "Un marche mixte, residentiel et patrimonial",
    summary:
      "Graville offre une lecture immobiliere tres interessante au Havre: maisons de ville, petits collectifs et parc locatif etabli. Le secteur attire les menages cherchant un prix immobilier Le Havre plus contenu tout en restant connecte aux zones d'emploi. Les agences immobilieres y travaillent aussi bien la primo-accession que la vente maison Le Havre avec potentiel de renovation.",
    marketFocus:
      "Mots-clés dominants: maison a vendre graville le havre, estimation maison le havre, achat immobilier ville basse, investissement locatif graville.",
    investmentAngle:
      "La profondeur de marche et le niveau de prix d'entree permettent des strategies diversifiees: residence principale, location nue ou location meublee longue duree.",
    timeline: [
      "XIXe: integration progressive au tissu havrais",
      "1950-1980: urbanisation residentielle continue",
      "Depuis 2015: regain d'interet pour les biens a renover",
    ],
    keywordTags: [
      "immobilier graville le havre",
      "maison de ville le havre",
      "achat maison graville",
      "agence immobiliere ville basse le havre",
      "estimation graville le havre",
    ],
    photoIds: ["bassin-commerce", "panorama-havre"],
  },
  {
    id: "sanvic",
    name: "Sanvic",
    headline: "Le pole familial de la ville haute",
    summary:
      "Sanvic reste central pour la recherche maison a vendre Le Havre avec jardin, garage et proximite des etablissements scolaires. Le marche immobilier Le Havre Sanvic est porte par la demande familiale, la qualite de vie et la presence d'un parc de maisons individuelles. Les transactions y mobilisent frequemment des dossiers de financement classiques avec compromis de vente le havre securises.",
    marketFocus:
      "Mots-clés dominants: vente maison sanvic le havre, quartier residentiel le havre, estimation maison familiale, agence immobiliere sanvic.",
    investmentAngle:
      "Moins speculatif que les secteurs hyper-centraux, Sanvic offre une forte stabilite de valeur et un rythme de rotation sain.",
    timeline: [
      "Debut XXe: urbanisation de la ville haute",
      "1960-2000: extension du parc pavillonnaire",
      "Depuis 2018: forte recherche sur maisons renovees energetiquement",
    ],
    keywordTags: [
      "immobilier sanvic le havre",
      "maison familiale le havre",
      "vente pavillon sanvic",
      "estimation maison sanvic",
      "agence immobiliere ville haute le havre",
    ],
    photoIds: ["panorama-havre", "hotel-ville"],
  },
  {
    id: "eure-docks",
    name: "Eure - Docks Vauban",
    headline: "Le Havre en renouvellement urbain et rendement locatif",
    summary:
      "Le secteur Eure - Docks Vauban symbolise le nouveau cycle immobilier Le Havre: programmes recents, commerces, mobilites et mixite habitat-activites. La location appartement Le Havre y est soutenue par les actifs mobiles et les etudiants. Les investisseurs ciblent souvent studio, T2 et petites surfaces proches des transports pour optimiser la vacance locative.",
    marketFocus:
      "Mots-clés dominants: investissement locatif le havre docks, appartement neuf le havre, rendement locatif le havre eure, gestion locative le havre.",
    investmentAngle:
      "La zone combine potentiel de valorisation a moyen terme et strategie de revenus, notamment pour un portefeuille locatif diversifie.",
    timeline: [
      "1990-2010: lancement des reconversions de friches portuaires",
      "2010-2020: acceleration des commerces et residences recentes",
      "2020-2026: renforcement de l'attractivite locative et des projets mixtes",
    ],
    keywordTags: [
      "immobilier eure le havre",
      "docks vauban appartement",
      "location appartement docks le havre",
      "gestion locative eure",
      "investissement locatif le havre docks",
    ],
    photoIds: ["docks-vauban", "panorama-havre"],
  },
];

export const leHavreFaq = [
  {
    question: "Quel quartier choisir pour acheter un appartement au Havre ?",
    answer:
      "Pour un appartement a vendre Le Havre centre, Perret reste la reference. Pour un cadre maritime, Saint-Vincent et Saint-Francois sont tres demandes. Pour un budget plus modulable, Graville et certains secteurs de l'Eure offrent de bonnes opportunites.",
  },
  {
    question: "Le Havre est-il pertinent pour un investissement locatif ?",
    answer:
      "Oui, le marche immobilier Le Havre combine demande locative active, prix d'entree encore competitifs sur plusieurs quartiers et typologies variees (studio, T2, maisons). La selection du quartier et de la surface reste determinante pour le rendement.",
  },
  {
    question: "Comment optimiser une estimation immobiliere au Havre ?",
    answer:
      "Une estimation immobiliere Le Havre performante repose sur les ventes recentes du micro-secteur, l'etat energetique, la copropriete, la vue, l'etage, l'exterieur et la liquidite de la typologie dans le quartier cible.",
  },
];
