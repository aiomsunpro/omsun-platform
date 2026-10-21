\set ON_ERROR_STOP 1
-- Runs after the other tests (reuses their users: a owner, b manager, d service exec,
-- e retailer Ganesh Kirana, a1 retailer Mitra One, and service PAN-NEW).
-- Families stay with their retailer; scheme edits go draft -> owner approval -> live.
insert into profile_fields(key, scope, kind, block, label_en, label_mr, options) values
 ('gender','member','choice',1,'Gender','लिंग','[{"value":"female","en":"Female","mr":"स्त्री"},{"value":"male","en":"Male","mr":"पुरुष"}]'),
 ('age','member','number',1,'Age','वय','[]'),
 ('family_income','household','band',3,'Family income a year','कुटुंबाचे वार्षिक उत्पन्न',
  '[{"value":"upto_21000","en":"Up to ₹21,000","mr":"₹21,000 पर्यंत","min":0,"max":21000},{"value":"upto_250000","en":"Up to ₹2.5 lakh","mr":"₹2.5 लाखांपर्यंत","min":21001,"max":250000}]'),
 ('it_payer','household','yes_no',3,'Anyone pays income tax','कुटुंबात कोणी आयकर भरतो का','[]')
on conflict (key) do nothing;  -- later migrations seed these questions
update profile_fields set label_en = 'Gender' where key = 'gender';

set role authenticated;

-- only the owner edits profile questions
select t_as('00000000-0000-0000-0000-00000000000b');
update profile_fields set label_en = 'Sex' where key = 'gender';
select t_check((select label_en from profile_fields where key = 'gender') = 'Gender', 'manager cannot reword questions');
select t_as('00000000-0000-0000-0000-00000000000a');
update profile_fields set label_en = 'Gender (as on Aadhaar)' where key = 'gender';
select t_check((select label_en from profile_fields where key = 'gender') = 'Gender (as on Aadhaar)', 'owner rewords a question');

-- retailer screens a family: it is stamped with the retailer and consent
select t_as('00000000-0000-0000-0000-00000000000e');
insert into families(id, retailer_id, family_name, mobile, answers, consent_method)
 values ('60000000-0000-0000-0000-000000000001', null, 'Patil family', '9000000001',
         '{"family_income":"upto_250000","it_payer":false}', 'verbal');
select t_check((select retailer_id = my_retailer_id() and consent_by = auth.uid() and consent_at is not null
                from families where id = '60000000-0000-0000-0000-000000000001'), 'family belongs to retailer with consent');
insert into family_members(id, family_id, customer_id, full_name, relation, answers) values
 ('61000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Sunita Patil','self','{"gender":"female","age":34}'),
 ('61000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001',null,'Ramesh Patil','spouse','{"gender":"male"}');
select t_err($$insert into family_members(family_id, customer_id, full_name)
 values ('60000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','Sita')$$, 'customer does not belong');

-- another retailer sees nothing of it
select t_as('00000000-0000-0000-0000-0000000000a1');
select t_check(not exists (select 1 from families) and not exists (select 1 from family_members), 'other retailer cannot see family');
update families set family_name = 'Hacked';
select t_as('00000000-0000-0000-0000-00000000000d');
select t_check((select family_name from families where id = '60000000-0000-0000-0000-000000000001') = 'Patil family', 'staff see the family, untouched');

-- retailer cannot write schemes or drafts
select t_as('00000000-0000-0000-0000-00000000000e');
select t_err($$insert into schemes(id, code, name_en, name_mr, level, category) values (gen_random_uuid(),'X','X','X','central','x')$$, 'row-level security');
select t_err($$insert into scheme_versions(data, change_note) values ('{}','test')$$, 'row-level security');

-- manager drafts a new scheme and submits it
select t_as('00000000-0000-0000-0000-00000000000b');
insert into scheme_versions(id, scheme_id, data, change_note, source, status) values
 ('70000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001',
  '{"code":"MH-LADKI-BAHIN","name_en":"Majhi Ladki Bahin","name_mr":"माझी लाडकी बहीण","level":"state","state":"MH",
    "category":"women_child","benefit_yearly":18000,"status":"open",
    "rules":[{"field":"gender","op":"=","value":"female"},{"field":"age","op":"between","value":[21,65]},
             {"field":"family_income","op":"<=","value":250000},
             {"is_exclusion":true,"field":"it_payer","op":"=","value":true,"question_mr":"कुटुंबात कोणी आयकर भरतो का?"}],
    "documents":[{"name_en":"Aadhaar","name_mr":"आधार"}],
    "steps":[{"what_en":"Apply on the Ladki Bahin portal","what_mr":"लाडकी बहीण पोर्टलवर अर्ज करा"}],
    "service_codes":["PAN-NEW"]}',
  'First draft', 'GR 28 Jun 2024', 'published');
select t_check((select status = 'draft' and version_no = 1 and created_by = auth.uid()
                from scheme_versions where id = '70000000-0000-0000-0000-000000000001'), 'insert always starts as draft v1');
update scheme_versions set status = 'in_review' where id = '70000000-0000-0000-0000-000000000001';
select t_check(not exists (select 1 from schemes), 'nothing is live before approval');
select t_err($$update scheme_versions set change_note = 'sneaky' where id = '70000000-0000-0000-0000-000000000001'$$, 'cannot be changed');

