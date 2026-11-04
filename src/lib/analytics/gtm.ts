import { sanitizeAnalyticsUrl } from "@/lib/analytics/analyticsUrl";

const GTM_CONTAINER_ID = import.meta.env.VITE_GTM_CONTAINER_ID;
const PRODUCTION_HOST_PATTERN = /^(?:www\.)?fochimmobilier\.com$/i;

type GtmWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function getGtmWindow(): GtmWindow {
  return window as GtmWindow;
}

function ensureGtag(): (...args: unknown[]) => void {
  const win = getGtmWindow();
  win.dataLayer = win.dataLayer || [];

  const gtag = win.gtag ?? function gtag() {
    // Google Tag Manager expects the command's Arguments object on the dataLayer.
    // eslint-disable-next-line prefer-rest-params
    win.dataLayer?.push(arguments);
  };
  win.gtag = gtag;
  return gtag;
}

function setAnalyticsConsent(granted: boolean): void {
  ensureGtag()("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function isProductionAnalyticsHost(): boolean {
  return typeof window !== "undefined" && PRODUCTION_HOST_PATTERN.test(window.location.hostname);
}

function isPublicAnalyticsPath(): boolean {
  return typeof window !== "undefined" && !window.location.pathname.startsWith("/admin");
}

function setAnalyticsPageContext(pageLocation: string, pageReferrer?: string): {
  page_location: string;
  page_referrer?: string;
} {
  const safePageLocation = sanitizeAnalyticsUrl(pageLocation);
  const rawPageReferrer = pageReferrer ?? document.referrer;
  const safePageReferrer = rawPageReferrer ? sanitizeAnalyticsUrl(rawPageReferrer) : "";
  const usablePageReferrer = safePageReferrer && safePageReferrer !== safePageLocation ? safePageReferrer : "";

  // Set safe defaults before GTM initializes so automatic tag events cannot read
  // sensitive query values from the current URL or the browser referrer.
  ensureGtag()("set", {
    page_location: safePageLocation,
    page_referrer: usablePageReferrer,
  });

  return {
    page_location: safePageLocation,
    ...(usablePageReferrer ? { page_referrer: usablePageReferrer } : {}),
  };
}

export function syncGoogleTagManagerConsent(granted: boolean): void {
  if (typeof window === "undefined" || !GTM_CONTAINER_ID) return;

  const win = getGtmWindow();
  const scriptId = `gtm-${GTM_CONTAINER_ID}`;

  setAnalyticsConsent(granted);
  if (!granted || !isProductionAnalyticsHost() || !isPublicAnalyticsPath()) {
    return;
  }

  setAnalyticsPageContext(window.location.href);
  if (document.getElementById(scriptId)) return;

  win.dataLayer?.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = scriptId;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_CONTAINER_ID)}`;
  document.head.appendChild(script);
}

export function hasGoogleTagManagerScript(): boolean {
  return isProductionAnalyticsHost() && isPublicAnalyticsPath() && Boolean(GTM_CONTAINER_ID) && Boolean(document.getElementById(`gtm-${GTM_CONTAINER_ID}`));
}

export function trackGoogleAnalyticsPageView(pageLocation: string, pageReferrer?: string): void {
  if (typeof window === "undefined" || !GTM_CONTAINER_ID || !isProductionAnalyticsHost() || !isPublicAnalyticsPath() || !hasGoogleTagManagerScript()) return;

  const pageContext = setAnalyticsPageContext(pageLocation, pageReferrer);

  ensureGtag()("event", "page_view", {
    ...pageContext,
    page_title: document.title,
  });
}
