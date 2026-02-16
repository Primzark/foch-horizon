export const transactionOptions = [
  { value: "vente", label: "Vente" },
  { value: "location", label: "Location" },
] as const;

export const propertyTypeOptions = [
  { value: "appartement", label: "Appartement" },
  { value: "maison_villa", label: "Maison / Villa" },
  { value: "autre", label: "Autre" },
] as const;

export const featureOptions = [
  { value: "ascenseur", label: "Ascenseur" },
  { value: "balcon", label: "Balcon / Terrasse" },
  { value: "vue_mer", label: "Vue mer" },
  { value: "garage", label: "Garage" },
  { value: "jardin", label: "Jardin" },
];

export const sortOptions = [
  { value: "newest", label: "Plus récents" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "surface_desc", label: "Surface" },
] as const;
