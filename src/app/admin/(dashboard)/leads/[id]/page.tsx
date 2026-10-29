import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { contactMethodLabel, interestLabel } from "@/config/lead-form";
import { FollowUpComposer } from "@/components/admin/follow-up-composer";
import { NoteForm } from "@/components/admin/note-form";
import { StatusSelect } from "@/components/admin/status-select";
import { site } from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { emailProvider } from "@/lib/email";
import { templateKeyFor } from "@/lib/follow-up";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Dhaka",
});

export default function LeadDetailPage(props: PageProps<"/admin/leads/[id]">) {
  return (
    <>
      <Link href="/admin/leads" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ash hover:text-night">
        ← All leads
      </Link>
      <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-2xl bg-sand" aria-label="Loading lead" />}>
        <LeadDetail {...props} />
      </Suspense>
    </>
  );
}

async function LeadDetail({ params }: PageProps<"/admin/leads/[id]">) {
  const { supabase, email: adminEmail } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [leadRes, notesRes, emailsRes] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    supabase.from("lead_notes").select("id, author_email, body, created_at").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("lead_emails").select("id, sent_by, subject, status, error, created_at").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);
  const lead = leadRes.data;
  if (!lead) notFound();
  const notes = notesRes.data ?? [];
  const emails = emailsRes.data ?? [];
  const provider = emailProvider();
  const waNumber = String(lead.phone).replace(/\D/g, "");

  const details: [string, React.ReactNode][] = [
    ["Interested in", interestLabel(lead.interest)],
    ["City / Location", lead.city ?? "—"],
    ["Preferred contact", contactMethodLabel(lead.preferred_contact_method)],
    ["Received", dateFmt.format(new Date(lead.created_at))],
    ["Last updated", dateFmt.format(new Date(lead.updated_at))],
    ["Source", lead.source ?? "—"],
    [
      "Campaign (UTM)",
      lead.utm_source || lead.utm_medium || lead.utm_campaign
        ? [lead.utm_source, lead.utm_medium, lead.utm_campaign].map((v) => v ?? "—").join(" / ")
        : "—",
    ],
  ];

  const action =
    "inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-paper-edge bg-white px-4 text-sm font-semibold text-night transition hover:border-night focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">
      <article className="rounded-2xl border border-paper-edge bg-white">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-edge p-5 sm:p-6">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-extrabold break-words text-night">{lead.full_name}</h1>
            <p className="mt-1 break-all text-ink-soft">{lead.email}</p>
            <p className="font-mono text-sm text-ash">{lead.phone}</p>
          </div>
          <StatusSelect key={lead.status} leadId={lead.id} status={lead.status} label="Lead status" size="md" />
        </header>

        <div className="flex flex-wrap gap-2 border-b border-paper-edge px-5 py-3 sm:px-6">
          <a href={`mailto:${lead.email}`} className={action}>Email</a>
          <a href={`tel:${lead.phone}`} className={action}>Call</a>
          <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className={action}>WhatsApp ↗</a>
        </div>

        <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 sm:p-6">
          {details.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ash">{k}</dt>
              <dd className="mt-0.5 break-words text-ink">{v}</dd>
            </div>
          ))}
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ash">Message</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-paper p-3 text-ink">
              {lead.message || <span className="text-ash">No message provided.</span>}
            </dd>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-kolapata/25 bg-kolapata-soft/60 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wider text-kolapata">Consent evidence</dt>
            <dd className="mt-1 text-sm text-ink-soft">
              {lead.consent_given ? "Given" : "Not given"} on{" "}
              <time dateTime={lead.consent_timestamp}>{dateFmt.format(new Date(lead.consent_timestamp))}</time>
              <blockquote className="mt-1 border-l-2 border-kolapata/40 pl-2 italic">“{lead.consent_text}”</blockquote>
            </dd>
          </div>
        </dl>
      </article>

      <section aria-labelledby="follow-up-heading" className="rounded-2xl border border-paper-edge bg-white p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="follow-up-heading" className="font-display text-xl font-bold text-night">Follow-up email</h2>
          <p className="text-xs text-ash">Pre-written for <strong>{interestLabel(lead.interest)}</strong> — edit anything before sending.</p>
        </div>
        {lead.consent_given ? (
          <FollowUpComposer
            leadId={lead.id}
            leadEmail={lead.email}
            lead={{ full_name: lead.full_name, interest: lead.interest, city: lead.city, message: lead.message, created_at: lead.created_at }}
            initialTemplate={templateKeyFor(lead.interest)}
            sender={adminEmail}
            links={{ siteUrl: site.mainUrl, signupUrl: `${site.mainUrl}/signup` }}
            provider={provider === "smtp" ? "SMTP" : provider === "resend" ? "Resend" : null}
          />
        ) : (
          <p className="rounded-xl bg-shapla-soft p-4 text-sm text-shapla-ink">This lead didn&apos;t consent to be contacted, so follow-up emails are disabled.</p>
        )}

        {emails.length > 0 ? (
          <div className="mt-6 border-t border-paper-edge pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ash">Emails sent ({emails.length})</h3>
            <ol className="flex flex-col gap-2">
              {emails.map((m) => (
                <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-paper/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{m.subject}</p>
                    <p className="text-xs text-ash"><span className="font-mono">{m.sent_by}</span> · {dateFmt.format(new Date(m.created_at))}</p>
                    {m.status === "failed" && m.error ? <p className="mt-0.5 text-xs text-shapla-ink">{m.error}</p> : null}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.status === "sent" ? "bg-kolapata-soft text-kolapata" : "bg-shapla-soft text-shapla-ink"}`}>
                    {m.status === "sent" ? "Sent" : "Failed"}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>
      </div>

      <aside aria-labelledby="notes-heading" className="flex flex-col gap-4 rounded-2xl border border-paper-edge bg-white p-5 sm:p-6">
        <h2 id="notes-heading" className="font-display text-xl font-bold text-night">Follow-up notes</h2>
        <NoteForm leadId={lead.id} />
        {notes.length === 0 ? (
          <p className="rounded-xl bg-paper p-4 text-sm text-ash">No notes yet. Notes are internal and never shown to the visitor.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-paper-edge bg-paper/60 p-3">
                <p className="whitespace-pre-wrap break-words text-sm text-ink">{n.body}</p>
                <p className="mt-2 text-xs text-ash">
                  <span className="font-mono">{n.author_email}</span> · {dateFmt.format(new Date(n.created_at))}
                </p>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}
