-- Security hardening (post-review).
--
-- 1. The app no longer uses Supabase Auth: every database call is made by the
--    server with the service role after checking the admin's JWT. So nothing
--    should be reachable as `anon` or `authenticated` — even if someone signs up
--    through Supabase Auth's public endpoint. RLS stays ON with no policies,
--    which denies everything to non-service roles.
-- 2. Dashboard realtime moves to a PRIVATE broadcast channel. With no policies on
--    realtime.messages, anon/authenticated clients can neither listen nor send;
--    only the server (service role) relays events to signed-in admins.
-- 3. session_version lets sign-out and password changes revoke existing JWTs.

-- 1. Lock down table access ---------------------------------------------------
drop policy if exists "admins read leads"        on public.leads;
drop policy if exists "admins update leads"      on public.leads;
drop policy if exists "admins read notes"        on public.lead_notes;
drop policy if exists "admins write notes"       on public.lead_notes;
drop policy if exists "admins read admins"       on public.admins;
drop policy if exists "admins add admins"        on public.admins;
drop policy if exists "admins remove admins"     on public.admins;
drop policy if exists "admins read lead emails"  on public.lead_emails;
drop policy if exists "admins write lead emails" on public.lead_emails;

alter table public.leads       enable row level security;
alter table public.lead_notes  enable row level security;
alter table public.lead_emails enable row level security;
alter table public.admins      enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.leads, public.lead_notes, public.lead_emails, public.admins, public.rate_limits
  from anon, authenticated;
revoke execute on function public.lead_stats() from anon, authenticated;
revoke execute on function public.is_admin()   from anon, authenticated;

-- Tables are no longer streamed via postgres_changes.
do $$
declare t text;
begin
  foreach t in array array['leads', 'lead_notes', 'lead_emails'] loop
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', t);
    end if;
  end loop;
end $$;

-- 2. Private broadcast channel ---------------------------------------------
create or replace function public.broadcast_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(
    jsonb_build_object('table', tg_table_name, 'op', tg_op, 'id', coalesce(new.id, old.id)),
    'change',
    'admin-feed',
    true -- private: only the service role (our server) can receive it
  );
  return null;
exception when others then
  return null; -- realtime problems must never block saving a lead
end;
$$;

-- 3. Session revocation --------------------------------------------------------
alter table public.admins add column if not exists session_version integer not null default 1;
