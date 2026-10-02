import type { Session } from "@supabase/supabase-js";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "./i18n";
import { errorText, supabase } from "./supabase";
import type { Lang, Profile, Retailer } from "./types";

type Auth = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  retailer: Retailer | null;
  /** Set when the profile could not be loaded (usually no internet). */
  loadError: string | null;
  /** Reloads the profile and retailer rows (after registering, or to check approval). */
  refresh: () => Promise<void>;
  setLanguage: (l: Lang) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setLang } = useI18n();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const loadedFor = useRef<string | null>(null);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(
    async (s: Session | null) => {
      if (!s) {
        setProfile(null);
        setRetailer(null);
        loadedFor.current = null;
        setLoadedUid(null);
        return;
      }
      const uid = s.user.id;
      const [{ data: p, error: pe }, { data: r, error: re }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, mobile, email, role, preferred_language, is_active")
          .eq("id", uid)
          .maybeSingle(),
        supabase.from("retailers").select("*").eq("profile_id", uid).maybeSingle(),
      ]);
      setLoadError(pe || re ? errorText(pe ?? re) : null);
      setProfile((p as Profile) ?? null);
      setRetailer((r as Retailer) ?? null);
      // Use the language saved on the profile the first time this login loads.
      if (p && loadedFor.current !== uid) setLang((p as Profile).preferred_language);
      loadedFor.current = uid;
      setLoadedUid(uid);
    },
    [setLang],
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await load(data.session).catch(() => {});
      if (active) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Run outside the auth callback, as supabase-js recommends.
        setTimeout(() => load(s).catch(() => {}), 0);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await load(data.session);
  }, [load]);

  const setLanguage = useCallback(
    async (l: Lang) => {
      setLang(l);
      if (profile) {
        setProfile({ ...profile, preferred_language: l });
        await supabase.from("profiles").update({ preferred_language: l }).eq("id", profile.id);
      }
    },
    [profile, setLang],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        // Not ready while a fresh login's profile is still loading.
        ready: ready && (!session || loadedUid === session.user.id),
        session,
        profile,
        retailer,
        loadError,
        refresh,
        setLanguage,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
