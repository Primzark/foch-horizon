// Mock data for Foch Immobilier demo

export interface Agent {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  bio: string;
  languages: string[];
  slug: string;
  photo: string;
  specialty: string;
}

export interface PropertyImage {
  id: string;
  url: string;
  alt: string;
  sort_order: number;
}

export interface Property {
  id: string;
  ref_id: string;
  slug: string;
  transaction_type: 'buy' | 'rent';
  status: 'available' | 'under_offer' | 'sold' | 'rented' | 'archived';
  title: string;
  city: string;
  area: string;
  postcode: string;
  price: number;
  surface_m2: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  garage: boolean;
  features: string[];
  description: string;
  dpe_class: string;
  ges_class: string;
  lat: number;
  lng: number;
  agent_id: string;
  created_at: string;
  updated_at: string;
  images: PropertyImage[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  published_at: string;
  status: string;
  tags: string[];
}

export const agents: Agent[] = [
  {
    id: "1",
    name: "Marie Dupont",
    role: "Directrice d'agence",
    phone: "02 35 42 00 01",
    email: "m.dupont@foch-immobilier.fr",
    bio: "Depuis plus de 20 ans au service de l'immobilier havrais, Marie dirige l'agence Foch Immobilier avec passion et expertise. Spécialiste du marché haut de gamme, elle accompagne ses clients dans leurs projets les plus ambitieux.",
    languages: ["Français", "Anglais"],
    slug: "marie-dupont",
    photo: "",
    specialty: "Biens de prestige",
  },
  {
    id: "2",
    name: "Thomas Lefebvre",
    role: "Négociateur immobilier",
    phone: "02 35 42 00 02",
    email: "t.lefebvre@foch-immobilier.fr",
    bio: "Thomas est spécialisé dans les appartements en centre-ville du Havre. Sa connaissance approfondie des quartiers et son sens du contact en font un interlocuteur privilégié pour les acquéreurs comme pour les vendeurs.",
    languages: ["Français", "Espagnol"],
    slug: "thomas-lefebvre",
    photo: "",
    specialty: "Appartements centre-ville",
  },
  {
    id: "3",
    name: "Sophie Martin",
    role: "Conseillère en immobilier",
    phone: "02 35 42 00 03",
    email: "s.martin@foch-immobilier.fr",
    bio: "Sophie accompagne les primo-accédants et les investisseurs dans leurs projets immobiliers. Son approche pédagogique et sa disponibilité sont très appréciées de ses clients.",
    languages: ["Français", "Anglais", "Allemand"],
    slug: "sophie-martin",
    photo: "",
    specialty: "Location & investissement",
  },
];

export const properties: Property[] = [
  {
    id: "1",
    ref_id: "FI-2024-001",
    slug: "appartement-vue-mer-3-pieces-le-havre",
    transaction_type: "buy",
    status: "available",
    title: "Appartement vue mer 3 pièces",
    city: "Le Havre",
    area: "Front de mer",
    postcode: "76600",
    price: 285000,
    surface_m2: 72,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    parking: 1,
    garage: false,
    features: ["Vue mer", "Balcon", "Ascenseur", "Gardien", "Cave"],
    description: "Magnifique appartement de 3 pièces offrant une vue imprenable sur la mer. Situé au 5ème étage d'une résidence de standing avec ascenseur, il se compose d'un séjour lumineux avec balcon, d'une cuisine équipée, de deux chambres, d'une salle de bains et d'un WC séparé. Cave et place de parking en sous-sol.",
    dpe_class: "C",
    ges_class: "D",
    lat: 49.4872,
    lng: 0.1218,
    agent_id: "1",
    created_at: "2024-11-15",
    updated_at: "2024-12-01",
    images: [
      { id: "1-1", url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop", alt: "Séjour lumineux vue mer", sort_order: 0 },
      { id: "1-2", url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop", alt: "Cuisine équipée moderne", sort_order: 1 },
      { id: "1-3", url: "https://images.unsplash.com/photo-1522771739806-5cf26c4fd7a3?w=800&h=600&fit=crop", alt: "Chambre principale", sort_order: 2 },
    ],
  },
  {
    id: "2",
    ref_id: "FI-2024-002",
    slug: "maison-bourgeoise-5-pieces-sainte-adresse",
    transaction_type: "buy",
    status: "available",
    title: "Maison bourgeoise 5 pièces avec jardin",
    city: "Sainte-Adresse",
    area: "Cap de la Hève",
    postcode: "76310",
    price: 520000,
    surface_m2: 145,
    rooms: 5,
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    garage: true,
    features: ["Jardin", "Terrasse", "Cheminée", "Garage double", "Sous-sol", "Vue mer partielle"],
    description: "Belle maison bourgeoise de caractère à Sainte-Adresse, à deux pas du cap de la Hève. Cette demeure de 145 m² offre de beaux volumes avec un séjour double traversant avec cheminée, une cuisine équipée ouverte, trois grandes chambres, deux salles d'eau, un sous-sol complet et un jardin arboré de 400 m².",
    dpe_class: "D",
    ges_class: "E",
    lat: 49.5045,
    lng: 0.0785,
    agent_id: "1",
    created_at: "2024-10-20",
    updated_at: "2024-11-15",
    images: [
      { id: "2-1", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop", alt: "Façade maison bourgeoise", sort_order: 0 },
      { id: "2-2", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop", alt: "Jardin arboré", sort_order: 1 },
      { id: "2-3", url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop", alt: "Séjour avec cheminée", sort_order: 2 },
    ],
  },
  {
    id: "3",
    ref_id: "FI-2024-003",
    slug: "studio-meuble-centre-ville-le-havre",
    transaction_type: "rent",
    status: "available",
    title: "Studio meublé centre-ville",
    city: "Le Havre",
    area: "Centre-ville",
    postcode: "76600",
    price: 520,
    surface_m2: 28,
    rooms: 1,
    bedrooms: 0,
    bathrooms: 1,
    parking: 0,
    garage: false,
    features: ["Meublé", "Internet inclus", "Proche tramway"],
    description: "Studio entièrement meublé et équipé au cœur du Havre. Idéal pour étudiant ou jeune actif. Comprend un coin nuit, un coin salon, une kitchenette équipée et une salle d'eau avec WC. Proche de toutes commodités et du tramway.",
    dpe_class: "B",
    ges_class: "C",
    lat: 49.4938,
    lng: 0.1077,
    agent_id: "2",
    created_at: "2024-12-01",
    updated_at: "2024-12-10",
    images: [
      { id: "3-1", url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop", alt: "Studio meublé", sort_order: 0 },
    ],
  },
  {
    id: "4",
    ref_id: "FI-2024-004",
    slug: "appartement-4-pieces-standing-le-havre",
    transaction_type: "buy",
    status: "under_offer",
    title: "Appartement 4 pièces standing",
    city: "Le Havre",
    area: "Quartier Perret",
    postcode: "76600",
    price: 195000,
    surface_m2: 85,
    rooms: 4,
    bedrooms: 2,
    bathrooms: 1,
    parking: 1,
    garage: false,
    features: ["Parquet", "Moulures", "Cave", "Ascenseur"],
    description: "Dans l'emblématique quartier Perret classé UNESCO, bel appartement de 4 pièces au 3ème étage avec ascenseur. Parquet, moulures et beaux volumes caractéristiques. Séjour double, deux chambres, cuisine séparée, salle de bains. Cave et parking.",
    dpe_class: "D",
    ges_class: "D",
    lat: 49.4922,
    lng: 0.1068,
    agent_id: "2",
    created_at: "2024-09-15",
    updated_at: "2024-11-20",
    images: [
      { id: "4-1", url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800&h=600&fit=crop", alt: "Séjour lumineux", sort_order: 0 },
      { id: "4-2", url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&h=600&fit=crop", alt: "Cuisine aménagée", sort_order: 1 },
    ],
  },
  {
    id: "5",
    ref_id: "FI-2024-005",
    slug: "t3-lumineux-terrasse-harfleur",
    transaction_type: "rent",
    status: "available",
    title: "T3 lumineux avec terrasse",
    city: "Harfleur",
    area: "Centre",
    postcode: "76700",
    price: 750,
    surface_m2: 62,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    parking: 1,
    garage: false,
    features: ["Terrasse", "Place de parking", "Récent"],
    description: "Appartement T3 récent et lumineux à Harfleur. Séjour avec accès terrasse, cuisine ouverte aménagée, deux chambres, salle de bains. Place de parking privée. Proche commerces et transports.",
    dpe_class: "B",
    ges_class: "B",
    lat: 49.5072,
    lng: 0.1942,
    agent_id: "3",
    created_at: "2024-11-25",
    updated_at: "2024-12-05",
    images: [
      { id: "5-1", url: "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&h=600&fit=crop", alt: "Séjour avec terrasse", sort_order: 0 },
    ],
  },
  {
    id: "6",
    ref_id: "FI-2024-006",
    slug: "villa-contemporaine-octeville",
    transaction_type: "buy",
    status: "available",
    title: "Villa contemporaine 6 pièces",
    city: "Octeville-sur-Mer",
    area: "Résidentiel",
    postcode: "76930",
    price: 680000,
    surface_m2: 180,
    rooms: 6,
    bedrooms: 4,
    bathrooms: 2,
    parking: 3,
    garage: true,
    features: ["Piscine", "Jardin 800m²", "Suite parentale", "Domotique", "Panneaux solaires"],
    description: "Superbe villa contemporaine de 2019 à Octeville-sur-Mer. Grands espaces de vie ouverts, suite parentale avec dressing et salle d'eau, 3 chambres supplémentaires, bureau, double garage. Jardin paysager de 800 m² avec piscine chauffée. Domotique et panneaux solaires.",
    dpe_class: "A",
    ges_class: "A",
    lat: 49.5282,
    lng: 0.0575,
    agent_id: "1",
    created_at: "2024-12-10",
    updated_at: "2024-12-15",
    images: [
      { id: "6-1", url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop", alt: "Villa contemporaine façade", sort_order: 0 },
      { id: "6-2", url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop", alt: "Piscine et jardin", sort_order: 1 },
    ],
  },
];

export const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Le marché immobilier au Havre : bilan 2024",
    slug: "marche-immobilier-le-havre-bilan-2024",
    excerpt: "Analyse complète du marché immobilier havrais en 2024 : tendances des prix, quartiers porteurs et perspectives pour 2025.",
    content: "Le marché immobilier au Havre a connu une année 2024 contrastée...",
    cover_image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=400&fit=crop",
    published_at: "2024-12-10",
    status: "published",
    tags: ["Marché immobilier", "Le Havre", "Analyse"],
  },
  {
    id: "2",
    title: "Nouveau DPE : ce qui change en 2025",
    slug: "nouveau-dpe-ce-qui-change-2025",
    excerpt: "Le diagnostic de performance énergétique évolue. Découvrez les nouvelles règles et leur impact sur la vente et la location.",
    content: "Le DPE fait peau neuve en 2025 avec de nouvelles méthodes de calcul...",
    cover_image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=400&fit=crop",
    published_at: "2024-11-28",
    status: "published",
    tags: ["DPE", "Réglementation", "Énergie"],
  },
  {
    id: "3",
    title: "5 conseils pour bien vendre votre bien",
    slug: "5-conseils-bien-vendre",
    excerpt: "Maximisez vos chances de vendre rapidement et au meilleur prix grâce à nos conseils d'experts.",
    content: "Vendre un bien immobilier est une étape importante...",
    cover_image: "https://images.unsplash.com/photo-1560520031-3a4dc4e9de0c?w=800&h=400&fit=crop",
    published_at: "2024-11-15",
    status: "published",
    tags: ["Conseils", "Vente", "Guide"],
  },
];

export const getPropertyBySlug = (slug: string) => properties.find(p => p.slug === slug);
export const getAgentById = (id: string) => agents.find(a => a.id === id);
export const getAgentBySlug = (slug: string) => agents.find(a => a.slug === slug);
export const getBlogPostBySlug = (slug: string) => blogPosts.find(b => b.slug === slug);

export const formatPrice = (price: number, type: 'buy' | 'rent') => {
  const formatted = new Intl.NumberFormat('fr-FR').format(price);
  return type === 'rent' ? `${formatted} €/mois` : `${formatted} €`;
};

export const cities = [...new Set(properties.map(p => p.city))];
export const propertyTypes = ["Appartement", "Maison", "Villa", "Studio", "Terrain", "Commerce"];
