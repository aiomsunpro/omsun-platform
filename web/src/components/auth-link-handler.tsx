"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect } from "react";

// Reset and sign-up links requested from the OMSUN Mitra app arrive with the
// session in the address after "#", which the server never sees. Save it as
// the site's login cookie, then open the right page.
export function AuthLinkHandler() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // An expired or already-used link comes back as #error=…
    if (hash.get("error_code") || hash.get("error")) {
      window.location.replace("/forgot-password?error=link");
      return;
    }
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (!access_token || !refresh_token) return;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) window.location.replace("/forgot-password?error=link");
      else window.location.replace(hash.get("type") === "recovery" ? "/reset-password" : "/login?confirmed=1");
    });
  }, []);
  return null;
}
