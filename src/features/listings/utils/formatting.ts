import type { Property, PropertyStatus, TransactionType } from "@/types/domain";

export function formatPrice(amount: number, transactionType: TransactionType): string {
  const formatted = new Intl.NumberFormat("fr-FR").format(amount);
  return transactionType === "location" ? `${formatted} € / mois` : `${formatted} €`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function toCanonicalPropertyPath(property: Pick<Property, "id" | "slug">): string {
  return `/biens/${property.id}-${property.slug}`;
}

export function getPropertyStatusLabel(status: PropertyStatus): string | null {
  switch (status) {
    case "under_offer":
      return "Sous offre";
    case "sold":
      return "Vendu";
    case "rented":
      return "Loué";
    case "off_market":
      return "Retiré";
    default:
      return null;
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
