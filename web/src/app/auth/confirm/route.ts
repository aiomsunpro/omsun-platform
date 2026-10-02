import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Links in Supabase emails (password reset, email confirmation) land here.
// The one-time code is swapped for a session, then the user goes on to `next`.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = params.get("next") ?? "/admin";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  const supabase = await createClient();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };

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
