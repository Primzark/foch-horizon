import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Building2,
  Check,
  CircleAlert,
  KeyRound,
  LogOut,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import { useSeo } from "@/lib/seo/useSeo";
import { formatPrice, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import type { PropertyStatus } from "@/types/domain";
import {
  ADMIN_PROPERTIES_QUERY_KEY,
  ADMIN_PROPERTY_STATUS_OPTIONS,
  AdminPropertiesError,
  getAdminProperties,
  updateAdminPropertyStatus,
  type AdminProperty,
} from "@/features/admin/api/adminProperties.service";

type StatusFilter = "all" | PropertyStatus;

const statusDetails: Record<PropertyStatus, { label: string; trigger: string; dot: string }> = {
  active: {
    label: "Disponible",
    trigger: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
    dot: "bg-emerald-600",
  },
  under_offer: {
    label: "Sous offre",
    trigger: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  reserved: {
    label: "Réservé",
    trigger: "border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-200",
    dot: "bg-violet-500",
  },
  sold: {
    label: "Vendu",
    trigger: "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
    dot: "bg-sky-600",
  },
  rented: {
    label: "Loué",
    trigger: "border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-200",
    dot: "bg-cyan-600",
  },
  off_market: {
    label: "Retiré",
    trigger: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
    dot: "bg-slate-500",
  },
};

const typeLabels: Record<AdminProperty["property_type"], string> = {
  appartement: "Appartement",
  maison_villa: "Maison / villa",
  autre: "Autre bien",
};

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");
}

function formatArea(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Surface non renseignée";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} m²`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatPropertyType(value: AdminProperty["property_type"]): string {
  return typeLabels[value] ?? "Autre bien";
}

function getStatusOptionLabel(status: PropertyStatus, transactionType: AdminProperty["transaction_type"]): string {
  if (status === "active") return transactionType === "location" ? "À louer" : "À vendre";
  return statusDetails[status].label;
}

function PropertyThumbnail({ property }: { property: AdminProperty }) {
  const cover = [...(property.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.source_url;

  return (
    <div className="relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-secondary/80 sm:h-[3.75rem] sm:w-20">
      <Building2 className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/70" aria-hidden="true" />
      {cover && (
        <img
          src={cover}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
      )}
    </div>
  );
}

function PropertyIdentity({ property }: { property: AdminProperty }) {
  const location = [property.city?.name, property.postal_code].filter(Boolean).join(" · ") || "Localisation non renseignée";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <PropertyThumbnail property={property} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-start gap-2">
          <Link
            to={toCanonicalPropertyPath(property)}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 font-medium leading-5 text-foreground decoration-primary/40 underline-offset-4 hover:underline"
          >
            {property.title}
          </Link>
          <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Réf. {property.id} <span aria-hidden="true">·</span> {location}</p>
      </div>
    </div>
  );
}

function PropertyPrice({ property }: { property: AdminProperty }) {
  return (
    <div className="min-w-0">
      <p className="font-medium tabular-nums">{formatPrice(property.price_amount, property.transaction_type)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{formatArea(property.surface_m2)}</p>
    </div>
  );
}

function LogoutConfirmationButton({
  onConfirm,
  children,
  ...buttonProps
}: {
  onConfirm: () => void | Promise<void>;
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button {...buttonProps}>{children}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
          <AlertDialogDescription>
            Vous devrez vous reconnecter pour accéder à la gestion des annonces.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Rester connecté</AlertDialogCancel>
          <AlertDialogAction onClick={() => { void onConfirm(); }}>
            Se déconnecter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StatusControl({
  property,
  value,
  saving,
  onChange,
}: {
  property: AdminProperty;
  value: PropertyStatus;
  saving: boolean;
  onChange: (propertyId: number, status: PropertyStatus) => void;
}) {
  const detail = statusDetails[value];

  return (
    <Select
      value={value}
      onValueChange={(status) => onChange(property.id, status as PropertyStatus)}
      disabled={saving}
    >
      <SelectTrigger
        aria-label={`Statut de ${property.title}`}
        aria-busy={saving}
        className={`h-9 w-[150px] gap-2 rounded-full px-3 text-xs font-medium shadow-none transition-colors focus-visible:ring-2 ${detail.trigger}`}
      >
        {saving ? (
          <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
        ) : (
          <span className={`h-2 w-2 shrink-0 rounded-full ${detail.dot}`} aria-hidden="true" />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[170px]">
        {ADMIN_PROPERTY_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {getStatusOptionLabel(option.value, property.transaction_type)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LoginPage({
  onLogin,
  pending,
  serverError,
  onCredentialsChange,
}: {
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  serverError: string | null;
  onCredentialsChange: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="grid min-h-dvh place-items-center bg-[hsl(var(--background))] px-5 py-12">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="w-full max-w-[440px]"
      >
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-2xl leading-none">Foch Immobilier</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Administration</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-[0_18px_50px_-34px_hsl(var(--foreground)/0.22)] sm:p-8">
          <div className="mb-7 flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-strong">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Espace administrateur</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Connectez-vous pour gérer les annonces immobilières.</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={onLogin} aria-busy={pending}>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Adresse email</Label>
              <Input
                id="admin-email"
                type="email"
                name="email"
                autoComplete="username"
                maxLength={254}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  onCredentialsChange();
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Mot de passe</Label>
              <Input
                id="admin-password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  onCredentialsChange();
                }}
                required
              />
            </div>
            {serverError && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                {serverError}
              </p>
            )}
            <Button type="submit" className="mt-2 w-full gap-2" disabled={pending}>
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {pending ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {pending ? "Connexion en cours." : ""}
          </p>
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">Accès réservé aux comptes administrateurs autorisés.</p>
      </motion.section>
    </main>
  );
}

function AdminState({
  icon,
  title,
  description,
  action,
}: {
  icon: "loading" | "denied" | "error";
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const Icon = icon === "denied" ? ShieldCheck : icon === "error" ? CircleAlert : Building2;
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (icon === "denied") titleRef.current?.focus();
  }, [icon]);

  return (
    <main className="grid min-h-dvh place-items-center bg-[hsl(var(--background))] px-5 py-12">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="max-w-md text-center"
      >
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
          {icon === "loading" ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent" aria-hidden="true" />
          ) : (
            <Icon className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <h1 ref={titleRef} tabIndex={icon === "denied" ? -1 : undefined} className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </motion.section>
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-l border-border/70 pl-4 first:border-l-0 first:pl-0 sm:pl-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

export default function AdminPropertiesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const supabaseClient = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const dashboardHeadingRef = useRef<HTMLHeadingElement>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [savingIds, setSavingIds] = useState<Set<number>>(() => new Set());
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<number, PropertyStatus>>({});

  useSeo({
    title: "Gestion des annonces | Foch Immobilier",
    description: "Gestion sécurisée des annonces immobilières.",
    canonicalPath: "/admin",
    noIndex: true,
  });

  useEffect(() => {
    if (!supabaseClient) {
      setAuthReady(true);
      return;
    }

    let active = true;
    void supabaseClient.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session ?? null);
        setAuthReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  const propertiesQuery = useQuery({
    queryKey: ADMIN_PROPERTIES_QUERY_KEY,
    queryFn: () => getAdminProperties(supabaseClient!),
    enabled: Boolean(session?.access_token),
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (propertiesQuery.isSuccess) dashboardHeadingRef.current?.focus();
  }, [propertiesQuery.isSuccess]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      if (!supabaseClient) throw new Error("Configuration Supabase manquante.");
      const { error } = await supabaseClient.auth.signInWithPassword(credentials);
      if (error) throw error;
    },
    onSuccess: () => setLoginError(null),
    onError: () => setLoginError("Impossible de vous connecter. Vérifiez votre adresse email et votre mot de passe, puis réessayez. Vérifiez également votre connexion internet."),
  });

  const logout = async () => {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      toast({ title: "Déconnexion impossible", description: "Réessayez dans un instant.", variant: "destructive" });
      return;
    }
    queryClient.removeQueries({ queryKey: ADMIN_PROPERTIES_QUERY_KEY });
    setOptimisticStatuses({});
    setLoginError(null);
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginMutation.isPending) return;
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!email || !password) return;
    setLoginError(null);
    loginMutation.mutate({ email, password });
  };

  const changeStatus = async (propertyId: number, status: PropertyStatus) => {
    const current = propertiesQuery.data?.find((property) => property.id === propertyId);
    if (!current || current.status === status || savingIds.has(propertyId) || !supabaseClient) return;

    setOptimisticStatuses((existing) => ({ ...existing, [propertyId]: status }));
    setSavingIds((existing) => new Set(existing).add(propertyId));

    try {
      const updated = await updateAdminPropertyStatus(supabaseClient, { id: propertyId, status });
      queryClient.setQueryData<AdminProperty[]>(ADMIN_PROPERTIES_QUERY_KEY, (properties) =>
        properties?.map((property) => (property.id === propertyId ? { ...property, ...updated } : property)),
      );
      toast({
        title: "Statut mis à jour",
        description: "Le nouveau statut est enregistré et publié sur le site.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d’enregistrer ce statut.";
      toast({ title: "Enregistrement impossible", description: message, variant: "destructive" });
    } finally {
      setOptimisticStatuses((existing) => {
        const next = { ...existing };
        delete next[propertyId];
        return next;
      });
      setSavingIds((existing) => {
        const next = new Set(existing);
        next.delete(propertyId);
        return next;
      });
    }
  };

  const allProperties = propertiesQuery.data ?? [];
  const filteredProperties = useMemo(() => {
    const needle = normalizeSearch(search.trim());
    return allProperties.filter((property) => {
      if (statusFilter !== "all" && property.status !== statusFilter) return false;
      if (!needle) return true;
      const haystack = normalizeSearch([
        property.title,
        property.slug,
        property.city?.name ?? "",
        property.postal_code ?? "",
        String(property.id),
      ].join(" "));
      return haystack.includes(needle);
    });
  }, [allProperties, search, statusFilter]);

  if (!supabaseClient) {
    return (
      <AdminState
        icon="error"
        title="Dashboard indisponible"
        description="La connexion Supabase n’est pas configurée pour ce site."
      />
    );
  }

  if (!authReady) {
    return <AdminState icon="loading" title="Vérification de la session" description="Chargement de l’espace administrateur…" />;
  }

  if (!session) {
    return (
      <LoginPage
        onLogin={handleLogin}
        pending={loginMutation.isPending}
        serverError={loginError}
        onCredentialsChange={() => setLoginError(null)}
      />
    );
  }

  const isForbidden = propertiesQuery.error instanceof AdminPropertiesError && propertiesQuery.error.status === 403;
  if (isForbidden) {
    return (
      <AdminState
        icon="denied"
        title="Accès réservé"
        description="Ce compte est connecté, mais il ne figure pas parmi les administrateurs autorisés."
        action={<LogoutConfirmationButton variant="outline" onConfirm={logout} className="gap-2"><LogOut className="h-4 w-4" />Se déconnecter</LogoutConfirmationButton>}
      />
    );
  }

  if (propertiesQuery.isLoading) {
    return <AdminState icon="loading" title="Chargement des annonces" description="Récupération de l’inventaire immobilier…" />;
  }

  if (propertiesQuery.isError) {
    return (
      <AdminState
        icon="error"
        title="Les annonces n’ont pas pu être chargées"
        description={propertiesQuery.error instanceof Error ? propertiesQuery.error.message : "Vérifiez votre session et réessayez."}
        action={(
          <div className="flex gap-2">
            <LogoutConfirmationButton variant="outline" onConfirm={logout} className="gap-2"><LogOut className="h-4 w-4" />Se déconnecter</LogoutConfirmationButton>
            <Button onClick={() => void propertiesQuery.refetch()}>Réessayer</Button>
          </div>
        )}
      />
    );
  }

  const counts = allProperties.reduce<Record<PropertyStatus, number>>((acc, property) => {
    acc[property.status] += 1;
    return acc;
  }, { active: 0, under_offer: 0, reserved: 0, sold: 0, rented: 0, off_market: 0 });
  const userEmail = session.user.email ?? "Administrateur";

  return (
    <motion.main
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="min-h-dvh bg-[hsl(var(--background))] text-foreground"
    >
      <div className="mx-auto min-h-dvh max-w-[1680px] lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/70 bg-card/70 px-5 py-7 lg:flex lg:flex-col">
          <Link to="/" className="flex items-center gap-3" aria-label="Foch Immobilier, accueil">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-display text-[1.35rem] leading-none">Foch Immobilier</span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.19em] text-muted-foreground">Administration</span>
            </span>
          </Link>

          <p className="mb-3 mt-12 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Espace de travail</p>
          <div className="flex items-center gap-3 rounded-xl bg-brand-soft px-3 py-3 text-sm font-medium text-brand-strong">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1">Annonces</span>
            <span className="text-xs tabular-nums opacity-70">{allProperties.length}</span>
          </div>

          <div className="mt-auto border-t border-border/70 pt-5">
            <p className="truncate text-xs font-medium" title={userEmail}>{userEmail}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Compte autorisé</p>
            <LogoutConfirmationButton variant="ghost" size="sm" onConfirm={logout} className="mt-4 w-full justify-start gap-2 px-2 text-muted-foreground">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Se déconnecter
            </LogoutConfirmationButton>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="flex min-h-[68px] items-center justify-between border-b border-border/70 bg-card/75 px-5 sm:px-7 lg:px-9">
            <div className="flex items-center gap-2 lg:hidden">
              <Building2 className="h-5 w-5 text-brand" aria-hidden="true" />
              <span className="font-display text-xl">Foch Immobilier</span>
            </div>
            <div className="hidden text-xs text-muted-foreground lg:block">Espace sécurisé · Gestion des biens</div>
            <div className="ml-auto flex items-center gap-2">
              <a href="/biens" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                Voir le site <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <LogoutConfirmationButton variant="outline" size="sm" onConfirm={logout} className="gap-2 lg:hidden">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Quitter
              </LogoutConfirmationButton>
            </div>
          </header>

          <div className="mx-auto max-w-[1380px] px-5 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">Inventaire immobilier</p>
                <h1 ref={dashboardHeadingRef} tabIndex={-1} className="mt-2 font-display text-4xl leading-none tracking-tight sm:text-[2.75rem]">Annonces</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  Gérez la visibilité et le statut de chaque bien. Les changements sont enregistrés automatiquement.
                </p>
              </div>
              <p className="mb-1 text-xs text-muted-foreground">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Connecté en tant que <span className="font-medium text-foreground">{userEmail}</span>
              </p>
            </div>

            <section aria-label="Synthèse des annonces" className="mt-8 grid grid-cols-2 gap-y-5 border-y border-border/70 py-5 sm:grid-cols-3 lg:grid-cols-7">
              <SummaryItem label="Toutes" value={allProperties.length} />
              <SummaryItem label="Disponibles" value={counts.active} />
              <SummaryItem label="Sous offre" value={counts.under_offer} />
              <SummaryItem label="Réservés" value={counts.reserved} />
              <SummaryItem label="Vendus" value={counts.sold} />
              <SummaryItem label="Loués" value={counts.rented} />
              <SummaryItem label="Retirés" value={counts.off_market} />
            </section>

            <section aria-label="Liste des annonces" className="mt-7">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold">Tous les biens</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{filteredProperties.length} résultat{filteredProperties.length === 1 ? "" : "s"} sur {allProperties.length}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative sm:w-[300px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Rechercher un bien, une ville, une référence…"
                      aria-label="Rechercher parmi les annonces"
                      className="h-10 bg-card pl-9 pr-9 text-xs"
                    />
                    {search && (
                      <button type="button" onClick={() => setSearch("")} aria-label="Effacer la recherche" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                    <SelectTrigger aria-label="Filtrer par statut" className="h-10 gap-2 bg-card text-xs sm:w-[190px]">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      {ADMIN_PROPERTY_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredProperties.length === 0 ? (
                <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-border bg-card/50 px-5 py-10 text-center">
                  <div>
                    <Search className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <h3 className="mt-3 text-sm font-semibold">Aucune annonce trouvée</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Modifiez la recherche ou le filtre de statut.</p>
                    {(search || statusFilter !== "all") && (
                      <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                        Effacer les filtres
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card md:block">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[940px] border-collapse text-left">
                        <thead>
                          <tr className="border-b border-border/70 bg-secondary/35 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            <th scope="col" className="px-5 py-3.5">Bien immobilier</th>
                            <th scope="col" className="px-4 py-3.5">Type</th>
                            <th scope="col" className="px-4 py-3.5">Prix</th>
                            <th scope="col" className="px-4 py-3.5">Mis à jour</th>
                            <th scope="col" className="px-5 py-3.5 text-right">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          <AnimatePresence initial={false}>
                            {filteredProperties.map((property) => (
                              <motion.tr
                                key={property.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.16 }}
                                className="border-b border-border/50 last:border-b-0 hover:bg-secondary/20"
                              >
                                <td className="px-5 py-3.5">
                                  <PropertyIdentity property={property} />
                                </td>
                                <td className="px-4 py-3.5">
                                  <p className="text-xs font-medium">{formatPropertyType(property.property_type)}</p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">{property.transaction_type === "location" ? "Location" : "Vente"}</p>
                                </td>
                                <td className="px-4 py-3.5"><PropertyPrice property={property} /></td>
                                <td className="px-4 py-3.5 text-xs text-muted-foreground">{formatDate(property.updated_at)}</td>
                                <td className="px-5 py-3.5">
                                  <div className="flex justify-end">
                                    <StatusControl
                                      property={property}
                                      value={optimisticStatuses[property.id] ?? property.status}
                                      saving={savingIds.has(property.id)}
                                      onChange={changeStatus}
                                    />
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card md:hidden">
                    {filteredProperties.map((property) => (
                      <motion.article key={property.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }} className="p-4">
                        <PropertyIdentity property={property} />
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div>
                            <PropertyPrice property={property} />
                            <p className="mt-1 text-xs text-muted-foreground">{formatPropertyType(property.property_type)} · {property.transaction_type === "location" ? "Location" : "Vente"}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{formatDate(property.updated_at)}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-[11px] text-muted-foreground">Statut</span>
                          <StatusControl
                            property={property}
                            value={optimisticStatuses[property.id] ?? property.status}
                            saving={savingIds.has(property.id)}
                            onChange={changeStatus}
                          />
                        </div>
                      </motion.article>
                    ))}
                  </div>
                </>
              )}

              <p className="mt-4 flex items-center gap-2 text-[11px] leading-5 text-muted-foreground">
                <Check className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                Chaque changement de statut est enregistré dans la base et pris en compte par le site public.
              </p>
            </section>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
