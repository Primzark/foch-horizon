function normalizeSiteUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getConfiguredPublicSiteUrl(): string | null {
  const envSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (typeof envSiteUrl === "string" && envSiteUrl.trim().length > 0) {
    return normalizeSiteUrl(envSiteUrl.trim());
  }

  return null;
}

export function getSiteUrl(): string {
  const configuredSiteUrl = getConfiguredPublicSiteUrl();
  if (configuredSiteUrl) return configuredSiteUrl;

  if (typeof window !== "undefined" && window.location.origin) {
    return normalizeSiteUrl(window.location.origin);
  }

  return "";
}

export function toAbsoluteUrl(value: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `${siteUrl}${value.startsWith("/") ? value : `/${value}`}`;
}
