
-- =====================================================================
-- OMSUN Platform — Yojana eligibility: applying from a screening
-- 2026-10-21. Builds on the earlier Yojana migrations.
--
-- "Apply" on a scheme creates an ordinary service request for the scheme's
-- paid OMSUN service, so status, documents, payment and commission all
-- work as before. The request remembers which scheme and which family
-- member it is for.
-- =====================================================================

alter table public.service_requests
  add column scheme_id        uuid references public.schemes(id),
  add column family_member_id uuid references public.family_members(id) on delete set null;
create index on public.service_requests (scheme_id);

create function public.tg_requests_scheme_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.scheme_id is not null and not exists (
       select 1 from scheme_services where scheme_id = new.scheme_id and service_id = new.service_id) then
    raise exception 'this service is not the paid service for that scheme';
  end if;
  if new.family_member_id is not null and not exists (
       select 1 from family_members m join families f on f.id = m.family_id
       where m.id = new.family_member_id
         and f.retailer_id is not distinct from new.retailer_id) then
    raise exception 'family member does not belong to this request''s retailer';
  end if;
  return new;
end $$;
create trigger requests_scheme_check before insert on public.service_requests
  for each row execute function public.tg_requests_scheme_check();
