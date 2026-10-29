import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses Row Level Security.
 * Only ever used on the server for public lead inserts, rate limiting and the
 * admin allow-list check before sending a login email. Never import this from
 * a client component — the `server-only` import above makes that a build error.
 */
export function createServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
