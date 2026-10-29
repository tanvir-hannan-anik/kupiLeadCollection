import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminSession = NonNullable<Awaited<ReturnType<typeof getAdmin>>>;

/**
 * Returns the signed-in admin, or null. The JWT proves who they are; we then
 * confirm they are still on the `admins` list (removing an admin, or clearing
 * their password, revokes access immediately).
 *
 * `supabase` is a server-only service-role client — every caller must have
 * gone through this check first.
 */
export async function getAdmin() {
  await connection(); // token expiry uses the current time: always per request
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const email = await verifySession(token);
  if (!email) return null;

  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("admins")
    .select("email, password_hash")
    .eq("email", email)
    .maybeSingle();
  if (!data?.password_hash) return null;

  return { email, supabase };
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login?error=unauthorized");
  return admin;
}
