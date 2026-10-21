
-- =====================================================================
-- OMSUN Platform — government price caps and price history
-- 2026-10-21. Builds on the earlier migrations.
--
-- One head-office price per service is already the rule (only the owner
-- changes govt_fee / service_charge / commission, and each request keeps
-- the price it was created with). This adds:
--   * services.price_cap: where a GR fixes what a citizen may be charged
--     (Aaple Sarkar certificates), the database refuses any price above it.
--     Only the owner sets or changes the cap.
--   * service_price_history: every price change from the audit log, with
--     who made it and when. Owner only, like the audit log itself.
-- Retailers cannot give discounts (Aditya, 2026-10-21): nothing here lets
-- a request's price differ from the service price.
-- =====================================================================

alter table public.services
  add column price_cap      numeric(10,2) check (price_cap is null or price_cap >= 0),
  add column price_cap_note text;            -- GR number / rate sheet the cap comes from

create function public.tg_services_price_cap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and not has_role('owner') and (
       new.price_cap is distinct from old.price_cap
    or new.price_cap_note is distinct from old.price_cap_note) then
    raise exception 'only the owner can change a government price cap';
  end if;
  if new.price_cap is not null and new.govt_fee + new.service_charge > new.price_cap then
    raise exception 'price ₹% is above the government cap of ₹%', new.govt_fee + new.service_charge, new.price_cap;
  end if;
  return new;
end $$;
create trigger services_price_cap before insert or update on public.services
  for each row execute function public.tg_services_price_cap();

create view public.service_price_history with (security_invoker = true) as
select (a.new_data->>'id')::uuid                     as service_id,
       a.created_at                                  as changed_at,
       a.actor                                       as changed_by,
       p.full_name                                   as changed_by_name,
       (a.old_data->>'govt_fee')::numeric            as old_govt_fee,
       (a.new_data->>'govt_fee')::numeric            as new_govt_fee,
       (a.old_data->>'service_charge')::numeric      as old_service_charge,
       (a.new_data->>'service_charge')::numeric      as new_service_charge,
       (a.old_data->>'retailer_commission')::numeric as old_commission,
       (a.new_data->>'retailer_commission')::numeric as new_commission,
       (a.old_data->>'price_cap')::numeric           as old_price_cap,
       (a.new_data->>'price_cap')::numeric           as new_price_cap
from public.audit_logs a
left join public.profiles p on p.id = a.actor
where a.table_name = 'services'
  and (a.action = 'INSERT'
       or a.old_data->'govt_fee' is distinct from a.new_data->'govt_fee'
       or a.old_data->'service_charge' is distinct from a.new_data->'service_charge'
       or a.old_data->'retailer_commission' is distinct from a.new_data->'retailer_commission'
       or a.old_data->'price_cap' is distinct from a.new_data->'price_cap');

grant select on public.service_price_history to authenticated;
