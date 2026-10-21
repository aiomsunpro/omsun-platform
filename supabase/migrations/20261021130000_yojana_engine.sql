
-- =====================================================================
-- OMSUN Platform — Yojana eligibility: the matching engine
-- 2026-10-21. Builds on 20261021120000_yojana_schemes.sql.
--
-- Rule-based, no AI: the same answers always give the same result, and
-- every result says which answers decided it. Each rule gives pass, fail
-- or unknown ("Don't know" and unanswered are unknown, never no).
--   * a group passes when all its rules pass (AND); a scheme's rules pass
--     when any group passes (OR);
--   * an exclusion that matches makes the scheme not eligible;
--   * eligible       = rules pass, no exclusion matches or is unknown
--     check          = nothing failed for sure, but some answers are missing
--     not_eligible   = every group fails, or an exclusion matches.
-- A band answer (income "up to ₹2.5 lakh") is a range, so "income <= 1 lakh"
-- is unknown for it, while "income <= 2.5 lakh" passes.
--
--   screen_family(family)         runs every live scheme, saves a screening
--   screening_followups(screening) the next questions, by schemes they settle
--   scheme_version_impact(version) who a draft would add or remove, before approval
-- =====================================================================

alter table public.screening_results
  add column passed_fields text[] not null default '{}',
  add column failed_fields text[] not null default '{}',
  add column manual_notes  text[] not null default '{}';

-- A seeded draft has no author; the owner or any manager may then edit it.
create or replace function public.tg_scheme_versions_guard() returns trigger
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
    if exists (select 1 from schemes where id = new.scheme_id) and new.based_on is null then
      select current_version_id into new.based_on from schemes where id = new.scheme_id;
    end if;
    perform pg_advisory_xact_lock(hashtext(new.scheme_id::text));
    select coalesce(max(version_no), 0) + 1 into new.version_no
      from scheme_versions where scheme_id = new.scheme_id;
    return new;
  end if;

  if old.created_by is distinct from auth.uid() and not has_role('owner')
     and not (old.created_by is null and has_role('manager')) then
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

-- ---------------------------------------------------------------------
-- 1. One rule against one answer: 'pass', 'fail' or 'unknown'
-- ---------------------------------------------------------------------
create function public.rule_outcome(p_kind public.profile_kind, p_options jsonb, p_answer jsonb,
                                    p_op text, p_value jsonb)
returns text language plpgsql immutable set search_path = public as $$
declare
  lo numeric; hi numeric; v numeric; a numeric; b numeric;
  opt jsonb; t text;
