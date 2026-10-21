\set ON_ERROR_STOP 1
-- Runs after yojana-schemes-test.sql. Uses the seeded profile questions and scheme drafts.
-- Users: a owner, b manager, e retailer Ganesh Kirana, a1 retailer Mitra One.

-- single rules: bands are ranges, "Don't know" is unknown
select t_check(rule_outcome('band', (select options from profile_fields where key = 'family_income'), '"upto_250000"', '<=', '250000') = 'pass', 'band inside limit passes');
select t_check(rule_outcome('band', (select options from profile_fields where key = 'family_income'), '"upto_250000"', '<=', '21000') = 'fail', 'band above limit fails');
select t_check(rule_outcome('band', (select options from profile_fields where key = 'family_income'), '"upto_250000"', '<=', '200000') = 'unknown', 'band across limit is unknown');
select t_check(rule_outcome('band', (select options from profile_fields where key = 'family_income'), '"above_800000"', '>', '800000') = 'pass', 'open-ended top band');
select t_check(rule_outcome('number', '[]', '64', 'between', '[21,65]') = 'pass' and rule_outcome('number', '[]', '66', 'between', '[21,65]') = 'fail', 'between');
select t_check(rule_outcome('choice', '[]', '"dont_know"', '=', '"female"') = 'unknown', 'dont know is unknown, not no');
select t_check(rule_outcome('choice', '[]', '"orange"', 'in', '["yellow","orange"]') = 'pass', 'in list');
select t_check(rule_outcome('multi', '[]', '["pm_kisan"]', 'contains', '"pm_kisan"') = 'pass'
               and rule_outcome('multi', '[]', '[]', 'contains', '"pm_kisan"') = 'fail', 'contains');
select t_check(rule_outcome('yes_no', '[]', 'false', '=', 'true') = 'fail' and rule_outcome('yes_no', '[]', null, '=', 'true') = 'unknown', 'yes/no');

set role authenticated;

-- manager verifies and submits four seeded drafts; owner approves them
select t_as('00000000-0000-0000-0000-00000000000b');
update scheme_versions set status = 'in_review', source = 'GR checked in test'
 where data->>'code' in ('MH-LADKI-BAHIN','MH-NAMO-SHETKARI','MH-SHRAVANBAL','MH-MJPJAY') and status = 'draft';
select t_as('00000000-0000-0000-0000-00000000000a');
select review_scheme_version(id, true, 'ok') from scheme_versions where status = 'in_review' and data->>'code' like 'MH-%';
select t_check((select count(*) = 4 from schemes where code like 'MH-%'), 'four schemes live');

-- retailer creates a family without consent: screening refused
select t_as('00000000-0000-0000-0000-00000000000e');
insert into families(id, family_name, answers) values
 ('62000000-0000-0000-0000-000000000001', 'Jadhav family', '{"family_income":"upto_250000","domicile_mh":"certificate"}');
insert into family_members(id, family_id, full_name, relation, answers) values
 ('63000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','Sunita Jadhav','self','{"gender":"female","age":34}'),
 ('63000000-0000-0000-0000-000000000002','62000000-0000-0000-0000-000000000001','Kamal Jadhav','mother','{"gender":"female","age":70}');
select t_err($$select screen_family('62000000-0000-0000-0000-000000000001')$$, 'consent');
update families set consent_method = 'verbal' where id = '62000000-0000-0000-0000-000000000001';

-- first screening: Ladki Bahin waits on the tax / govt-job questions; mother is too old
create temp table s1 as select screen_family('62000000-0000-0000-0000-000000000001') as id;
select t_check((select result = 'check' and missing_fields @> '{it_payer,govt_employee}' and 'age' = any(passed_fields)
                from screening_results r join schemes s on s.id = r.scheme_id
                where r.screening_id = (select id from s1) and s.code = 'MH-LADKI-BAHIN'
                  and member_id = '63000000-0000-0000-0000-000000000001'), 'Ladki Bahin: check one more thing');
select t_check((select result = 'not_eligible' and 'age' = any(failed_fields)
                from screening_results r join schemes s on s.id = r.scheme_id
                where r.screening_id = (select id from s1) and s.code = 'MH-LADKI-BAHIN'
                  and member_id = '63000000-0000-0000-0000-000000000002'), 'Ladki Bahin: mother not eligible, age shown');
