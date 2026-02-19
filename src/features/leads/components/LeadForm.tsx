import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitLead } from "@/features/leads/api/leads.service";
import type { LeadSource } from "@/types/domain";
import { trackEvent } from "@/lib/analytics/events";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";

interface LeadFormProps {
  source: LeadSource;
  propertyId?: number;
  cityId?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  showAppointmentFields?: boolean;
}

export function LeadForm({
  source,
  propertyId,
  cityId,
  title = "Envoyer un message",
  description,
  ctaLabel = "Envoyer",
  showAppointmentFields = false,
}: LeadFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { reducedMotion } = useMotionPreference();
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
    consent: false,
    callbackWindow: "",
    financingStatus: "not_defined",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formState.consent) {
      toast.error("Le consentement est requis pour envoyer votre demande.");
      return;
    }

    setLoading(true);

    try {
      await submitLead({
        source,
        propertyId,
        cityId,
        firstName: formState.firstName,
        lastName: formState.lastName,
        email: formState.email,
        phone: formState.phone || undefined,
        message: formState.message,
        consent: formState.consent,
        callbackWindow: formState.callbackWindow || undefined,
        financingStatus:
          formState.financingStatus === "not_defined"
            ? undefined
            : (formState.financingStatus as "cash" | "mortgage_in_progress" | "needs_financing"),
      });

      trackEvent("lead_submitted", { source, propertyId, cityId });
      toast.success("Votre demande a bien été transmise.");
      setSubmitted(true);
      setFormState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        message: "",
        consent: false,
        callbackWindow: "",
        financingStatus: "not_defined",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-xl">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}

      <AnimatePresence mode="wait" initial={false}>
        {submitted ? (
          <motion.div
            key="lead-success"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div>
                <p className="text-sm font-medium text-emerald-900">Demande envoyée avec succès</p>
                <p className="mt-1 text-sm text-emerald-800/90">
                  Merci. Un conseiller Foch Immobilier revient vers vous rapidement.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" className="mt-4" onClick={() => setSubmitted(false)}>
              Envoyer une autre demande
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="lead-form"
            onSubmit={handleSubmit}
            className="mt-4 space-y-3"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lead-first-name">Prénom</Label>
                <Input
                  id="lead-first-name"
                  required
                  value={formState.firstName}
                  onChange={(event) => setFormState((current) => ({ ...current, firstName: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-last-name">Nom</Label>
                <Input
                  id="lead-last-name"
                  required
                  value={formState.lastName}
                  onChange={(event) => setFormState((current) => ({ ...current, lastName: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">Email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  required
                  value={formState.email}
                  onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-phone">Téléphone</Label>
                <Input
                  id="lead-phone"
                  type="tel"
                  value={formState.phone}
                  onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
            </div>

            {showAppointmentFields && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Créneau de rappel</Label>
                  <Select
                    value={formState.callbackWindow || "none"}
                    onValueChange={(value) =>
                      setFormState((current) => ({ ...current, callbackWindow: value === "none" ? "" : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sans préférence</SelectItem>
                      <SelectItem value="matin">Matin</SelectItem>
                      <SelectItem value="apres-midi">Après-midi</SelectItem>
                      <SelectItem value="fin-journee">Fin de journée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Situation de financement</Label>
                  <Select
                    value={formState.financingStatus}
                    onValueChange={(value) => setFormState((current) => ({ ...current, financingStatus: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_defined">Non renseigné</SelectItem>
                      <SelectItem value="cash">Achat comptant</SelectItem>
                      <SelectItem value="mortgage_in_progress">Crédit en cours</SelectItem>
                      <SelectItem value="needs_financing">Financement à prévoir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="lead-message">Message</Label>
              <Textarea
                id="lead-message"
                required
                rows={5}
                value={formState.message}
                onChange={(event) => setFormState((current) => ({ ...current, message: event.target.value }))}
              />
            </div>

            <label className="inline-flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={formState.consent}
                onCheckedChange={(value) => setFormState((current) => ({ ...current, consent: Boolean(value) }))}
              />
              <span>
                J'accepte que mes données soient utilisées pour traiter ma demande, conformément à la politique de
                confidentialité.
              </span>
            </label>

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Envoi..." : ctaLabel}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
