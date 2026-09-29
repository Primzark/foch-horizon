import { useEffect } from "react";
import { Link } from "react-router-dom";
import { syncGoogleTagManagerConsent } from "@/lib/analytics/gtm";
import { useUiStore } from "@/lib/state/useUiStore";

export function CookieConsentManager() {
  const consent = useUiStore((state) => state.cookieConsent);
  const setConsent = useUiStore((state) => state.setCookieConsent);
  const preferencesOpen = useUiStore((state) => state.cookiePreferencesOpen);
  const setPreferencesOpen = useUiStore((state) => state.setCookiePreferencesOpen);

  useEffect(() => {
    syncGoogleTagManagerConsent(consent === "accepted");
  }, [consent]);

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
