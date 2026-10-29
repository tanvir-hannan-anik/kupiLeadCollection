-- Defence in depth: Supabase grants broad table privileges to `authenticated`
-- by default. RLS already blocks these, but TRUNCATE ignores RLS, so remove
-- everything the dashboard doesn't need. (Server inserts use the service role.)

revoke insert, delete, truncate, references, trigger on public.leads      from authenticated;
revoke update, delete, truncate, references, trigger on public.lead_notes from authenticated;
revoke update, truncate, references, trigger         on public.admins     from authenticated;
revoke all                                            on public.rate_limits from authenticated;

-- Same for anonymous visitors on any table we own.
revoke all on public.leads, public.lead_notes, public.admins, public.rate_limits from anon;
