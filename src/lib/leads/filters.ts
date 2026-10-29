import { INTEREST_OPTIONS, LEAD_STATUSES, type LeadStatus } from "@/config/lead-form";

export const PAGE_SIZE = 20;
/** Date filters are interpreted in Bangladesh time. */
const TZ_OFFSET = "+06:00";

export type LeadFilters = {
  q: string;
  status: LeadStatus | "";
  interest: string;
  from: string;
  to: string;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function parseLeadFilters(params: RawParams): LeadFilters {
  const status = first(params.status);
  const interest = first(params.interest);
  const from = first(params.from);
  const to = first(params.to);
  const page = Number.parseInt(first(params.page), 10);
  return {
    // Drop characters that have meaning in PostgREST filter syntax / LIKE patterns.
    q: first(params.q).replace(/[,()*%\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 100),
    status: (LEAD_STATUSES as readonly string[]).includes(status) ? (status as LeadStatus) : "",
    interest: INTEREST_OPTIONS.some((o) => o.value === interest) ? interest : "",
    from: isDate(from) ? from : "",
    to: isDate(to) ? to : "",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Builds the PostgREST `or` filter for free-text search, or null. */
export function searchFilter(q: string): string | null {
  if (!q) return null;
  const parts = [`full_name.ilike."%${q}%"`, `email.ilike."%${q}%"`];
  const digits = q.replace(/[\s\-+]/g, "");
  if (/^\d{3,}$/.test(digits)) parts.push(`phone.ilike."%${digits}%"`);
  return parts.join(",");
}

// Minimal shape of a Supabase filter builder. Kept non-generic: constraining
// against Supabase's own builder types makes TypeScript give up (TS2589).
interface Filterable {
  or(filters: string): Filterable;
  eq(column: string, value: string): Filterable;
  gte(column: string, value: string): Filterable;
  lt(column: string, value: string): Filterable;
}

/** Applies search/status/interest/date filters to a `.from("leads").select()` builder. */
export function applyLeadFilters<T>(query: T, f: LeadFilters): T {
  let q = query as unknown as Filterable;
  const search = searchFilter(f.q);
  if (search) q = q.or(search);
  if (f.status) q = q.eq("status", f.status);
  if (f.interest) q = q.eq("interest", f.interest);
  if (f.from) q = q.gte("created_at", `${f.from}T00:00:00${TZ_OFFSET}`);
  if (f.to) q = q.lt("created_at", `${nextDay(f.to)}T00:00:00${TZ_OFFSET}`);
  return q as unknown as T;
}

/** Query string for links that keep the current filters (e.g. pagination, export). */
export function filtersToQuery(f: LeadFilters, overrides: Partial<LeadFilters> = {}): string {
  const merged = { ...f, ...overrides };
  const params = new URLSearchParams();
  for (const key of ["q", "status", "interest", "from", "to"] as const) {
    if (merged[key]) params.set(key, merged[key]);
  }
  if (merged.page > 1) params.set("page", String(merged.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}
