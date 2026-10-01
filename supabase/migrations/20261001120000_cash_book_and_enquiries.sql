-- =====================================================================
-- OMSUN Platform — cash book (Inflow & Outflow) and customer enquiries
-- 2026-10-01. Builds on 20261001000000_stage1_schema.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Leads table now holds both sales leads (retailer recruitment) and
--    customer enquiries (someone asking about a service).
-- ---------------------------------------------------------------------
alter table public.leads
  add column lead_type text not null default 'retailer' check (lead_type in ('retailer','enquiry')),
  add column service_id uuid references public.services(id);

create index on public.leads (lead_type, stage);

-- Service staff take enquiries at the counter and on the phone.
drop policy leads_insert on public.leads;
create policy leads_insert on public.leads for insert to authenticated
  with check (has_role('owner','manager','sales_executive')
              or (has_role('service_executive') and lead_type = 'enquiry'));

drop policy lead_activities_insert on public.lead_activities;
create policy lead_activities_insert on public.lead_activities for insert to authenticated
  with check (has_role('owner','manager','sales_executive','service_executive')
              and exists (select 1 from leads l where l.id = lead_id));

-- ---------------------------------------------------------------------
-- 2. Cash book: money in and out that is not a service payment
--    (rent, salaries, electricity, govt fees paid out, owner top-ups...).
--    Service payments come from the payments table; the Inflow & Outflow
--    screen combines both.
-- ---------------------------------------------------------------------
create table public.cash_entries (
  id          uuid primary key default gen_random_uuid(),
  entry_date  date not null default ((now() at time zone 'Asia/Kolkata')::date),
  direction   text not null check (direction in ('in','out')),
  category    text not null,
  amount      numeric(10,2) not null check (amount > 0),
  method      public.payment_method not null default 'cash',
  note        text,
  is_void     boolean not null default false,
  void_reason text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create index on public.cash_entries (entry_date);

create function public.tg_cash_entries_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare editable text[] := array['is_void','void_reason'];
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
      if not has_role('owner') and new.entry_date < today_ist() - 1 then
        raise exception 'backdated entries need the owner';
      end if;
    end if;
    new.is_void := false;
    new.void_reason := null;
    return new;
  end if;
  if (to_jsonb(new) - editable) is distinct from (to_jsonb(old) - editable) then
    raise exception 'cash entries cannot be edited; void and enter again';
  end if;
  if old.is_void then raise exception 'entry already void'; end if;
  if new.is_void and coalesce(btrim(new.void_reason), '') = '' then
    raise exception 'voiding needs a reason';
  end if;
  return new;
end $$;

create trigger cash_entries_guard before insert or update on public.cash_entries
  for each row execute function public.tg_cash_entries_guard();
create trigger audit after insert or update or delete on public.cash_entries
  for each row execute function public.tg_audit();

alter table public.cash_entries enable row level security;
create policy cash_select on public.cash_entries for select to authenticated
  using (has_role('owner','manager','accountant'));
create policy cash_insert on public.cash_entries for insert to authenticated
  with check (has_role('owner','manager','accountant'));
create policy cash_update on public.cash_entries for update to authenticated
  using (has_role('owner','accountant'));

-- ---------------------------------------------------------------------
-- 3. Totals for the dashboard and cash book, summed in the database so
--    they stay right past the API's row limit. Security invoker: each
--    caller only sums the rows their own policies let them see.
-- ---------------------------------------------------------------------
create function public.cash_in_hand_before(p_date date) returns numeric
language sql stable security invoker set search_path = public as $$
  select coalesce((select sum(amount) from payments
                   where status <> 'reversed' and method = 'cash' and paid_on < p_date), 0)
       + coalesce((select sum(case when direction = 'in' then amount else -amount end) from cash_entries
                   where not is_void and method = 'cash' and entry_date < p_date), 0)
$$;

create function public.business_totals(p_day date) returns table (
  received_all numeric, collected_day numeric,
  business_all numeric, pending_all numeric,
  business_day numeric, pending_day numeric, requests_day bigint
) language sql stable security invoker set search_path = public as $$
  with r as (
    select amount_due, greatest(amount_due - amount_paid, 0) as pending,
           (submitted_at at time zone 'Asia/Kolkata')::date = p_day as is_day
    from service_requests where status not in ('cancelled','rejected')
  ), p as (
    select amount, paid_on from payments where status <> 'reversed'
  )
  select coalesce((select sum(amount) from p), 0),
         coalesce((select sum(amount) from p where paid_on = p_day), 0),
         coalesce(sum(amount_due), 0), coalesce(sum(pending), 0),
         coalesce(sum(amount_due) filter (where is_day), 0),
         coalesce(sum(pending) filter (where is_day), 0),
         count(*) filter (where is_day)
  from r
$$;

-- ---------------------------------------------------------------------
-- 4. Reports. Security invoker like the totals above.
-- ---------------------------------------------------------------------

-- End of day: what each staff member did and collected over a date range.
create function public.report_staff_day(p_start date, p_end date) returns table (
  staff_id uuid, staff_name text,
  requests_created bigint, requests_completed bigint, payments bigint,
  cash numeric, upi numeric, other numeric, collected numeric
) language sql stable security invoker set search_path = public as $$
  -- Anything done by a retailer in the Mitra app is grouped in one row (who = null).
  with staff as (
    select id from profiles where role in ('owner','manager','accountant','sales_executive','service_executive')
  ), made as (
    select s.id as who, count(*) as n from service_requests r left join staff s on s.id = r.created_by
    where (r.submitted_at at time zone 'Asia/Kolkata')::date between p_start and p_end
    group by 1
  ), done as (
    select s.id as who, count(*) as n from request_status_history h left join staff s on s.id = h.changed_by
    where h.to_status = 'completed'
      and (h.created_at at time zone 'Asia/Kolkata')::date between p_start and p_end
    group by 1
  ), paid as (
    select s.id as who, count(*) as n,
           sum(y.amount) filter (where y.method = 'cash') as cash,
           sum(y.amount) filter (where y.method = 'upi') as upi,
           sum(y.amount) filter (where y.method not in ('cash','upi')) as other,
           sum(y.amount) as total
    from payments y left join staff s on s.id = y.received_by
    where y.status <> 'reversed' and y.paid_on between p_start and p_end
    group by 1
  ), who as (
    select who from made union select who from done union select who from paid
  )
  select w.who,
         case when w.who is null then 'Retailers (Mitra app)'
              else coalesce(nullif(p.full_name, ''), p.email) end,
         coalesce(m.n, 0), coalesce(d.n, 0), coalesce(y.n, 0),
         coalesce(y.cash, 0), coalesce(y.upi, 0), coalesce(y.other, 0), coalesce(y.total, 0)
  from who w
  left join profiles p on p.id = w.who
  left join made m on m.who is not distinct from w.who
  left join done d on d.who is not distinct from w.who
  left join paid y on y.who is not distinct from w.who
  order by 9 desc, 2
$$;

-- Month (or any range) by service: requests, business booked, money collected.
create function public.report_services(p_start date, p_end date) returns table (
  service_id uuid, service_name text, requests bigint, completed bigint,
  business numeric, commission numeric, collected numeric
) language sql stable security invoker set search_path = public as $$
  with r as (
    select service_id, count(*) as n,
           count(*) filter (where status = 'completed') as done,
           sum(amount_due) as business, sum(retailer_commission) as commission
    from service_requests
    where status not in ('cancelled','rejected')
      and (submitted_at at time zone 'Asia/Kolkata')::date between p_start and p_end
    group by 1
  ), y as (
    select sr.service_id, sum(p.amount) as collected
    from payments p join service_requests sr on sr.id = p.request_id
    where p.status <> 'reversed' and p.paid_on between p_start and p_end
    group by 1
  )
  select s.id, s.name_en, coalesce(r.n, 0), coalesce(r.done, 0),
         coalesce(r.business, 0), coalesce(r.commission, 0), coalesce(y.collected, 0)
  from services s
  left join r on r.service_id = s.id
  left join y on y.service_id = s.id
  where r.n is not null or y.collected is not null
  order by 5 desc, 2
$$;

-- Month by day: requests, business, collected, other inflow and outflow.
create function public.report_days(p_start date, p_end date) returns table (
  day date, requests bigint, business numeric, collected numeric, other_in numeric, other_out numeric
) language sql stable security invoker set search_path = public as $$
  select d::date,
    (select count(*) from service_requests
      where status not in ('cancelled','rejected') and (submitted_at at time zone 'Asia/Kolkata')::date = d::date),
    coalesce((select sum(amount_due) from service_requests
      where status not in ('cancelled','rejected') and (submitted_at at time zone 'Asia/Kolkata')::date = d::date), 0),
    coalesce((select sum(amount) from payments where status <> 'reversed' and paid_on = d::date), 0),
    coalesce((select sum(amount) from cash_entries where not is_void and direction = 'in' and entry_date = d::date), 0),
    coalesce((select sum(amount) from cash_entries where not is_void and direction = 'out' and entry_date = d::date), 0)
  from generate_series(p_start, p_end, interval '1 day') d
  order by 1
$$;

-- Leads: per staff member, what came in, what they did, what they closed.
create function public.report_leads(p_start date, p_end date) returns table (
  staff_id uuid, staff_name text, lead_type text,
  added bigint, activities bigint, converted bigint, lost bigint, open_now bigint, overdue bigint
) language sql stable security invoker set search_path = public as $$
  with l as (
    select * from leads
  ), staff as (
    select distinct assigned_to as who, lead_type from l
  )
  select s.who, coalesce(nullif(p.full_name, ''), p.email, 'Not assigned'), s.lead_type,
    (select count(*) from l where l.assigned_to is not distinct from s.who and l.lead_type = s.lead_type
       and (l.created_at at time zone 'Asia/Kolkata')::date between p_start and p_end),
    (select count(*) from lead_activities a join l on l.id = a.lead_id
      where l.assigned_to is not distinct from s.who and l.lead_type = s.lead_type
        and (a.created_at at time zone 'Asia/Kolkata')::date between p_start and p_end),
    (select count(*) from l where l.assigned_to is not distinct from s.who and l.lead_type = s.lead_type
       and l.stage = 'converted' and (l.updated_at at time zone 'Asia/Kolkata')::date between p_start and p_end),
    (select count(*) from l where l.assigned_to is not distinct from s.who and l.lead_type = s.lead_type
       and l.stage in ('not_interested','lost') and (l.updated_at at time zone 'Asia/Kolkata')::date between p_start and p_end),
    (select count(*) from l where l.assigned_to is not distinct from s.who and l.lead_type = s.lead_type
       and l.stage not in ('converted','not_interested','lost')),
    (select count(*) from l where l.assigned_to is not distinct from s.who and l.lead_type = s.lead_type
       and l.stage not in ('converted','not_interested','lost') and l.next_follow_up_on < today_ist())
  from staff s left join profiles p on p.id = s.who
  order by 3, 2
$$;