-- a manager cannot approve, even someone else's change; the owner can send back or approve
select t_err($$select review_scheme_version('70000000-0000-0000-0000-000000000001', true)$$, 'only the owner');
select t_as('00000000-0000-0000-0000-00000000000a');
select t_err($$select review_scheme_version('70000000-0000-0000-0000-000000000001', false, '')$$, 'say why');
select review_scheme_version('70000000-0000-0000-0000-000000000001', false, 'Add the GR link');
select t_as('00000000-0000-0000-0000-00000000000b');
update scheme_versions set source = 'GR 28 Jun 2024, https://example.org/gr.pdf', status = 'in_review'
 where id = '70000000-0000-0000-0000-000000000001';
select t_as('00000000-0000-0000-0000-00000000000a');
select review_scheme_version('70000000-0000-0000-0000-000000000001', true, 'ok');
select t_check((select current_version_id = '70000000-0000-0000-0000-000000000001' and code = 'MH-LADKI-BAHIN'
                from schemes), 'approved version is live');
select t_check((select count(*) = 4 from scheme_rules) and (select count(*) = 1 from scheme_rules where is_exclusion)
               and (select count(*) = 1 from scheme_documents) and (select count(*) = 1 from scheme_steps)
               and (select count(*) = 1 from scheme_services), 'rules, documents, steps and service copied');

-- retailer reads the live scheme and suggests a correction
select t_as('00000000-0000-0000-0000-00000000000e');
select t_check((select count(*) = 1 from schemes) and (select count(*) = 4 from scheme_rules), 'retailer reads live scheme');
insert into scheme_suggestions(scheme_id, message, status)
 values ('71000000-0000-0000-0000-000000000001', 'Tehsil now asks for a bank passbook too', 'accepted');
select t_check((select status = 'open' and retailer_id = my_retailer_id() from scheme_suggestions), 'suggestion lands open');
update scheme_suggestions set status = 'dismissed';
select t_check((select status = 'open' from scheme_suggestions), 'retailer cannot close a suggestion');

-- manager edits the live scheme (income limit); a stale second draft cannot be approved after it
select t_as('00000000-0000-0000-0000-00000000000b');
insert into scheme_versions(id, scheme_id, data, change_note) select '70000000-0000-0000-0000-000000000002', scheme_id,
  jsonb_set(data, '{rules,2,value}', '300000'), 'Income limit raised' from scheme_versions where id = '70000000-0000-0000-0000-000000000001';
insert into scheme_versions(id, scheme_id, data, change_note) select '70000000-0000-0000-0000-000000000003', scheme_id,
  jsonb_set(data, '{benefit_yearly}', '24000'), 'Benefit raised' from scheme_versions where id = '70000000-0000-0000-0000-000000000001';
select t_check((select based_on = '70000000-0000-0000-0000-000000000001' and version_no = 2
                from scheme_versions where id = '70000000-0000-0000-0000-000000000002'), 'draft records what it started from');
update scheme_versions set status = 'in_review' where id in ('70000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000003');
select t_as('00000000-0000-0000-0000-00000000000a');
select review_scheme_version('70000000-0000-0000-0000-000000000002', true);
select t_check((select value = '300000' from scheme_rules where field = 'family_income'), 'new limit is live');
select t_err($$select review_scheme_version('70000000-0000-0000-0000-000000000003', true)$$, 'scheme changed after this draft');

-- a rule on an unknown field is refused at approval and nothing changes
select t_as('00000000-0000-0000-0000-00000000000b');
insert into scheme_versions(id, scheme_id, data, change_note) select '70000000-0000-0000-0000-000000000004', scheme_id,
  jsonb_set(data, '{rules,0,field}', '"caste"'), 'Bad field' from scheme_versions where id = '70000000-0000-0000-0000-000000000002';
update scheme_versions set status = 'in_review' where id = '70000000-0000-0000-0000-000000000004';
select t_as('00000000-0000-0000-0000-00000000000a');
select t_err($$select review_scheme_version('70000000-0000-0000-0000-000000000004', true)$$, 'unknown profile field');
select t_check((select status = 'in_review' from scheme_versions where id = '70000000-0000-0000-0000-000000000004')
               and (select current_version_id = '70000000-0000-0000-0000-000000000002' from schemes), 'failed approval leaves everything as it was');

-- rollback: restoring v1 makes a new draft that still needs approval
select t_as('00000000-0000-0000-0000-00000000000b');
select restore_scheme_version('70000000-0000-0000-0000-000000000001', 'Undo the income change') is not null as restored;
select t_check((select status = 'draft' and version_no = 5 from scheme_versions where change_note = 'Undo the income change'), 'restore is a new draft');
update scheme_versions set status = 'in_review' where change_note = 'Undo the income change';
select t_as('00000000-0000-0000-0000-00000000000a');
select review_scheme_version((select id from scheme_versions where change_note = 'Undo the income change'), true);
select t_check((select value = '250000' from scheme_rules where field = 'family_income'), 'old limit is back');
select t_err($$select publish_scheme_version('70000000-0000-0000-0000-000000000002')$$, 'permission denied');

reset role;
select t_check((select count(*) >= 3 from audit_logs where table_name = 'scheme_versions'), 'scheme changes are in the audit log');
delete from scheme_suggestions; delete from screenings; delete from family_members; delete from families;
update schemes set current_version_id = null where id = '71000000-0000-0000-0000-000000000001';
delete from scheme_versions where scheme_id = '71000000-0000-0000-0000-000000000001';
delete from schemes where id = '71000000-0000-0000-0000-000000000001';
update profile_fields set label_en = 'Gender' where key = 'gender';
select 'YOJANA SCHEME TESTS PASSED';
