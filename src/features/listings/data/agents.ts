import type { Agent } from "@/types/domain";

const legacyFacebookUrl = "https://www.facebook.com/fochimmobiliermetropole#";

export const agents: Agent[] = [
  {
    id: "agent-jeanne-morel",
    fullName: "Jeanne Morel",
    role: "Directrice d'agence",
    phone: "02 35 42 00 01",
    mobile: "06 11 22 33 44",
    email: "contact@foch-immobilier.fr",
    facebookUrl: legacyFacebookUrl,
    portraitUrl:
      "https://foch.staticlbi.com/original/images/agences/avatar_364a50d41bc519ebda39842d618c1ed5.jpg",
    bio: "Référente transaction depuis plus de 15 ans, Jeanne pilote les ventes résidentielles au Havre et sur le littoral.",
    isActive: true,
    cityIds: ["city-le-havre", "city-sainte-adresse", "city-montivilliers"],
  },
  {
    id: "agent-lucas-bernard",
    fullName: "Lucas Bernard",
    role: "Conseiller immobilier",
    phone: "02 35 42 00 01",
    mobile: "06 55 66 77 88",
    email: "vendre@foch-immobilier.fr",
    facebookUrl: legacyFacebookUrl,
    portraitUrl:
      "https://foch.staticlbi.com/original/images/agences/avatar_9ab622de29743726ec6e660e1fd5ea8e.jpg",
    bio: "Spécialiste des appartements familiaux et des acquisitions en résidence principale.",
    isActive: true,
    cityIds: ["city-le-havre", "city-gainneville"],
  },
  {
    id: "agent-clara-durand",
    fullName: "Clara Durand",
    role: "Conseillère location & gestion",
    phone: "02 35 42 00 01",
    mobile: "06 99 88 77 66",
    email: "location@foch-immobilier.fr",
    facebookUrl: legacyFacebookUrl,
    portraitUrl:
      "https://foch.staticlbi.com/original/images/agences/avatar_3b09e05ea7eaad316f237fa19a8ef697.jpg",
    bio: "En charge des locations et de l'administration de biens avec suivi propriétaire-locataire.",
    isActive: true,
    cityIds: ["city-le-havre", "city-maneglise", "city-montivilliers"],
  },
];

export const agentById = new Map(agents.map((agent) => [agent.id, agent]));
