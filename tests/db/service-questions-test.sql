\set ON_ERROR_STOP 1
-- Runs after schema-test.sql (reuses its users, service and request).
-- Owner adds questions to the service; retailer answers them on a request.
set role authenticated;
select t_as('00000000-0000-0000-0000-00000000000b');  -- manager
insert into service_questions(id, service_id, question_en, question_mr, sort_order) values
 ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Father''s Name','वडिलांचे नाव',1),
 ('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Old PAN Number','जुना पॅन क्रमांक',2);

select t_as('00000000-0000-0000-0000-00000000000e');  -- retailer, cannot edit questions
select t_err($$insert into service_questions(service_id, question_en, question_mr) values ('20000000-0000-0000-0000-000000000001','X','X')$$, 'row-level security');
select count(*) = 2 as retailer_reads_questions from service_questions;

-- retailer answers on its own request; question text is copied from the service
insert into request_answers(request_id, question_id, question_en, question_mr, answer)
 values ('40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','ignored','ignored','  Shankar Patil ');
select question_en = 'Father''s Name' and answer = 'Shankar Patil' as answer_saved
  from request_answers where question_id = '50000000-0000-0000-0000-000000000001';
select t_err($$insert into request_answers(request_id, question_id, question_en, question_mr, answer)
 values ('40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','x','x','again')$$, 'duplicate key');
update request_answers set answer = 'Shankar R Patil', question_en = 'hacked'
 where question_id = '50000000-0000-0000-0000-000000000001';
select question_en = 'Father''s Name' and answer = 'Shankar R Patil' as only_answer_changes
  from request_answers where question_id = '50000000-0000-0000-0000-000000000001';

-- service executive assigned to the request and the accountant can read it
select t_as('00000000-0000-0000-0000-00000000000d');
select count(*) = 1 as assigned_exec_sees_answer from request_answers;
select t_as('00000000-0000-0000-0000-00000000000c');
select count(*) = 1 as accountant_sees_answer from request_answers;

-- rewording a question leaves old answers as they were; removing keeps the answer
select t_as('00000000-0000-0000-0000-00000000000a');
update service_questions set question_en = 'Father Name' where id = '50000000-0000-0000-0000-000000000001';
delete from service_questions where id = '50000000-0000-0000-0000-000000000001';
select question_en = 'Father''s Name' and question_id is null as answer_kept
  from request_answers where answer = 'Shankar R Patil';
reset role;
delete from request_answers;
delete from service_questions;
select 'SERVICE QUESTION TESTS PASSED';
