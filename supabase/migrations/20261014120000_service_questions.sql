-- =====================================================================
-- OMSUN Platform — questions per service, typed answers per request
-- 2026-10-14. Builds on the earlier migrations.
--
-- Besides documents, a service can ask for details the customer types
-- (father's name, date of birth, old PAN number…). The admin sets the
-- questions on the service; the retailer or office staff fill in the
-- answers on each request.
-- =====================================================================

create table public.service_questions (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references public.services(id) on delete cascade,
  question_en  text not null check (length(btrim(question_en)) between 1 and 200),
  question_mr  text not null check (length(btrim(question_mr)) between 1 and 200),
  is_mandatory boolean not null default true,
  sort_order   int not null default 0
);
create index on public.service_questions (service_id, sort_order);

-- The question text is copied onto the answer, so old requests still read
-- correctly after a question is reworded or removed.
create table public.request_answers (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.service_requests(id) on delete cascade,
  question_id uuid references public.service_questions(id) on delete set null,
  question_en text not null,
  question_mr text not null,
  answer      text not null check (length(answer) <= 2000),
  answered_by uuid references public.profiles(id) default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (request_id, question_id)
);
create index on public.request_answers (request_id);

create function public.tg_request_answer_fill() returns trigger
language plpgsql security definer set search_path = public as $$
declare q service_questions;
begin
  if tg_op = 'UPDATE' then
    -- only the answer itself can change (the link to a removed question
    -- is cleared by the database, and the copied text stays)
    new.request_id  := old.request_id;
    new.question_id := case when new.question_id is null then null else old.question_id end;
    new.question_en := old.question_en;
    new.question_mr := old.question_mr;
    new.created_at  := old.created_at;
    if new.answer is distinct from old.answer then
      new.answered_by := auth.uid();
      new.updated_at  := now();
    else
      new.answered_by := old.answered_by;
      new.updated_at  := old.updated_at;
    end if;
  elsif new.question_id is not null then
    select * into q from service_questions where id = new.question_id;
    if q.id is null or q.service_id <> (select service_id from service_requests where id = new.request_id) then
      raise exception 'this question does not belong to the request''s service';
    end if;
    new.question_en := q.question_en;
    new.question_mr := q.question_mr;
  end if;
  new.answer := btrim(new.answer);
  return new;
end $$;
create trigger request_answers_fill before insert or update on public.request_answers
  for each row execute function public.tg_request_answer_fill();

alter table public.service_questions enable row level security;
alter table public.request_answers   enable row level security;

-- questions are part of the catalogue, readable like required documents
create policy questions_read on public.service_questions for select to anon, authenticated using (true);
create policy questions_write on public.service_questions for all to authenticated
  using (has_role('owner','manager')) with check (has_role('owner','manager'));

-- answers follow the same rules as the request's documents
create policy answers_select on public.request_answers for select to authenticated
  using (has_role('accountant') or can_work_request(request_id));
create policy answers_insert on public.request_answers for insert to authenticated
  with check (can_work_request(request_id));
create policy answers_update on public.request_answers for update to authenticated
  using (can_work_request(request_id));

grant select on public.service_questions to anon, authenticated;
grant insert, update, delete on public.service_questions to authenticated;
grant select, insert, update on public.request_answers to authenticated;
