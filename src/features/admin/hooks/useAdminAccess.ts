import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

export function useAdminAccess(): boolean {
  const supabase = getBrowserSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(!supabase);
  const [authorizedAccessToken, setAuthorizedAccessToken] = useState<string | null>(null);
  const currentAccessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setSessionReady(true);
      setAuthorizedAccessToken(null);
      currentAccessTokenRef.current = null;
      return;
    }

    let active = true;
    let authEventRevision = 0;

    const applySession = (nextSession: Session | null) => {
      const nextAccessToken = nextSession?.access_token ?? null;
      if (currentAccessTokenRef.current !== nextAccessToken) {
        currentAccessTokenRef.current = nextAccessToken;
        setAuthorizedAccessToken(null);
      }
      setSession(nextSession);
      setSessionReady(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventRevision += 1;
      if (active) applySession(nextSession);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || authEventRevision > 0) return;
      applySession(error ? null : data.session);
    }).catch(() => {
      if (!active || authEventRevision > 0) return;
      applySession(null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const accessToken = session?.access_token;
    if (!supabase || !sessionReady || !accessToken) {
      setAuthorizedAccessToken(null);
      return;
    }

    let active = true;
    void supabase.functions.invoke<{ authorized?: boolean }>("admin-properties?check=admin-access", {
      method: "GET",
    }).then(({ data, error }) => {
      if (active) setAuthorizedAccessToken(!error && data?.authorized === true ? accessToken : null);
    }).catch(() => {
      if (active) setAuthorizedAccessToken(null);
    });

    return () => {
      active = false;
    };
  }, [session?.access_token, sessionReady, supabase]);

  return Boolean(session?.access_token && authorizedAccessToken === session.access_token);
}
