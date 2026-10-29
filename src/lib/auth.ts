import "server-only";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

export type AdminSession = NonNullable<Awaited<ReturnType<typeof getAdmin>>>;

/**
 * Returns the signed-in admin, or null when there is no session or the user is
 * not on the `admins` allow-list. The allow-list check runs in Postgres
 * (`is_admin()`), the same function the RLS policies use.
 */
export async function getAdmin() {
  const supabase = await createSessionClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser(); // verified with Supabase Auth, not just the cookie
  if (!user?.email) return null;

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return null;

  return { email: user.email.toLowerCase(), supabase };
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login?error=unauthorized");
  return admin;
}
