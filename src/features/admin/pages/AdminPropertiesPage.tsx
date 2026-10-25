import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowUpRight,
  ArrowLeft,
  Building2,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Heart,
  KeyRound,
  LogOut,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { FormErrorSummary, type FormErrorItem } from "@/components/forms/FormErrorSummary";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  ADMIN_PROPERTIES_QUERY_KEY,
  ADMIN_AGENTS_QUERY_KEY,
  ADMIN_PROPERTY_LIKES_QUERY_KEY,
  ADMIN_PROPERTY_LIKE_HISTORY_QUERY_KEY,
  ADMIN_PROPERTY_STATUS_OPTIONS,
  AdminPropertiesError,
  getAdminPropertyLikeHistory,
  getAdminPropertyLikeSummary,
  getAdminProperties,
  getAdminAgents,
  updateAdminProperty,
  type AdminManagedPropertyStatus,
  type AdminAgent,
  type AdminPropertyUpdateInput,
  type AdminProperty,
  type AdminPropertyLikeSummary,
} from "@/features/admin/api/adminProperties.service";

type StatusFilter = "all" | AdminManagedPropertyStatus;
type AdminLoginErrors = Partial<Record<"email" | "password", string>>;

const adminLoginEmailSchema = z.string().trim().email().max(254);

function validateAdminLogin(emailValue: string, password: string): AdminLoginErrors {
  const errors: AdminLoginErrors = {};
  const email = emailValue.trim();

  if (!email) {
    errors.email = "Obligatoire.";
  } else if (email.length > 254) {
    errors.email = "L’adresse email doit contenir 254 caractères maximum.";
  } else if (!adminLoginEmailSchema.safeParse(email).success) {
    errors.email = "Vérifiez l’adresse email, par exemple nom@exemple.fr.";
  }

  if (password.length === 0) errors.password = "Obligatoire.";

  return errors;
}

const statusDetails: Record<AdminManagedPropertyStatus, { label: string; trigger: string; dot: string }> = {
  active: {
    label: "Disponible",
    trigger: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
    dot: "bg-emerald-600",
  },
  new: {
    label: "Nouveauté",
    trigger: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
    dot: "bg-emerald-600",
  },
  exclusive: {
    label: "Exclusivité",
    trigger: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900 hover:bg-fuchsia-100 dark:border-fuchsia-900 dark:bg-fuchsia-950/50 dark:text-fuchsia-200",
    dot: "bg-fuchsia-600",
  },
  price_reduced: {
    label: "Prix réduit",
    trigger: "border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-200",
    dot: "bg-orange-600",
  },
  under_offer: {
    label: "Sous offre",
    trigger: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  under_contract: {
    label: "Sous compromis",
    trigger: "border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-200",
    dot: "bg-violet-500",
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Paris",
    timeZoneName: "short",
  }).format(date);
}

function visitorLabel(visitorId: string): string {
  return `Visiteur · ${visitorId.slice(0, 8).toUpperCase()}`;
}

function formatPropertyType(value: AdminProperty["property_type"]): string {
  return typeLabels[value] ?? "Autre bien";
}

