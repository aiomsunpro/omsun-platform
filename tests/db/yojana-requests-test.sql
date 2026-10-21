\set ON_ERROR_STOP 1
-- Runs after yojana-engine-test.sql. Applying for a live scheme creates a normal request.
set role authenticated;
select t_as('00000000-0000-0000-0000-00000000000b');
insert into scheme_versions(scheme_id, data, change_note)
select scheme_id, jsonb_set(data, '{service_codes}', '["PAN-NEW"]'), 'Link the paid service'
from scheme_versions where data->>'code' = 'MH-SHRAVANBAL' and status = 'published';
update scheme_versions set status = 'in_review' where change_note = 'Link the paid service';
select t_as('00000000-0000-0000-0000-00000000000a');
select review_scheme_version(id, true) from scheme_versions where data->>'code' = 'MH-SHRAVANBAL' and status = 'in_review';

-- office family, walk-in request for the linked service
select t_as('00000000-0000-0000-0000-00000000000d');
insert into families(id, family_name, consent_method) values ('64000000-0000-0000-0000-000000000001', 'Office family', 'verbal');
insert into family_members(id, family_id, customer_id, full_name) values
 ('65000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Walk-in Sita');
insert into service_requests(channel, customer_id, service_id, scheme_id, family_member_id, assigned_to)
select 'walk_in', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', s.id,
       '65000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d'
from schemes s where s.code = 'MH-SHRAVANBAL';
select t_check((select count(*) = 1 from service_requests where scheme_id is not null and customer_price = 200), 'scheme request uses the head-office price');
-- a service that is not the scheme's paid service is refused
select t_err($$insert into service_requests(channel, customer_id, service_id, scheme_id)
  select 'walk_in', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-0000000000a1', id from schemes where code = 'MH-SHRAVANBAL'$$,
  'not the paid service');

-- a retailer cannot attach another shop's (or the office's) family member
select t_as('00000000-0000-0000-0000-00000000000e');
select t_err($$insert into service_requests(customer_id, service_id, scheme_id, family_member_id)
  select '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', id, '65000000-0000-0000-0000-000000000001'
  from schemes where code = 'MH-SHRAVANBAL'$$, 'does not belong');
reset role;
select 'YOJANA REQUEST TESTS PASSED';
