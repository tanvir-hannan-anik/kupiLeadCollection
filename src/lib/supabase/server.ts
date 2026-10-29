import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabasePublicEnv } from "./env";

/**
 * Per-request client acting as the signed-in user. Queries made through it are
 * subject to Row Level Security, so only admins can read or change leads.
 */
export async function createSessionClient() {
  // Auth checks session expiry with Date.now(), so this must run per request —
  // never during (runtime) prerendering.
  await connection();
  const env = supabasePublicEnv();
  if (!env) return null;
  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
