-- =====================================================================
-- OMSUN Platform — office records moved over from the old Lovable portal
-- 2026-10-02. Builds on the earlier migrations.
--
-- 1. Housekeeping log and water bills
-- 2. Credentials: portal logins kept for customers (GST, Aadhaar…)
-- 3. Bank accounts and cash denomination limits
-- 4. Compliances: ongoing work done for a customer (GST return, ITR…)
-- 5. track_request(): the website's application status tracker
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Housekeeping log and water bills. All staff can see them; the
--    owner, manager and accountant keep them; only the owner deletes.
-- ---------------------------------------------------------------------
create table public.housekeeping_log (
  id          uuid primary key default gen_random_uuid(),
  staff_name  text not null check (length(btrim(staff_name)) between 1 and 100),
  work_date   date not null default public.today_ist(),
  is_present  boolean not null default true,
  work_done   text,
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  notes       text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.housekeeping_log (work_date desc);

create table public.water_bills (
  id          uuid primary key default gen_random_uuid(),
  bill_month  date not null check (extract(day from bill_month) = 1),   -- first day of the month
  vendor      text,
  amount      numeric(10,2) not null check (amount >= 0),
  paid        boolean not null default false,
  paid_on     date,
  notes       text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (paid or paid_on is null)
);
create index on public.water_bills (bill_month desc);

-- ---------------------------------------------------------------------
-- 2. Credentials. Passwords for customers' government portals. The
--    owner and manager see all of them; other staff see only the ones
--    they saved. Nothing here goes to the audit log, so passwords are
--    not copied anywhere else.
-- ---------------------------------------------------------------------
create table public.credentials (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  service_id  uuid references public.services(id),
  label       text not null check (length(btrim(label)) between 1 and 120),  -- e.g. "GST portal"
  username    text,
  password    text,
  notes       text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.credentials (customer_id);

-- ---------------------------------------------------------------------
-- 3. Bank accounts and denomination limits (how many notes of each
--    value the counter may hold). Owner, manager and accountant see
--    them; the owner changes them.
-- ---------------------------------------------------------------------
create table public.bank_accounts (
  id             uuid primary key default gen_random_uuid(),
  bank_name      text not null check (length(btrim(bank_name)) between 1 and 100),
  account_holder text,
  account_number text,
  ifsc           text check (ifsc is null or ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  branch         text,
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.denomination_limits (
  denomination int primary key check (denomination > 0),   -- note or coin value in ₹
  max_count    int not null default 0 check (max_count >= 0),
  notes        text,
  updated_at   timestamptz not null default now()
);
insert into public.denomination_limits (denomination) values (500), (200), (100), (50), (20), (10);

-- ---------------------------------------------------------------------
-- 4. Compliances. Recurring or long-running work for a customer.
-- ---------------------------------------------------------------------
create type public.compliance_status as enum
  ('not_started','in_process','uploaded','completed','delivered','cancelled','refunded','inactive');

create table public.compliances (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  service_id     uuid not null references public.services(id),
  status         public.compliance_status not null default 'not_started',
  fee            numeric(10,2) not null default 0 check (fee >= 0),
  amount_paid    numeric(10,2) not null default 0 check (amount_paid >= 0),
  payment_status public.pay_status generated always as (
                   case when amount_paid <= 0 then 'unpaid'::public.pay_status
                        when amount_paid >= fee then 'paid'::public.pay_status
                        else 'partial'::public.pay_status end) stored,
  assigned_to    uuid references public.profiles(id),
  started_on     date,
  completed_on   date,
  delivered_on   date,
  reference_no   text,
  notes          text,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.compliances (status);
create index on public.compliances (assigned_to);

-- Shared triggers
create trigger set_updated_at before update on public.housekeeping_log    for each row execute function public.tg_set_updated_at();
create trigger set_updated_at before update on public.water_bills         for each row execute function public.tg_set_updated_at();
create trigger set_updated_at before update on public.credentials         for each row execute function public.tg_set_updated_at();
create trigger set_updated_at before update on public.bank_accounts       for each row execute function public.tg_set_updated_at();
create trigger set_updated_at before update on public.denomination_limits for each row execute function public.tg_set_updated_at();
create trigger set_updated_at before update on public.compliances         for each row execute function public.tg_set_updated_at();
create trigger set_created_by before insert on public.housekeeping_log    for each row execute function public.tg_set_created_by();
create trigger set_created_by before insert on public.water_bills         for each row execute function public.tg_set_created_by();
create trigger set_created_by before insert on public.credentials         for each row execute function public.tg_set_created_by();
create trigger set_created_by before insert on public.compliances         for each row execute function public.tg_set_created_by();

-- Row-level security
alter table public.housekeeping_log    enable row level security;
alter table public.water_bills         enable row level security;
alter table public.credentials         enable row level security;
alter table public.bank_accounts       enable row level security;
alter table public.denomination_limits enable row level security;
alter table public.compliances         enable row level security;

create policy housekeeping_select on public.housekeeping_log for select to authenticated using (is_staff());
create policy housekeeping_insert on public.housekeeping_log for insert to authenticated with check (has_role('owner','manager','accountant'));
create policy housekeeping_update on public.housekeeping_log for update to authenticated using (has_role('owner','manager','accountant'));
create policy housekeeping_delete on public.housekeeping_log for delete to authenticated using (has_role('owner'));

create policy water_select on public.water_bills for select to authenticated using (is_staff());
create policy water_insert on public.water_bills for insert to authenticated with check (has_role('owner','manager','accountant'));
create policy water_update on public.water_bills for update to authenticated using (has_role('owner','manager','accountant'));
create policy water_delete on public.water_bills for delete to authenticated using (has_role('owner'));

create policy credentials_select on public.credentials for select to authenticated
  using (has_role('owner','manager') or (is_staff() and created_by = auth.uid()));
create policy credentials_insert on public.credentials for insert to authenticated with check (is_staff());
create policy credentials_update on public.credentials for update to authenticated
  using (has_role('owner','manager') or (is_staff() and created_by = auth.uid()));
create policy credentials_delete on public.credentials for delete to authenticated
  using (has_role('owner','manager') or (is_staff() and created_by = auth.uid()));

create policy banks_select on public.bank_accounts for select to authenticated using (has_role('owner','manager','accountant'));
create policy banks_write  on public.bank_accounts for all    to authenticated using (has_role('owner')) with check (has_role('owner'));
create policy denom_select on public.denomination_limits for select to authenticated using (has_role('owner','manager','accountant'));
create policy denom_write  on public.denomination_limits for all    to authenticated using (has_role('owner')) with check (has_role('owner'));

create policy compliances_select on public.compliances for select to authenticated
  using (has_role('owner','manager','accountant') or (is_staff() and (assigned_to = auth.uid() or created_by = auth.uid())));
create policy compliances_insert on public.compliances for insert to authenticated
  with check (has_role('owner','manager','accountant','service_executive'));
create policy compliances_update on public.compliances for update to authenticated
  using (has_role('owner','manager','accountant') or (has_role('service_executive') and assigned_to = auth.uid()));
create policy compliances_delete on public.compliances for delete to authenticated using (has_role('owner'));

-- ---------------------------------------------------------------------
-- 5. Website status tracker. A visitor types the request number from
--    their receipt and the customer's mobile; both must match. Returns
--    only the service name, status and dates — never names or money.
-- ---------------------------------------------------------------------
create function public.track_request(p_request_number text, p_mobile text)
returns table (request_number text, service_en text, service_mr text,
               status public.request_status, submitted_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.request_number, s.name_en, s.name_mr, r.status, r.submitted_at, r.updated_at
  from service_requests r
  join customers c on c.id = r.customer_id
  join services s on s.id = r.service_id
  where upper(btrim(r.request_number)) = upper(btrim(coalesce(p_request_number, '')))
    and length(regexp_replace(coalesce(p_mobile, ''), '\D', '', 'g')) >= 10
    and right(regexp_replace(coalesce(c.mobile, ''), '\D', '', 'g'), 10)
        = right(regexp_replace(coalesce(p_mobile, ''), '\D', '', 'g'), 10)
  limit 1
$$;

revoke execute on function public.track_request(text, text) from public;
grant execute on function public.track_request(text, text) to anon, authenticated;