function getStatusOptionLabel(status: AdminManagedPropertyStatus, _transactionType: AdminProperty["transaction_type"]): string {
  if (status === "active") return "À vendre";
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

function PropertyPrice({ property, align = "start" }: { property: AdminProperty; align?: "start" | "end" }) {
  const formattedPrice = new Intl.NumberFormat("fr-FR").format(property.price_amount);

  return (
    <div className="min-w-0">
      <p className={["inline-grid grid-cols-[auto_1.25rem] items-center gap-1 font-medium tabular-nums", align === "end" && "w-full justify-end"].filter(Boolean).join(" ")}>
        <span className={align === "end" ? "text-right" : "text-left"}>{formattedPrice}</span>
        <span className="text-center leading-none" aria-hidden="true">€</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{formatArea(property.surface_m2)}</p>
    </div>
  );
}

const UNASSIGNED_AGENT = "__unassigned__";

function PropertyFlagControl({
  property,
  kind,
  checked,
  saving,
  onChange,
}: {
  property: AdminProperty;
  kind: "favorite" | "online";
  checked: boolean;
  saving: boolean;
  onChange: (checked: boolean) => void;
}) {
  const label = kind === "favorite" ? "Favoris" : "En ligne";

  return (
    <Checkbox
      checked={checked}
      disabled={saving}
      onCheckedChange={(value) => onChange(value === true)}
      aria-label={label + " : " + property.title}
      className="mx-auto"
    />
  );
}

function PropertyAgentControl({
  property,
  agents,
  saving,
  onChange,
}: {
  property: AdminProperty;
  agents: AdminAgent[];
  saving: boolean;
  onChange: (agentId: string | null) => void;
}) {
  const value = property.agent_id ?? UNASSIGNED_AGENT;
  const assignedAgent = agents.find((agent) => agent.id === property.agent_id);

  return (
    <Select
      value={value}
      onValueChange={(agentId) => onChange(agentId === UNASSIGNED_AGENT ? null : agentId)}
      disabled={saving || agents.length === 0}
    >
      <SelectTrigger aria-label={"Négociateur de " + property.title} className="h-9 min-w-[190px] bg-background text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={UNASSIGNED_AGENT}>Non assigné</SelectItem>
        {property.agent_id && !assignedAgent && <SelectItem value={property.agent_id}>Négociateur archivé</SelectItem>}
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>{agent.full_name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  value: AdminManagedPropertyStatus;
  saving: boolean;
  onChange: (propertyId: number, status: AdminManagedPropertyStatus) => void;
}) {
  const detail = statusDetails[value];

  return (
    <Select
      value={value}
      onValueChange={(status) => onChange(property.id, status as AdminManagedPropertyStatus)}
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
        <SelectValue>{getStatusOptionLabel(value, property.transaction_type)}</SelectValue>
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
  const [showPassword, setShowPassword] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const errorSummaryRef = useRef<HTMLElement>(null);
  const serverErrorRef = useRef<HTMLParagraphElement>(null);
  const validationErrors = validateAdminLogin(email, password);
  const emailError = validationAttempted || emailBlurred ? validationErrors.email : undefined;
  const passwordError = validationAttempted ? validationErrors.password : undefined;
  const summaryErrors: FormErrorItem[] = validationAttempted
    ? [
        ...(validationErrors.email ? [{ fieldId: "admin-email", label: "Adresse email", message: validationErrors.email }] : []),
        ...(validationErrors.password ? [{ fieldId: "admin-password", label: "Mot de passe", message: validationErrors.password }] : []),
      ]
    : [];

  useEffect(() => {
    if (serverError) serverErrorRef.current?.focus();
  }, [serverError]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    setValidationAttempted(true);
    const errors = validateAdminLogin(email, password);
    if (Object.keys(errors).length > 0) {
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    onLogin(event);
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-[hsl(var(--background))] px-5 py-12">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="w-full max-w-[440px]"
      >
        <div className="mb-8 flex flex-col items-start gap-2">
          <img
            src="/images/foch-immobilier-logo-transparent.png"
            alt="Foch Immobilier"
            width={772}
            height={150}
            className="h-auto w-[220px] max-w-full object-contain"
            decoding="async"
          />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Administration</p>
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

          <form className="space-y-4" onSubmit={handleSubmit} noValidate aria-busy={pending}>
            <FormErrorSummary
              id="admin-login-error-summary"
              ref={errorSummaryRef}
              errors={summaryErrors}
              guidance="Corrigez les champs signalés, puis réessayez."
            />
            <div className="space-y-2">
              <Label htmlFor="admin-email">Adresse email</Label>
              <Input
                id="admin-email"
                type="email"
                name="email"
                autoComplete="username"
                maxLength={254}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? "admin-email-error" : undefined}
                className={emailError ? "border-destructive" : undefined}
                value={email}
                onBlur={() => {
                  if (email.trim()) setEmailBlurred(true);
                }}
                onChange={(event) => {
                  setEmail(event.target.value);
                  onCredentialsChange();
                }}
                required
              />
              {emailError && <p id="admin-email-error" className="text-xs text-destructive" aria-live="polite">{emailError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? "admin-password-error" : undefined}
                  className={`pr-10${passwordError ? " border-destructive" : ""}`}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    onCredentialsChange();
                  }}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </div>
              {passwordError && <p id="admin-password-error" className="text-xs text-destructive" aria-live="polite">{passwordError}</p>}
            </div>
            {serverError && (
              <p ref={serverErrorRef} tabIndex={-1} role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                {serverError}
              </p>
            )}
            <Button type="submit" className="mt-2 w-full gap-2" disabled={pending}>
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {pending ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
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
        <h1 className="text-xl font-semibold">{title}</h1>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const likesSection = searchParams.get("section") === "likes";
  const selectedLikePropertyIdValue = searchParams.get("propertyId");
  const parsedLikePropertyId = selectedLikePropertyIdValue && /^\d+$/.test(selectedLikePropertyIdValue)
    ? Number(selectedLikePropertyIdValue)
    : NaN;
  const selectedLikePropertyId = Number.isSafeInteger(parsedLikePropertyId) && parsedLikePropertyId > 0
    ? parsedLikePropertyId
    : null;
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [savingIds, setSavingIds] = useState<Set<number>>(() => new Set());

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

  const agentsQuery = useQuery({
    queryKey: ADMIN_AGENTS_QUERY_KEY,
    queryFn: () => getAdminAgents(supabaseClient!),
    enabled: Boolean(session?.access_token),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const propertyLikesQuery = useQuery({
    queryKey: ADMIN_PROPERTY_LIKES_QUERY_KEY,
    queryFn: () => getAdminPropertyLikeSummary(supabaseClient!),
    enabled: Boolean(session?.access_token && likesSection),
    retry: false,
    staleTime: 0,
    refetchInterval: likesSection ? 30_000 : false,
  });

  const propertyLikeHistoryQuery = useQuery({
    queryKey: [...ADMIN_PROPERTY_LIKE_HISTORY_QUERY_KEY, selectedLikePropertyId],
    queryFn: () => getAdminPropertyLikeHistory(supabaseClient!, selectedLikePropertyId!),
    enabled: Boolean(session?.access_token && likesSection && selectedLikePropertyId),
    retry: false,
    staleTime: 0,
    refetchInterval: likesSection && selectedLikePropertyId ? 30_000 : false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      if (!supabaseClient) throw new Error("Configuration Supabase manquante.");
      const { error } = await supabaseClient.auth.signInWithPassword(credentials);
      if (error) throw error;
    },
    onSuccess: () => setLoginError(null),
    onError: () => setLoginError("Connexion impossible. Vérifiez votre adresse email et votre mot de passe, puis réessayez. Si le problème persiste, vérifiez votre connexion internet."),
  });

  const logout = async () => {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      toast({ title: "Déconnexion impossible", description: "Réessayez dans un instant.", variant: "destructive" });
      return;
    }
    queryClient.removeQueries({ queryKey: ADMIN_PROPERTIES_QUERY_KEY });
    queryClient.removeQueries({ queryKey: ADMIN_AGENTS_QUERY_KEY });
    queryClient.removeQueries({ queryKey: ADMIN_PROPERTY_LIKES_QUERY_KEY });
    queryClient.removeQueries({ queryKey: ADMIN_PROPERTY_LIKE_HISTORY_QUERY_KEY });
    setLoginError(null);
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginMutation.isPending) return;
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (Object.keys(validateAdminLogin(email, password)).length > 0) return;
    setLoginError(null);
    loginMutation.mutate({ email, password });
  };

  const changeProperty = async (input: AdminPropertyUpdateInput) => {
    const current = propertiesQuery.data?.find((property) => property.id === input.id);
    if (!current || savingIds.has(input.id) || !supabaseClient) return;
    if (input.status === current.status) return;
    if (input.isFeatured === current.is_featured) return;
    if (input.isOnline === current.is_online) return;
    if ("agentId" in input && input.agentId === current.agent_id) return;

    const optimisticUpdate: Partial<AdminProperty> = {};
    if (input.status) {
      optimisticUpdate.status = input.status;
      optimisticUpdate.admin_status_override = input.status;
    }
    if (input.isFeatured !== undefined) optimisticUpdate.is_featured = input.isFeatured;
    if (input.isOnline !== undefined) optimisticUpdate.is_online = input.isOnline;
    if ("agentId" in input) optimisticUpdate.agent_id = input.agentId ?? null;

    setSavingIds((existing) => new Set(existing).add(input.id));
    queryClient.setQueryData<AdminProperty[]>(ADMIN_PROPERTIES_QUERY_KEY, (properties) =>
      properties?.map((property) => (property.id === input.id ? { ...property, ...optimisticUpdate } : property)),
    );

    try {
      const updated = await updateAdminProperty(supabaseClient, input);
      queryClient.setQueryData<AdminProperty[]>(ADMIN_PROPERTIES_QUERY_KEY, (properties) =>
        properties?.map((property) => (property.id === input.id ? { ...property, ...updated } : property)),
      );
      const title = input.status
        ? "Statut mis à jour"
        : input.isFeatured !== undefined
          ? "Favori mis à jour"
          : input.isOnline !== undefined
            ? "Visibilité mise à jour"
            : "Négociateur mis à jour";
      const description = input.status
        ? "Le nouveau statut est enregistré."
        : input.isFeatured !== undefined
          ? "La sélection de l’accueil est enregistrée."
          : input.isOnline !== undefined
            ? "La visibilité du bien est enregistrée."
            : "Le négociateur est enregistré.";
      toast({ title, description });
    } catch (error) {
      queryClient.setQueryData<AdminProperty[]>(ADMIN_PROPERTIES_QUERY_KEY, (properties) =>
        properties?.map((property) => (property.id === input.id ? { ...property, ...current } : property)),
      );
      const message = error instanceof Error ? error.message : "Impossible d’enregistrer cette modification.";
      toast({ title: "Enregistrement impossible", description: message, variant: "destructive" });
    } finally {
      setSavingIds((existing) => {
        const next = new Set(existing);
        next.delete(input.id);
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

  const counts = allProperties.reduce<Record<AdminManagedPropertyStatus, number>>((acc, property) => {
    acc[property.status] += 1;
    return acc;
  }, Object.fromEntries(ADMIN_PROPERTY_STATUS_OPTIONS.map(({ value }) => [value, 0])) as Record<AdminManagedPropertyStatus, number>);
  const propertyById = new Map(allProperties.map((property) => [property.id, property]));
  const propertyLikes = propertyLikesQuery.data ?? [];
  const totalActiveLikes = propertyLikes.reduce((sum, item) => sum + item.like_count, 0);
  const likeSummaryRows = propertyLikes
    .map((summary) => ({ summary, property: propertyById.get(summary.property_id) }))
    .filter((row): row is { summary: AdminPropertyLikeSummary; property: AdminProperty } => Boolean(row.property));
  const selectedLikeProperty = selectedLikePropertyId ? propertyById.get(selectedLikePropertyId) : undefined;
  const selectedLikeSummary = selectedLikePropertyId
    ? propertyLikes.find((item) => item.property_id === selectedLikePropertyId)
    : undefined;
  const likeHistory = propertyLikeHistoryQuery.data ?? [];
  const userEmail = session.user.email ?? "Administrateur";
  const adminAgents = agentsQuery.data ?? [];
  return (
    <motion.main
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="min-h-dvh bg-[hsl(var(--background))] text-foreground"
    >
      <div className="mx-auto min-h-dvh w-full max-w-[1680px]">
        <header className="flex min-h-[68px] items-center justify-between gap-3 border-b border-border/70 bg-card/75 px-4 sm:px-7 lg:px-10">
          <Link to="/" className="shrink-0" aria-label="Foch Immobilier, accueil">
            <img
              src="/images/foch-immobilier-logo-transparent.png"
              alt="Foch Immobilier"
              width={772}
              height={150}
              className="h-auto w-[110px] max-w-full object-contain sm:w-[150px]"
              decoding="async"
            />
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <a href="/biens" target="_blank" rel="noreferrer" aria-label="Voir le site" className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3">
              <span className="hidden sm:inline">Voir le site</span><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <LogoutConfirmationButton variant="outline" size="sm" onConfirm={logout} className="gap-2 px-2 sm:px-3">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="sm:hidden">Quitter</span>
              <span className="hidden sm:inline">Se déconnecter</span>
            </LogoutConfirmationButton>
          </div>
        </header>

        <nav aria-label="Administration" className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-card/40 px-4 py-2.5 sm:px-7 lg:px-10">
          <Link
            to="/admin"
            aria-current={!likesSection ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors ${!likesSection ? "bg-brand-soft text-brand-strong" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            <span>Annonces</span>
            <span className="text-xs tabular-nums opacity-70">{allProperties.length}</span>
          </Link>
          <Link
            to="/admin?section=likes"
            aria-current={likesSection ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors ${likesSection ? "bg-brand-soft text-brand-strong" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            <span>Historique des likes</span>
            <span className="text-xs tabular-nums opacity-70">{propertyLikes.length}</span>
          </Link>
        </nav>

          <div className="mx-auto w-full max-w-none px-4 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-10">
            {likesSection ? (
              <section aria-labelledby="admin-likes-title">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    {selectedLikePropertyId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mb-3 -ml-3 gap-2 text-muted-foreground"
                        onClick={() => setSearchParams({ section: "likes" })}
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Tous les biens aimés
                      </Button>
                    )}
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">Engagement des visiteurs</p>
                    <h1 id="admin-likes-title" className="mt-2 font-display text-4xl leading-none tracking-tight sm:text-[2.75rem]">
                      {selectedLikeProperty ? "Historique du bien" : "Historique des likes"}
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                      Retrouvez les biens les plus appréciés et consultez chaque ajout ou retrait avec son horodatage.
                    </p>
                  </div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    Connecté en tant que <span className="font-medium text-foreground">{userEmail}</span>
                  </p>
                </div>

                {!selectedLikePropertyId && (
                  <section aria-label="Synthèse des likes" className="mt-8 grid grid-cols-2 gap-y-5 border-y border-border/70 py-5 sm:grid-cols-3">
                    <SummaryItem label="Likes actifs" value={totalActiveLikes} />
                    <SummaryItem label="Biens concernés" value={propertyLikes.length} />
                  </section>
                )}

                {selectedLikePropertyId ? (
                  selectedLikeProperty ? (
                    <div className="mt-8">
                      <div className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                        <div className="min-w-0 flex-1">
                          <PropertyIdentity property={selectedLikeProperty} />
                          <p className="mt-3 text-xs text-muted-foreground">
                            {formatPropertyType(selectedLikeProperty.property_type)} · Vente · {formatPrice(selectedLikeProperty.price_amount, selectedLikeProperty.transaction_type)}
                          </p>
                        </div>
                        <div className="shrink-0 sm:text-right">
                          <p className="text-2xl font-semibold tabular-nums tracking-tight">{selectedLikeSummary?.like_count ?? 0}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            like{selectedLikeSummary?.like_count === 1 ? "" : "s"} actif{selectedLikeSummary?.like_count === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4 mt-8 flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold">Activité des visiteurs</h2>
                          <p className="mt-1 text-xs text-muted-foreground">Chaque ajout et retrait est horodaté à la seconde, heure de Paris.</p>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{likeHistory.length} événement{likeHistory.length === 1 ? "" : "s"}</span>
                      </div>

                      {propertyLikeHistoryQuery.isLoading ? (
                        <div className="grid min-h-48 place-items-center rounded-2xl border border-border/70 bg-card text-sm text-muted-foreground" role="status">
                          Chargement de l’historique…
                        </div>
                      ) : propertyLikeHistoryQuery.isError ? (
                        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive" role="alert">
                          <p>Impossible de charger l’historique de ce bien.</p>
                          <Button variant="outline" size="sm" className="mt-3" onClick={() => void propertyLikeHistoryQuery.refetch()}>Réessayer</Button>
                        </div>
                      ) : likeHistory.length === 0 ? (
                        <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-border bg-card/50 px-5 py-10 text-center">
                          <p className="text-sm font-medium">Aucune activité enregistrée pour ce bien.</p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[620px] border-collapse text-left">
                              <thead>
                                <tr className="border-b border-border/70 bg-secondary/35 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  <th scope="col" className="px-5 py-3.5">Action</th>
                                  <th scope="col" className="px-5 py-3.5">Date et heure</th>
                                  <th scope="col" className="px-5 py-3.5">Visiteur</th>
                                </tr>
                              </thead>
                              <tbody>
                                {likeHistory.map((event) => (
                                  <tr key={event.id} className="border-b border-border/50 last:border-b-0">
                                    <td className="px-5 py-4">
                                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${event.action === "like" ? "bg-brand-soft text-brand-strong" : "bg-secondary text-muted-foreground"}`}>
                                        {event.action === "like" ? "Like ajouté" : "Like retiré"}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4 text-sm tabular-nums">{formatDateTime(event.occurred_at)}</td>
                                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{visitorLabel(event.visitor_id)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive" role="alert">
                      Ce bien n’est pas présent dans l’inventaire actuel.
                    </div>
                  )
                ) : (
                  <div className="mt-8">
                    <div className="mb-4">
                      <h2 className="text-base font-semibold">Biens appréciés</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Le total correspond aux visiteurs ayant actuellement aimé chaque bien.</p>
                    </div>

                    {propertyLikesQuery.isLoading ? (
                      <div className="grid min-h-48 place-items-center rounded-2xl border border-border/70 bg-card text-sm text-muted-foreground" role="status">
                        Chargement des likes…
                      </div>
                    ) : propertyLikesQuery.isError ? (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive" role="alert">
                        <p>Impossible de charger les likes.</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => void propertyLikesQuery.refetch()}>Réessayer</Button>
                      </div>
                    ) : likeSummaryRows.length === 0 ? (
                      <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-border bg-card/50 px-5 py-10 text-center">
                        <div>
                          <Heart className="mx-auto h-6 w-6 text-brand" aria-hidden="true" />
                          <h3 className="mt-3 text-sm font-semibold">Aucun like enregistré</h3>
                          <p className="mt-1 text-xs text-muted-foreground">Les biens apparaîtront ici dès qu’un visiteur cliquera sur un cœur.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
                        {likeSummaryRows.map(({ summary, property }) => (
                          <article key={property.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                            <div className="min-w-0 flex-1">
                              <PropertyIdentity property={property} />
                              <p className="mt-3 text-xs text-muted-foreground">
                                {formatPropertyType(property.property_type)} · Vente · {formatPrice(property.price_amount, property.transaction_type)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-5 sm:justify-end">
                              <div className="sm:text-right">
                                <p className="text-xl font-semibold tabular-nums">{summary.like_count} like{summary.like_count === 1 ? "" : "s"}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Dernier like · {formatDateTime(summary.latest_liked_at)}</p>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => setSearchParams({ section: "likes", propertyId: String(property.id) })}>
                                Voir l’historique
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            ) : (
              <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">Inventaire immobilier</p>
                <h1 className="mt-2 font-display text-4xl leading-none tracking-tight sm:text-[2.75rem]">Annonces</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  Gérez les favoris, la visibilité, le négociateur et le statut de chaque bien.
                </p>
              </div>
              <p className="mb-1 text-xs text-muted-foreground">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Connecté en tant que <span className="font-medium text-foreground">{userEmail}</span>
              </p>
            </div>

            <section aria-label="Synthèse des annonces" className="mt-8 grid grid-cols-2 gap-y-5 border-y border-border/70 py-5 sm:grid-cols-3 lg:grid-cols-6">
              <SummaryItem label="Toutes" value={allProperties.length} />
              <SummaryItem label="Favoris" value={allProperties.filter((property) => property.is_featured).length} />
              <SummaryItem label="En ligne" value={allProperties.filter((property) => property.is_online).length} />
              <SummaryItem label="Sous offre" value={counts.under_offer} />
              <SummaryItem label="Sous compromis" value={counts.under_contract} />
              <SummaryItem label="Vendus" value={counts.sold} />
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
                      <table className="w-full min-w-[1320px] border-collapse text-left">
                        <thead>
                          <tr className="border-b border-border/70 bg-secondary/35 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            <th scope="col" className="px-5 py-3.5">Bien immobilier</th>
                            <th scope="col" className="w-[180px] px-3 py-3.5">Statut</th>
                            <th scope="col" className="px-4 py-3.5">Type</th>
                            <th scope="col" className="px-4 py-3.5 text-right">Prix</th>
                            <th scope="col" className="px-3 py-3.5 text-center">Favoris</th>
                            <th scope="col" className="px-3 py-3.5 text-center">En ligne</th>
                            <th scope="col" className="px-4 py-3.5">Négociateur</th>
                            <th scope="col" className="px-4 py-3.5">Mis à jour</th>
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
                                <td className="px-3 py-3.5">
                                  <StatusControl
                                    property={property}
                                    value={property.status}
                                    saving={savingIds.has(property.id)}
                                    onChange={(propertyId, status) => void changeProperty({ id: propertyId, status })}
                                  />
                                </td>
                                <td className="px-4 py-3.5">
                                  <p className="text-xs font-medium">{formatPropertyType(property.property_type)}</p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">Vente</p>
                                </td>
                                <td className="px-4 py-3.5 text-right"><PropertyPrice property={property} align="end" /></td>
                                <td className="px-3 py-3.5 text-center">
                                  <PropertyFlagControl
                                    property={property}
                                    kind="favorite"
                                    checked={property.is_featured}
                                    saving={savingIds.has(property.id)}
                                    onChange={(isFeatured) => void changeProperty({ id: property.id, isFeatured })}
                                  />
                                </td>
                                <td className="px-3 py-3.5 text-center">
                                  <PropertyFlagControl
                                    property={property}
                                    kind="online"
                                    checked={property.is_online}
                                    saving={savingIds.has(property.id)}
                                    onChange={(isOnline) => void changeProperty({ id: property.id, isOnline })}
                                  />
                                </td>
                                <td className="px-4 py-3.5">
                                  <PropertyAgentControl
                                    property={property}
                                    agents={adminAgents}
                                    saving={savingIds.has(property.id)}
                                    onChange={(agentId) => void changeProperty({ id: property.id, agentId })}
                                  />
                                </td>
                                <td className="px-4 py-3.5 text-xs text-muted-foreground">{formatDate(property.updated_at)}</td>
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
                            <p className="mt-1 text-xs text-muted-foreground">{formatPropertyType(property.property_type)} · Vente</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{formatDate(property.updated_at)}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-[11px] text-muted-foreground">Statut</span>
                          <StatusControl
                            property={property}
                            value={property.status}
                            saving={savingIds.has(property.id)}
                            onChange={(propertyId, status) => void changeProperty({ id: propertyId, status })}
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                            <span className="text-xs">Favoris</span>
                            <PropertyFlagControl
                              property={property}
                              kind="favorite"
                              checked={property.is_featured}
                              saving={savingIds.has(property.id)}
                              onChange={(isFeatured) => void changeProperty({ id: property.id, isFeatured })}
                            />
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                            <span className="text-xs">En ligne</span>
                            <PropertyFlagControl
                              property={property}
                              kind="online"
                              checked={property.is_online}
                              saving={savingIds.has(property.id)}
                              onChange={(isOnline) => void changeProperty({ id: property.id, isOnline })}
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-[11px] text-muted-foreground">Négociateur</span>
                          <PropertyAgentControl
                            property={property}
                            agents={adminAgents}
                            saving={savingIds.has(property.id)}
                            onChange={(agentId) => void changeProperty({ id: property.id, agentId })}
                          />
                        </div>
                      </motion.article>
                    ))}
                  </div>
                </>
              )}

              <p className="mt-4 flex items-center gap-2 text-[11px] leading-5 text-muted-foreground">
                <Check className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                Les modifications sont enregistrées automatiquement et appliquées aux pages publiques.
              </p>
            </section>
              </>
            )}
          </div>
      </div>
    </motion.main>
  );
}
