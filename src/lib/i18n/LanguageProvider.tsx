import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { canonicalFrenchText, translateText, type SiteLanguage } from "@/lib/i18n/catalog";

const STORAGE_KEY = "foch-site-language";
const LanguageContext = createContext<{ language: SiteLanguage; setLanguage: (language: SiteLanguage) => void } | null>(null);
let activeLanguage: SiteLanguage = "fr";
const renderedText = new WeakMap<Text, { french: string; current: string }>();
const renderedAttributes = new WeakMap<Element, Map<string, { french: string; current: string }>>();

function readSavedLanguage(): SiteLanguage {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

export function getSiteLanguage(): SiteLanguage {
  return activeLanguage;
}

function getCanonicalText(node: Text, renderedText: WeakMap<Text, { french: string; current: string }>): string {
  const value = node.data;
  const previous = renderedText.get(node);
  if (previous?.current === value) return previous.french;
  return canonicalFrenchText(value);
}

function localizeTextNode(node: Text, language: SiteLanguage, renderedText: WeakMap<Text, { french: string; current: string }>) {
  const french = getCanonicalText(node, renderedText);
  const nextText = translateText(french, language);
  renderedText.set(node, { french, current: nextText });
  if (node.data !== nextText) node.data = nextText;
}

function localizeAttribute(
  element: Element,
  name: string,
  language: SiteLanguage,
  renderedAttributes: WeakMap<Element, Map<string, { french: string; current: string }>>,
) {
  const value = element.getAttribute(name);
  if (value === null) return;
  let attributes = renderedAttributes.get(element);
  if (!attributes) {
    attributes = new Map();
    renderedAttributes.set(element, attributes);
  }
  const previous = attributes.get(name);
  const french = previous?.current === value ? previous.french : canonicalFrenchText(value);
  const nextValue = translateText(french, language);
  attributes.set(name, { french, current: nextValue });
  if (value !== nextValue) element.setAttribute(name, nextValue);
}

function shouldSkipText(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent || !node.data.trim()) return true;
  if (parent.closest("script, style, noscript, textarea, input, [contenteditable='true'], [data-no-translate]")) return true;
  if (parent.namespaceURI === "http://www.w3.org/2000/svg") return true;
  return false;
}

/** Applies the shared copy catalogue across eager and lazy-loaded route content. */
export function LanguageDocumentSync() {
  const { language } = useSiteLanguage();

  useEffect(() => {
    activeLanguage = language;
    document.documentElement.lang = language;

    const attributesToTranslate = ["aria-label", "aria-description", "title", "placeholder", "alt"];

    const localizeElement = (element: Element) => {
      if (element.closest("[data-no-translate]")) return;
      const localizeAttributes = (target: Element) => {
        if (!(target instanceof HTMLElement) || target.closest("[data-no-translate]")) return;
        for (const attribute of attributesToTranslate) localizeAttribute(target, attribute, language, renderedAttributes);
      };
      localizeAttributes(element);
      element.querySelectorAll("[aria-label], [aria-description], [title], [placeholder], [alt]").forEach(localizeAttributes);
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        if (node instanceof Text && !shouldSkipText(node)) localizeTextNode(node, language, renderedText);
        node = walker.nextNode();
      }
    };

    const localizeDocument = () => {
      if (document.body) localizeElement(document.body);
      if (document.title) document.title = translateText(canonicalFrenchText(document.title), language);
      document.querySelectorAll("meta[name='description'], meta[property='og:title'], meta[property='og:description'], meta[name='twitter:title'], meta[name='twitter:description']").forEach((meta) => {
        localizeAttribute(meta, "content", language, renderedAttributes);
      });
      const ogLocale = document.querySelector<HTMLMetaElement>("meta[property='og:locale']");
      if (ogLocale) ogLocale.content = language === "en" ? "en_GB" : "fr_FR";
    };

    localizeDocument();
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData" && record.target instanceof Text && !shouldSkipText(record.target)) {
          localizeTextNode(record.target, language, renderedText);
        }
        if (record.type === "attributes" && record.target instanceof Element && record.attributeName && attributesToTranslate.includes(record.attributeName)) {
          localizeAttribute(record.target, record.attributeName, language, renderedAttributes);
        }
        if (record.type === "childList") {
          record.addedNodes.forEach((added) => {
            if (added instanceof Text && !shouldSkipText(added)) localizeTextNode(added, language, renderedText);
            else if (added instanceof Element) localizeElement(added);
          });
        }
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: attributesToTranslate,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SiteLanguage>(() => {
    const initial = readSavedLanguage();
    activeLanguage = initial;
    return initial;
  });
  const setLanguage = useCallback((nextLanguage: SiteLanguage) => {
    setLanguageState(nextLanguage);
    activeLanguage = nextLanguage;
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch {
      // Continue with the in-memory preference when browser storage is unavailable.
    }
  }, []);
  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useSiteLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useSiteLanguage must be used inside LanguageProvider");
  return value;
}
