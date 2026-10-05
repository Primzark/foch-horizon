export type GeographyGuideLabel = {
  id: string;
  name: string;
  placeType?: "quartier" | "commune";
};

// The full guide copy stays with lazy page chunks; this compact index supports navigation and site metadata.
export const geographyGuideIndex: GeographyGuideLabel[] = [
  { id: "le-havre", name: "Le Havre" },
  { id: "sainte-adresse", name: "Sainte-Adresse" },
  { id: "la-plage", name: "La plage et Saint-Vincent" },
  { id: "gobelins", name: "Les Gobelins" },
  { id: "saint-michel", name: "Saint-Michel" },
  { id: "octeville-sur-mer", name: "Octeville-sur-Mer" },
  { id: "montivilliers", name: "Montivilliers" },
  { id: "maneglise", name: "Manéglise" },
  { id: "gainneville", name: "Gainneville" },
  { id: "saint-romain", name: "Saint-Romain-de-Colbosc" },
  { id: "etretat", name: "Étretat" },
  { id: "deauville", name: "Deauville" },
  { id: "trouville", name: "Trouville-sur-Mer" },
  { id: "halles-centrales", name: "Halles Centrales", placeType: "quartier" },
  { id: "hotel-de-ville", name: "Hôtel de Ville", placeType: "quartier" },
  { id: "notre-dame", name: "Notre-Dame", placeType: "quartier" },
  { id: "saint-francois", name: "Saint-François", placeType: "quartier" },
  { id: "perrey", name: "Le Perrey", placeType: "quartier" },
  { id: "danton", name: "Danton", placeType: "quartier" },
  { id: "bleville", name: "Bois de Bléville", placeType: "quartier" },
  { id: "centre-ville", name: "Le centre-ville", placeType: "quartier" },
  { id: "avenue-foch", name: "Avenue Foch", placeType: "quartier" },
  { id: "harfleur", name: "Harfleur", placeType: "commune" },
  { id: "gonfreville-l-orcher", name: "Gonfreville-l’Orcher", placeType: "commune" },
  { id: "rogerville", name: "Rogerville", placeType: "commune" },
  { id: "saint-laurent-de-brevedent", name: "Saint-Laurent-de-Brèvedent", placeType: "commune" },
  { id: "etainhus", name: "Étainhus", placeType: "commune" },
  { id: "epretot", name: "Épretot", placeType: "commune" },
  { id: "saint-aubin-routot", name: "Saint-Aubin-Routot", placeType: "commune" },
  { id: "la-remuee", name: "La Remuée", placeType: "commune" },
  { id: "gommerville", name: "Gommerville", placeType: "commune" },
  { id: "la-cerlangue", name: "La Cerlangue", placeType: "commune" },
  { id: "les-trois-pierres", name: "Les Trois-Pierres", placeType: "commune" },
];

export function isHavreNeighborhood(guide: GeographyGuideLabel): boolean {
  return guide.placeType === "quartier" || ["la-plage", "gobelins", "saint-michel"].includes(guide.id);
}
