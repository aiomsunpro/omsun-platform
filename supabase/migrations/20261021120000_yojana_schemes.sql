
-- =====================================================================
-- OMSUN Platform — Yojana eligibility: family profiles and scheme rules
-- 2026-10-21. Builds on the earlier migrations.
--
-- A retailer (or office staff) screens a whole family once, and the
-- answers are tested against every scheme's rules. This file adds:
--   * profile_fields: the profile questions. Nothing about them is
--     hard-coded; the owner edits wording, options and income bands.
--   * families / family_members: one household, one row per person, the
--     answers kept as JSON keyed by profile_fields.key.
--   * schemes and their rules, documents, steps and linked services
--     (the live catalogue). Apps read these; nobody writes them directly.
--   * scheme_versions: every edit is a draft with a note and source. A
--     the owner approves it, and only then publish_scheme_version()
--     copies it into the live tables. Old versions are kept for rollback.
--   * scheme_suggestions: retailers report a change they saw in the field.
--   * screenings / screening_results: what a screening found, per member.
--
-- The matching function and the first schemes come in the next migration.
-- =====================================================================

create type public.profile_scope   as enum ('household','member');
create type public.profile_kind    as enum ('number','band','choice','multi','yes_no','date');
create type public.scheme_level    as enum ('central','state');
create type public.scheme_status   as enum ('open','closed','seasonal');
create type public.version_status  as enum ('draft','in_review','sent_back','published','discarded');
create type public.screen_result   as enum ('eligible','check','not_eligible');

