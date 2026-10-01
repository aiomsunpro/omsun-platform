\set ON_ERROR_STOP 1
-- Runs after schema-test.sql (reuses its users and helpers).
set role authenticated;

-- accountant records an expense; it cannot be backdated, edited or deleted
select t_as('00000000-0000-0000-0000-00000000000c');
insert into cash_entries(direction, category, amount, method, note) values ('out','Electricity',850,'upi','Sept bill');
select t_err($$insert into cash_entries(direction, category, amount, entry_date) values ('out','Rent',5000, current_date - 10)$$, 'backdated');
select t_err($$update cash_entries set amount = 1$$, 'cannot be edited');
select t_err($$update cash_entries set is_void = true$$, 'needs a reason');
update cash_entries set is_void = true, void_reason = 'Duplicate';
select t_err($$update cash_entries set void_reason = 'again'$$, 'already void');
delete from cash_entries;  -- no delete policy: nothing happens
select count(*) = 1 as entry_kept from cash_entries;

-- reports: a voided entry does not count, a live one does
insert into cash_entries(direction, category, amount, method) values ('out','Tea',120,'cash');
select other_out = 120 as report_day_outflow from report_days(today_ist(), today_ist());
select count(*) >= 0 as staff_report_runs from report_staff_day(today_ist() - 30, today_ist());
select count(*) >= 0 as service_report_runs from report_services(today_ist() - 30, today_ist());

-- service executive cannot see the cash book, but can take an enquiry
select t_as('00000000-0000-0000-0000-00000000000d');
select count(*) = 0 as exec_sees_no_cash from cash_entries;
insert into leads(full_name, mobile, lead_type, assigned_to) values ('Walk-in enquiry', '9111111111', 'enquiry', auth.uid());
select t_err($$insert into leads(full_name, mobile, lead_type) values ('X', '9222222222', 'retailer')$$, 'row-level security');
insert into lead_activities(lead_id, activity_type, outcome) select id, 'call', 'interested' from leads;
select last_contact_at is not null as contact_logged from leads;
select added = 1 and activities = 1 and open_now = 1 as lead_report
  from report_leads(today_ist(), today_ist()) where lead_type = 'enquiry';
select coalesce(sum(other_out), 0) = 0 as exec_report_hides_cash from report_days(today_ist(), today_ist());

-- retailer sees neither
select t_as('00000000-0000-0000-0000-00000000000e');
select (select count(*) from cash_entries) + (select count(*) from leads) = 0 as retailer_sees_nothing;
reset role;
select 'CASH BOOK TESTS PASSED';
