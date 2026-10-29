import Link from "next/link";
import { Suspense } from "react";
import { INTEREST_OPTIONS, LEAD_STATUSES, interestLabel } from "@/config/lead-form";
import { StatusSelect } from "@/components/admin/status-select";
import { inputClass, selectClass } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth";
import { applyLeadFilters, filtersToQuery, PAGE_SIZE, parseLeadFilters, type LeadFilters } from "@/lib/leads/filters";

type Stats = { total: number; new: number; contacted: number; interested: number; converted: number; closed: number };

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Dhaka",
});

export default function LeadsPage(props: PageProps<"/admin/leads">) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ember">Dashboard</p>
          <h1 className="font-display text-3xl font-extrabold text-night">Leads</h1>
        </div>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <LeadsDashboard {...props} />
      </Suspense>
    </>
  );
}

async function LeadsDashboard({ searchParams }: PageProps<"/admin/leads">) {
  const { supabase } = await requireAdmin();
  const filters = parseLeadFilters(await searchParams);
  const fromRow = (filters.page - 1) * PAGE_SIZE;

  const listQuery = applyLeadFilters(
    supabase
      .from("leads")
      .select("id, full_name, email, phone, interest, status, city, created_at", { count: "exact" }),
    filters,
  )
    .order("created_at", { ascending: false })
    .range(fromRow, fromRow + PAGE_SIZE - 1);

  const [statsRes, listRes] = await Promise.all([supabase.rpc("lead_stats").single<Stats>(), listQuery]);

  if (listRes.error) {
    console.error("[admin] lead list failed", listRes.error.message);
    return (
      <p role="alert" className="rounded-2xl border border-shapla/30 bg-shapla-soft p-5 text-shapla-ink">
        We couldn&apos;t load leads right now. Please refresh the page.
      </p>
    );
  }

  const stats = statsRes.data;
  const leads = listRes.data ?? [];
  const total = listRes.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(filters.q || filters.status || filters.interest || filters.from || filters.to);

  const cards = [
    { label: "Total Leads", value: stats?.total, status: "" as const, accent: "bg-night text-paper" },
    { label: "New", value: stats?.new, status: "New" as const, accent: "bg-padma-soft text-padma-ink" },
    { label: "Contacted", value: stats?.contacted, status: "Contacted" as const, accent: "bg-flame-soft text-ember-ink" },
    { label: "Interested", value: stats?.interested, status: "Interested" as const, accent: "bg-shapla-soft text-shapla-ink" },
    { label: "Converted", value: stats?.converted, status: "Converted" as const, accent: "bg-kolapata-soft text-kolapata" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c, i) => {
          const active = filters.status === c.status && (c.status !== "" || !filters.status);
          return (
            <li key={c.label} className={i === 0 ? "col-span-2 sm:col-span-1" : ""}>
              <Link
                href={`/admin/leads${filtersToQuery({ ...filters, status: c.status }, { page: 1 })}`}
                aria-current={active ? "true" : undefined}
                className={`flex h-full flex-col justify-between rounded-2xl p-4 ring-2 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-flame ${c.accent} ${active ? "ring-night/80" : "ring-transparent"}`}
              >
                <span className="text-sm font-semibold opacity-80">{c.label}</span>
                <span className="mt-2 font-display text-3xl font-extrabold tabular-nums">
                  {c.value ?? "—"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Filters */}
      <form
        role="search"
        action="/admin/leads"
        className="grid grid-cols-1 gap-3 rounded-2xl border border-paper-edge bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1.3fr_1fr_1fr_auto]"
      >
        <label className="flex flex-col gap-1 text-xs font-semibold text-ash">
          Search
          <input name="q" type="search" defaultValue={filters.q} placeholder="Name, email or phone" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ash">
          Status
          <select name="status" defaultValue={filters.status} className={selectClass}>
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ash">
          Interest
          <select name="interest" defaultValue={filters.interest} className={selectClass}>
            <option value="">All interests</option>
            {INTEREST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ash">
          From
          <input name="from" type="date" defaultValue={filters.from} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ash">
          To
          <input name="to" type="date" defaultValue={filters.to} className={inputClass} />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="h-11 flex-1 rounded-full bg-night px-5 text-sm font-bold text-paper transition hover:bg-panel focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50">
            Apply
          </button>
          {hasFilters ? (
            <Link href="/admin/leads" className="grid h-11 place-items-center rounded-full px-3 text-sm font-semibold text-ash hover:text-night">
              Reset
            </Link>
          ) : null}
        </div>
      </form>

      {/* Table */}
      <section aria-labelledby="results-heading" className="overflow-hidden rounded-2xl border border-paper-edge bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-edge px-4 py-3">
          <h2 id="results-heading" className="text-sm font-semibold text-ink-soft">
            {total === 0 ? "No leads" : `${fromRow + 1}–${fromRow + leads.length} of ${total} lead${total === 1 ? "" : "s"}`}
            {hasFilters ? " (filtered)" : ""}
          </h2>
          <a
            href={`/api/admin/leads/export${filtersToQuery(filters, { page: 1 })}`}
            download
            className="inline-flex h-9 items-center gap-2 rounded-full border-2 border-paper-edge px-4 text-sm font-semibold text-night transition hover:border-night focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-current"><path d="M9 3h2v8.6l3.3-3.3 1.4 1.4L10 15.4 4.3 9.7l1.4-1.4L9 11.6V3ZM4 16h12v2H4v-2Z" /></svg>
            Export CSV
          </a>
        </div>

        {leads.length === 0 ? (
          <EmptyState filtered={hasFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-sand/60 text-xs uppercase tracking-wider text-ash">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Contact</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Interest</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Received</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-edge/70">
                {leads.map((lead) => (
                  <tr key={lead.id} className="transition-colors hover:bg-paper/70">
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads/${lead.id}`} className="font-semibold text-night hover:underline">
                        {lead.full_name}
                      </Link>
                      {lead.city ? <div className="text-xs text-ash">{lead.city}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-56 truncate text-ink-soft" title={lead.email}>{lead.email}</div>
                      <div className="font-mono text-xs text-ash">{lead.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{interestLabel(lead.interest)}</td>
                    <td className="px-4 py-3">
                      <StatusSelect key={lead.status} leadId={lead.id} status={lead.status} label={`Status for ${lead.full_name}`} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-ash">{dateFmt.format(new Date(lead.created_at))}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="inline-flex h-8 items-center rounded-full px-3 text-xs font-bold text-padma hover:bg-padma-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50"
                      >
                        View <span className="sr-only">&nbsp;{lead.full_name}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 ? <Pagination filters={filters} pages={pages} /> : null}
      </section>
    </div>
  );
}

function Pagination({ filters, pages }: { filters: LeadFilters; pages: number }) {
  const page = Math.min(filters.page, pages);
  const link = (p: number) => `/admin/leads${filtersToQuery(filters, { page: p })}`;
  const btn =
    "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-paper-edge px-4 py-3">
      {page > 1 ? (
        <Link href={link(page - 1)} className={`${btn} border-2 border-paper-edge text-night hover:border-night`}>← Previous</Link>
      ) : (
        <span className={`${btn} text-ash/50`} aria-disabled="true">← Previous</span>
      )}
      <span className="font-mono text-xs text-ash">Page {page} of {pages}</span>
      {page < pages ? (
        <Link href={link(page + 1)} className={`${btn} border-2 border-paper-edge text-night hover:border-night`}>Next →</Link>
      ) : (
        <span className={`${btn} text-ash/50`} aria-disabled="true">Next →</span>
      )}
    </nav>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-flame-soft text-2xl">🪔</div>
      <p className="mt-3 font-display text-xl font-bold text-night">
        {filtered ? "No leads match these filters" : "No leads yet"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-ash">
        {filtered
          ? "Try a different search term or clear the filters."
          : "When visitors submit the contact form, their details will appear here."}
      </p>
      {filtered ? (
        <Link href="/admin/leads" className="mt-4 text-sm font-bold text-padma hover:underline">Clear filters</Link>
      ) : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading leads">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`h-24 animate-pulse rounded-2xl bg-sand ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`} />
        ))}
      </div>
      <div className="h-20 animate-pulse rounded-2xl bg-sand" />
      <div className="h-96 animate-pulse rounded-2xl bg-sand" />
    </div>
  );
}
