import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";
import { supabase } from "@/integrations/supabase/client";
import { useSeo } from "@/lib/seo/useSeo";

export default function PropertyAlertActionPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = searchParams.get("token");
  const isUnsubscribe = location.pathname === "/alertes/desabonnement";

  useSeo({
    title: isUnsubscribe ? "Arrêter une alerte | Foch Immobilier" : "Confirmer une alerte | Foch Immobilier",
    description: "Gérez votre alerte e-mail Foch Immobilier.",
    canonicalPath: location.pathname,
    noIndex: true,
  });

  const submit = async () => {
    if (!token) {
      setError("Ce lien est incomplet. Revenez sur la page des biens pour créer une nouvelle alerte.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const { error: requestError } = await supabase.functions.invoke("property-alerts", {
        body: { action: isUnsubscribe ? "unsubscribe" : "confirm", token },
      });
      if (requestError) throw requestError;
      setComplete(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Cette action n’a pas pu être réalisée. Réessayez dans un instant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <StorefrontPageHero
        title={isUnsubscribe ? "Arrêter cette alerte e-mail" : "Confirmer votre alerte e-mail"}
        description={isUnsubscribe
          ? "Confirmez l’arrêt des e-mails pour cette recherche."
          : "Confirmez votre adresse pour recevoir les nouvelles annonces correspondant à votre recherche."}
      />
      <section className="container mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          {complete ? (
            <>
              <p role="status" className="text-base leading-relaxed">
                {isUnsubscribe
                  ? "Cette alerte est arrêtée. Vous ne recevrez plus les annonces correspondantes."
                  : "Votre adresse est confirmée. Vous recevrez un e-mail lorsqu’un nouveau bien correspondra à votre recherche."}
              </p>
              <Button asChild variant="brand" className="mt-6 min-h-11">
                <Link to="/biens">Voir les biens</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isUnsubscribe
                  ? "Votre désabonnement sera appliqué à cette alerte uniquement."
                  : "Les biens déjà publiés ne déclencheront pas d’e-mail pour cette inscription."}
              </p>
              {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" variant="brand" className="min-h-11" onClick={submit} disabled={isSubmitting || !token}>
                  {isSubmitting
                    ? "En cours…"
                    : isUnsubscribe
                      ? "Confirmer le désabonnement"
                      : "Confirmer mon adresse"}
                </Button>
                <Button asChild type="button" variant="outline" className="min-h-11">
                  <Link to="/biens">Retour aux biens</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
