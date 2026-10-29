-- Switch the admin dashboard from Supabase Auth (magic links) to the app's own
-- email + password login with signed JWT sessions.
--
-- * The server now talks to the database with the service role after verifying
--   the admin's JWT, so dashboard queries no longer go through `authenticated`.
-- * Passwords are stored only as scrypt hashes (set with `npm run admin:password`).
-- * Realtime: instead of postgres_changes (which needs a Supabase Auth session),
--   triggers broadcast a tiny "something changed" message containing only the
--   row id — never names, emails or phone numbers. The dashboard then re-fetches
--   through the server, which checks the admin's JWT.

alter table public.admins add column if not exists password_hash text;

-- The server (service role) reads the dashboard counters.
grant execute on function public.lead_stats() to service_role;

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
    false
  );
  return null;
exception when others then
  -- Realtime problems must never block saving a lead.
  return null;
end;
$$;

revoke all on function public.broadcast_admin_change() from public, anon, authenticated;

drop trigger if exists leads_broadcast on public.leads;
create trigger leads_broadcast
  after insert or update on public.leads
  for each row execute function public.broadcast_admin_change();

drop trigger if exists lead_notes_broadcast on public.lead_notes;
create trigger lead_notes_broadcast
  after insert on public.lead_notes
  for each row execute function public.broadcast_admin_change();

drop trigger if exists lead_emails_broadcast on public.lead_emails;
create trigger lead_emails_broadcast
  after insert on public.lead_emails
  for each row execute function public.broadcast_admin_change();
