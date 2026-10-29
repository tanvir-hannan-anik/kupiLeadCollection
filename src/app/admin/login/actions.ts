"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/rate-limit";
import { isSessionConfigured, SESSION_COOKIE } from "@/lib/session";
import { setSessionCookie } from "@/lib/session-cookie";
import { createServiceClient } from "@/lib/supabase/service";

export type LoginState = { error?: string; email?: string };

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});

const GENERIC_ERROR = "Incorrect email or password.";

// Used when the email isn't an admin, so a wrong email takes as long as a
// wrong password (no timing hint about who the admins are).
const DUMMY_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

const safeNext = (next: unknown) =>
  typeof next === "string" && /^\/admin(\/|$)/.test(next) && !next.startsWith("/admin/login") ? next : "/admin/leads";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const typedEmail = String(formData.get("email") ?? "").slice(0, 254);
  if (!parsed.success) return { error: "Enter your email and password.", email: typedEmail };
  const { email, password } = parsed.data;

  const db = createServiceClient();
  if (!db || !isSessionConfigured()) {
    return { error: "Admin sign-in isn't configured yet (see README → Setup).", email };
  }

  // Throttle guessing: per IP and per account.
  const ip = clientIp(await headers());
  const window = { limit: 10, windowSeconds: 15 * 60 };
  const [ipOk, accountOk] = await Promise.all([
    checkRateLimit(db, rateLimitKey("login-ip", ip), window),
    checkRateLimit(db, rateLimitKey("login-account", email), window),
  ]);
  if (!ipOk || !accountOk) return { error: "Too many attempts. Please wait 15 minutes and try again.", email };

  const { data: admin } = await db
    .from("admins")
    .select("email, password_hash, session_version")
    .eq("email", email)
    .maybeSingle();
  const valid = await verifyPassword(password, admin?.password_hash ?? DUMMY_HASH);
  if (!admin?.password_hash || !valid) return { error: GENERIC_ERROR, email };

  await setSessionCookie(email, admin.session_version);
  redirect(safeNext(formData.get("next")));
}

/** Signs out everywhere: bumping the version invalidates every issued token. */
export async function signOut() {
  const admin = await getAdmin();
  if (admin) {
    await admin.supabase
      .from("admins")
      .update({ session_version: admin.sessionVersion + 1 })
      .eq("email", admin.email);
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
