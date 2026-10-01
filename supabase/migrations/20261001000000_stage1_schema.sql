-- =====================================================================
-- OMSUN Platform — Stage 1 database (Supabase / PostgreSQL)
-- Draft v0.1, 2026-10-01. See stage1-spec.md for the business rules.
--
-- Run once on a fresh Supabase project (SQL editor or as the first
-- migration). Relies on Supabase's auth.users, auth.uid(), storage
-- schema and the supabase_realtime publication.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Types
-- ---------------------------------------------------------------------
create type public.app_role as enum
  ('owner','manager','accountant','sales_executive','service_executive','retailer','customer');
create type public.retailer_status   as enum ('pending','approved','suspended','rejected');
create type public.request_channel   as enum ('retailer','walk_in','website');
create type public.request_status    as enum
  ('new','assigned','documents_required','documents_received','under_process',
   'pending','completed','rejected','cancelled');
create type public.request_priority  as enum ('normal','urgent');
create type public.pay_status        as enum ('unpaid','partial','paid');
create type public.payment_method    as enum ('cash','upi','bank','other');
create type public.payment_state     as enum ('recorded','verified','reversed');
create type public.payer_type        as enum ('customer','retailer');
create type public.payment_purpose   as enum ('service','retailer_dues','joining_fee');
create type public.commission_status as enum ('on_hold','earned','settled','cancelled');
create type public.settlement_status as enum ('draft','finalized');
create type public.document_kind     as enum ('input','output');
create type public.verification      as enum ('pending','verified','rejected');
create type public.lead_stage        as enum
  ('new_lead','contacted','interested','information_sent','follow_up','meeting_scheduled',
   'visit_completed','payment_pending','converted','not_interested','lost');
create type public.ticket_status     as enum ('open','in_progress','resolved','closed');

