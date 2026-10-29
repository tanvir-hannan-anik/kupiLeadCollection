import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client for the admin dashboard (realtime subscriptions).
 * Uses the public anon key + the signed-in admin's session cookie, so Row
 * Level Security decides which rows (and realtime events) it can see.
 */
export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey);
}
