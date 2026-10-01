import type { Property, PropertyStatus, PropertyType, TransactionType } from "@/types/domain";

export function formatPrice(amount: number, _transactionType?: TransactionType): string {
  const formatted = new Intl.NumberFormat("fr-FR").format(amount);
  return `${formatted} €`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function sanitizePropertySlug(slug: string): string {
  const sanitized = normalizeKeyword(slug)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "annonce";
}

export function toCanonicalPropertyPath(property: Pick<Property, "id" | "slug">): string {
  return `/biens/${property.id}-${sanitizePropertySlug(property.slug)}`;
}

export function getPropertyStatusLabel(status: PropertyStatus): string | null {
  switch (status) {
    case "under_offer":
      return "Sous offre";
    case "sold":
      return "Vendu";
    case "rented":
      return null;
    case "off_market":
      return "Retiré";
    default:
      return null;
  }
}

export function getPropertyCardLabels(property: Pick<Property, "status" | "title">): string[] {
  const statusLabel = getPropertyStatusLabel(property.status);
  if (property.status === "sold" || property.status === "off_market") {
    return statusLabel ? [statusLabel] : [];
  }

  // The source feed currently publishes these labels in listing titles, without
  // dedicated exclusivity/newness fields. Only read explicit leading labels;
  // do not infer a property's status from its age, price, or description.
  const sourceLabels = new Set<string>();
  let title = normalizeKeyword(property.title).replace(/^[\s\p{P}]+/u, "");
  let match: RegExpMatchArray | null;
  while ((match = title.match(/^(sous[\s-]+compromis|sous[\s-]+offre|exclusivite|nouveautes?)\b/))) {
    sourceLabels.add(match[1].replace(/[\s-]+/g, " "));
    title = title.slice(match[0].length).replace(/^[\s\p{P}]+/u, "");
  }

  const labels: string[] = [];
  const sourceStatus = sourceLabels.has("sous compromis")
    ? "Sous compromis"
    : sourceLabels.has("sous offre")
      ? "Sous offre"
      : null;
  const effectiveStatus = statusLabel ?? sourceStatus;
  if (effectiveStatus) labels.push(effectiveStatus);
  if (sourceLabels.has("exclusivite")) labels.push("Exclusivité");
  if (!effectiveStatus && (sourceLabels.has("nouveaute") || sourceLabels.has("nouveautes"))) {
    labels.push("Nouveautés");
  }
  return labels;
}

export function formatPropertyTypeLabel(propertyType: PropertyType): string {
  switch (propertyType) {
    case "appartement":
      return "Appartement";
    case "maison_villa":
      return "Maison / Villa";
    default:
      return "Autre";
  }
}

export function parseReferenceFromQuery(input: string): number | null {
  const match = input.match(/(?:ref\.?\s*)?(\d{3,6})/i);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isInteger(value) ? value : null;
}

export function normalizeKeyword(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
