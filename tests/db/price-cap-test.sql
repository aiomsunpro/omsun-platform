\set ON_ERROR_STOP 1
-- Runs after the other tests (users: a owner, b manager; service INC = 34 + 116).
set role authenticated;
select t_as('00000000-0000-0000-0000-00000000000b');
select t_err($$update services set price_cap = 200 where code = 'INC'$$, 'only the owner');

select t_as('00000000-0000-0000-0000-00000000000a');
select t_err($$update services set price_cap = 100 where code = 'INC'$$, 'above the government cap');
update services set price_cap = 150, price_cap_note = 'Revenue Dept rate sheet (test)' where code = 'INC';
select t_err($$update services set service_charge = 120 where code = 'INC'$$, 'above the government cap');
update services set service_charge = 100 where code = 'INC';
select t_check((select count(*) >= 3 from service_price_history h join services s on s.id = h.service_id where s.code = 'INC'), 'price changes are listed');
select t_check((select new_service_charge = 100 and old_service_charge = 116 and changed_by_name is not distinct from (select full_name from profiles where id = auth.uid())
                from service_price_history h join services s on s.id = h.service_id where s.code = 'INC' order by changed_at desc limit 1),
               'latest change shows old and new price and who');

-- managers do not see the price history (audit log is owner only)
select t_as('00000000-0000-0000-0000-00000000000b');
select t_check(not exists (select 1 from service_price_history), 'manager cannot read price history');
reset role;
select 'PRICE CAP TESTS PASSED';
