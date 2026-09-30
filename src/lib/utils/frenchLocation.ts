/** French contractions for city labels, including names returned by the API. */
export function atLocation(name: string): string {
  if (name === "Halles Centrales") return "aux Halles Centrales";
  if (name === "Hôtel de Ville") return "près de l’Hôtel de Ville";
  if (/^le\s+/i.test(name)) return `au ${name.slice(3)}`;
  if (/^les\s+/i.test(name)) return `aux ${name.slice(4)}`;
  return `à ${name}`;
}
export function ofLocation(name: string): string {
  if (name === "Halles Centrales") return "des Halles Centrales";
  if (name === "Hôtel de Ville") return "de l’Hôtel de Ville";
  if (/^le\s+/i.test(name)) return `du ${name.slice(3)}`;
  if (/^les\s+/i.test(name)) return `des ${name.slice(4)}`;
  if (/^[aeiouyhàâéèêëîïôùûüœ]/i.test(name)) return `d’${name}`;
  return `de ${name}`;
}
