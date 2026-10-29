-- Kupi Lead Generation & Management — initial schema
-- Run in Supabase: Dashboard → SQL Editor → paste & run (or `supabase db push`).
-- Idempotent where practical, so re-running is safe.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Admin allow-list
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  email      text primary key check (email = lower(email) and position('@' in email) > 1),
  added_by   text,
  created_at timestamptz not null default now()
);

insert into public.admins (email, added_by) values
  ('251-16-021@diu.edu.bd', 'seed'),
  ('251-16-012@diu.edu.bd', 'seed'),
  ('251-16-017@diu.edu.bd', 'seed')
on conflict (email) do nothing;

-- True when the signed-in Supabase user's email is on the allow-list.
-- SECURITY DEFINER so it can read `admins` without recursive RLS checks.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id                       uuid primary key default gen_random_uuid(),
  full_name                text not null check (char_length(full_name) between 2 and 100),
  email                    text not null check (char_length(email) <= 254),
  phone                    text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'), -- E.164
  interest                 text not null check (char_length(interest) <= 100),
  city                     text check (char_length(city) <= 80),
  preferred_contact_method text check (preferred_contact_method in ('email', 'phone', 'whatsapp')),
  message                  text check (char_length(message) <= 1000),
  consent_given            boolean not null check (consent_given),
  consent_timestamp        timestamptz not null,
  consent_text             text not null, -- exact wording the visitor agreed to
  status                   text not null default 'New'
                           check (status in ('New', 'Contacted', 'Interested', 'Converted', 'Closed')),
  source                   text,
  utm_source               text,
  utm_medium               text,
  utm_campaign             text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx     on public.leads (status, created_at desc);
create index if not exists leads_interest_idx   on public.leads (interest, created_at desc);
create index if not exists leads_email_idx      on public.leads (email, created_at desc);
create index if not exists leads_phone_idx      on public.leads (phone, created_at desc);
-- Fast `ilike '%term%'` search on large tables.
create index if not exists leads_search_name_trgm  on public.leads using gin (full_name gin_trgm_ops);
create index if not exists leads_search_email_trgm on public.leads using gin (email gin_trgm_ops);
create index if not exists leads_search_phone_trgm on public.leads using gin (phone gin_trgm_ops);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Internal follow-up notes
-- ---------------------------------------------------------------------------
create table if not exists public.lead_notes (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.leads (id) on delete cascade,
  author_email text not null,
  body         text not null check (char_length(body) between 1 and 2000),
  created_at   timestamptz not null default now()
);

create index if not exists lead_notes_lead_idx on public.lead_notes (lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed window, keyed by a salted hash of the client IP)
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         integer not null default 0
);

-- Atomically records a hit; returns true while the caller is within the limit.
create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case
                 when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
                 else r.hits + 1
               end,
        window_start = case
                 when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
                 else r.window_start
               end
  returning hits into v_hits;

  -- Opportunistic cleanup so the table stays small.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Dashboard counters (runs as the caller, so RLS still applies)
-- ---------------------------------------------------------------------------
create or replace function public.lead_stats()
returns table (total bigint, new bigint, contacted bigint, interested bigint, converted bigint, closed bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*),
    count(*) filter (where status = 'New'),
    count(*) filter (where status = 'Contacted'),
    count(*) filter (where status = 'Interested'),
    count(*) filter (where status = 'Converted'),
    count(*) filter (where status = 'Closed')
  from public.leads;
$$;

revoke all on function public.lead_stats() from public, anon;
grant execute on function public.lead_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
--   * Visitors (anon) have NO direct table access — leads are inserted by the
--     server through POST /api/leads using the service role.
--   * Signed-in users can only read/update leads if they are on `admins`.
--   * Nobody can delete leads through the API.
-- ---------------------------------------------------------------------------
alter table public.admins      enable row level security;
alter table public.leads       enable row level security;
alter table public.lead_notes  enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.leads, public.lead_notes, public.admins, public.rate_limits from anon;

drop policy if exists "admins read leads"   on public.leads;
drop policy if exists "admins update leads" on public.leads;
create policy "admins read leads"   on public.leads for select to authenticated using (public.is_admin());
create policy "admins update leads" on public.leads for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read notes"  on public.lead_notes;
drop policy if exists "admins write notes" on public.lead_notes;
create policy "admins read notes"  on public.lead_notes for select to authenticated using (public.is_admin());
create policy "admins write notes" on public.lead_notes for insert to authenticated
  with check (public.is_admin() and author_email = lower(auth.jwt() ->> 'email'));

drop policy if exists "admins read admins"   on public.admins;
drop policy if exists "admins add admins"    on public.admins;
drop policy if exists "admins remove admins" on public.admins;
create policy "admins read admins"   on public.admins for select to authenticated using (public.is_admin());
create policy "admins add admins"    on public.admins for insert to authenticated with check (public.is_admin());
create policy "admins remove admins" on public.admins for delete to authenticated
  using (public.is_admin() and email <> lower(auth.jwt() ->> 'email')); -- can't remove yourself

-- Admins may only change workflow status on a lead, never the visitor's data.
revoke update on public.leads from authenticated;
grant select on public.leads to authenticated;
grant update (status) on public.leads to authenticated;
grant select, insert on public.lead_notes to authenticated;
grant select, insert, delete on public.admins to authenticated;
-- rate_limits: no policies → inaccessible except via the service role.
