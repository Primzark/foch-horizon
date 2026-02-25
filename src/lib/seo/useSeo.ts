import { useEffect } from "react";

interface SeoOptions {
  title: string;
  description: string;
  canonicalPath?: string;
  noIndex?: boolean;
  jsonLd?: object | object[];
  image?: string;
  type?: "website" | "article";
}

const defaultOgImage =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/1c5Ul6EafQQxFKZpYyK1fNvJX4a2/social-images/social-1771265379992-fochimmobilier-agence-immobiliere-le-havre-76_2.webp";

function normalizeSiteUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function toAbsoluteUrl(value: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${siteUrl}${value.startsWith("/") ? value : `/${value}`}`;
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
  if (configuredSiteUrl) {
    return configuredSiteUrl;
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return normalizeSiteUrl(window.location.origin);
  }

  return "";
}

function upsertMeta(name: string, content: string): void {
  const existing = document.querySelector(`meta[name="${name}"]`);
  if (existing) {
    existing.setAttribute("content", content);
    return;
  }

  const meta = document.createElement("meta");
  meta.setAttribute("name", name);
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

function upsertPropertyMeta(property: string, content: string): void {
  const existing = document.querySelector(`meta[property="${property}"]`);
  if (existing) {
    existing.setAttribute("content", content);
    return;
  }

  const meta = document.createElement("meta");
  meta.setAttribute("property", property);
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

function upsertCanonical(href: string): void {
  let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
}

function removeCanonical(): void {
  document.querySelector("link[rel='canonical']")?.remove();
}

function removePropertyMeta(property: string): void {
  document.querySelector(`meta[property="${property}"]`)?.remove();
}

function upsertRobots(noIndex: boolean): void {
  const value = noIndex
    ? "noindex,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"
    : "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1";
  upsertMeta("robots", value);
}

function removeJsonLdNodes(): void {
  document.querySelectorAll("script[data-foch-jsonld='true']").forEach((node) => node.remove());
}

function upsertJsonLd(jsonLd: object | object[]): void {
  removeJsonLdNodes();
  const nodes = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

  nodes.forEach((node) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.fochJsonld = "true";
    script.text = JSON.stringify(node);
    document.head.appendChild(script);
  });
}

export function useSeo(options: SeoOptions): void {
  useEffect(() => {
    const configuredSiteUrl = getConfiguredPublicSiteUrl();
    const siteUrl = getSiteUrl();
    const canonicalPath =
      options.canonicalPath ?? (typeof window !== "undefined" ? window.location.pathname : "/");
    const canonicalUrl = configuredSiteUrl ? toAbsoluteUrl(canonicalPath, configuredSiteUrl) : null;
    const imageUrl = toAbsoluteUrl(options.image ?? defaultOgImage, siteUrl);

    document.title = options.title;

    upsertMeta("description", options.description);
    upsertMeta("author", "Foch Immobilier");
    upsertMeta("theme-color", "#2eca6a");
    upsertPropertyMeta("og:title", options.title);
    upsertPropertyMeta("og:description", options.description);
    upsertPropertyMeta("og:type", options.type ?? "website");
    upsertPropertyMeta("og:site_name", "Foch Immobilier");
    upsertPropertyMeta("og:locale", "fr_FR");
    upsertPropertyMeta("og:image", imageUrl);
    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", options.title);
    upsertMeta("twitter:description", options.description);
    upsertMeta("twitter:image", imageUrl);
    if (canonicalUrl) {
      upsertCanonical(canonicalUrl);
      upsertPropertyMeta("og:url", canonicalUrl);
    } else {
      removeCanonical();
      removePropertyMeta("og:url");
    }

    upsertRobots(Boolean(options.noIndex));

    if (options.jsonLd) {
      upsertJsonLd(options.jsonLd);
    } else {
      removeJsonLdNodes();
    }

    return () => {
      removeJsonLdNodes();
    };
  }, [options]);
}