-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text,
  mobile             text unique,                -- 10 digits, no +91
  email              text,
  role               public.app_role not null default 'retailer',
  preferred_language text not null default 'mr' check (preferred_language in ('mr','en')),
  photo_path         text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.retailers (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid unique references public.profiles(id),   -- null until the retailer signs up
  business_name      text not null,
  owner_name         text not null,
  mobile             text not null unique,
  village            text,
  taluka             text,
  district           text,
  pincode            text,
  address            text,
  business_type      text,                       -- kirana, pan shop, dairy, CSC...
  status             public.retailer_status not null default 'pending',
  joining_fee_amount numeric(10,2) not null default 5000,
  joining_fee_paid   boolean not null default false,
  onboarded_by       uuid references public.profiles(id),
  joined_on          date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.employees (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null unique references public.profiles(id),
  employee_code text not null unique,
  designation   text,
  manager_id    uuid references public.profiles(id),
  joined_on     date,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.service_categories (
  id             uuid primary key default gen_random_uuid(),
  name_en        text not null,
  name_mr        text not null,
  description_en text,
  description_mr text,
  icon           text,
  sort_order     int not null default 0,
  is_active      boolean not null default true
);

create table public.services (
  id                     uuid primary key default gen_random_uuid(),
  category_id            uuid not null references public.service_categories(id),
  code                   text not null unique,       -- e.g. PAN-NEW
  name_en                text not null,
  name_mr                text not null,
  description_en         text,
  description_mr         text,
  instructions_en        text,
  instructions_mr        text,
  govt_fee               numeric(10,2) not null default 0 check (govt_fee >= 0),
  service_charge         numeric(10,2) not null default 0 check (service_charge >= 0),
  customer_price         numeric(10,2) generated always as (govt_fee + service_charge) stored,
  retailer_commission    numeric(10,2) not null default 0
                         check (retailer_commission >= 0 and retailer_commission <= service_charge),
  processing_days        int,
  available_to_retailers boolean not null default true,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.service_required_documents (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references public.services(id) on delete cascade,
  name_en      text not null,
  name_mr      text not null,
  is_mandatory boolean not null default true,
  notes        text,
  sort_order   int not null default 0
);

-- Avoid storing Aadhaar/PAN numbers here; they belong only inside the uploaded documents.
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  mobile      text,
  alt_mobile  text,
  village     text,
  taluka      text,
  district    text,
  address     text,
  retailer_id uuid references public.retailers(id),   -- null = OMSUN office customer
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create sequence public.request_number_seq;
create sequence public.receipt_number_seq;

create table public.service_requests (
  id                  uuid primary key default gen_random_uuid(),
  request_number      text not null unique,
  channel             public.request_channel not null default 'retailer',
  token_date          date,                       -- walk-in only
  token_number        int,
  customer_id         uuid not null references public.customers(id),
  service_id          uuid not null references public.services(id),
  retailer_id         uuid references public.retailers(id),
  assigned_to         uuid references public.profiles(id),
  status              public.request_status not null default 'new',
  last_status_note    text,                       -- set together with status; copied into history
  priority            public.request_priority not null default 'normal',
  -- price snapshot taken at submission
  govt_fee            numeric(10,2) not null default 0,
  service_charge      numeric(10,2) not null default 0,
  customer_price      numeric(10,2) generated always as (govt_fee + service_charge) stored,
  retailer_commission numeric(10,2) not null default 0,
  amount_due          numeric(10,2) not null default 0,  -- what OMSUN must receive
  amount_paid         numeric(10,2) not null default 0,  -- sum of non-reversed payments
  payment_status      public.pay_status not null default 'unpaid',
  remarks             text,
  created_by          uuid references public.profiles(id),
  submitted_at        timestamptz not null default now(),
  completed_at        timestamptz,
  updated_at          timestamptz not null default now(),
  unique (token_date, token_number),
  check (channel <> 'retailer' or retailer_id is not null)
);

create table public.request_documents (
  id                   uuid primary key default gen_random_uuid(),
  request_id           uuid not null references public.service_requests(id),
  kind                 public.document_kind not null default 'input',
  required_document_id uuid references public.service_required_documents(id),
  document_name        text not null,
  storage_path         text not null,             -- '<request_id>/<file>' in bucket request-documents
  mime_type            text,
  size_bytes           bigint,
  uploaded_by          uuid references public.profiles(id),
  verification         public.verification not null default 'pending',
  verification_note    text,
  verified_by          uuid references public.profiles(id),
  created_at           timestamptz not null default now()
);

create table public.request_status_history (
  id          bigint generated always as identity primary key,
  request_id  uuid not null references public.service_requests(id),
  from_status public.request_status,
  to_status   public.request_status not null,
  changed_by  uuid references public.profiles(id),
  note        text,
  created_at  timestamptz not null default now()
);

create table public.retailer_settlements (
  id                uuid primary key default gen_random_uuid(),
  retailer_id       uuid not null references public.retailers(id),
  period_start      date not null,
  period_end        date not null,
  request_count     int not null default 0,
  gross_amount      numeric(12,2) not null default 0,  -- customer prices
  commission_amount numeric(12,2) not null default 0,  -- kept by retailer
  amount_due        numeric(12,2) not null default 0,  -- owed to OMSUN
  amount_received   numeric(12,2) not null default 0,
  balance           numeric(12,2) generated always as (amount_due - amount_received) stored,
  status            public.settlement_status not null default 'draft',
  created_by        uuid references public.profiles(id),
  finalized_at      timestamptz,
  created_at        timestamptz not null default now(),
  unique (retailer_id, period_start),
  check (period_end >= period_start)
);

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  receipt_number  text not null unique,
  purpose         public.payment_purpose not null default 'service',
  request_id      uuid references public.service_requests(id),
  retailer_id     uuid references public.retailers(id),
  settlement_id   uuid references public.retailer_settlements(id),
  payer_type      public.payer_type not null default 'customer',
  amount          numeric(10,2) not null check (amount > 0),
  method          public.payment_method not null,
  reference       text,                           -- UPI ref / cheque no.
  status          public.payment_state not null default 'recorded',
  paid_on         date not null default ((now() at time zone 'Asia/Kolkata')::date),
  received_by     uuid references public.profiles(id),
  verified_by     uuid references public.profiles(id),
  verified_at     timestamptz,
  reversal_reason text,
  notes           text,
  created_at      timestamptz not null default now(),
  check (purpose <> 'service'     or request_id  is not null),
  check (purpose =  'service'     or retailer_id is not null)
);

create table public.commissions (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null unique references public.service_requests(id),
  retailer_id   uuid not null references public.retailers(id),
  amount        numeric(10,2) not null,
  status        public.commission_status not null default 'on_hold',
  earned_at     timestamptz,
  settlement_id uuid references public.retailer_settlements(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.leads (
  id                    uuid primary key default gen_random_uuid(),
  full_name             text not null,
  mobile                text not null,
  village               text,
  taluka                text,
  district              text,
  business_type         text,
  source                text,                     -- call, camp, referral, website, walk-in...
  interest              text,                     -- retailer joining, a service...
  stage                 public.lead_stage not null default 'new_lead',
  assigned_to           uuid references public.profiles(id),
  last_contact_at       timestamptz,
  next_follow_up_on     date,
  notes                 text,
  converted_retailer_id uuid references public.retailers(id),
  created_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table public.lead_activities (
  id            bigint generated always as identity primary key,
  lead_id       uuid not null references public.leads(id) on delete cascade,
  activity_type text not null check (activity_type in ('call','whatsapp','visit','meeting','note')),
  outcome       text check (outcome in ('not_connected','connected','conversation','interested',
                                        'not_interested','follow_up','payment')),
  notes         text,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

create table public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid references public.profiles(id),
  retailer_id uuid references public.retailers(id),
  request_id  uuid references public.service_requests(id),
  subject     text not null,
  description text,
  status      public.ticket_status not null default 'open',
  assigned_to uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,            -- app translates by type: request_status, assigned...
  title      text not null,
  body       text,
  request_id uuid references public.service_requests(id),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title_en    text not null,
  title_mr    text,
  body_en     text,
  body_mr     text,
  target_role public.app_role,          -- null = everyone
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table public.audit_logs (
  id         bigint generated always as identity primary key,
  actor      uuid,
  action     text not null,
  table_name text not null,
  record_id  text,
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz not null default now()
);

create index on public.service_requests (status);
create index on public.service_requests (retailer_id);
create index on public.service_requests (assigned_to);
create index on public.service_requests (customer_id);
create index on public.request_documents (request_id);
create index on public.request_status_history (request_id);
create index on public.payments (request_id);
create index on public.payments (retailer_id);
create index on public.commissions (retailer_id, status);
create index on public.customers (retailer_id);
create index on public.customers (mobile);
create index on public.leads (assigned_to, next_follow_up_on);
create index on public.notifications (user_id, is_read);

-- ---------------------------------------------------------------------
-- 3. Helper functions (used by security policies and triggers)
-- ---------------------------------------------------------------------
create function public.today_ist() returns date language sql stable as
$$ select (now() at time zone 'Asia/Kolkata')::date $$;

create function public.app_current_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and is_active
$$;

create function public.has_role(variadic roles public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_current_role() = any(roles), false)
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select has_role('owner','manager','accountant','sales_executive','service_executive')
$$;

create function public.my_retailer_id() returns uuid
language sql stable security definer set search_path = public as $$
  select r.id from retailers r join profiles p on p.id = r.profile_id
  where r.profile_id = auth.uid() and p.is_active
$$;

-- Owner/manager, the assigned employee, or the retailer who owns the request.
create function public.can_work_request(req uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from service_requests r
    where r.id = req
      and ( has_role('owner','manager')
         or (r.assigned_to = auth.uid() and has_role('service_executive','manager','owner'))
         or (r.retailer_id is not null and r.retailer_id = my_retailer_id()) )
  )
$$;

create function public.can_see_request(req uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select has_role('accountant','sales_executive') or can_work_request(req)
$$;

create function public.request_transition_allowed(f public.request_status, t public.request_status)
returns boolean language sql immutable as $$
  select case f
    when 'new'                then t in ('assigned','documents_required','rejected','cancelled')
    when 'assigned'           then t in ('under_process','documents_required','rejected','cancelled')
    when 'documents_required' then t in ('documents_received','rejected','cancelled')
    when 'documents_received' then t in ('under_process','documents_required','rejected','cancelled')
    when 'under_process'      then t in ('pending','documents_required','completed','rejected','cancelled')
    when 'pending'            then t in ('under_process','completed','rejected','cancelled')
    else false
  end
$$;

create function public.is_internal() returns boolean language sql stable as
$$ select coalesce(current_setting('omsun.internal', true), '') = 'on' $$;

create function public.next_request_number() returns text language sql volatile as $$
  select 'OMS-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMM') || '-'
         || lpad(nextval('public.request_number_seq')::text, 6, '0')
$$;

create function public.next_receipt_number() returns text language sql volatile as $$
  select 'RCP-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMM') || '-'
         || lpad(nextval('public.receipt_number_seq')::text, 6, '0')
$$;

create function public.notify(p_user uuid, p_type text, p_title text, p_body text, p_request uuid)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, title, body, request_id)
  select p_user, p_type, p_title, p_body, p_request where p_user is not null
$$;

-- Keeps the request's commission row in line with its status and payment.
create function public.sync_commission(req uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r service_requests;
  target commission_status;
begin
  select * into r from service_requests where id = req;
  if r.retailer_id is null then return; end if;

  if r.status = 'completed' then
    target := case when r.amount_paid >= r.amount_due then 'earned' else 'on_hold' end;
    insert into commissions (request_id, retailer_id, amount, status, earned_at)
    values (r.id, r.retailer_id, r.retailer_commission, target,
            case when target = 'earned' then now() end)
    on conflict (request_id) do update
      set status    = excluded.status,
          amount    = excluded.amount,
          earned_at = coalesce(commissions.earned_at, excluded.earned_at),
          updated_at = now()
      where commissions.status <> 'settled';
  elsif r.status in ('rejected','cancelled') then
    update commissions set status = 'cancelled', updated_at = now()
    where request_id = req and status in ('on_hold','earned');
  else  -- reopened by owner
    update commissions set status = 'on_hold', updated_at = now()
    where request_id = req and status = 'earned';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------
create function public.tg_set_updated_at() returns trigger language plpgsql as
$$ begin new.updated_at := now(); return new; end $$;

create trigger set_updated_at before update on public.retailers        for each row execute function public.tg_set_updated_at();
create trigger set_updated_at before update on public.services         for each row execute function public.tg_set_updated_at();
create trigger set_updated_at before update on public.leads            for each row execute function public.tg_set_updated_at();
create trigger set_updated_at before update on public.support_tickets  for each row execute function public.tg_set_updated_at();
create trigger set_updated_at before update on public.commissions      for each row execute function public.tg_set_updated_at();

-- 4.1 New login -> profile (role retailer). Links a retailer row created earlier by staff.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m text := nullif(right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 10), '');
begin
  insert into profiles (id, mobile, email, full_name)
  values (new.id, m, new.email, new.raw_user_meta_data ->> 'full_name');
  if m is not null then
    update retailers set profile_id = new.id where mobile = m and profile_id is null;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4.2 Only the owner changes roles; managers may handle retailer/field staff accounts.
create function public.tg_profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is null then return new; end if;
  if new.id <> old.id then raise exception 'profile id cannot change'; end if;
  if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
    if has_role('owner') then
      null;
    elsif has_role('manager')
          and old.role in ('retailer','sales_executive','service_executive')
          and new.role in ('retailer','sales_executive','service_executive') then
      null;
    else
      raise exception 'not allowed to change role or active status';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.tg_profiles_guard();

-- 4.3 Retailer rows: self sign-up stays pending; only owner/manager approve.
create function public.tg_retailers_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if has_role('retailer') then
      new.profile_id := auth.uid();
      new.status := 'pending';
      new.joining_fee_paid := false;
    elsif not has_role('owner','manager') then
      new.status := 'pending';
      new.joining_fee_paid := false;
    end if;
    if has_role('sales_executive') then new.onboarded_by := auth.uid(); end if;
  else
    if not has_role('owner','manager') and (
         new.status is distinct from old.status
      or new.joining_fee_paid is distinct from old.joining_fee_paid
      or new.joining_fee_amount is distinct from old.joining_fee_amount
      or new.joined_on is distinct from old.joined_on
      or new.profile_id is distinct from old.profile_id) then
      raise exception 'only owner or manager can change approval, fee or login link';
    end if;
  end if;
  if new.status = 'approved' and new.joined_on is null then new.joined_on := today_ist(); end if;
  return new;
end $$;

create trigger retailers_guard before insert or update on public.retailers
  for each row execute function public.tg_retailers_guard();

-- 4.4 Managers may edit the catalogue but not prices or commission.
create function public.tg_services_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not has_role('owner') and (
       new.govt_fee is distinct from old.govt_fee
    or new.service_charge is distinct from old.service_charge
    or new.retailer_commission is distinct from old.retailer_commission) then
    raise exception 'only the owner can change prices or commission';
  end if;
  return new;
end $$;

create trigger services_guard before update on public.services
  for each row execute function public.tg_services_guard();

-- 4.5 Customers created by a retailer always belong to that retailer.
create function public.tg_customers_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if has_role('retailer') then
    new.retailer_id := my_retailer_id();
  end if;
  if tg_op = 'INSERT' then new.created_by := auth.uid(); end if;
  return new;
end $$;

create trigger customers_guard before insert or update on public.customers
  for each row execute function public.tg_customers_guard();

-- 4.6 Service request: creation
create function public.tg_requests_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s services;
  rid uuid;
begin
  if auth.uid() is not null then
    if has_role('retailer') then
      select r.id into rid from retailers r where r.id = my_retailer_id() and r.status = 'approved';
      if rid is null then raise exception 'retailer account is not approved yet'; end if;
      new.channel := 'retailer';
      new.retailer_id := rid;
      new.assigned_to := null;
      if not exists (select 1 from customers c where c.id = new.customer_id and c.retailer_id = rid) then
        raise exception 'customer does not belong to this retailer';
      end if;
    elsif not has_role('owner','manager','service_executive') then
      raise exception 'this role cannot create service requests';
    end if;
    new.created_by := auth.uid();
  end if;

  select * into s from services where id = new.service_id;
  if not found or not s.is_active then raise exception 'service is not available'; end if;
  if new.channel = 'retailer' and not s.available_to_retailers then
    raise exception 'service is not offered to retailers';
  end if;

  new.request_number      := coalesce(new.request_number, next_request_number());
  new.status              := case when new.assigned_to is not null then 'assigned' else 'new' end;
  new.govt_fee            := s.govt_fee;
  new.service_charge      := s.service_charge;
  new.retailer_commission := case when new.retailer_id is null then 0 else s.retailer_commission end;
  new.amount_due          := s.govt_fee + s.service_charge - new.retailer_commission;
  new.amount_paid         := 0;
  new.payment_status      := 'unpaid';
  new.submitted_at        := now();
  new.completed_at        := null;

  if new.channel = 'walk_in' then
    perform pg_advisory_xact_lock(hashtext('omsun_token'));
    new.token_date := today_ist();
    select coalesce(max(token_number), 0) + 1 into new.token_number
    from service_requests where token_date = new.token_date;
  else
    new.token_date := null;
    new.token_number := null;
  end if;
  return new;
end $$;

create trigger requests_before_insert before insert on public.service_requests
  for each row execute function public.tg_requests_before_insert();

-- 4.7 Service request: updates (field rules + status lifecycle)
create function public.tg_requests_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  system_call boolean := auth.uid() is null;
  internal    boolean := is_internal();
  -- customer_price is generated, so it is not yet set on NEW in a BEFORE trigger
  frozen      text[]  := array['status','last_status_note','updated_at','customer_price'];
begin
  if not system_call and not internal then
    -- amount_paid is maintained only from payments
    if new.amount_paid is distinct from old.amount_paid then
      raise exception 'amount paid is updated from payments only';
    end if;
    -- retailers and service staff may only move the status
    if has_role('retailer','service_executive')
       and (to_jsonb(new) - frozen) is distinct from (to_jsonb(old) - frozen) then
      raise exception 'only the status and its note can be changed';
    end if;
    -- snapshot and ownership fields: owner only
    if not has_role('owner') and (
         new.govt_fee is distinct from old.govt_fee
      or new.service_charge is distinct from old.service_charge
      or new.retailer_commission is distinct from old.retailer_commission
      or new.retailer_id is distinct from old.retailer_id
      or new.channel is distinct from old.channel
      or new.request_number is distinct from old.request_number
      or new.token_number is distinct from old.token_number) then
      raise exception 'only the owner can change price, retailer or numbering';
    end if;
  end if;

  -- assigning a new request moves it to "assigned"
  if old.status = 'new' and new.status = 'new' and new.assigned_to is not null then
    new.status := 'assigned';
  end if;

  if new.status is distinct from old.status and not system_call then
    if has_role('retailer') and not (
         (old.status = 'new' and new.status = 'cancelled')
      or (old.status = 'documents_required' and new.status = 'documents_received')) then
      raise exception 'retailer can only cancel a new request or confirm documents';
    end if;
    if has_role('service_executive') and new.status = 'cancelled' then
      raise exception 'only manager or owner can cancel';
    end if;
    if not request_transition_allowed(old.status, new.status)
       and not (has_role('owner')
                and old.status in ('completed','rejected','cancelled')
                and new.status = 'under_process') then
      raise exception 'status cannot move from % to %', old.status, new.status;
    end if;
  end if;

  if new.status is distinct from old.status then
    -- a note left over from the previous change does not carry into this one
    if new.last_status_note is not distinct from old.last_status_note then
      new.last_status_note := null;
    end if;
    if new.status = 'assigned' and new.assigned_to is null then
      raise exception 'assign an employee first';
    end if;
    if new.status in ('rejected','documents_required','cancelled')
       and coalesce(btrim(new.last_status_note), '') = '' then
      raise exception 'a note is required for status %', new.status;
    end if;
    if new.status = 'completed' then
      if not exists (select 1 from request_documents d
                     where d.request_id = new.id and d.kind = 'output') then
        raise exception 'attach the completed document before marking completed';
      end if;
      if new.channel = 'walk_in' and new.amount_paid < new.amount_due then
        raise exception 'walk-in request must be fully paid before completion';
      end if;
      new.completed_at := now();
    else
      new.completed_at := null;
    end if;
  end if;

  new.amount_due := new.govt_fee + new.service_charge - new.retailer_commission;
  new.payment_status := case
    when new.amount_paid >= new.amount_due then 'paid'
    when new.amount_paid > 0 then 'partial'
    else 'unpaid' end;
  new.updated_at := now();
  return new;
end $$;

create trigger requests_before_update before update on public.service_requests
  for each row execute function public.tg_requests_before_update();

-- 4.8 History, notifications, commission
create function public.tg_requests_after_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare retailer_user uuid;
begin
  select profile_id into retailer_user from retailers where id = new.retailer_id;

  if tg_op = 'INSERT' then
    insert into request_status_history (request_id, from_status, to_status, changed_by, note)
    values (new.id, null, new.status, auth.uid(), new.last_status_note);
    if new.assigned_to is not null then
      perform notify(new.assigned_to, 'assigned', 'New work assigned', new.request_number, new.id);
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into request_status_history (request_id, from_status, to_status, changed_by, note)
    values (new.id, old.status, new.status, auth.uid(), new.last_status_note);
    if retailer_user is distinct from auth.uid() then
      perform notify(retailer_user, 'request_status',
                     new.request_number || ': ' || new.status::text, new.last_status_note, new.id);
    end if;
    perform sync_commission(new.id);
  end if;

  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
    perform notify(new.assigned_to, 'assigned', 'New work assigned', new.request_number, new.id);
  end if;
  return new;
end $$;

create trigger requests_after_write after insert or update on public.service_requests
  for each row execute function public.tg_requests_after_write();

-- 4.9 Documents: retailers upload inputs only; an upload answers "documents required".
create function public.tg_documents_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.uploaded_by := auth.uid();
    if has_role('retailer') then
      new.kind := 'input';
      new.verification := 'pending';
      new.verified_by := null;
    end if;
  end if;
  if new.storage_path not like new.request_id::text || '/%' then
    raise exception 'storage path must start with the request id';
  end if;
  return new;
end $$;

create trigger documents_before_insert before insert on public.request_documents
  for each row execute function public.tg_documents_before_insert();

create function public.tg_documents_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if has_role('retailer') and new.kind = 'input' then
    perform set_config('omsun.internal', 'on', true);
    update service_requests
       set status = 'documents_received', last_status_note = 'Documents uploaded by retailer'
     where id = new.request_id and status = 'documents_required';
    perform set_config('omsun.internal', 'off', true);
  end if;
  return new;
end $$;

create trigger documents_after_insert after insert on public.request_documents
  for each row execute function public.tg_documents_after_insert();

create function public.tg_documents_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.request_id <> old.request_id or new.storage_path <> old.storage_path
     or new.kind <> old.kind or new.uploaded_by is distinct from old.uploaded_by then
    raise exception 'only verification fields can change';
  end if;
  if new.verification is distinct from old.verification and auth.uid() is not null then
    new.verified_by := auth.uid();
  end if;
  return new;
end $$;

create trigger documents_before_update before update on public.request_documents
  for each row execute function public.tg_documents_before_update();

-- 4.10 Payments: receipt numbers, no backdating, verify/reverse only.
create function public.tg_payments_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.received_by := auth.uid();
    if not has_role('owner','accountant') then
      new.status := 'recorded';
    end if;
    if not has_role('owner') and new.paid_on < today_ist() - 1 then
      raise exception 'backdated payments need the owner';
    end if;
  end if;
  if new.status = 'reversed' then raise exception 'a new payment cannot be reversed'; end if;
  if new.status = 'verified' then
    new.verified_by := auth.uid();
    new.verified_at := now();
  else
    new.verified_by := null;
    new.verified_at := null;
  end if;
  if new.request_id is not null and new.retailer_id is null then
    select retailer_id into new.retailer_id from service_requests where id = new.request_id;
  end if;
  new.receipt_number := coalesce(new.receipt_number, next_receipt_number());
  return new;
end $$;

create trigger payments_before_insert before insert on public.payments
  for each row execute function public.tg_payments_before_insert();

create function public.tg_payments_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare editable text[] := array['status','verified_by','verified_at','reversal_reason','notes'];
begin
  if (to_jsonb(new) - editable) is distinct from (to_jsonb(old) - editable) then
    raise exception 'payments cannot be edited; reverse and record again';
  end if;
  if old.status = 'reversed' then raise exception 'payment already reversed'; end if;
  if new.status is distinct from old.status then
    if new.status = 'recorded' then raise exception 'cannot un-verify a payment'; end if;
    if new.status = 'verified' then
      new.verified_by := auth.uid();
      new.verified_at := now();
    end if;
    if new.status = 'reversed' and coalesce(btrim(new.reversal_reason), '') = '' then
      raise exception 'reversal needs a reason';
    end if;
  end if;
  return new;
end $$;

create trigger payments_before_update before update on public.payments
  for each row execute function public.tg_payments_before_update();

create function public.tg_payments_after_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.request_id is not null then
    perform set_config('omsun.internal', 'on', true);
    update service_requests
       set amount_paid = (select coalesce(sum(amount), 0) from payments
                          where request_id = new.request_id and status <> 'reversed')
     where id = new.request_id;
    perform set_config('omsun.internal', 'off', true);
    perform sync_commission(new.request_id);
  end if;
  return new;
end $$;

create trigger payments_after_write after insert or update on public.payments
  for each row execute function public.tg_payments_after_write();

-- 4.11 Lead activity updates the lead's last contact.
create function public.tg_lead_activity_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update leads set last_contact_at = new.created_at where id = new.lead_id;
  return new;
end $$;

create function public.tg_set_created_by() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then new.created_by := auth.uid(); end if;
  return new;
end $$;

create trigger lead_activity_after_insert after insert on public.lead_activities
  for each row execute function public.tg_lead_activity_after_insert();
create trigger set_created_by before insert on public.leads            for each row execute function public.tg_set_created_by();
create trigger set_created_by before insert on public.lead_activities  for each row execute function public.tg_set_created_by();
create trigger set_created_by before insert on public.support_tickets  for each row execute function public.tg_set_created_by();
create trigger set_created_by before insert on public.announcements    for each row execute function public.tg_set_created_by();

-- 4.12 Audit log on key tables.
create function public.tg_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
        n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  insert into audit_logs (actor, action, table_name, record_id, old_data, new_data)
  values (auth.uid(), tg_op, tg_table_name, coalesce(n, o) ->> 'id', o, n);
  return coalesce(new, old);
end $$;

create trigger audit after insert or update or delete on public.profiles             for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.retailers            for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.services             for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.service_requests     for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.payments             for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.commissions          for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.retailer_settlements for each row execute function public.tg_audit();

-- ---------------------------------------------------------------------
-- 5. Monthly retailer settlement (accountant / owner)
-- ---------------------------------------------------------------------
create function public.create_retailer_settlement(p_retailer uuid, p_start date, p_end date)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if not has_role('owner','accountant') then raise exception 'not allowed'; end if;

  insert into retailer_settlements
    (retailer_id, period_start, period_end, request_count, gross_amount,
     commission_amount, amount_due, amount_received, created_by)
  select p_retailer, p_start, p_end, count(*),
         coalesce(sum(customer_price), 0), coalesce(sum(retailer_commission), 0),
         coalesce(sum(amount_due), 0), coalesce(sum(amount_paid), 0), auth.uid()
  from service_requests
  where retailer_id = p_retailer and status = 'completed'
    and (completed_at at time zone 'Asia/Kolkata')::date between p_start and p_end
  returning id into sid;

  update commissions c set settlement_id = sid
  from service_requests r
  where r.id = c.request_id and c.retailer_id = p_retailer and c.status = 'earned'
    and c.settlement_id is null
    and (r.completed_at at time zone 'Asia/Kolkata')::date between p_start and p_end;
  return sid;
end $$;

create function public.finalize_retailer_settlement(p_settlement uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role('owner','accountant') then raise exception 'not allowed'; end if;
  update retailer_settlements set status = 'finalized', finalized_at = now()
   where id = p_settlement and status = 'draft';
  if not found then raise exception 'settlement not found or already finalized'; end if;
  update commissions set status = 'settled' where settlement_id = p_settlement and status = 'earned';
end $$;

-- ---------------------------------------------------------------------
-- 6. Row level security
-- ---------------------------------------------------------------------
alter table public.profiles                   enable row level security;
alter table public.retailers                  enable row level security;
alter table public.employees                  enable row level security;
alter table public.service_categories         enable row level security;
alter table public.services                   enable row level security;
alter table public.service_required_documents enable row level security;
alter table public.customers                  enable row level security;
alter table public.service_requests           enable row level security;
alter table public.request_documents          enable row level security;
alter table public.request_status_history     enable row level security;
alter table public.payments                   enable row level security;
alter table public.commissions                enable row level security;
alter table public.retailer_settlements       enable row level security;
alter table public.leads                      enable row level security;
alter table public.lead_activities            enable row level security;
alter table public.support_tickets            enable row level security;
alter table public.notifications              enable row level security;
alter table public.announcements              enable row level security;
alter table public.audit_logs                 enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or is_staff());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or has_role('owner')
         or (has_role('manager') and role in ('retailer','sales_executive','service_executive')));

-- retailers
create policy retailers_select on public.retailers for select to authenticated
  using (profile_id = auth.uid() or is_staff());
create policy retailers_insert on public.retailers for insert to authenticated
  with check (has_role('owner','manager','sales_executive')
              or (has_role('retailer') and my_retailer_id() is null));
create policy retailers_update on public.retailers for update to authenticated
  using (has_role('owner','manager','sales_executive') or profile_id = auth.uid());

-- employees
create policy employees_select on public.employees for select to authenticated using (is_staff());
create policy employees_write  on public.employees for all to authenticated
  using (has_role('owner')) with check (has_role('owner'));

-- catalogue: public can read active services (website + app)
create policy categories_read on public.service_categories for select to anon, authenticated
  using (is_active or is_staff());
create policy categories_write on public.service_categories for all to authenticated
  using (has_role('owner','manager')) with check (has_role('owner','manager'));
create policy services_read on public.services for select to anon, authenticated
  using (is_active or is_staff());
create policy services_insert on public.services for insert to authenticated with check (has_role('owner'));
create policy services_update on public.services for update to authenticated using (has_role('owner','manager'));
create policy reqdocs_read on public.service_required_documents for select to anon, authenticated using (true);
create policy reqdocs_write on public.service_required_documents for all to authenticated
  using (has_role('owner','manager')) with check (has_role('owner','manager'));

-- customers
create policy customers_select on public.customers for select to authenticated
  using (is_staff() or (retailer_id is not null and retailer_id = my_retailer_id()));
create policy customers_insert on public.customers for insert to authenticated
  with check (has_role('owner','manager','service_executive','retailer'));
create policy customers_update on public.customers for update to authenticated
  using (has_role('owner','manager','service_executive')
         or (retailer_id is not null and retailer_id = my_retailer_id()));

-- service requests
create policy requests_select on public.service_requests for select to authenticated
  using (has_role('owner','manager','accountant','sales_executive')
         or assigned_to = auth.uid()
         or (retailer_id is not null and retailer_id = my_retailer_id()));
create policy requests_insert on public.service_requests for insert to authenticated
  with check (has_role('owner','manager','service_executive','retailer'));
create policy requests_update on public.service_requests for update to authenticated
  using (has_role('owner','manager')
         or (has_role('service_executive') and assigned_to = auth.uid())
         or (retailer_id is not null and retailer_id = my_retailer_id()));

-- request documents
create policy documents_select on public.request_documents for select to authenticated
  using (has_role('accountant') or can_work_request(request_id));
create policy documents_insert on public.request_documents for insert to authenticated
  with check (can_work_request(request_id));
create policy documents_update on public.request_documents for update to authenticated
  using (has_role('owner','manager')
         or (has_role('service_executive') and can_work_request(request_id)));

-- status history (written by trigger only)
create policy history_select on public.request_status_history for select to authenticated
  using (has_role('accountant') or can_work_request(request_id));

-- payments
create policy payments_select on public.payments for select to authenticated
  using (has_role('owner','manager','accountant')
         or received_by = auth.uid()
         or (retailer_id is not null and retailer_id = my_retailer_id()));
create policy payments_insert on public.payments for insert to authenticated
  with check (has_role('owner','manager','accountant','service_executive'));
create policy payments_update on public.payments for update to authenticated
  using (has_role('owner','accountant'));

-- commissions (created by trigger)
create policy commissions_select on public.commissions for select to authenticated
  using (has_role('owner','manager','accountant') or retailer_id = my_retailer_id());
create policy commissions_update on public.commissions for update to authenticated
  using (has_role('owner','accountant'));

-- settlements (created by function)
create policy settlements_select on public.retailer_settlements for select to authenticated
  using (has_role('owner','manager','accountant') or retailer_id = my_retailer_id());
create policy settlements_update on public.retailer_settlements for update to authenticated
  using (has_role('owner','accountant'));

-- leads
create policy leads_select on public.leads for select to authenticated
  using (has_role('owner','manager') or assigned_to = auth.uid() or created_by = auth.uid());
create policy leads_insert on public.leads for insert to authenticated
  with check (has_role('owner','manager','sales_executive'));
create policy leads_update on public.leads for update to authenticated
  using (has_role('owner','manager') or assigned_to = auth.uid());
create policy lead_activities_select on public.lead_activities for select to authenticated
  using (exists (select 1 from leads l where l.id = lead_id));
create policy lead_activities_insert on public.lead_activities for insert to authenticated
  with check (has_role('owner','manager','sales_executive')
              and exists (select 1 from leads l where l.id = lead_id));

-- support tickets
create policy tickets_select on public.support_tickets for select to authenticated
  using (has_role('owner','manager','accountant') or created_by = auth.uid() or assigned_to = auth.uid());
create policy tickets_insert on public.support_tickets for insert to authenticated with check (true);
create policy tickets_update on public.support_tickets for update to authenticated
  using (has_role('owner','manager') or assigned_to = auth.uid() or created_by = auth.uid());

-- notifications (created by triggers)
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid());

-- announcements
create policy announcements_select on public.announcements for select to authenticated
  using (has_role('owner','manager')
         or (is_active and (target_role is null or target_role = app_current_role())));
create policy announcements_write on public.announcements for all to authenticated
  using (has_role('owner','manager')) with check (has_role('owner','manager'));

-- audit log
create policy audit_select on public.audit_logs for select to authenticated using (has_role('owner'));

-- Internal helpers are not callable from the apps.
revoke execute on function public.sync_commission(uuid) from public, anon, authenticated;
revoke execute on function public.notify(uuid, text, text, text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Storage: private bucket for customer documents
--    Path: <request_id>/<file name>. Apps use signed URLs to view.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('request-documents', 'request-documents', false);

create policy "request docs read" on storage.objects for select to authenticated
  using (bucket_id = 'request-documents'
         and (public.has_role('accountant')
              or public.can_work_request(((storage.foldername(name))[1])::uuid)));
create policy "request docs upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'request-documents'
              and public.can_work_request(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------------
-- 8. Realtime: push these changes to the apps
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table
  public.service_requests, public.request_status_history, public.notifications, public.support_tickets;
