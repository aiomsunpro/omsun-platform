-- =====================================================================
-- OMSUN Platform — tighten function permissions (Supabase security advisor)
-- 2026-10-01. Builds on the two earlier migrations.
--
-- * Fixed search_path on the helper functions that lacked one.
-- * Postgres lets everyone (PUBLIC) execute new functions. Take that away
--   and grant back only what the apps and security policies need:
--   - anon: is_staff(), used by the public catalogue policies.
--   - authenticated: the role helpers used inside policies, the settlement
--     functions (they check the role themselves), totals and reports.
--   Trigger functions need no grant; triggers fire regardless.
-- =====================================================================

alter function public.today_ist() set search_path = public;
alter function public.request_transition_allowed(public.request_status, public.request_status) set search_path = public;
alter function public.is_internal() set search_path = public;
alter function public.next_request_number() set search_path = public;
alter function public.next_receipt_number() set search_path = public;
alter function public.tg_set_updated_at() set search_path = public;
alter function public.tg_set_created_by() set search_path = public;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
    where n.nspname = 'public' and d.objid is null       -- skip functions owned by extensions
      and p.proname <> 'rls_auto_enable'                 -- Supabase's own helper
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

grant execute on function public.is_staff() to anon, authenticated;
grant execute on function
  public.today_ist(),
  public.app_current_role(),
  public.has_role(variadic public.app_role[]),
  public.my_retailer_id(),
  public.can_work_request(uuid),
  public.can_see_request(uuid),
  public.create_retailer_settlement(uuid, date, date),
  public.finalize_retailer_settlement(uuid),
  public.cash_in_hand_before(date),
  public.business_totals(date),
  public.report_staff_day(date, date),
  public.report_services(date, date),
  public.report_days(date, date),
  public.report_leads(date, date)
to authenticated;

-- Functions added later are not executable by everyone unless granted.
alter default privileges in schema public revoke execute on functions from public, anon;
