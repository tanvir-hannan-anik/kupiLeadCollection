-- Realtime for the admin dashboard.
-- Supabase Realtime only broadcasts tables in the `supabase_realtime` publication,
-- and it applies RLS per subscriber — so only signed-in admins (is_admin()) receive
-- lead events. Visitors / anon clients receive nothing.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lead_notes'
  ) then
    alter publication supabase_realtime add table public.lead_notes;
  end if;
end $$;
