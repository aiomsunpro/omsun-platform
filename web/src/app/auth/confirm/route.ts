import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Links in Supabase emails (password reset, email confirmation) land here.
// The one-time code is swapped for a session, then the user goes on to `next`.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = params.get("next");

  const supabase = await createClient();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { data: { session: null }, error: new Error("missing code") };

  // Without an explicit `next`, a reset link goes to the new-password page.
  const fallback = type === "recovery" || isRecovery(data.session?.access_token) ? "/reset-password" : "/admin";
  const target = next ?? fallback;
  const safeNext = target.startsWith("/") && !target.startsWith("//") ? target : "/admin";

  const url = request.nextUrl.clone();
  url.search = "";
  if (error) {
    url.pathname = "/forgot-password";
    url.searchParams.set("error", "link");
  } else {
    url.pathname = safeNext;
  }
  return NextResponse.redirect(url);
}

/** True when the session came from a password-reset link (the token's "amr" says "recovery"). */
function isRecovery(accessToken?: string) {
  if (!accessToken) return false;
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString());
    return Array.isArray(payload.amr) && payload.amr.some((a: { method?: string }) => a.method === "recovery");
  } catch {
    return false;
  }
}
