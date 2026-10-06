import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { hasGoogleTagManagerScript, syncGoogleTagManagerConsent, trackGoogleAnalyticsPageView } from "@/lib/analytics/gtm";
import { useUiStore } from "@/lib/state/useUiStore";

export function CookieConsentManager() {
  const location = useLocation();
  const consent = useUiStore((state) => state.cookieConsent);
  const setConsent = useUiStore((state) => state.setCookieConsent);
  const preferencesOpen = useUiStore((state) => state.cookiePreferencesOpen);
  const setPreferencesOpen = useUiStore((state) => state.setCookiePreferencesOpen);
  const previousConsent = useRef<typeof consent | null>(null);
  const previousPageLocation = useRef<string | null>(null);

  useEffect(() => {
    const pageLocation = window.location.href;
    const priorConsent = previousConsent.current;
    const priorPageLocation = previousPageLocation.current;
    const gtmWasAlreadyLoaded = hasGoogleTagManagerScript();
    const consentChanged = priorConsent !== consent;
    const accepted = consent === "accepted";

    if (consentChanged) {
      syncGoogleTagManagerConsent(accepted);
    }

    const routeChanged = priorPageLocation !== null && priorPageLocation !== pageLocation;
    const consentRestored = accepted && consentChanged && priorConsent === "rejected" && gtmWasAlreadyLoaded;
    let pageViewTimer: number | undefined;

    const initialAcceptedPage = accepted && !gtmWasAlreadyLoaded;
    if (accepted && (routeChanged || consentRestored || initialAcceptedPage)) {
      pageViewTimer = window.setTimeout(() => {
        trackGoogleAnalyticsPageView(pageLocation, routeChanged ? priorPageLocation ?? undefined : undefined);
      }, 0);
    }

    previousConsent.current = consent;
    previousPageLocation.current = pageLocation;

    return () => {
      if (pageViewTimer !== undefined) {
        window.clearTimeout(pageViewTimer);
      }
    };
  }, [consent, location.pathname, location.search, location.hash]);

  const visible = consent === "unset" || preferencesOpen;
  if (!visible) return null;

  const chooseConsent = (nextConsent: "accepted" | "rejected") => {
    setConsent(nextConsent);
    setPreferencesOpen(false);
  };

  return (
    <section
      aria-label="Préférences de cookies"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[110] mx-auto max-w-3xl rounded-2xl border border-border bg-card p-5 shadow-2xl sm:inset-x-6 sm:bottom-6 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h2 className="font-display text-lg font-semibold">Vos préférences de cookies</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Les cookies de mesure d’audience ne sont activés qu’avec votre accord. Vous pouvez modifier votre choix à tout moment.
            {" "}
            <Link to="/cookies" className="underline underline-offset-2">
              En savoir plus
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted"
            onClick={() => chooseConsent("rejected")}
          >
            Tout refuser
          </button>
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            onClick={() => chooseConsent("accepted")}
          >
            Accepter
          </button>
          {preferencesOpen && consent !== "unset" ? (
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-full px-3 text-sm text-muted-foreground hover:bg-muted"
              onClick={() => setPreferencesOpen(false)}
            >
              Fermer
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
