import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitLead } from "@/features/leads/api/leads.service";
import { FormErrorSummary, type FormErrorItem } from "@/components/forms/FormErrorSummary";
import { validateLeadForm } from "@/features/leads/types/lead.schema";
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
  variant?: "card" | "plain";
  disableMotion?: boolean;
}

export function LeadForm({
  source,
  propertyId,
  cityId,
  title = "Envoyer un message",
  description,
  ctaLabel = "Envoyer",
  showAppointmentFields = false,
  variant = "card",
  disableMotion = false,
}: LeadFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [phoneBlurred, setPhoneBlurred] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const formStartedAtRef = useRef(Date.now());
  const websiteRef = useRef<HTMLInputElement | null>(null);
  const summaryRef = useRef<HTMLElement | null>(null);
  const serverErrorRef = useRef<HTMLParagraphElement | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);
  const submissionLockRef = useRef(false);
  const { reducedMotion } = useMotionPreference();
  const animationsEnabled = !disableMotion && !reducedMotion;
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
  const validationErrors = validateLeadForm(formState);
  const emailError = validationAttempted || emailBlurred ? validationErrors.email : undefined;
  const phoneError = validationAttempted || phoneBlurred ? validationErrors.phone : undefined;
  const summaryErrors: FormErrorItem[] = validationAttempted
    ? [
        ["firstName", "lead-first-name", "Prénom"],
        ["lastName", "lead-last-name", "Nom"],
        ["email", "lead-email", "Email"],
        ["phone", "lead-phone", "Téléphone"],
        ["message", "lead-message", "Message"],
        ["consent", "lead-consent", "Confidentialité"],
      ].flatMap(([field, fieldId, label]) => {
        const message = validationErrors[field as keyof typeof validationErrors];
        return message ? [{ fieldId, label, message }] : [];
      })
    : [];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submissionLockRef.current) return;

    setValidationAttempted(true);
    const errors = validateLeadForm(formState);
    if (Object.keys(errors).length > 0) {
      window.requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setServerError(null);
    submissionLockRef.current = true;
    setLoading(true);

    try {
      await submitLead({
        source,
        propertyId,
        cityId,
        firstName: formState.firstName,
        lastName: formState.lastName,
        email: formState.email,
        phone: formState.phone.trim() || undefined,
        message: formState.message,
        consent: formState.consent,
        website: websiteRef.current?.value || undefined,
        formStartedAt: formStartedAtRef.current,
        callbackWindow: formState.callbackWindow || undefined,
        financingStatus:
          formState.financingStatus === "not_defined"
            ? undefined
            : (formState.financingStatus as "cash" | "mortgage_in_progress" | "needs_financing"),
      });

      trackEvent("lead_submitted", {
        source,
        property_id: propertyId,
        city_id: cityId,
      });
      toast.success("Votre demande a bien été transmise.");
      setSubmitted(true);
      window.requestAnimationFrame(() => successRef.current?.focus());
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
    } catch {
      setServerError("Votre demande n’a pas pu être envoyée. Vérifiez les champs et réessayez ; vos informations sont conservées.");
      window.requestAnimationFrame(() => serverErrorRef.current?.focus());
    } finally {
      submissionLockRef.current = false;
      setLoading(false);
    }
  };

  return (
    <section className={variant === "card" ? "rounded-2xl border border-border bg-card p-5" : "p-0"}>
      <h3 className="font-display text-xl">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <p className="mt-2 text-xs text-muted-foreground">Tous les champs sont obligatoires, sauf le téléphone.</p>

      <AnimatePresence mode="wait" initial={false}>
        {submitted ? (
          <motion.div
            key="lead-success"
            initial={animationsEnabled ? { opacity: 0, y: 10, scale: 0.98 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={animationsEnabled ? { opacity: 0, y: -8, scale: 0.98 } : undefined}
            transition={{ duration: animationsEnabled ? 0.24 : 0, ease: "easeOut" }}
            className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5"
            ref={successRef}
            role="status"
            aria-live="polite"
            tabIndex={-1}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div>
                <p className="text-sm font-medium text-emerald-900">Demande envoyée avec succès</p>
                <p className="mt-1 text-sm text-emerald-800/90">
                  Merci. Un conseiller dédié Foch Immobilier revient vers vous dans les meilleurs délais.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="brand"
              className="mt-4"
              onClick={() => {
                formStartedAtRef.current = Date.now();
                if (websiteRef.current) websiteRef.current.value = "";
                setValidationAttempted(false);
                setEmailBlurred(false);
                setPhoneBlurred(false);
                setServerError(null);
                setSubmitted(false);
              }}
            >
              Envoyer une autre demande
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="lead-form"
            onSubmit={handleSubmit}
            noValidate
            aria-busy={loading}
            className="mt-4 space-y-3"
            initial={animationsEnabled ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={animationsEnabled ? { opacity: 0, y: -8 } : undefined}
            transition={{ duration: animationsEnabled ? 0.2 : 0, ease: "easeOut" }}
          >
            <FormErrorSummary id="lead-error-summary" ref={summaryRef} errors={summaryErrors} />
            <div aria-hidden="true" className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
              <label htmlFor="lead-website">Votre site web</label>
              <Input id="lead-website" ref={websiteRef} name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lead-first-name">Prénom <span aria-hidden="true" className="text-destructive">*</span></Label>
                <Input
                  id="lead-first-name"
                  name="firstName"
                  required
                  maxLength={80}
                  autoComplete="given-name"
                  aria-invalid={validationAttempted && validationErrors.firstName ? true : undefined}
                  aria-describedby={validationAttempted && validationErrors.firstName ? "lead-first-name-error" : undefined}
                  value={formState.firstName}
                  onChange={(event) => {
                    setServerError(null);
                    setFormState((current) => ({ ...current, firstName: event.target.value }));
                  }}
                />
                {validationAttempted && validationErrors.firstName && (
                  <p id="lead-first-name-error" className="text-xs text-destructive" aria-live="polite">{validationErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-last-name">Nom <span aria-hidden="true" className="text-destructive">*</span></Label>
                <Input
                  id="lead-last-name"
                  name="lastName"
                  required
                  maxLength={80}
                  autoComplete="family-name"
                  aria-invalid={validationAttempted && validationErrors.lastName ? true : undefined}
                  aria-describedby={validationAttempted && validationErrors.lastName ? "lead-last-name-error" : undefined}
                  value={formState.lastName}
                  onChange={(event) => {
                    setServerError(null);
                    setFormState((current) => ({ ...current, lastName: event.target.value }));
                  }}
                />
                {validationAttempted && validationErrors.lastName && (
                  <p id="lead-last-name-error" className="text-xs text-destructive" aria-live="polite">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">Email <span aria-hidden="true" className="text-destructive">*</span></Label>
                <Input
                  id="lead-email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? "lead-email-error" : undefined}
                  value={formState.email}
                  onBlur={() => {
                    if (formState.email.trim()) setEmailBlurred(true);
                  }}
                  onChange={(event) => {
                    setServerError(null);
                    setFormState((current) => ({ ...current, email: event.target.value }));
                  }}
                />
                {emailError && <p id="lead-email-error" className="text-xs text-destructive" aria-live="polite">{emailError}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-phone">
                  Téléphone <span className="font-normal text-muted-foreground">(facultatif)</span>
                </Label>
                <Input
                  id="lead-phone"
                  name="phone"
                  type="tel"
                  maxLength={40}
                  autoComplete="tel"
                  aria-invalid={phoneError ? true : undefined}
                  aria-describedby={phoneError ? "lead-phone-error" : undefined}
                  value={formState.phone}
                  onBlur={() => {
                    if (formState.phone.trim()) setPhoneBlurred(true);
                  }}
                  onChange={(event) => {
                    setServerError(null);
                    setFormState((current) => ({ ...current, phone: event.target.value }));
                  }}
                />
                {phoneError && <p id="lead-phone-error" className="text-xs text-destructive" aria-live="polite">{phoneError}</p>}
              </div>
            </div>

            {showAppointmentFields && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label id="lead-callback-window-label">Créneau de rappel</Label>
                  <Select
                    value={formState.callbackWindow || "none"}
                    onValueChange={(value) =>
                      setFormState((current) => ({ ...current, callbackWindow: value === "none" ? "" : value }))
                    }
                  >
                    <SelectTrigger id="lead-callback-window" aria-labelledby="lead-callback-window-label">
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
                  <Label id="lead-financing-status-label">Situation de financement</Label>
                  <Select
                    value={formState.financingStatus}
                    onValueChange={(value) => setFormState((current) => ({ ...current, financingStatus: value }))}
                  >
                    <SelectTrigger id="lead-financing-status" aria-labelledby="lead-financing-status-label">
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
              <Label htmlFor="lead-message">
                Message <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Textarea
                id="lead-message"
                name="message"
                required
                maxLength={2000}
                aria-invalid={validationAttempted && validationErrors.message ? true : undefined}
                aria-describedby={validationAttempted && validationErrors.message ? "lead-message-error" : undefined}
                rows={5}
                value={formState.message}
                onChange={(event) => {
                  setServerError(null);
                  setFormState((current) => ({ ...current, message: event.target.value }));
                }}
              />
              {validationAttempted && validationErrors.message && (
                <p id="lead-message-error" className="text-xs text-destructive" aria-live="polite">{validationErrors.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-start gap-2 text-xs text-muted-foreground">
                <Checkbox
                  id="lead-consent"
                  checked={formState.consent}
                  required
                  aria-required="true"
                  aria-invalid={validationAttempted && validationErrors.consent ? true : undefined}
                  aria-describedby={validationAttempted && validationErrors.consent ? "lead-consent-error" : undefined}
                  aria-labelledby="lead-consent-label"
                  onCheckedChange={(value) => {
                    setServerError(null);
                    setFormState((current) => ({ ...current, consent: Boolean(value) }));
                  }}
                />
                <p>
                  <Label
                    id="lead-consent-label"
                    htmlFor="lead-consent"
                    className="cursor-pointer text-xs font-normal leading-relaxed text-muted-foreground"
                    onClick={(event) => {
                      event.preventDefault();
                      document.getElementById("lead-consent")?.focus();
                      setServerError(null);
                      setFormState((current) => ({ ...current, consent: !current.consent }));
                    }}
                  >
                    J'accepte que mes données soient utilisées pour traiter ma demande.
                  </Label>{" "}
                  Consultez la{" "}
                  <Link to="/confidentialite" className="underline underline-offset-2">politique de confidentialité</Link>.
                  <span aria-hidden="true" className="ml-1 text-destructive">*</span>
                </p>
              </div>
              {validationAttempted && validationErrors.consent && (
                <p id="lead-consent-error" className="text-xs text-destructive" aria-live="polite">{validationErrors.consent}</p>
              )}
            </div>

            {serverError && (
              <p
                ref={serverErrorRef}
                tabIndex={-1}
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground"
              >
                {serverError}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Envoi..." : ctaLabel}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
