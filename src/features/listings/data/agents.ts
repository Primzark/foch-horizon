import type { Agent } from "@/types/domain";

const legacyFacebookUrl = "https://www.facebook.com/FochImmo/";

export const agents: Agent[] = [
  {
    id: "agent-jeanne-morel",
    fullName: "Alain DURAME",
    role: "Transactions",
    phone: "02 35 42 51 76",
    mobile: "06 11 31 01 95",
    email: "vendre@fochimmobilier.com",
    facebookUrl: legacyFacebookUrl,
    portraitUrl: "https://www.fochimmobilier.com/static/img/agent-immobilier-le-havre-alain-durame_800x896.jpg",
    bio: "Vous accompagne dans vos transactions immobilières depuis 1993.",
    isActive: true,
    cityIds: ["city-le-havre", "city-sainte-adresse", "city-montivilliers"],
  },
  {
    id: "agent-lucas-bernard",
    fullName: "Emma VASSELIN",
    role: "Transactions",
    phone: "02 35 42 51 76",
    mobile: "06 27 22 87 41",
    email: "vendre@fochimmobilier.com",
    facebookUrl: legacyFacebookUrl,
    portraitUrl: "https://www.fochimmobilier.com/static/img/agent-immobilier-le-havre-emma-vasselin_800x896.jpg",
    bio: "Portefeuille d'affaires de qualité.",
    isActive: true,
    cityIds: ["city-le-havre", "city-gainneville"],
  },
  {
    id: "agent-clara-durand",
    fullName: "Véronique FOGT",
    role: "Transactions",
    phone: "02 35 42 51 76",
    mobile: "06 60 78 01 01",
    email: "vendre@fochimmobilier.com",
    facebookUrl: legacyFacebookUrl,
    portraitUrl: "https://www.fochimmobilier.com/static/img/agent-immobilier-le-havre-sandrine-durame_800x896.jpg",
    bio: "Portefeuille d'affaires de qualité.",
    isActive: true,
    cityIds: ["city-le-havre", "city-maneglise", "city-montivilliers"],
  },
  {
    id: "agent-dries-hubert",
    fullName: "Dries HUBERT",
    role: "Transactions et administration de biens",
    phone: "02 35 42 51 76",
    mobile: "",
    email: "contact@fochimmobilier.com",
    facebookUrl: legacyFacebookUrl,
    portraitUrl: "https://www.fochimmobilier.com/static/img/agent-immobilier-le-havre-alain-durame_800x896.jpg",
    bio: "Accompagnement en transaction et administration de biens.",
    isActive: true,
    cityIds: ["city-le-havre", "city-sainte-adresse", "city-gainneville", "city-maneglise", "city-montivilliers"],
  },
];

export const agentById = new Map(agents.map((agent) => [agent.id, agent]));
