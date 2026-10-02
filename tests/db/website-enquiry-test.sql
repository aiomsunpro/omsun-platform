\set ON_ERROR_STOP 1
-- Runs after schema-test.sql (reuses its users and helpers).
-- A visitor who is not signed in sends the website's callback form.
grant execute on function t_err(text,text) to anon;
set role anon;
select set_config('request.jwt.claims', '', false);
select submit_website_enquiry('Ramesh Patil', '+91 98765 43210', 'Omerga', 'Dharashiv', 'Shop', 'PAN card, Aadhaar update');
-- the same mobile again within 10 minutes is ignored, not an error
select submit_website_enquiry('Ramesh Patil', '9876543210', 'Omerga', 'Dharashiv');
select t_err($$select submit_website_enquiry('', '9876500000', 'A', 'B')$$, 'invalid_name');
select t_err($$select submit_website_enquiry('X', '12345', 'A', 'B')$$, 'invalid_mobile');
select t_err($$select submit_website_enquiry('X', '9876500000', '', 'B')$$, 'invalid_place');
select t_err($$select submit_website_enquiry('X', '9876500000', 'A', 'B', null, repeat('x', 1001))$$, 'too_long');
-- the visitor still cannot read or write leads directly
select count(*) = 0 as anon_reads_no_leads from leads;
select t_err($$insert into leads(full_name, mobile) values ('X', '9000000000')$$, 'row-level security');
reset role;

-- it lands in the Enquiries tab as a new website lead
select count(*) = 1 as one_website_enquiry from leads where source = 'website' and mobile = '9876543210';
select lead_type = 'enquiry' and stage = 'new_lead' and village = 'Omerga' and district = 'Dharashiv'
   and business_type = 'Shop' and interest = 'PAN card, Aadhaar update' and created_by is null as enquiry_saved
  from leads where source = 'website' and mobile = '9876543210';

-- the owner sees it in Enquiries and can assign it; unassigned, a service
-- executive does not (same rule as every other lead)
set role authenticated;
select t_as('00000000-0000-0000-0000-00000000000a');
select count(*) = 1 as owner_sees_website_enquiry from leads where source = 'website';
select t_as('00000000-0000-0000-0000-00000000000d');
select count(*) = 0 as exec_waits_for_assignment from leads where source = 'website';
reset role;

-- hourly cap
insert into leads(full_name, mobile, source, lead_type)
  select 'Bulk', '7' || lpad(g::text, 9, '0'), 'website', 'enquiry' from generate_series(1, 99) g;
set role anon;
select t_err($$select submit_website_enquiry('Late', '9123456789', 'A', 'B')$$, 'too_many_enquiries');
reset role;
delete from leads where source = 'website';
select 'WEBSITE ENQUIRY TESTS PASSED';
