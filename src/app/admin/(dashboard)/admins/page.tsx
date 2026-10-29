import { Suspense } from "react";
import { AddAdminForm } from "@/components/admin/add-admin-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { requireAdmin } from "@/lib/auth";
import { removeAdmin } from "../actions";

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Dhaka" });

export default function AdminsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ember">Access</p>
      <h1 className="font-display text-3xl font-extrabold text-night">Administrators</h1>
      <p className="mt-1 text-sm text-ash">
        People on this list can sign in to the dashboard and view, update and export leads.
      </p>
      <Suspense fallback={<div className="mt-6 h-72 animate-pulse rounded-2xl bg-sand" />}>
        <AdminList />
      </Suspense>
    </div>
  );
}

async function AdminList() {
  const { supabase, email: me } = await requireAdmin();
  const { data: admins, error } = await supabase
    .from("admins")
    .select("email, added_by, created_at, password_hash")
    .order("created_at", { ascending: true });

  return (
    <div className="mt-6 flex flex-col gap-6">
      <section aria-labelledby="add-admin" className="rounded-2xl border border-paper-edge bg-white p-5">
        <h2 id="add-admin" className="font-display text-lg font-bold text-night">Add an admin or set a password</h2>
        <p className="mb-3 text-sm text-ash">Enter a new email to add an admin, or an existing admin&apos;s email to give them a new password. They sign in at /admin/login.</p>
        <AddAdminForm />
      </section>

      <section aria-labelledby="admin-list" className="overflow-hidden rounded-2xl border border-paper-edge bg-white">
        <h2 id="admin-list" className="border-b border-paper-edge px-5 py-3 text-sm font-semibold text-ink-soft">
          {admins?.length ?? 0} administrator{admins?.length === 1 ? "" : "s"}
        </h2>
        {error ? (
          <p role="alert" className="p-5 text-shapla-ink">Couldn&apos;t load administrators.</p>
        ) : (
          <ul className="divide-y divide-paper-edge/70">
            {admins?.map((a) => (
              <li key={a.email} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="break-all font-mono text-sm text-night">
                    {a.email}
                    {a.email === me ? <span className="ml-2 rounded-full bg-flame-soft px-2 py-0.5 font-sans text-xs font-semibold text-ember-ink">You</span> : null}
                    {!a.password_hash ? <span className="ml-2 rounded-full bg-sand px-2 py-0.5 font-sans text-xs font-semibold text-ash">No password yet</span> : null}
                  </p>
                  <p className="text-xs text-ash">
                    Added {dateFmt.format(new Date(a.created_at))}
                    {a.added_by && a.added_by !== "seed" ? ` by ${a.added_by}` : ""}
                  </p>
                </div>
                {a.email !== me ? (
                  <form action={removeAdmin}>
                    <input type="hidden" name="email" value={a.email} />
                    <SubmitButton variant="danger" pendingLabel="Removing…" className="h-8 px-3 text-xs">
                      Remove<span className="sr-only">&nbsp;{a.email}</span>
                    </SubmitButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
