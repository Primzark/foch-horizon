const GTM_CONTAINER_ID = import.meta.env.VITE_GTM_CONTAINER_ID;

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

export function syncGoogleTagManagerConsent(granted: boolean): void {
  if (typeof window === "undefined" || !GTM_CONTAINER_ID) return;

  const win = getGtmWindow();
  const scriptId = `gtm-${GTM_CONTAINER_ID}`;

  setAnalyticsConsent(granted);
  if (!granted) {
    return;
  }

  if (document.getElementById(scriptId)) return;

  win.dataLayer?.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = scriptId;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_CONTAINER_ID)}`;
  document.head.appendChild(script);
}

export function hasGoogleTagManagerScript(): boolean {
  return typeof document !== "undefined" && Boolean(GTM_CONTAINER_ID) && Boolean(document.getElementById(`gtm-${GTM_CONTAINER_ID}`));
}

export function trackGoogleAnalyticsPageView(pageLocation: string, pageReferrer?: string): void {
  if (typeof window === "undefined" || !GTM_CONTAINER_ID || !hasGoogleTagManagerScript()) return;

  ensureGtag()("event", "page_view", {
    page_location: pageLocation,
    page_title: document.title,
    ...(pageReferrer && pageReferrer !== pageLocation ? { page_referrer: pageReferrer } : {}),
  });
}
