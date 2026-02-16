import { useEffect } from "react";

interface SeoOptions {
  title: string;
  description: string;
  canonicalPath?: string;
  noIndex?: boolean;
  jsonLd?: object | object[];
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

function upsertRobots(noIndex: boolean): void {
  const value = noIndex ? "noindex,follow" : "index,follow";
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
    document.title = options.title;

    upsertMeta("description", options.description);
    upsertPropertyMeta("og:title", options.title);
    upsertPropertyMeta("og:description", options.description);
    upsertMeta("twitter:title", options.title);
    upsertMeta("twitter:description", options.description);

    if (options.canonicalPath) {
      const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL || "https://www.foch-immobilier.fr";
      const canonicalUrl = `${baseUrl}${options.canonicalPath}`;
      upsertCanonical(canonicalUrl);
      upsertPropertyMeta("og:url", canonicalUrl);
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
