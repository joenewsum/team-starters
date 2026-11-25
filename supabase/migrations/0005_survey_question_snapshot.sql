-- Each survey keeps its own copy of the questions, so editing a template
-- never changes a survey that's already running.
alter table public.surveys add column if not exists questions jsonb;

update public.surveys s set questions = t.questions
from public.templates t
where t.id = s.template_id and s.questions is null;

create or replace function public.get_open_survey(p_token text)
returns table (team_name text, template_id text, template_name text, questions jsonb)
language sql
security definer set search_path = ''
stable
as $$
  select s.team_name, t.id, t.name, coalesce(s.questions, t.questions)
  from public.surveys s
  join public.templates t on t.id = s.template_id
  where s.share_token = p_token
    and s.status = 'open'
    and (s.close_date is null or s.close_date >= current_date);
$$;
