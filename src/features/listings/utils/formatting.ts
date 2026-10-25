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

export function getCanonicalPropertySlug(property: Pick<Property, "id" | "slug">): string {
  const slug = sanitizePropertySlug(property.slug);
  const propertyIdSuffix = `-${property.id}`;
  return slug.endsWith(propertyIdSuffix)
    ? slug.slice(0, -propertyIdSuffix.length) || "annonce"
    : slug;
}

export function toCanonicalPropertyPath(property: Pick<Property, "id" | "slug">): string {
  return `/biens/${property.id}-${getCanonicalPropertySlug(property)}`;
}

export function normalizePropertyDescription(description: string | null | undefined): string {
  return (description ?? "")
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type PropertyBadgeSource = Pick<Property, "status" | "title"> & Partial<Pick<Property, "sourceStatus" | "adminStatusOverride">>;

function hasLabelToken(value: string, token: RegExp): boolean {
  return token.test(normalizeKeyword(value));
}

function getExplicitStatusLabel(value: string): "Sous compromis" | "Sous offre" | null {
  const normalized = normalizeKeyword(value);
  if (/(?:^|[^\p{L}\p{N}])sous[\s-]+compromis(?:$|[^\p{L}\p{N}])/u.test(normalized)) {
    return "Sous compromis";
  }
  if (/(?:^|[^\p{L}\p{N}])sous[\s-]+offre(?:$|[^\p{L}\p{N}])/u.test(normalized)) {
    return "Sous offre";
  }
  return null;
}

export function getPropertyStatusLabel(
  status: PropertyStatus,
  sourceStatus?: string | null,
  title?: string,
): string | null {
  switch (status) {
    case "under_offer": {
      const isUnderContract = normalizeKeyword(sourceStatus ?? "").includes("compromis") ||
        getExplicitStatusLabel(title ?? "") === "Sous compromis";
      return isUnderContract ? "Sous compromis" : "Sous offre";
    }
    case "new":
      return "Nouveauté";
    case "exclusive":
      return "Exclusivité";
    case "price_reduced":
      return "Baisse de prix";
    case "under_contract":
      return "Sous compromis";
    case "reserved":
      return null;
    case "sold":
      return "Vendu par l’agence";
    case "off_market":
      return null;
    case "active":
      return getExplicitStatusLabel(sourceStatus ?? "") ?? getExplicitStatusLabel(title ?? "");
    default:
      return null;
  }
}

export function isAvailablePropertyStatus(status: PropertyStatus): boolean {
  return status === "active" || status === "new" || status === "exclusive" || status === "price_reduced";
}

export function getPropertySchemaAvailability(status: PropertyStatus): string {
  if (isAvailablePropertyStatus(status)) return "https://schema.org/InStock";
  if (status === "under_offer" || status === "under_contract" || status === "reserved") {
    return "https://schema.org/LimitedAvailability";
  }
  if (status === "off_market") return "https://schema.org/Discontinued";
  return "https://schema.org/SoldOut";
}

export function getPropertyCardLabels(property: PropertyBadgeSource): string[] {
  const hasAdminOverride = property.adminStatusOverride === property.status;
  const statusLabel = getPropertyStatusLabel(
    property.status,
    hasAdminOverride ? null : property.sourceStatus,
    hasAdminOverride ? undefined : property.title,
  );
  if (
    property.status === "new" ||
    property.status === "exclusive" ||
    property.status === "price_reduced" ||
    property.status === "under_offer" ||
    property.status === "under_contract" ||
    property.status === "reserved" ||
    property.status === "sold" ||
    property.status === "off_market"
  ) {
    return statusLabel ? [statusLabel] : [];
  }

  // Exclusivity and newness are explicit title tags in the source feed. Read
  // the title only, so ordinary description text never creates a badge.
  const normalizedTitle = normalizeKeyword(property.title);
  const hasExclusivity = hasLabelToken(
    normalizedTitle,
    /(?:^|[^\p{L}\p{N}])exclusivite(?:$|[^\p{L}\p{N}])/u,
  ) && !/(?:^|[^\p{L}\p{N}])sans[\s-]+exclusivite(?:$|[^\p{L}\p{N}])/u.test(normalizedTitle);
  const hasNewness = hasLabelToken(
    normalizedTitle,
    /(?:^|[^\p{L}\p{N}])nouveaut(?:e|es)(?:$|[^\p{L}\p{N}])/u,
  );

  const labels: string[] = [];
  if (statusLabel) labels.push(statusLabel);
  if (hasExclusivity) labels.push("Exclusivité");
  if (!statusLabel && hasNewness) labels.push("Nouveautés");
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
