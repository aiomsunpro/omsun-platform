\set ON_ERROR_STOP 1
-- Runs after schema-test.sql (reuses its users, customer and request).
-- a = owner, b = manager, c = accountant, d = service executive, e = retailer
set role authenticated;

-- housekeeping and water bills: accountant keeps them, all staff see, only owner deletes
select t_as('00000000-0000-0000-0000-00000000000c');
insert into housekeeping_log(staff_name, work_done, amount_paid) values ('Sunita', 'Floor and toilets', 150);
insert into water_bills(bill_month, vendor, amount) values (date_trunc('month', now())::date, 'Jar supplier', 600);
select t_err($$insert into water_bills(bill_month, amount) values ('2026-10-05', 10)$$, 'check constraint');
select t_err($$insert into water_bills(bill_month, amount, paid_on) values ('2026-09-01', 10, '2026-09-03')$$, 'check constraint');
delete from housekeeping_log;   -- accountant cannot delete: nothing happens
select count(*) = 1 as accountant_cannot_delete from housekeeping_log;
select t_as('00000000-0000-0000-0000-00000000000d');
select (select count(*) from housekeeping_log) = 1 and (select count(*) from water_bills) = 1 as exec_sees_office_logs;
select t_err($$insert into housekeeping_log(staff_name) values ('X')$$, 'row-level security');
select t_as('00000000-0000-0000-0000-00000000000e');
select (select count(*) from housekeeping_log) + (select count(*) from water_bills) = 0 as retailer_sees_no_logs;
select t_as('00000000-0000-0000-0000-00000000000a');
delete from housekeeping_log;
select count(*) = 0 as owner_deletes from housekeeping_log;

-- credentials: the saver and owner/manager see them, other staff do not
select t_as('00000000-0000-0000-0000-00000000000d');
insert into credentials(customer_id, label, username, password)
  values ('30000000-0000-0000-0000-000000000001', 'GST portal', 'ramesh01', 's3cret');
select count(*) = 1 as saver_sees_own from credentials;
select t_as('00000000-0000-0000-0000-00000000000c');
select count(*) = 0 as accountant_cannot_see_others from credentials;
update credentials set password = 'hacked';
select t_as('00000000-0000-0000-0000-00000000000b');
select password = 's3cret' as manager_sees_unchanged from credentials;
select t_as('00000000-0000-0000-0000-00000000000e');
select t_err($$insert into credentials(label) values ('X')$$, 'row-level security');

-- bank accounts and denomination limits: owner changes, accountant reads, exec sees nothing
select t_as('00000000-0000-0000-0000-00000000000a');
insert into bank_accounts(bank_name, account_number, ifsc) values ('SBI', '1234567890', 'SBIN0001234');
select t_err($$insert into bank_accounts(bank_name, ifsc) values ('X', 'bad')$$, 'check constraint');
update denomination_limits set max_count = 40 where denomination = 500;
select t_as('00000000-0000-0000-0000-00000000000c');
select (select count(*) from bank_accounts) = 1 and (select max_count from denomination_limits where denomination = 500) = 40 as accountant_reads_banks;
select t_err($$insert into bank_accounts(bank_name) values ('X')$$, 'row-level security');
update denomination_limits set max_count = 1;
select (select max_count from denomination_limits where denomination = 500) = 40 as accountant_cannot_change_limits;
select t_as('00000000-0000-0000-0000-00000000000d');
select (select count(*) from bank_accounts) + (select count(*) from denomination_limits) = 0 as exec_sees_no_banks;

-- compliances: payment status follows the amounts; exec works only assigned ones
select t_as('00000000-0000-0000-0000-00000000000b');
insert into compliances(customer_id, service_id, fee, amount_paid)
  values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1000, 400);
select payment_status = 'partial' as partly_paid from compliances;
select t_as('00000000-0000-0000-0000-00000000000d');
select count(*) = 0 as exec_sees_unassigned_none from compliances;
select t_as('00000000-0000-0000-0000-00000000000b');
update compliances set assigned_to = '00000000-0000-0000-0000-00000000000d';
select t_as('00000000-0000-0000-0000-00000000000d');
update compliances set status = 'in_process', amount_paid = 1000, started_on = today_ist();
select status = 'in_process' and payment_status = 'paid' as exec_updates_assigned from compliances;
delete from compliances;
select count(*) = 1 as exec_cannot_delete from compliances;
reset role;

-- website tracker: request number + matching mobile, nothing else
grant execute on function t_err(text,text) to anon;
set role anon;
select count(*) = 0 as anon_reads_no_tables
  from (select 1 from credentials union all select 1 from compliances union all select 1 from bank_accounts) x;
reset role;
select request_number as rn from service_requests limit 1 \gset
set role anon;
select count(*) = 1 as tracked from track_request(:'rn', '+91 90000 00001');
select count(*) = 1 as tracked_lowercase from track_request(lower(:'rn'), '9000000001');
select count(*) = 0 as wrong_mobile from track_request(:'rn', '9999999999');
select count(*) = 0 as no_mobile from track_request(:'rn', '');
select count(*) = 0 as wrong_number from track_request('OMS-0000-000000', '9000000001');
reset role;
select 'OFFICE RECORDS TESTS PASSED';
