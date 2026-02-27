import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${fieldLabel} doit être un nombre entier positif.`);
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldLabel} doit être un nombre entier positif.`);
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
      toast({
        title: "Connexion réussie",
        description: "Vous pouvez maintenant modifier les compteurs.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Connexion refusée",
        description: error instanceof Error ? error.message : "Impossible de se connecter.",
      });
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
      toast({
        title: "Compteurs mis à jour",
        description: "Les nouveaux chiffres sont publiés sur la page d'accueil.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Échec de la mise à jour",
        description: error instanceof Error ? error.message : "Impossible d'enregistrer les compteurs.",
      });
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
    loginMutation.mutate();
  };

  const onSaveSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
            <form className="space-y-4" onSubmit={onLoginSubmit}>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Mot de passe</Label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
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
            <form className="space-y-4" onSubmit={onSaveSubmit}>
              <div className="space-y-2">
                <Label htmlFor="counter-sold">Biens vendus</Label>
                <Input
                  id="counter-sold"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.soldCount}
                  onChange={(event) => setForm((current) => ({ ...current, soldCount: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counter-offer">Biens sous offre</Label>
                <Input
                  id="counter-offer"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.underOfferCount}
                  onChange={(event) => setForm((current) => ({ ...current, underOfferCount: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counter-contract">Compromis en cours</Label>
                <Input
                  id="counter-contract"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.underContractCount}
                  onChange={(event) => setForm((current) => ({ ...current, underContractCount: event.target.value }))}
                  required
                />
              </div>
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
