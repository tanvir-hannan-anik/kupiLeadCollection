import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

/** Landing point for the magic link in the admin sign-in email. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get("next") ?? "";
  const destination = /^\/admin(\/|$)/.test(next) ? next : "/admin/leads";
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/admin/login?error=${reason}`, origin));

  const supabase = await createSessionClient();
  if (!supabase) return fail("not_configured");

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };

  if (error) return fail("link_expired");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return fail("unauthorized");
  }

  return NextResponse.redirect(new URL(destination, origin));
}
