-- Follow-up emails sent to leads from the admin dashboard (an audit trail).

create table if not exists public.lead_emails (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  sent_by     text not null,
  to_email    text not null,
  subject     text not null check (char_length(subject) between 1 and 200),
  body        text not null check (char_length(body) between 1 and 5000),
  template    text,
  status      text not null check (status in ('sent', 'failed')),
  provider_id text,
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists lead_emails_lead_idx on public.lead_emails (lead_id, created_at desc);

alter table public.lead_emails enable row level security;

drop policy if exists "admins read lead emails"  on public.lead_emails;
drop policy if exists "admins write lead emails" on public.lead_emails;
create policy "admins read lead emails" on public.lead_emails
  for select to authenticated using (public.is_admin());
create policy "admins write lead emails" on public.lead_emails
  for insert to authenticated
  with check (public.is_admin() and sent_by = lower(auth.jwt() ->> 'email'));

revoke all on public.lead_emails from anon, authenticated;
grant select, insert on public.lead_emails to authenticated;

-- Other admins' dashboards refresh when a follow-up goes out.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lead_emails'
  ) then
    alter publication supabase_realtime add table public.lead_emails;
  end if;
end $$;
