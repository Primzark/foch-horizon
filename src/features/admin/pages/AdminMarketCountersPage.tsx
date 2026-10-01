import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormErrorSummary, type FormErrorItem } from "@/components/forms/FormErrorSummary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import { useSeo } from "@/lib/seo/useSeo";
import {
  getMarketCountersSnapshot,
  type MarketCountersSnapshot,
  type UpdateMarketCountersInput,
  updateMarketCountersSnapshot,
} from "@/features/listings/api/properties.service";

type CountersForm = {
  soldCount: string;
  underOfferCount: string;
  underContractCount: string;
};

type CounterField = keyof CountersForm;

const counterLabels: Record<CounterField, string> = {
  soldCount: "Biens vendus",
  underOfferCount: "Biens sous offre",
  underContractCount: "Compromis en cours",
};

function validateAdminEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Indiquez l’adresse email de votre compte.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Vérifiez le format de votre adresse email.";
  if (email.length > 254) return "L’adresse email doit contenir 254 caractères maximum.";
  return undefined;
}

function validatePassword(value: string): string | undefined {
  return value ? undefined : "Indiquez le mot de passe de votre compte.";
}

function validateCounterValue(value: string, field: CounterField): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Indiquez le nombre de " + counterLabels[field].toLowerCase() + ".";
  if (!/^[0-9]+$/.test(trimmed) || !Number.isSafeInteger(Number(trimmed))) {
    return "Saisissez un nombre entier supérieur ou égal à 0.";
  }
  return undefined;
}

const EMPTY_FORM: CountersForm = {
  soldCount: "0",
  underOfferCount: "0",
  underContractCount: "0",
};

function snapshotToForm(snapshot: MarketCountersSnapshot): CountersForm {
  return {
    soldCount: String(snapshot.soldCount),
    underOfferCount: String(snapshot.underOfferCount),
    underContractCount: String(snapshot.underContractCount),
  };
}

function parseNonNegativeInteger(value: string, fieldLabel: string): number {
  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed) || !Number.isSafeInteger(Number(trimmed))) {
    throw new Error(fieldLabel + " doit être un nombre entier supérieur ou égal à 0.");
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(fieldLabel + " doit être un nombre entier supérieur ou égal à 0.");
  }

  return parsed;
}

