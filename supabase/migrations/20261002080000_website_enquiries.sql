-- =====================================================================
-- OMSUN Platform — enquiries from the public website
-- 2026-10-02. Builds on the earlier migrations.
--
-- The website's "कॉलबॅक मिळवा" form lets visitors who are not signed in
-- leave their details. They cannot write to leads directly (RLS allows
-- staff only), so this one function checks the input and saves it as an
-- enquiry (lead_type 'enquiry', source 'website'). It then shows up in the
-- admin app's Enquiries tab as a New Lead.
--
-- Abuse limits: a mobile number can send one enquiry per 10 minutes
-- (repeats are ignored, not errors), and the site accepts at most 100
-- website enquiries per hour in total.
-- =====================================================================

create or replace function public.submit_website_enquiry(
  p_full_name     text,
  p_mobile        text,
  p_village       text,
  p_district      text,
  p_business_type text default null,
  p_interest      text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name     text := btrim(coalesce(p_full_name, ''));
  v_mobile   text := regexp_replace(coalesce(p_mobile, ''), '\D', '', 'g');
  v_village  text := btrim(coalesce(p_village, ''));
  v_district text := btrim(coalesce(p_district, ''));
  v_business text := nullif(btrim(coalesce(p_business_type, '')), '');
  v_interest text := nullif(btrim(coalesce(p_interest, '')), '');
begin
  -- Accept 98XXXXXXXX, +91 98XXXXXXXX, 091…; keep the last 10 digits.
  if length(v_mobile) in (11, 12) and v_mobile ~ '^(0|91)' then
    v_mobile := right(v_mobile, 10);
  end if;

  if v_name = '' or length(v_name) > 100 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if v_mobile !~ '^[6-9][0-9]{9}$' then
    raise exception 'invalid_mobile' using errcode = '22023';
  end if;
  if v_village = '' or length(v_village) > 100 or v_district = '' or length(v_district) > 100 then
    raise exception 'invalid_place' using errcode = '22023';
  end if;
  if length(v_business) > 200 or length(v_interest) > 1000 then
    raise exception 'too_long' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.leads
    where source = 'website' and mobile = v_mobile and created_at > now() - interval '10 minutes'
  ) then
    return;
  end if;

  if (select count(*) from public.leads
      where source = 'website' and created_at > now() - interval '1 hour') >= 100 then
    raise exception 'too_many_enquiries' using errcode = '54000';
  end if;

  insert into public.leads (full_name, mobile, village, district, business_type, interest, source, lead_type)
  values (v_name, v_mobile, v_village, v_district, v_business, v_interest, 'website', 'enquiry');
end $$;

revoke execute on function public.submit_website_enquiry(text, text, text, text, text, text) from public;
grant execute on function public.submit_website_enquiry(text, text, text, text, text, text) to anon, authenticated;
