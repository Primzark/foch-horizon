import { useEffect } from "react";
import { siteEntities } from "@/lib/seo/entities";
import { pageBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { getConfiguredPublicSiteUrl, getSiteUrl, toAbsoluteUrl } from "@/lib/seo/siteUrl";
import { useSiteLanguage } from "@/lib/i18n/LanguageProvider";
import { translateText } from "@/lib/i18n/catalog";

export { getConfiguredPublicSiteUrl, getSiteUrl } from "@/lib/seo/siteUrl";

interface SeoOptions {
  title: string;
  description: string;
  canonicalPath?: string;
  noIndex?: boolean;
  jsonLd?: object | object[];
  image?: string;
  type?: "website" | "article";
}

const defaultOgImage = "/images/agence-foch.jpg";

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

function isVercelHostname(siteUrl: string): boolean {
  try {
    return new URL(siteUrl).hostname.toLowerCase().endsWith(".vercel.app");
  } catch {
    return false;
  }
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
  const { language } = useSiteLanguage();
  useEffect(() => {
    const configuredSiteUrl = getConfiguredPublicSiteUrl();
    const siteUrl = getSiteUrl();
    const canonicalPath =
      options.canonicalPath ?? (typeof window !== "undefined" ? window.location.pathname : "/");
    const canonicalUrl = configuredSiteUrl ? toAbsoluteUrl(canonicalPath, configuredSiteUrl) : null;
    const imageUrl = toAbsoluteUrl(options.image ?? defaultOgImage, siteUrl);

    const pageTitle = translateText(options.title, language);
    const pageDescription = translateText(options.description, language);
    document.title = pageTitle;

    upsertMeta("description", pageDescription);
    upsertMeta("author", "Foch Immobilier");
    upsertMeta("theme-color", "#2eca6a");
    upsertPropertyMeta("og:title", pageTitle);
    upsertPropertyMeta("og:description", pageDescription);
    upsertPropertyMeta("og:type", options.type ?? "website");
    upsertPropertyMeta("og:site_name", "Foch Immobilier");
    upsertPropertyMeta("og:locale", language === "en" ? "en_GB" : "fr_FR");
    upsertPropertyMeta("og:image", imageUrl);
    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", pageTitle);
    upsertMeta("twitter:description", pageDescription);
    upsertMeta("twitter:image", imageUrl);
    if (canonicalUrl) {
      upsertCanonical(canonicalUrl);
      upsertPropertyMeta("og:url", canonicalUrl);
    } else {
      removeCanonical();
      removePropertyMeta("og:url");
    }

    // The Vercel hostname is the pre-launch environment. It stays crawlable for
    // review, but only the final public domain should be eligible for indexing.
    upsertRobots(Boolean(options.noIndex) || isVercelHostname(siteUrl));

    const supplied = options.jsonLd ? (Array.isArray(options.jsonLd) ? options.jsonLd : [options.jsonLd]) : [];
    const pageUrl = toAbsoluteUrl(canonicalPath, siteUrl);
    const crumbs = pageBreadcrumbs(canonicalPath, pageTitle).map((crumb) => ({ ...crumb, name: translateText(crumb.name, language) }));
    // One stable business identity across all routes; breadcrumbs follow visible navigation.
    const content = supplied.filter((node) => !["RealEstateAgent", "Organization", "WebSite", "BreadcrumbList"].includes((node as { "@type"?: string })["@type"] ?? ""));
    upsertJsonLd({
      "@context": "https://schema.org",
      "@graph": [
        ...siteEntities(siteUrl),
        { "@type": "WebPage", "@id": `${pageUrl}#webpage`, url: pageUrl, name: pageTitle, description: pageDescription, inLanguage: language === "en" ? "en-GB" : "fr-FR", isPartOf: { "@id": `${siteUrl}/#website` }, publisher: { "@id": `${siteUrl}/#agency` }, ...(crumbs.length ? { breadcrumb: { "@id": `${pageUrl}#breadcrumb` } } : {}) },
        ...(crumbs.length ? [{ "@type": "BreadcrumbList", "@id": `${pageUrl}#breadcrumb`, itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: toAbsoluteUrl(crumb.path, siteUrl) })) }] : []),
        ...content,
      ],
    });

    return () => {
      removeJsonLdNodes();
    };
  }, [options, language]);
}
