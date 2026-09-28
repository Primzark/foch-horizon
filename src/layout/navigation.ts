export const primaryLinks = [
  { to: "/biens", label: "Nos biens" },
  { to: "/vendre", label: "Vendre" },
  { to: "/nos-dernieres-ventes", label: "Nos dernières ventes" },
  { to: "/estimation", label: "Avis de valeur" },
  { to: "/geographie", label: "Géographie" },
  { to: "/contact", label: "Contact" },
];

export function openSiteAssistant() {
  window.dispatchEvent(new Event("foch:open-assistant"));
}
