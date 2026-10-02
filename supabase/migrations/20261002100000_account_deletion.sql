-- =====================================================================
-- OMSUN Platform — account deletion requests
-- 2026-10-02. Builds on the earlier migrations.
--
-- Google Play requires apps with sign-up to let people ask for their
-- account and data to be deleted, both inside the app and on a web page.
-- Both call this function. It saves the request in the Enquiries tab
-- (interest 'Account deletion request') so the office can act on it.
--
-- A signed-in retailer's name and mobile come from their shop record, so
-- the request cannot be made for someone else's shop. Visitors who are
-- not signed in give their name, mobile and email; the office verifies
-- them by phone before deleting anything.
-- =====================================================================

create or replace function public.request_account_deletion(
  p_full_name text,
  p_mobile    text,
  p_email     text default null,
  p_reason    text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name   text := btrim(coalesce(p_full_name, ''));
  v_mobile text := regexp_replace(coalesce(p_mobile, ''), '\D', '', 'g');
  v_email  text := nullif(btrim(coalesce(p_email, '')), '');
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_source text := 'website';
  r        record;
begin
  if auth.uid() is not null then
    select rt.owner_name, rt.mobile, p.email into r
    from retailers rt join profiles p on p.id = rt.profile_id
    where rt.profile_id = auth.uid();
    if found then
      v_name := r.owner_name;
      v_mobile := regexp_replace(r.mobile, '\D', '', 'g');
      v_email := coalesce(r.email, v_email);
      v_source := 'app';
    end if;
  end if;

  if length(v_mobile) in (11, 12) and v_mobile ~ '^(0|91)' then
    v_mobile := right(v_mobile, 10);
  end if;

  if v_name = '' or length(v_name) > 100 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if v_mobile !~ '^[6-9][0-9]{9}$' then
    raise exception 'invalid_mobile' using errcode = '22023';
  end if;
  if length(v_email) > 200 or length(v_reason) > 1000 then
    raise exception 'too_long' using errcode = '22023';
  end if;

  -- One request per mobile per day is enough; repeats are ignored.
  if exists (
    select 1 from leads
    where mobile = v_mobile and interest = 'Account deletion request'
      and created_at > now() - interval '1 day'
  ) then
    return;
  end if;

  if (select count(*) from leads
      where source = 'website' and created_at > now() - interval '1 hour') >= 100 then
    raise exception 'too_many_enquiries' using errcode = '54000';
  end if;

  insert into leads (full_name, mobile, source, lead_type, interest, notes)
  values (v_name, v_mobile, v_source, 'enquiry', 'Account deletion request',
          concat_ws(E'\n', 'Email: ' || v_email, 'Reason: ' || v_reason));
end $$;

revoke execute on function public.request_account_deletion(text, text, text, text) from public;
grant execute on function public.request_account_deletion(text, text, text, text) to anon, authenticated;