select t_check((select result = 'not_eligible' from screening_results r join schemes s on s.id = r.scheme_id
                where r.screening_id = (select id from s1) and s.code = 'MH-SHRAVANBAL'
                  and member_id = '63000000-0000-0000-0000-000000000002'), 'Shravanbal: income too high');
select t_check((select result = 'check' and member_id is null from screening_results r join schemes s on s.id = r.scheme_id
                where r.screening_id = (select id from s1) and s.code = 'MH-NAMO-SHETKARI'), 'Namo Shetkari checked once per household');
select t_check((select result = 'eligible' from screening_results r join schemes s on s.id = r.scheme_id
                where r.screening_id = (select id from s1) and s.code = 'MH-MJPJAY' and member_id = '63000000-0000-0000-0000-000000000001'),
               'MJPJAY: domicile certificate is enough');
-- the tax question settles two schemes, so it comes first
select t_check((select field in ('it_payer','govt_employee') and schemes = 2
                from screening_followups((select id from s1)) limit 1), 'top follow-up settles two schemes');

-- another retailer cannot see or screen the family
select t_as('00000000-0000-0000-0000-0000000000a1');
select t_err($$select screen_family('62000000-0000-0000-0000-000000000001')$$, 'family not found');
select t_check(not exists (select 1 from screenings) and not exists (select 1 from screening_results), 'other retailer sees no screenings');
select t_check(not exists (select 1 from screening_followups((select id from s1))), 'other retailer gets no follow-ups');

-- answers filled in: Sunita eligible; mother eligible for Shravanbal once income and pension are known
select t_as('00000000-0000-0000-0000-00000000000e');
update families set answers = answers || '{"it_payer":false,"govt_employee":false,"family_income":"upto_21000"}'
 where id = '62000000-0000-0000-0000-000000000001';
create temp table s2 as select screen_family('62000000-0000-0000-0000-000000000001') as id;
select t_check((select result = 'eligible' from screening_results r join schemes s on s.id = r.scheme_id
                where r.screening_id = (select id from s2) and s.code = 'MH-LADKI-BAHIN'
                  and member_id = '63000000-0000-0000-0000-000000000001'), 'Ladki Bahin eligible after answers');
select t_check((select result = 'check' and missing_fields = '{enrolled}' from screening_results r join schemes s on s.id = r.scheme_id
                where r.screening_id = (select id from s2) and s.code = 'MH-SHRAVANBAL'
                  and member_id = '63000000-0000-0000-0000-000000000002'), 'Shravanbal waits on existing pension');
update families set answers = answers || '{"enrolled":[]}' where id = '62000000-0000-0000-0000-000000000001';
create temp table s3 as select screen_family('62000000-0000-0000-0000-000000000001') as id;
select t_check((select result = 'eligible' from screening_results r join schemes s on s.id = r.scheme_id
                where r.screening_id = (select id from s3) and s.code = 'MH-SHRAVANBAL'
                  and member_id = '63000000-0000-0000-0000-000000000002'), 'Shravanbal eligible');
select t_check((select count(*) = 3 from screenings where family_id = '62000000-0000-0000-0000-000000000001'), 'every screening is kept');
select t_err($$select scheme_version_impact((select id from scheme_versions limit 1))$$, 'not allowed');

-- impact preview: raising Ladki Bahin's age limit to 75 would add the mother
select t_as('00000000-0000-0000-0000-00000000000b');
insert into scheme_versions(scheme_id, data, change_note)
select scheme_id, jsonb_set(data, '{rules,1,value}', '[21,75]'), 'Age limit to 75 (test)'
from scheme_versions where data->>'code' = 'MH-LADKI-BAHIN' and status = 'published';
select t_check((select newly_eligible = 1 and no_longer_eligible = 0 and people_checked = 2
                from scheme_version_impact((select id from scheme_versions where change_note = 'Age limit to 75 (test)'))),
               'impact: one person newly eligible');

reset role;
delete from screenings; delete from family_members; delete from families;
delete from scheme_versions where change_note = 'Age limit to 75 (test)';
select 'YOJANA ENGINE TESTS PASSED';