function parseUpdateInput(form: CountersForm): UpdateMarketCountersInput {
  return {
    soldCount: parseNonNegativeInteger(form.soldCount, "Biens vendus"),
    underOfferCount: parseNonNegativeInteger(form.underOfferCount, "Biens sous offre"),
    underContractCount: parseNonNegativeInteger(form.underContractCount, "Compromis en cours"),
  };
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AdminMarketCountersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const supabaseClient = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState<CountersForm>(EMPTY_FORM);
  const [loginValidationAttempted, setLoginValidationAttempted] = useState(false);
  const [loginEmailBlurred, setLoginEmailBlurred] = useState(false);
  const [loginServerError, setLoginServerError] = useState<string | null>(null);
  const [counterValidationAttempted, setCounterValidationAttempted] = useState(false);
  const [blurredCounters, setBlurredCounters] = useState<Set<CounterField>>(() => new Set());
  const [saveServerError, setSaveServerError] = useState<string | null>(null);
  const loginSummaryRef = useRef<HTMLElement | null>(null);
  const counterSummaryRef = useRef<HTMLElement | null>(null);

  useSeo({
    title: "Admin compteurs | Foch Immobilier",
    description: "Tableau de bord des compteurs de performance agence.",
    canonicalPath: "/admin",
    noIndex: true,
  });

  useEffect(() => {
    if (!supabaseClient) {
      return;
    }

    void supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  const countersQuery = useQuery({
    queryKey: ["market-counters-admin"],
    queryFn: getMarketCountersSnapshot,
    enabled: Boolean(session?.access_token),
  });

  const loginEmailError =
    loginValidationAttempted || loginEmailBlurred ? validateAdminEmail(email) : undefined;
  const loginPasswordError = loginValidationAttempted ? validatePassword(password) : undefined;
  const counterErrors: Record<CounterField, string | undefined> = {
    soldCount: validateCounterValue(form.soldCount, "soldCount"),
    underOfferCount: validateCounterValue(form.underOfferCount, "underOfferCount"),
    underContractCount: validateCounterValue(form.underContractCount, "underContractCount"),
  };
  const counterSummaryErrors: FormErrorItem[] = counterValidationAttempted
    ? (Object.keys(counterLabels) as CounterField[]).flatMap((field) =>
        counterErrors[field]
          ? [{ fieldId: "counter-" + field, label: counterLabels[field], message: counterErrors[field]! }]
          : [],
      )
    : [];
  const loginSummaryErrors: FormErrorItem[] = loginValidationAttempted
    ? [
        loginEmailError ? { fieldId: "admin-email", label: "Email", message: loginEmailError } : null,
        loginPasswordError ? { fieldId: "admin-password", label: "Mot de passe", message: loginPasswordError } : null,
      ].filter((error): error is FormErrorItem => error !== null)
    : [];

  useEffect(() => {
    if (countersQuery.data) {
      setForm(snapshotToForm(countersQuery.data));
    }
  }, [countersQuery.data]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!supabaseClient) {
        throw new Error("Configuration Supabase manquante.");
      }

      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      setPassword("");
      setLoginServerError(null);
      toast({
        title: "Connexion réussie",
        description: "Vous pouvez maintenant modifier les compteurs.",
      });
    },
    onError: () => {
      setLoginServerError("Connexion impossible. Vérifiez votre adresse email et votre mot de passe, puis réessayez.");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session?.access_token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      const payload = parseUpdateInput(form);
      return await updateMarketCountersSnapshot(payload, session.access_token);
    },
    onSuccess: (snapshot) => {
      queryClient.setQueryData(["market-counters-admin"], snapshot);
      queryClient.setQueryData(["market-counters"], snapshot);
      void queryClient.invalidateQueries({ queryKey: ["market-counters"] });
      setSaveServerError(null);
      toast({
        title: "Compteurs mis à jour",
        description: "Les nouveaux chiffres sont publiés sur la page d'accueil.",
      });
    },
    onError: () => {
      setSaveServerError(
        "Impossible d’enregistrer ces valeurs. Vérifiez les nombres et votre session administrateur, puis réessayez.",
      );
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!supabaseClient) {
        return;
      }
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      setSession(null);
      setForm(EMPTY_FORM);
      setPassword("");
      toast({
        title: "Déconnecté",
        description: "La session administrateur a été fermée.",
      });
    },
  });

  const onLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginValidationAttempted(true);
    if (validateAdminEmail(email) || validatePassword(password)) {
      window.requestAnimationFrame(() => loginSummaryRef.current?.focus());
      return;
    }
    setLoginServerError(null);
    loginMutation.mutate();
  };

  const onSaveSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCounterValidationAttempted(true);
    if (Object.values(counterErrors).some(Boolean)) {
      window.requestAnimationFrame(() => counterSummaryRef.current?.focus());
      return;
    }
    setSaveServerError(null);
    saveMutation.mutate();
  };

  if (!supabaseClient) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard indisponible</CardTitle>
            <CardDescription>
              Ajoutez `VITE_SUPABASE_PROJECT_URL` et `VITE_SUPABASE_ANON_KEY` pour activer la connexion administrateur.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="container mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-brand" />
              Espace administrateur
            </CardTitle>
            <CardDescription>Connectez-vous pour modifier les compteurs de performance affichés sur le site.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onLoginSubmit} noValidate aria-busy={loginMutation.isPending}>
              <FormErrorSummary
                id="admin-login-error-summary"
                ref={loginSummaryRef}
                errors={loginSummaryErrors}
              />
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={254}
                  aria-invalid={loginEmailError ? true : undefined}
                  aria-describedby={loginEmailError ? "admin-email-error" : undefined}
                  value={email}
                  onBlur={() => {
                    if (email.trim()) setLoginEmailBlurred(true);
                  }}
                  onChange={(event) => {
                    setLoginServerError(null);
                    setEmail(event.target.value);
                  }}
                  required
                />
                {loginEmailError && (
                  <p id="admin-email-error" className="text-xs text-destructive" aria-live="polite">{loginEmailError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Mot de passe</Label>
                <Input
                  id="admin-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  aria-invalid={loginValidationAttempted && loginPasswordError ? true : undefined}
                  aria-describedby={loginValidationAttempted && loginPasswordError ? "admin-password-error" : undefined}
                  value={password}
                  onChange={(event) => {
                    setLoginServerError(null);
                    setPassword(event.target.value);
                  }}
                  required
                />
                {loginValidationAttempted && loginPasswordError && (
                  <p id="admin-password-error" className="text-xs text-destructive" aria-live="polite">{loginPasswordError}</p>
                )}
              </div>
              {loginServerError && (
                <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground">
                  {loginServerError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  const userEmail = session.user.email ?? "admin";
  const isLoading = countersQuery.isLoading && !countersQuery.data;
  const updatedAtLabel = countersQuery.data ? formatUpdatedAt(countersQuery.data.updatedAt) : "N/A";
  const sourceLabel = countersQuery.data?.source === "manual" ? "Valeurs manuelles" : "Calcul automatique";

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Administration</p>
          <h1 className="mt-1 font-display text-3xl">Compteurs de performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connecté en tant que <span className="font-medium text-foreground">{userEmail}</span>
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modifier les valeurs affichées</CardTitle>
          <CardDescription>
            Source actuelle: {sourceLabel}. Dernière mise à jour: {updatedAtLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des compteurs...</p>
          ) : (
            <form className="space-y-4" onSubmit={onSaveSubmit} noValidate aria-busy={saveMutation.isPending}>
              <FormErrorSummary
                id="admin-counters-error-summary"
                ref={counterSummaryRef}
                errors={counterSummaryErrors}
              />
              <div className="space-y-2">
                <Label htmlFor="counter-sold">Biens vendus</Label>
                <Input
                  id="counter-sold"
                  name="soldCount"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-required="true"
                  aria-invalid={(counterValidationAttempted || blurredCounters.has("soldCount")) && counterErrors.soldCount ? true : undefined}
                  aria-describedby={(counterValidationAttempted || blurredCounters.has("soldCount")) && counterErrors.soldCount ? "counter-sold-error" : undefined}
                  value={form.soldCount}
                  onBlur={() => {
                    if (form.soldCount.trim()) setBlurredCounters((current) => new Set(current).add("soldCount"));
                  }}
                  onChange={(event) => {
                    setSaveServerError(null);
                    setForm((current) => ({ ...current, soldCount: event.target.value }));
                  }}
                  required
                />
                {(counterValidationAttempted || blurredCounters.has("soldCount")) && counterErrors.soldCount && (
                  <p id="counter-sold-error" className="text-xs text-destructive" aria-live="polite">{counterErrors.soldCount}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="counter-offer">Biens sous offre</Label>
                <Input
                  id="counter-offer"
                  name="underOfferCount"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-required="true"
                  aria-invalid={(counterValidationAttempted || blurredCounters.has("underOfferCount")) && counterErrors.underOfferCount ? true : undefined}
                  aria-describedby={(counterValidationAttempted || blurredCounters.has("underOfferCount")) && counterErrors.underOfferCount ? "counter-offer-error" : undefined}
                  value={form.underOfferCount}
                  onBlur={() => {
                    if (form.underOfferCount.trim()) setBlurredCounters((current) => new Set(current).add("underOfferCount"));
                  }}
                  onChange={(event) => {
                    setSaveServerError(null);
                    setForm((current) => ({ ...current, underOfferCount: event.target.value }));
                  }}
                  required
                />
                {(counterValidationAttempted || blurredCounters.has("underOfferCount")) && counterErrors.underOfferCount && (
                  <p id="counter-offer-error" className="text-xs text-destructive" aria-live="polite">{counterErrors.underOfferCount}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="counter-contract">Compromis en cours</Label>
                <Input
                  id="counter-contract"
                  name="underContractCount"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-required="true"
                  aria-invalid={(counterValidationAttempted || blurredCounters.has("underContractCount")) && counterErrors.underContractCount ? true : undefined}
                  aria-describedby={(counterValidationAttempted || blurredCounters.has("underContractCount")) && counterErrors.underContractCount ? "counter-contract-error" : undefined}
                  value={form.underContractCount}
                  onBlur={() => {
                    if (form.underContractCount.trim()) setBlurredCounters((current) => new Set(current).add("underContractCount"));
                  }}
                  onChange={(event) => {
                    setSaveServerError(null);
                    setForm((current) => ({ ...current, underContractCount: event.target.value }));
                  }}
                  required
                />
                {(counterValidationAttempted || blurredCounters.has("underContractCount")) && counterErrors.underContractCount && (
                  <p id="counter-contract-error" className="text-xs text-destructive" aria-live="polite">{counterErrors.underContractCount}</p>
                )}
              </div>
              {saveServerError && (
                <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground">
                  {saveServerError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Enregistrement..." : "Enregistrer les compteurs"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
