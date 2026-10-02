\set ON_ERROR_STOP 1
-- Runs after schema-test.sql (reuses its users and helpers).
-- A visitor on the website asks for their account to be deleted.
set role anon;
select set_config('request.jwt.claims', '', false);
select request_account_deletion('Suresh Jadhav', '+91 98220 11111', 'suresh@example.com', 'Shop closed');
select request_account_deletion('Suresh Jadhav', '9822011111');   -- repeat within a day: ignored
select t_err($$select request_account_deletion('', '9822000000')$$, 'invalid_name');
select t_err($$select request_account_deletion('X', '123')$$, 'invalid_mobile');
select t_err($$select request_account_deletion('X', '9822000000', null, repeat('x', 1001))$$, 'too_long');
reset role;
select count(*) = 1 and bool_and(source = 'website' and lead_type = 'enquiry'
       and interest = 'Account deletion request' and notes like '%suresh@example.com%' and notes like '%Shop closed%')
  as website_request_saved
  from leads where mobile = '9822011111';

-- inside the app, the retailer's own shop name and mobile are used,
-- whatever the app sends
set role authenticated;
select t_as('00000000-0000-0000-0000-00000000000e');
select request_account_deletion('Someone Else', '9999999999', null, 'Not using it');
reset role;
select count(*) = 1 as app_request_uses_shop_mobile
  from leads where mobile = '9800000005' and source = 'app' and full_name = 'Ganesh'
   and interest = 'Account deletion request';
select count(*) = 0 as no_request_for_other_mobile from leads where mobile = '9999999999';

-- the owner sees both in Enquiries
set role authenticated;
select t_as('00000000-0000-0000-0000-00000000000a');
select count(*) = 2 as owner_sees_requests from leads where interest = 'Account deletion request';
reset role;
delete from leads where interest = 'Account deletion request';
select 'ACCOUNT DELETION TESTS PASSED';
