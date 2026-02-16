import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const steps = ["Type de bien", "Localisation", "Détails", "Vos coordonnées"];

const ValuationPage = () => {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    propertyType: "",
    address: "",
    city: "",
    postcode: "",
    surface: "",
    rooms: "",
    bedrooms: "",
    condition: "",
    features: [] as string[],
    name: "",
    email: "",
    phone: "",
    callbackTime: "",
    message: "",
    consent: false,
  });

  const update = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const canNext = () => {
    if (step === 0) return !!form.propertyType;
    if (step === 1) return !!form.city;
    if (step === 2) return !!form.surface;
    if (step === 3) return !!form.name && !!form.email && form.consent;
    return true;
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Layout>
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <Check className="h-8 w-8 text-accent" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-foreground">Demande envoyée !</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Merci pour votre demande d'estimation. Un de nos conseillers vous recontactera dans les plus brefs délais.
          </p>
          <Link to="/">
            <Button className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90">
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="border-b border-border bg-primary py-12 text-center text-primary-foreground">
        <h1 className="font-display text-3xl font-bold lg:text-4xl">Estimez votre bien</h1>
        <p className="mx-auto mt-2 max-w-lg text-primary-foreground/70">
          Obtenez une estimation gratuite et sans engagement en quelques minutes.
        </p>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-12">
        {/* Progress */}
        <div className="mb-10 flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center">
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i <= step ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              )}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn("mx-2 h-0.5 flex-1 rounded", i < step ? "bg-accent" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-5"
        >
          {step === 0 && (
            <>
              <h2 className="font-display text-xl font-semibold">Quel type de bien souhaitez-vous estimer ?</h2>
              <div className="grid grid-cols-2 gap-3">
                {["Appartement", "Maison", "Villa", "Terrain", "Commerce", "Autre"].map(type => (
                  <button
                    key={type}
                    onClick={() => update("propertyType", type)}
                    className={cn(
                      "rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all",
                      form.propertyType === type
                        ? "border-accent bg-accent/5 text-accent"
                        : "border-border text-foreground hover:border-accent/50"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-display text-xl font-semibold">Où se situe votre bien ?</h2>
              <Input placeholder="Adresse" value={form.address} onChange={e => update("address", e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Ville" value={form.city} onChange={e => update("city", e.target.value)} />
                <Input placeholder="Code postal" value={form.postcode} onChange={e => update("postcode", e.target.value)} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display text-xl font-semibold">Caractéristiques du bien</h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Surface m²</label>
                  <Input type="number" value={form.surface} onChange={e => update("surface", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Pièces</label>
                  <Input type="number" value={form.rooms} onChange={e => update("rooms", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Chambres</label>
                  <Input type="number" value={form.bedrooms} onChange={e => update("bedrooms", e.target.value)} />
                </div>
              </div>
              <Select value={form.condition} onValueChange={v => update("condition", v)}>
                <SelectTrigger><SelectValue placeholder="État du bien" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Neuf</SelectItem>
                  <SelectItem value="excellent">Excellent état</SelectItem>
                  <SelectItem value="good">Bon état</SelectItem>
                  <SelectItem value="renovate">À rénover</SelectItem>
                  <SelectItem value="heavy">Travaux importants</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Particularités (vue, jardin, terrasse…)" value={form.message} onChange={e => update("message", e.target.value)} rows={3} />
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-display text-xl font-semibold">Vos coordonnées</h2>
              <Input placeholder="Nom complet" value={form.name} onChange={e => update("name", e.target.value)} required />
              <Input type="email" placeholder="Email" value={form.email} onChange={e => update("email", e.target.value)} required />
              <Input type="tel" placeholder="Téléphone" value={form.phone} onChange={e => update("phone", e.target.value)} />
              <Select value={form.callbackTime} onValueChange={v => update("callbackTime", v)}>
                <SelectTrigger><SelectValue placeholder="Créneaux de rappel préférés" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Matin (9h-12h)</SelectItem>
                  <SelectItem value="afternoon">Après-midi (14h-18h)</SelectItem>
                  <SelectItem value="evening">Soir (18h-20h)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="val-consent"
                  checked={form.consent}
                  onCheckedChange={(v) => update("consent", !!v)}
                />
                <label htmlFor="val-consent" className="text-xs leading-tight text-muted-foreground">
                  J'accepte que mes données soient traitées pour répondre à ma demande d'estimation.{" "}
                  <Link to="/legal/privacy" className="text-accent hover:underline">Politique de confidentialité</Link>
                </label>
              </div>
            </>
          )}
        </motion.div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Précédent
          </Button>
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Suivant <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canNext()}
              className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90 shadow-gold"
            >
              Envoyer <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ValuationPage;
