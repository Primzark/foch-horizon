function normalizeProviderLabel(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function mapProviderTransactionType(rawStatus) {
  const status = normalizeProviderLabel(rawStatus);
  return /location|loue|louee/.test(status) ? "location" : "vente";
}

export function mapProviderPropertyStatus(rawStatus) {
  const status = normalizeProviderLabel(rawStatus);
  if (/sous[\s-]+(offre|compromis|promesse)|offre(?: d'?achat)?[\s-]+acceptee|compromis(?: de vente)?[\s-]+(?:signe|en cours)|vente[\s-]+en[\s-]+cours/.test(status)) {
    return "under_offer";
  }
  if (/\bvendu(?:e|s|es)?\b/.test(status)) return "sold";
  if (/\bloue(?:e|s|es)?\b/.test(status)) return "rented";
  if (/\b(retire|indisponible|hors[\s-]+marche)(?:e|s|es)?\b/.test(status)) return "off_market";
  return "active";
}