-- ---------------------------------------------------------------------
-- 1. Profile questions
-- ---------------------------------------------------------------------
-- options: for choice / multi / band, a list of
--   {"value": "upto_21000", "en": "Up to ₹21,000", "mr": "…", "hi": "…", "min": 0, "max": 21000}
-- (min / max only for bands; they let a rule on a number be decided
-- from a band answer).
create table public.profile_fields (
  key         text primary key check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  scope       public.profile_scope not null,
  kind        public.profile_kind not null,
  block       int not null check (block between 1 and 20),
  label_en    text not null check (length(btrim(label_en)) between 1 and 200),
  label_mr    text not null check (length(btrim(label_mr)) between 1 and 200),
  label_hi    text,
  help_en     text,
  help_mr     text,
  options     jsonb not null default '[]' check (jsonb_typeof(options) = 'array'),
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Families
-- ---------------------------------------------------------------------
create table public.families (
  id             uuid primary key default gen_random_uuid(),
  retailer_id    uuid references public.retailers(id),   -- null = OMSUN office family
  family_name    text not null check (length(btrim(family_name)) between 1 and 120),
  mobile         text,
  village        text,
  taluka         text,
  district       text,
  answers        jsonb not null default '{}' check (jsonb_typeof(answers) = 'object'),
  consent_method text check (consent_method in ('otp','verbal')),
  consent_at     timestamptz,
  consent_by     uuid references public.profiles(id),
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.families (retailer_id);
create index on public.families (mobile);

create table public.family_members (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  full_name   text not null check (length(btrim(full_name)) between 1 and 120),
  relation    text not null default 'self'
              check (relation in ('self','spouse','son','daughter','father','mother','other')),
  answers     jsonb not null default '{}' check (jsonb_typeof(answers) = 'object'),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.family_members (family_id);
create index on public.family_members (customer_id);

-- ---------------------------------------------------------------------
-- 3. Live scheme catalogue (written only by publish_scheme_version)
-- ---------------------------------------------------------------------
create table public.schemes (
  id                 uuid primary key,
  code               text not null unique check (code ~ '^[A-Z0-9][A-Z0-9-]{1,40}$'),
  name_en            text not null,
  name_mr            text not null,
  name_hi            text,
  level              public.scheme_level not null,
  state              text check (state is null or state ~ '^[A-Z]{2}$'),  -- 'MH'; null for central
  department         text,
  category           text not null,         -- agriculture, education, health, pension, housing, business, women_child, welfare
  benefit_en         text,
  benefit_mr         text,
  benefit_hi         text,
  benefit_type       text check (benefit_type in ('cash','subsidy','loan','insurance','service','other')),
  benefit_yearly     numeric(12,2) check (benefit_yearly >= 0),   -- for ranking; rupees per year
  apply_url          text,
  apply_mode         text check (apply_mode in ('online','offline','csc','mixed')),
  status             public.scheme_status not null default 'open',
  deadline           date,
  last_verified_on   date,
  source_url         text,
  current_version_id uuid,
  published_at       timestamptz not null default now(),
  check ((level = 'state') = (state is not null))
);

create table public.scheme_rules (
  id           uuid primary key default gen_random_uuid(),
  scheme_id    uuid not null references public.schemes(id) on delete cascade,
  is_exclusion boolean not null default false,   -- matched exclusion = not eligible
  rule_group   int not null default 1 check (rule_group between 1 and 20),  -- AND inside, OR across
  field        text not null references public.profile_fields(key) on update cascade,
  op           text not null check (op in ('=','!=','<','<=','>','>=','between','in','not_in','contains','not_contains','exists')),
  value        jsonb,                            -- number, text, true/false, [a,b] for between, list for in
  manual_check boolean not null default false,   -- cannot be decided from answers: shown to the agent
  question_en  text,                             -- asked when the field is unknown
  question_mr  text,
  note         text,
  sort_order   int not null default 0,
  check (op = 'exists' or value is not null)
);
create index on public.scheme_rules (scheme_id);

create table public.scheme_documents (
  id                uuid primary key default gen_random_uuid(),
  scheme_id         uuid not null references public.schemes(id) on delete cascade,
  name_en           text not null,
  name_mr           text not null,
  is_mandatory      boolean not null default true,
  issued_by         text,
  help_service_code text,      -- an OMSUN service that gets this document for the customer
  sort_order        int not null default 0
);
create index on public.scheme_documents (scheme_id);

create table public.scheme_steps (
  id           uuid primary key default gen_random_uuid(),
  scheme_id    uuid not null references public.schemes(id) on delete cascade,
  step_no      int not null,
  where_en     text,
  where_mr     text,
  what_en      text not null,
  what_mr      text not null,
  typical_days int,
  unique (scheme_id, step_no)
);

-- The paid OMSUN service for applying. Its price comes from services, so it
-- is the same head-office price everywhere.
create table public.scheme_services (
  scheme_id  uuid not null references public.schemes(id) on delete cascade,
  service_id uuid not null references public.services(id),
  primary key (scheme_id, service_id)
);

-- ---------------------------------------------------------------------
-- 4. Drafts, review and history
-- ---------------------------------------------------------------------
-- data holds the whole scheme in one JSON object: the schemes columns
-- (code, name_en, ...) plus "rules", "documents", "steps" (arrays of the
-- table columns) and "service_codes" (array of services.code).
create table public.scheme_versions (
  id           uuid primary key default gen_random_uuid(),
  scheme_id    uuid not null default gen_random_uuid(),   -- a new scheme gets its id here
  version_no   int not null,
  data         jsonb not null check (jsonb_typeof(data) = 'object'),
  status       public.version_status not null default 'draft',
  change_note  text not null check (length(btrim(change_note)) between 3 and 1000),
  source       text,                                       -- GR number, notification, field report
  based_on     uuid references public.scheme_versions(id),
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_by  uuid references public.profiles(id),
  reviewed_at  timestamptz,
  review_note  text,
  published_at timestamptz,
  unique (scheme_id, version_no)
);
create index on public.scheme_versions (status);
alter table public.schemes add foreign key (current_version_id) references public.scheme_versions(id);

create table public.scheme_suggestions (
  id          uuid primary key default gen_random_uuid(),
  scheme_id   uuid references public.schemes(id) on delete set null,
  retailer_id uuid references public.retailers(id),
  message     text not null check (length(btrim(message)) between 3 and 2000),
  status      text not null default 'open' check (status in ('open','accepted','dismissed')),
  handled_by  uuid references public.profiles(id),
  handled_at  timestamptz,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index on public.scheme_suggestions (status);

-- ---------------------------------------------------------------------
-- 5. Screenings
-- ---------------------------------------------------------------------
create table public.screenings (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families(id) on delete cascade,
  profile    jsonb not null,          -- household + member answers at the time
  run_by     uuid references public.profiles(id),
  run_at     timestamptz not null default now()
);
create index on public.screenings (family_id, run_at desc);

create table public.screening_results (
  id             bigint generated always as identity primary key,
  screening_id   uuid not null references public.screenings(id) on delete cascade,
  member_id      uuid references public.family_members(id) on delete cascade,  -- null = household-only scheme
  scheme_id      uuid not null references public.schemes(id) on delete cascade,
  version_id     uuid references public.scheme_versions(id),
  result         public.screen_result not null,
  reason         text,
  missing_fields text[] not null default '{}'
);
create index on public.screening_results (screening_id);
create index on public.screening_results (scheme_id, result);

-- ---------------------------------------------------------------------
-- 6. Helpers and triggers
-- ---------------------------------------------------------------------
create function public.can_see_family(fam uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from families f
    where f.id = fam
      and (is_staff() or (f.retailer_id is not null and f.retailer_id = my_retailer_id()))
  )
$$;

-- A family made by a retailer always belongs to that retailer. Consent is
-- stamped with who recorded it.
create function public.tg_families_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if has_role('retailer') then
    new.retailer_id := my_retailer_id();
    if new.retailer_id is null then raise exception 'retailer account is not set up yet'; end if;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  if new.consent_method is not null
     and (tg_op = 'INSERT' or new.consent_method is distinct from old.consent_method) then
    new.consent_at := now();
    new.consent_by := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.consent_at := old.consent_at;
    new.consent_by := old.consent_by;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger families_guard before insert or update on public.families
  for each row execute function public.tg_families_guard();

-- A member can only be linked to a customer the same retailer owns.
create function public.tg_family_members_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if tg_op = 'UPDATE' then new.family_id := old.family_id; new.created_at := old.created_at; end if;
  if new.customer_id is not null and auth.uid() is not null and has_role('retailer') then
    select retailer_id into rid from families where id = new.family_id;
    if not exists (select 1 from customers c where c.id = new.customer_id and c.retailer_id = rid) then
      raise exception 'customer does not belong to this retailer';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger family_members_guard before insert or update on public.family_members
  for each row execute function public.tg_family_members_guard();

create trigger set_updated_at before update on public.profile_fields
  for each row execute function public.tg_set_updated_at();

-- Drafts: the author edits a draft (or one sent back) and submits it.
-- Reviewing and publishing happen only in review_scheme_version().
create function public.tg_scheme_versions_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_internal() then return new; end if;
  if tg_op = 'INSERT' then
    new.status       := 'draft';
    new.created_by   := auth.uid();
    new.created_at   := now();
    new.submitted_at := null;
    new.reviewed_by  := null;
    new.reviewed_at  := null;
    new.review_note  := null;
    new.published_at := null;
    -- a draft of an existing scheme must say which version it starts from
    if exists (select 1 from schemes where id = new.scheme_id) and new.based_on is null then
      select current_version_id into new.based_on from schemes where id = new.scheme_id;
    end if;
    perform pg_advisory_xact_lock(hashtext(new.scheme_id::text));
    select coalesce(max(version_no), 0) + 1 into new.version_no
      from scheme_versions where scheme_id = new.scheme_id;
    return new;
  end if;

  if old.created_by is distinct from auth.uid() and not has_role('owner') then
    raise exception 'only the author can change this draft';
  end if;
  if old.status not in ('draft','sent_back') then
    raise exception 'this version is % and cannot be changed', old.status;
  end if;
  if new.status not in ('draft','in_review','discarded') then
    raise exception 'a draft can only be submitted for review or discarded';
  end if;
  new.id := old.id; new.scheme_id := old.scheme_id; new.version_no := old.version_no;
  new.based_on := old.based_on; new.created_by := old.created_by; new.created_at := old.created_at;
  new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
  new.review_note := old.review_note; new.published_at := null;
  new.submitted_at := case when new.status = 'in_review' then now() else old.submitted_at end;
  new.updated_at := now();
  return new;
end $$;
create trigger scheme_versions_guard before insert or update on public.scheme_versions
  for each row execute function public.tg_scheme_versions_guard();

create function public.tg_scheme_suggestions_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.retailer_id := my_retailer_id();
    new.status := 'open';
    new.handled_by := null; new.handled_at := null;
  else
    if not has_role('owner','manager') then raise exception 'only the office can close a suggestion'; end if;
    new.scheme_id := old.scheme_id; new.retailer_id := old.retailer_id; new.message := old.message;
    new.created_by := old.created_by; new.created_at := old.created_at;
    if new.status is distinct from old.status then
      new.handled_by := auth.uid(); new.handled_at := now();
    end if;
  end if;
  return new;
end $$;
create trigger scheme_suggestions_guard before insert or update on public.scheme_suggestions
  for each row execute function public.tg_scheme_suggestions_guard();

-- ---------------------------------------------------------------------
-- 7. Publish: copy an approved version into the live tables
-- ---------------------------------------------------------------------
create function public.publish_scheme_version(p_version uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v scheme_versions;
  d jsonb;
  r jsonb;
  missing text;
begin
  select * into v from scheme_versions where id = p_version;
  d := v.data;

  insert into schemes (id, code, name_en, name_mr, name_hi, level, state, department, category,
                       benefit_en, benefit_mr, benefit_hi, benefit_type, benefit_yearly,
                       apply_url, apply_mode, status, deadline, last_verified_on, source_url,
                       current_version_id, published_at)
  values (v.scheme_id, d->>'code', d->>'name_en', d->>'name_mr', d->>'name_hi',
          (d->>'level')::scheme_level, d->>'state', d->>'department', d->>'category',
          d->>'benefit_en', d->>'benefit_mr', d->>'benefit_hi', d->>'benefit_type',
          (d->>'benefit_yearly')::numeric, d->>'apply_url', d->>'apply_mode',
          coalesce((d->>'status')::scheme_status, 'open'), (d->>'deadline')::date,
          (d->>'last_verified_on')::date, d->>'source_url', v.id, now())
  on conflict (id) do update set
    code = excluded.code, name_en = excluded.name_en, name_mr = excluded.name_mr,
    name_hi = excluded.name_hi, level = excluded.level, state = excluded.state,
    department = excluded.department, category = excluded.category,
    benefit_en = excluded.benefit_en, benefit_mr = excluded.benefit_mr,
    benefit_hi = excluded.benefit_hi, benefit_type = excluded.benefit_type,
    benefit_yearly = excluded.benefit_yearly, apply_url = excluded.apply_url,
    apply_mode = excluded.apply_mode, status = excluded.status, deadline = excluded.deadline,
    last_verified_on = excluded.last_verified_on, source_url = excluded.source_url,
    current_version_id = excluded.current_version_id, published_at = excluded.published_at;

  delete from scheme_rules     where scheme_id = v.scheme_id;
  delete from scheme_documents where scheme_id = v.scheme_id;
  delete from scheme_steps     where scheme_id = v.scheme_id;
  delete from scheme_services  where scheme_id = v.scheme_id;

  for r in select * from jsonb_array_elements(coalesce(d->'rules', '[]')) loop
    if not exists (select 1 from profile_fields where key = r->>'field') then
      raise exception 'rule uses an unknown profile field: %', r->>'field';
    end if;
  end loop;
  insert into scheme_rules (scheme_id, is_exclusion, rule_group, field, op, value, manual_check,
                            question_en, question_mr, note, sort_order)
  select v.scheme_id, coalesce((x->>'is_exclusion')::boolean, false), coalesce((x->>'rule_group')::int, 1),
         x->>'field', x->>'op', x->'value', coalesce((x->>'manual_check')::boolean, false),
         x->>'question_en', x->>'question_mr', x->>'note', ord::int
  from jsonb_array_elements(coalesce(d->'rules', '[]')) with ordinality as t(x, ord);

  insert into scheme_documents (scheme_id, name_en, name_mr, is_mandatory, issued_by, help_service_code, sort_order)
  select v.scheme_id, x->>'name_en', x->>'name_mr', coalesce((x->>'is_mandatory')::boolean, true),
         x->>'issued_by', x->>'help_service_code', ord::int
  from jsonb_array_elements(coalesce(d->'documents', '[]')) with ordinality as t(x, ord);

  insert into scheme_steps (scheme_id, step_no, where_en, where_mr, what_en, what_mr, typical_days)
  select v.scheme_id, coalesce((x->>'step_no')::int, ord::int), x->>'where_en', x->>'where_mr',
         x->>'what_en', x->>'what_mr', (x->>'typical_days')::int
  from jsonb_array_elements(coalesce(d->'steps', '[]')) with ordinality as t(x, ord);

  select string_agg(c, ', ') into missing
  from jsonb_array_elements_text(coalesce(d->'service_codes', '[]')) c
  where not exists (select 1 from services s where s.code = c);
  if missing is not null then raise exception 'unknown service code: %', missing; end if;
  insert into scheme_services (scheme_id, service_id)
  select v.scheme_id, s.id from services s
  where s.code in (select jsonb_array_elements_text(coalesce(d->'service_codes', '[]')));
end $$;

-- Approve (publish) or send back a version in review. Managers write the
-- drafts; only the owner approves them (Aditya, 2026-10-21).
create function public.review_scheme_version(p_version uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v scheme_versions;
begin
  if not has_role('owner') then raise exception 'only the owner can approve scheme changes'; end if;
  select * into v from scheme_versions where id = p_version for update;
  if v.id is null then raise exception 'version not found'; end if;
  if v.status <> 'in_review' then raise exception 'this version is not waiting for review'; end if;
  if not p_approve and coalesce(btrim(p_note), '') = '' then
    raise exception 'say why the change is sent back';
  end if;
  if p_approve and exists (
       select 1 from schemes s where s.id = v.scheme_id
       and s.current_version_id is distinct from v.based_on) then
    raise exception 'the scheme changed after this draft was started; start a new draft from the live version';
  end if;

  perform set_config('omsun.internal', 'on', true);
  update scheme_versions
     set status = case when p_approve then 'published' else 'sent_back' end::version_status,
         reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note,
         published_at = case when p_approve then now() end
   where id = p_version;
  if p_approve then perform publish_scheme_version(p_version); end if;
  perform set_config('omsun.internal', 'off', true);
end $$;

-- Rollback: start a new draft that copies an older version. It goes
-- through review like any other change.
create function public.restore_scheme_version(p_version uuid, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v scheme_versions; nid uuid;
begin
  if not has_role('owner','manager') then raise exception 'not allowed'; end if;
  select * into v from scheme_versions where id = p_version;
  if v.id is null or v.status <> 'published' then raise exception 'only a published version can be restored'; end if;
  insert into scheme_versions (scheme_id, data, change_note, source)
  values (v.scheme_id, v.data, p_note, 'Restore of version ' || v.version_no)
  returning id into nid;
  return nid;
end $$;

-- ---------------------------------------------------------------------
-- 8. Security
-- ---------------------------------------------------------------------
alter table public.profile_fields      enable row level security;
alter table public.families            enable row level security;
alter table public.family_members      enable row level security;
alter table public.schemes             enable row level security;
alter table public.scheme_rules        enable row level security;
alter table public.scheme_documents    enable row level security;
alter table public.scheme_steps        enable row level security;
alter table public.scheme_services     enable row level security;
alter table public.scheme_versions     enable row level security;
alter table public.scheme_suggestions  enable row level security;
alter table public.screenings          enable row level security;
alter table public.screening_results   enable row level security;

-- profile questions: everyone reads (website quiz later); only the owner edits
create policy profile_fields_read on public.profile_fields for select to anon, authenticated
  using (is_active or is_staff());
create policy profile_fields_write on public.profile_fields for all to authenticated
  using (has_role('owner')) with check (has_role('owner'));

-- families: staff see all, a retailer only its own (same as customers)
create policy families_select on public.families for select to authenticated
  using (is_staff() or (retailer_id is not null and retailer_id = my_retailer_id()));
create policy families_insert on public.families for insert to authenticated
  with check (has_role('owner','manager','service_executive','retailer'));
create policy families_update on public.families for update to authenticated
  using (has_role('owner','manager','service_executive')
         or (retailer_id is not null and retailer_id = my_retailer_id()));
create policy members_select on public.family_members for select to authenticated
  using (can_see_family(family_id));
create policy members_write on public.family_members for all to authenticated
  using (can_see_family(family_id) and (has_role('owner','manager','service_executive','retailer')))
  with check (can_see_family(family_id) and (has_role('owner','manager','service_executive','retailer')));

-- live catalogue: readable by everyone, written only by publish_scheme_version
create policy schemes_read     on public.schemes          for select to anon, authenticated using (true);
create policy rules_read       on public.scheme_rules     for select to anon, authenticated using (true);
create policy sdocs_read       on public.scheme_documents for select to anon, authenticated using (true);
create policy steps_read       on public.scheme_steps     for select to anon, authenticated using (true);
create policy sservices_read   on public.scheme_services  for select to anon, authenticated using (true);

-- versions: owner and managers write drafts and see all; other staff read
create policy versions_select on public.scheme_versions for select to authenticated using (is_staff());
create policy versions_insert on public.scheme_versions for insert to authenticated
  with check (has_role('owner','manager'));
create policy versions_update on public.scheme_versions for update to authenticated
  using (has_role('owner','manager'));

-- suggestions: retailers and staff send, the office reads and closes
create policy suggestions_select on public.scheme_suggestions for select to authenticated
  using (is_staff() or created_by = auth.uid());
create policy suggestions_insert on public.scheme_suggestions for insert to authenticated
  with check (is_staff() or has_role('retailer'));
create policy suggestions_update on public.scheme_suggestions for update to authenticated
  using (has_role('owner','manager'));

-- screenings follow the family
create policy screenings_select on public.screenings for select to authenticated
  using (can_see_family(family_id));
create policy screening_results_select on public.screening_results for select to authenticated
  using (exists (select 1 from screenings s where s.id = screening_id and can_see_family(s.family_id)));

grant select on public.profile_fields, public.schemes, public.scheme_rules, public.scheme_documents,
  public.scheme_steps, public.scheme_services to anon, authenticated;
grant insert, update, delete on public.profile_fields to authenticated;
grant select, insert, update on public.families, public.scheme_versions, public.scheme_suggestions to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select on public.screenings, public.screening_results to authenticated;

grant execute on function
  public.can_see_family(uuid),
  public.review_scheme_version(uuid, boolean, text),
  public.restore_scheme_version(uuid, text)
to authenticated;
revoke execute on function public.publish_scheme_version(uuid) from public, anon, authenticated;

create trigger audit after insert or update or delete on public.profile_fields  for each row execute function public.tg_audit();
create trigger audit after insert or update or delete on public.scheme_versions for each row execute function public.tg_audit();
