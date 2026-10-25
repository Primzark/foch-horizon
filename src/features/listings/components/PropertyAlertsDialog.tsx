import { useState, type FormEvent } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { PropertySearchParams } from "@/types/api";
import { toPropertyAlertCriteria } from "@/features/listings/utils/propertyAlertCriteria";

interface PropertyAlertsDialogProps {
  filters: PropertySearchParams;
}

export function PropertyAlertsDialog({ filters }: PropertyAlertsDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const criteria = toPropertyAlertCriteria(filters);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!consent) {
      setError("Votre accord est nécessaire pour recevoir cette alerte.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: requestError } = await supabase.functions.invoke<{ confirmationEmailQueued?: boolean }>("property-alerts", {
        body: { action: "subscribe", email: email.trim(), criteria, consent },
      });
      if (requestError) throw requestError;

      setMessage(data?.confirmationEmailQueued
        ? "Votre demande est enregistrée. L’e-mail de confirmation sera renvoyé dès que le service sera disponible. L’alerte restera inactive jusqu’à votre confirmation."
        : "Votre demande a été prise en compte. Si une confirmation est nécessaire, un lien vous sera envoyé par e-mail. L’alerte restera inactive jusqu’à la validation de l’adresse.");
      setEmail("");
      setConsent(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "L’inscription n’a pas pu être enregistrée. Réessayez dans un instant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWhenClosed = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setMessage(null);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetWhenClosed}>
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-11 shrink-0 gap-2">
          <BellRing aria-hidden="true" className="h-4 w-4" />
          Crée une alerte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une alerte e-mail</DialogTitle>
          <DialogDescription>
            Nous vous écrirons lorsqu’un nouveau bien correspondra à votre recherche. Les annonces déjà en ligne ne seront pas envoyées.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="property-alert-email">Adresse e-mail</Label>
            <Input
              id="property-alert-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@exemple.fr"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="property-alert-consent"
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked === true)}
              disabled={isSubmitting}
              aria-required="true"
            />
            <Label htmlFor="property-alert-consent" className="cursor-pointer text-sm font-normal leading-relaxed">
              J’accepte de recevoir par e-mail les nouvelles annonces correspondant à ces critères. Je pourrai arrêter cette alerte à tout moment depuis le lien présent dans chaque e-mail.
            </Label>
          </div>

          {message && <p role="status" className="rounded-lg bg-brand-soft/60 p-3 text-sm text-brand-strong">{message}</p>}
          {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

          <Button type="submit" variant="brand" className="min-h-11 w-full" disabled={isSubmitting || !consent}>
            {isSubmitting ? "Enregistrement…" : "M’envoyer le lien de confirmation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