begin
  if p_answer is null or jsonb_typeof(p_answer) = 'null' or p_answer = '"dont_know"' then
    return 'unknown';
  end if;

  if p_op = 'exists' then
    return case when p_answer in ('false', '[]', '""', '"none"') then 'fail' else 'pass' end;
  end if;

  if p_kind = 'multi' then
    if jsonb_typeof(p_answer) <> 'array' then return 'unknown'; end if;
    return case p_op
      when 'contains'     then case when p_answer @> jsonb_build_array(p_value) then 'pass' else 'fail' end
      when 'not_contains' then case when p_answer @> jsonb_build_array(p_value) then 'fail' else 'pass' end
      else 'unknown' end;
  end if;

  -- in / not in: compare the answer itself (choice value, band value, yes/no)
  if p_op in ('in','not_in') then
    if jsonb_typeof(p_value) <> 'array' then return 'unknown'; end if;
    return case when (p_value @> jsonb_build_array(p_answer)) = (p_op = 'in') then 'pass' else 'fail' end;
  end if;

  if p_kind in ('number','band') and p_op in ('=','!=','<','<=','>','>=','between') then
    if p_kind = 'number' then
      if jsonb_typeof(p_answer) <> 'number' then return 'unknown'; end if;
      lo := p_answer::text::numeric; hi := lo;
    else
      select o into opt from jsonb_array_elements(p_options) o where o->>'value' = p_answer #>> '{}';
      if opt is null then return 'unknown'; end if;
      lo := coalesce((opt->>'min')::numeric, '-Infinity');
      hi := coalesce((opt->>'max')::numeric, 'Infinity');
    end if;
    if p_op = 'between' then
      a := (p_value->>0)::numeric; b := (p_value->>1)::numeric;
      return case when lo >= a and hi <= b then 'pass' when hi < a or lo > b then 'fail' else 'unknown' end;
    end if;
    v := (p_value #>> '{}')::numeric;
    return case p_op
      when '<=' then case when hi <= v then 'pass' when lo >  v then 'fail' else 'unknown' end
      when '<'  then case when hi <  v then 'pass' when lo >= v then 'fail' else 'unknown' end
      when '>=' then case when lo >= v then 'pass' when hi <  v then 'fail' else 'unknown' end
      when '>'  then case when lo >  v then 'pass' when hi <= v then 'fail' else 'unknown' end
      when '='  then case when lo = v and hi = v then 'pass' when v < lo or v > hi then 'fail' else 'unknown' end
      when '!=' then case when lo = v and hi = v then 'fail' when v < lo or v > hi then 'pass' else 'unknown' end
    end;
  end if;

  if p_kind = 'date' and p_op in ('=','!=','<','<=','>','>=') then
    t := p_answer #>> '{}';
    return case when
      case p_op
        when '='  then t::date =  (p_value #>> '{}')::date
        when '!=' then t::date <> (p_value #>> '{}')::date
        when '<'  then t::date <  (p_value #>> '{}')::date
        when '<=' then t::date <= (p_value #>> '{}')::date
        when '>'  then t::date >  (p_value #>> '{}')::date
        when '>=' then t::date >= (p_value #>> '{}')::date
      end then 'pass' else 'fail' end;
  end if;

  -- choice and yes/no: equality
  if p_op = '='  then return case when p_answer = p_value then 'pass' else 'fail' end; end if;
  if p_op = '!=' then return case when p_answer = p_value then 'fail' else 'pass' end; end if;
  return 'unknown';
end $$;

-- ---------------------------------------------------------------------
-- 2. One scheme's rules (as JSON, live or draft) against one person
-- ---------------------------------------------------------------------
-- Returns {"result", "passed": [...], "failed": [...], "missing": [...], "manual": [...]}.
create function public.evaluate_rules(p_rules jsonb, p_house jsonb, p_member jsonb)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  r jsonb; f profile_fields; outcome text; ans jsonb; g text;
  grp_state jsonb := '{}';     -- group -> 'pass' | 'unknown' | 'fail'
  grp_missing jsonb := '{}';   -- group -> fields still unknown
  passed text[] := '{}'; failed text[] := '{}'; missing text[] := '{}'; manual text[] := '{}';
  excl_hit boolean := false; excl_unknown text[] := '{}';
  any_pass boolean; any_unknown boolean; result screen_result;
begin
  for r in select * from jsonb_array_elements(coalesce(p_rules, '[]')) loop
    select * into f from profile_fields where key = r->>'field';
    if f.key is null then continue; end if;
    ans := case when f.scope = 'household' then p_house -> f.key else p_member -> f.key end;
    if coalesce((r->>'manual_check')::boolean, false) then
      outcome := 'unknown';
      manual := manual || coalesce(r->>'note', r->>'question_en', f.label_en);
    else
      outcome := rule_outcome(f.kind, f.options, ans, r->>'op', r->'value');
    end if;

    if coalesce((r->>'is_exclusion')::boolean, false) then
      if outcome = 'pass' then excl_hit := true; failed := failed || f.key;
      elsif outcome = 'unknown' then excl_unknown := excl_unknown || f.key; end if;
      continue;
    end if;

    g := coalesce(r->>'rule_group', '1');
    if outcome = 'pass' then passed := passed || f.key;
    elsif outcome = 'fail' then failed := failed || f.key; end if;
    grp_state := jsonb_set(grp_state, array[g], to_jsonb(
      case when outcome = 'fail' or grp_state->>g = 'fail' then 'fail'
           when outcome = 'unknown' or grp_state->>g = 'unknown' then 'unknown'
           else 'pass' end));
    if outcome = 'unknown' then
      grp_missing := jsonb_set(grp_missing, array[g], coalesce(grp_missing->g, '[]') || to_jsonb(f.key));
    end if;
  end loop;

  any_pass    := grp_state = '{}' or exists (select 1 from jsonb_each_text(grp_state) e where e.value = 'pass');
  any_unknown := exists (select 1 from jsonb_each_text(grp_state) e where e.value = 'unknown');

  if excl_hit or not (any_pass or any_unknown) then
    result := 'not_eligible';
  elsif any_pass and cardinality(excl_unknown) = 0 then
    result := 'eligible';
  else
    result := 'check';
    if not any_pass then
      select coalesce(array_agg(distinct m), '{}') into missing
      from jsonb_each(grp_missing) e, jsonb_array_elements_text(e.value) m
      where grp_state->>e.key = 'unknown';
    end if;
    missing := array(select distinct unnest(missing || excl_unknown));
  end if;

  return jsonb_build_object(
    'result', result,
    'passed', to_jsonb(array(select distinct unnest(passed))),
    'failed', to_jsonb(array(select distinct unnest(failed))),
    'missing', to_jsonb(missing),
    'manual', to_jsonb(manual));
end $$;

-- Live rules of one scheme in the same JSON shape a draft uses.
create function public.live_scheme_rules(p_scheme uuid) returns jsonb
language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'is_exclusion', is_exclusion, 'rule_group', rule_group, 'field', field, 'op', op,
           'value', value, 'manual_check', manual_check, 'question_en', question_en,
           'question_mr', question_mr, 'note', note) order by sort_order), '[]')
  from scheme_rules where scheme_id = p_scheme
$$;

-- True when any rule looks at a member field, so the scheme is checked per person.
create function public.rules_need_member(p_rules jsonb) returns boolean
language sql stable set search_path = public as $$
  select exists (
    select 1 from jsonb_array_elements(coalesce(p_rules, '[]')) r
    join profile_fields f on f.key = r->>'field' where f.scope = 'member')
$$;

-- ---------------------------------------------------------------------
-- 3. Screen a family against every live scheme
-- ---------------------------------------------------------------------
create function public.screen_family(p_family uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  fam families; s record; m record; rules jsonb; res jsonb; sid uuid; st text;
  has_members boolean;
begin
  if not (is_staff() or has_role('retailer')) or not can_see_family(p_family) then
    raise exception 'family not found';
  end if;
  select * into fam from families where id = p_family;
  if fam.consent_method is null then raise exception 'record the family''s consent first'; end if;
  st := coalesce(fam.answers->>'state', 'MH');
  has_members := exists (select 1 from family_members where family_id = p_family);

  insert into screenings (family_id, profile, run_by)
  values (p_family, jsonb_build_object(
            'household', fam.answers,
            'members', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'full_name', full_name,
                                   'relation', relation, 'answers', answers) order by sort_order, created_at)
                                 from family_members where family_id = p_family), '[]')),
          auth.uid())
  returning id into sid;

  for s in select * from schemes
           where status <> 'closed' and (level = 'central' or state = st) loop
    rules := live_scheme_rules(s.id);
    if rules_need_member(rules) and has_members then
      for m in select * from family_members where family_id = p_family loop
        res := evaluate_rules(rules, fam.answers, m.answers);
        insert into screening_results (screening_id, member_id, scheme_id, version_id, result,
                                       passed_fields, failed_fields, missing_fields, manual_notes)
        values (sid, m.id, s.id, s.current_version_id, (res->>'result')::screen_result,
                array(select jsonb_array_elements_text(res->'passed')),
                array(select jsonb_array_elements_text(res->'failed')),
                array(select jsonb_array_elements_text(res->'missing')),
                array(select jsonb_array_elements_text(res->'manual')));
      end loop;
    else
      res := evaluate_rules(rules, fam.answers, '{}');
      insert into screening_results (screening_id, member_id, scheme_id, version_id, result,
                                     passed_fields, failed_fields, missing_fields, manual_notes)
      values (sid, null, s.id, s.current_version_id, (res->>'result')::screen_result,
              array(select jsonb_array_elements_text(res->'passed')),
              array(select jsonb_array_elements_text(res->'failed')),
              array(select jsonb_array_elements_text(res->'missing')),
              array(select jsonb_array_elements_text(res->'manual')));
    end if;
  end loop;
  return sid;
end $$;

-- The questions to ask next: every unknown answer behind a "check" result,
-- with how many schemes it could settle. Ask the top few, save, re-screen.
create function public.screening_followups(p_screening uuid)
returns table (field text, scope public.profile_scope, member_id uuid, label_en text, label_mr text,
               schemes int, block int)
language sql stable security definer set search_path = public as $$
  select f.key, f.scope, case when f.scope = 'member' then r.member_id end,
         f.label_en, f.label_mr, count(distinct r.scheme_id)::int, f.block
  from screening_results r
  join screenings s on s.id = r.screening_id
  cross join lateral unnest(r.missing_fields) mf
  join profile_fields f on f.key = mf
  where r.screening_id = p_screening and r.result = 'check' and can_see_family(s.family_id)
  group by f.key, f.scope, case when f.scope = 'member' then r.member_id end, f.label_en, f.label_mr, f.block, f.sort_order
  order by count(distinct r.scheme_id) desc, f.block, f.sort_order
$$;

-- Before approving a draft: how many people it would newly make eligible,
-- and how many would lose eligibility, based on every saved family today.
create function public.scheme_version_impact(p_version uuid)
returns table (newly_eligible int, no_longer_eligible int, people_checked int)
language plpgsql stable security definer set search_path = public as $$
declare
  v scheme_versions; live jsonb; draft jsonb; per_member boolean; st text;
begin
  if not has_role('owner','manager') then raise exception 'not allowed'; end if;
  select * into v from scheme_versions where id = p_version;
  if v.id is null then raise exception 'version not found'; end if;
  live  := case when exists (select 1 from schemes where id = v.scheme_id) then live_scheme_rules(v.scheme_id) end;
  draft := coalesce(v.data->'rules', '[]');
  per_member := rules_need_member(draft) or (live is not null and rules_need_member(live));
  st := v.data->>'state';

  return query
  with people as (
    select f.answers as house, m.answers as member
    from families f join family_members m on m.family_id = f.id
    where per_member and (st is null or coalesce(f.answers->>'state', 'MH') = st)
    union all
    select f.answers, '{}'::jsonb from families f
    where not per_member and (st is null or coalesce(f.answers->>'state', 'MH') = st)
  ), judged as (
    select case when live is null then 'not_eligible' else evaluate_rules(live, house, member)->>'result' end as before,
           evaluate_rules(draft, house, member)->>'result' as after
    from people
  )
  select count(*) filter (where after = 'eligible' and before <> 'eligible')::int,
         count(*) filter (where before = 'eligible' and after <> 'eligible')::int,
         count(*)::int
  from judged;
end $$;

grant execute on function
  public.screen_family(uuid),
  public.screening_followups(uuid),
  public.scheme_version_impact(uuid)
to authenticated;
