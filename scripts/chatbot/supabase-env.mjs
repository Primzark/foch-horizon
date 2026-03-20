const HOSTED_PROJECT_REF_RE = /^[a-z0-9-]+$/i;
const HOSTED_SUPABASE_DOMAIN_RE = /^[a-z0-9-]+\.supabase\.co$/i;
const INVALID_SUPABASE_URL_MESSAGE =
  "Invalid SUPABASE_URL. Use an HTTP(S) URL like https://<project-ref>.supabase.co, or provide the hosted Supabase project ref/domain.";
const MISSING_SUPABASE_URL_MESSAGE = "Missing SUPABASE_URL (or VITE_SUPABASE_PROJECT_URL).";
const MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE = "Missing SUPABASE_SERVICE_ROLE_KEY.";

function trimEnvValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function listSupabaseUrlCandidates(env) {
  return [trimEnvValue(env.SUPABASE_URL), trimEnvValue(env.VITE_SUPABASE_PROJECT_URL)].filter(Boolean);
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeSupabaseUrlInput(value) {
  const trimmed = trimEnvValue(value);
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, "");
  }

  if (HOSTED_SUPABASE_DOMAIN_RE.test(trimmed)) {
    return `https://${trimmed}`;
  }

  if (HOSTED_PROJECT_REF_RE.test(trimmed)) {
    return `https://${trimmed}.supabase.co`;
  }

  return trimmed;
}

export function resolveSupabaseUrl(env = process.env) {
  for (const candidate of listSupabaseUrlCandidates(env)) {
    const normalized = normalizeSupabaseUrlInput(candidate);
    if (isValidHttpUrl(normalized)) {
      return normalized.replace(/\/$/, "");
    }
  }

  return "";
}

export function resolveRequiredSupabaseServiceRoleConfig(env = process.env) {
  const supabaseUrl = resolveSupabaseUrl(env);
  const serviceRoleKey = trimEnvValue(env.SUPABASE_SERVICE_ROLE_KEY);

  if (!listSupabaseUrlCandidates(env).length) {
    throw new Error(MISSING_SUPABASE_URL_MESSAGE);
  }
  if (!supabaseUrl) {
    throw new Error(INVALID_SUPABASE_URL_MESSAGE);
  }
  if (!serviceRoleKey) {
    throw new Error(MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE);
  }

  return { supabaseUrl, serviceRoleKey };
}

export function resolveOptionalSupabaseServiceRoleConfig(env = process.env) {
  const hasSupabaseUrl = listSupabaseUrlCandidates(env).length > 0;
  const hasServiceRoleKey = Boolean(trimEnvValue(env.SUPABASE_SERVICE_ROLE_KEY));

  if (!hasSupabaseUrl && !hasServiceRoleKey) {
    return { enabled: false, supabaseUrl: "", serviceRoleKey: "" };
  }

  const { supabaseUrl, serviceRoleKey } = resolveRequiredSupabaseServiceRoleConfig(env);
  return { enabled: true, supabaseUrl, serviceRoleKey };
}
