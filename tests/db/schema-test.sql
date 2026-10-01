\set ON_ERROR_STOP 1
-- helpers (test only)
create function public.t_as(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function public.t_err(q text, expect text) returns text language plpgsql as $$
begin execute q; raise exception 'FAIL: expected error "%" but succeeded: %', expect, q;
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  if position(expect in sqlerrm) = 0 then raise exception 'FAIL: wrong error for %: %', q, sqlerrm; end if;
  return 'ok: ' || sqlerrm; end $$;
grant execute on function t_as(text), t_err(text,text) to authenticated;

insert into auth.users(id, phone) values
 ('00000000-0000-0000-0000-00000000000a','919800000001'),
 ('00000000-0000-0000-0000-00000000000b','919800000002'),
 ('00000000-0000-0000-0000-00000000000c','919800000003'),
 ('00000000-0000-0000-0000-00000000000d','919800000004'),
 ('00000000-0000-0000-0000-00000000000e','919800000005');
update profiles set role='owner' where mobile='9800000001';
update profiles set role='manager' where mobile='9800000002';
update profiles set role='accountant' where mobile='9800000003';
update profiles set role='service_executive' where mobile='9800000004';
-- 5 stays retailer
insert into service_categories(id,name_en,name_mr) values ('10000000-0000-0000-0000-000000000001','Identity','ओळखपत्र');
insert into services(id,category_id,code,name_en,name_mr,govt_fee,service_charge,retailer_commission)
 values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','PAN-NEW','New PAN','नवीन पॅन',107,93,40);

set role authenticated;
-- retailer signs up and registers shop: stays pending, cannot approve self
select t_as('00000000-0000-0000-0000-00000000000e');
insert into retailers(business_name, owner_name, mobile, status) values ('Ganesh Kirana','Ganesh','9800000005','approved');
select status from retailers;  -- expect pending
select t_err($$update retailers set status='approved'$$, 'only owner or manager');
select t_err($$update profiles set role='owner' where id=auth.uid()$$, 'not allowed to change role');
insert into customers(id, full_name, mobile) values ('30000000-0000-0000-0000-000000000001','Ramesh Patil','9000000001');
select t_err($$insert into service_requests(customer_id, service_id) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001')$$, 'not approved');

-- manager approves; manager cannot change price
select t_as('00000000-0000-0000-0000-00000000000b');
update retailers set status='approved';
select t_err($$update services set retailer_commission=50$$, 'only the owner');

-- retailer submits request: snapshot + number
select t_as('00000000-0000-0000-0000-00000000000e');
insert into service_requests(id, customer_id, service_id, status, retailer_commission)
 values ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','completed',999);
select request_number, status, customer_price, retailer_commission, amount_due from service_requests;
select t_err($$update service_requests set status='under_process'$$, 'retailer can only');
select t_err($$update service_requests set priority='urgent'$$, 'only the status');

-- service exec cannot see it until assigned
select t_as('00000000-0000-0000-0000-00000000000d');
select count(*) as exec_sees_before_assign from service_requests;

-- manager assigns -> status assigned automatically
select t_as('00000000-0000-0000-0000-00000000000b');
update service_requests set assigned_to='00000000-0000-0000-0000-00000000000d';
select status from service_requests;

-- exec: invalid jump, docs required needs note, retailer upload moves to documents_received
select t_as('00000000-0000-0000-0000-00000000000d');
select t_err($$update service_requests set status='completed'$$, 'cannot move');
select t_err($$update service_requests set status='documents_required'$$, 'note is required');
update service_requests set status='documents_required', last_status_note='Aadhaar photo is blurry';
select t_as('00000000-0000-0000-0000-00000000000e');
insert into request_documents(request_id, kind, document_name, storage_path)
 values ('40000000-0000-0000-0000-000000000001','output','Aadhaar','40000000-0000-0000-0000-000000000001/aadhaar.jpg');
select kind, (select status from service_requests) as req_status from request_documents;  -- input, documents_received
select count(*) as retailer_notifications from notifications;

-- exec processes; completion needs output doc
select t_as('00000000-0000-0000-0000-00000000000d');
update service_requests set status='under_process';
select t_err($$update service_requests set status='completed'$$, 'attach the completed');
insert into request_documents(request_id, kind, document_name, storage_path)
 values ('40000000-0000-0000-0000-000000000001','output','PAN acknowledgement','40000000-0000-0000-0000-000000000001/ack.pdf');
update service_requests set status='completed';
select status, payment_status from service_requests;
reset role; select status, amount from commissions; set role authenticated;  -- on_hold (unpaid)

-- payment: backdate blocked; retailer pays dues -> commission earned
select t_as('00000000-0000-0000-0000-00000000000d');
select t_err($$insert into payments(request_id, payer_type, amount, method, paid_on) values ('40000000-0000-0000-0000-000000000001','retailer',160,'cash', current_date-5)$$, 'backdated');
insert into payments(request_id, payer_type, amount, method, status) values ('40000000-0000-0000-0000-000000000001','retailer',160,'upi','verified');
select receipt_number, status, retailer_id is not null as has_retailer from payments;  -- recorded (exec cannot verify)
select t_as('00000000-0000-0000-0000-00000000000c');
select t_err($$update payments set amount=10$$, 'cannot be edited');
update payments set status='verified';
select t_err($$update payments set status='reversed'$$, 'needs a reason');
select payment_status, amount_paid, amount_due from service_requests;
select status from commissions;  -- earned
select t_as('00000000-0000-0000-0000-00000000000b');
select t_err($$update service_requests set amount_paid=0$$, 'amount paid');
select t_as('00000000-0000-0000-0000-00000000000c');

-- retailer sees own earnings; another role cannot see audit
select t_as('00000000-0000-0000-0000-00000000000e');
select count(*) as retailer_sees_commission from commissions;
select count(*) as retailer_sees_audit from audit_logs;

-- settlement
select t_as('00000000-0000-0000-0000-00000000000c');
select create_retailer_settlement((select id from retailers), today_ist()-30, today_ist()) is not null as created;
select request_count, gross_amount, commission_amount, amount_due, amount_received, balance from retailer_settlements;
select finalize_retailer_settlement((select id from retailer_settlements));
select status from commissions;  -- settled
select t_err($$select sync_commission('40000000-0000-0000-0000-000000000001')$$, 'permission denied');

-- walk-in: token, cannot complete unpaid
select t_as('00000000-0000-0000-0000-00000000000d');
insert into customers(id, full_name) values ('30000000-0000-0000-0000-000000000002','Walk-in Sita');
insert into service_requests(id, channel, customer_id, service_id, assigned_to) values
 ('40000000-0000-0000-0000-000000000002','walk_in','30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000d');
select request_number, token_number, status, amount_due from service_requests where channel='walk_in';
update service_requests set status='under_process' where channel='walk_in';
insert into request_documents(request_id, kind, document_name, storage_path) values ('40000000-0000-0000-0000-000000000002','output','PAN','40000000-0000-0000-0000-000000000002/pan.pdf');
select t_err($$update service_requests set status='completed' where channel='walk_in'$$, 'fully paid');
insert into payments(request_id, amount, method) values ('40000000-0000-0000-0000-000000000002',200,'cash');
update service_requests set status='completed' where channel='walk_in';
reset role;
select count(*) as walkin_commissions from commissions c join service_requests r on r.id=c.request_id where r.channel='walk_in';
select to_status, note from request_status_history where request_id='40000000-0000-0000-0000-000000000001' order by id;
select count(*) as audit_rows from audit_logs;
select 'ALL TESTS PASSED';
