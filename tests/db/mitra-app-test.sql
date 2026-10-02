\set ON_ERROR_STOP 1
-- The exact calls the OMSUN Mitra app makes, run as a retailer who signed up with email.
create or replace function public.t_as(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create or replace function public.t_check(ok boolean, what text) returns text language plpgsql as $$
begin if not ok then raise exception 'FAIL: %', what; end if; return 'ok: ' || what; end $$;
grant execute on function t_as(text), t_check(boolean, text) to authenticated;

insert into auth.users(id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1', 'mitra1@example.com', '{"full_name":"Mitra One","mobile":"9811111111"}'),
 ('00000000-0000-0000-0000-0000000000a2', 'mitra2@example.com', '{"full_name":"Mitra Two"}'),
 ('00000000-0000-0000-0000-0000000000a9', 'boss@example.com', '{}');
update profiles set role = 'manager' where email = 'boss@example.com';
insert into service_categories(id, name_en, name_mr) values ('10000000-0000-0000-0000-0000000000a1', 'Certificates', 'प्रमाणपत्रे');
insert into services(id, category_id, code, name_en, name_mr, govt_fee, service_charge, retailer_commission)
 values ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'INC', 'Income Certificate', 'उत्पन्नाचा दाखला', 34, 116, 30);
insert into service_required_documents(service_id, name_en, name_mr) values ('20000000-0000-0000-0000-0000000000a1', 'Ration Card', 'रेशन कार्ड');

set role authenticated;
select t_as('00000000-0000-0000-0000-0000000000a1');
-- register-shop screen
update profiles set full_name = 'Mitra One', mobile = '9811111111' where id = auth.uid();
insert into retailers(business_name, owner_name, mobile, business_type, village, taluka, district, pincode, address)
 values ('Mitra Mobile', 'Mitra One', '9811111111', 'Mobile Shop', 'Naichakur', 'Omerga', 'Dharashiv', '413606', null);
select t_check((select status from retailers where profile_id = auth.uid()) = 'pending', 'self-registered shop is pending');
-- language switch
update profiles set preferred_language = 'en' where id = auth.uid();
select t_check((select preferred_language from profiles where id = auth.uid()) = 'en', 'language saved');

-- a second retailer cannot claim the same mobile number
select t_as('00000000-0000-0000-0000-0000000000a2');
select t_check(not exists (select 1 from retailers), 'other retailer cannot see shop');
do $$ begin
  insert into retailers(business_name, owner_name, mobile) values ('Copy', 'Two', '9811111111');
  raise exception 'FAIL: duplicate mobile accepted';
exception when unique_violation then null; end $$;

-- office approves
select t_as('00000000-0000-0000-0000-0000000000a9');
update retailers set status = 'approved' where mobile = '9811111111';

-- new-request screen: catalogue, customer, request, document
select t_as('00000000-0000-0000-0000-0000000000a1');
select t_check(exists (select 1 from services where id = '20000000-0000-0000-0000-0000000000a1' and is_active and available_to_retailers), 'catalogue visible');
insert into customers(id, full_name, mobile, village) values ('30000000-0000-0000-0000-0000000000a1', 'Sunita Jadhav', '9822001122', 'Naichakur')
 returning id, full_name;
insert into service_requests(id, customer_id, service_id, remarks)
 values ('40000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'Urgent for scholarship')
 returning request_number;
select t_check((select customer_price = 150 and retailer_commission = 30 and amount_due = 120 from service_requests where id = '40000000-0000-0000-0000-0000000000a1'), 'price snapshot');
insert into storage.objects(bucket_id, name) values ('request-documents', '40000000-0000-0000-0000-0000000000a1/1700000000-ration.jpg');
insert into request_documents(request_id, required_document_id, document_name, storage_path, mime_type, size_bytes)
 values ('40000000-0000-0000-0000-0000000000a1', (select id from service_required_documents limit 1), 'Ration Card',
         '40000000-0000-0000-0000-0000000000a1/1700000000-ration.jpg', 'image/jpeg', 12345);
select t_check((select count(*) from request_documents where request_id = '40000000-0000-0000-0000-0000000000a1') = 1, 'document recorded');
select t_check((select count(*) from request_status_history where request_id = '40000000-0000-0000-0000-0000000000a1') = 1, 'history visible');

-- other retailer sees none of it and cannot upload into it
select t_as('00000000-0000-0000-0000-0000000000a2');
select t_check(not exists (select 1 from customers) and not exists (select 1 from service_requests), 'data is private');
do $$ begin
  insert into storage.objects(bucket_id, name) values ('request-documents', '40000000-0000-0000-0000-0000000000a1/evil.jpg');
  raise exception 'FAIL: foreign upload accepted';
exception when insufficient_privilege then null; end $$;

-- request page: cancel while new (needs a note), then read notifications
select t_as('00000000-0000-0000-0000-0000000000a1');
update service_requests set status = 'cancelled', last_status_note = 'Customer changed mind' where id = '40000000-0000-0000-0000-0000000000a1';
select t_check((select status from service_requests where id = '40000000-0000-0000-0000-0000000000a1') = 'cancelled', 'retailer cancelled new request');
update notifications set is_read = true where is_read = false;

-- earnings screen queries run
select count(*) from commissions;
select count(*) from retailer_settlements;
reset role;
select 'MITRA TESTS PASSED';
