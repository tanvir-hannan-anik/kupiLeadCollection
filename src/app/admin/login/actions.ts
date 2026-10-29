"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/rate-limit";
import { createSessionClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type LoginState = {
  step: "email" | "code";
  email?: string;
  message?: string;
  error?: string;
};

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

/**
 * Where the sign-in link should bring the admin back to: the site they are
 * actually using (localhost, a Vercel preview or production). This is safe to
 * take from the request because Supabase only honours redirect URLs on its
 * allow-list (Authentication → URL Configuration). NEXT_PUBLIC_APP_URL is only
 * a fallback, so a leftover "http://localhost:3000" can't break production.
 */
async function appOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

const safeNext = (next: unknown) =>
  typeof next === "string" && /^\/admin(\/|$)/.test(next) ? next : "/admin/leads";

/** Single entry point for the two-step sign-in form. */
export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  switch (formData.get("intent")) {
    case "verify":
      return verifyLoginCode(formData);
    case "restart":
      return { step: "email", email: prev.email };
    default:
      return sendLoginCode(formData);
  }
}

async function sendLoginCode(formData: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { step: "email", error: "Enter a valid email address." };
  const email = parsed.data;

  const service = createServiceClient();
  const supabase = await createSessionClient();
  if (!service || !supabase) {
    return { step: "email", error: "Admin sign-in isn't configured yet. See README → Setup." };
  }

  const allowed = await checkRateLimit(
    service,
    rateLimitKey("login", clientIp(await headers())),
    { limit: 5, windowSeconds: 15 * 60 },
  );
  if (!allowed) return { step: "email", error: "Too many attempts. Please wait 15 minutes." };

  // Only allow-listed admins get an email. We answer the same way either way,
  // so this form can't be used to discover who the admins are.
  const { data: admin } = await service.from("admins").select("email").eq("email", email).maybeSingle();
  if (admin) {
    const next = safeNext(formData.get("next"));
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${await appOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      console.error("[admin-login] signInWithOtp failed", error.message);
      return { step: "email", error: "We couldn't send the sign-in email. Please try again shortly." };
    }
  }

  return {
    step: "code",
    email,
    message: "If this email belongs to an admin, a sign-in link and code are on the way.",
  };
}

async function verifyLoginCode(formData: FormData): Promise<LoginState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");
  if (!email.success) return { step: "email", error: "Start again with your email." };
  if (!/^\d{6,10}$/.test(token)) {
    return { step: "code", email: email.data, error: "Enter the code from the email." };
  }

  const supabase = await createSessionClient();
  if (!supabase) return { step: "email", error: "Admin sign-in isn't configured yet." };

  const { error } = await supabase.auth.verifyOtp({ email: email.data, token, type: "email" });
  if (error) {
    return { step: "code", email: email.data, error: "That code is invalid or has expired." };
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { step: "email", error: "This account doesn't have admin access." };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}
