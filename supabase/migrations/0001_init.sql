-- Team Starters: phase 1 schema
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

-- Leaders: one row per signed-in leader, created automatically on first sign-in.
create table public.leaders (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  wants_updates boolean not null default false,
  created_at timestamptz not null default now()
);

-- Templates: each Team Starter is data (questions and readout sections).
create table public.templates (
  id text primary key,                 -- e.g. 'value-starter'
  name text not null,
  version int not null default 1,
  description text,
  questions jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Surveys: a leader running one template with one team.
create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.leaders (id) on delete cascade,
  template_id text not null references public.templates (id),
  template_version int not null default 1,
  team_name text not null check (char_length(team_name) between 1 and 120),
  close_date date,
  status text not null default 'open' check (status in ('open', 'closed')),
  share_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index surveys_leader_idx on public.surveys (leader_id, created_at desc);

-- Responses: anonymous. No names, emails or IP addresses are stored.
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  role text not null check (role in ('leader', 'team')),
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);
create index responses_survey_idx on public.responses (survey_id);

-- Readouts: stats plus the AI synthesis, written by the server.
create table public.readouts (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  response_count int not null,
  stats jsonb not null,
  synthesis jsonb,
  pdf_path text,
  created_at timestamptz not null default now()
);
create index readouts_survey_idx on public.readouts (survey_id, created_at desc);

-- Create the leader row when someone signs in for the first time.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.leaders (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Table access for the app. Row-level security below narrows it to each leader's own rows.
grant usage on schema public to anon, authenticated;
grant select on public.templates to anon, authenticated;
grant select, update on public.leaders to authenticated;
grant select, insert, update, delete on public.surveys to authenticated;
grant select on public.responses to authenticated;
grant select on public.readouts to authenticated;

-- Row-level security: each leader sees only their own data.
alter table public.leaders   enable row level security;
alter table public.templates enable row level security;
alter table public.surveys   enable row level security;
alter table public.responses enable row level security;
alter table public.readouts  enable row level security;

create policy "leaders read own row" on public.leaders
  for select to authenticated using (id = (select auth.uid()));
create policy "leaders update own row" on public.leaders
  for update to authenticated using (id = (select auth.uid()));

create policy "anyone reads active templates" on public.templates
  for select to anon, authenticated using (active);

create policy "leaders read own surveys" on public.surveys
  for select to authenticated using (leader_id = (select auth.uid()));
create policy "leaders create own surveys" on public.surveys
  for insert to authenticated with check (leader_id = (select auth.uid()));
create policy "leaders update own surveys" on public.surveys
  for update to authenticated using (leader_id = (select auth.uid()));
create policy "leaders delete own surveys" on public.surveys
  for delete to authenticated using (leader_id = (select auth.uid()));

create policy "leaders read responses to own surveys" on public.responses
  for select to authenticated using (
    exists (select 1 from public.surveys s
            where s.id = survey_id and s.leader_id = (select auth.uid()))
  );

create policy "leaders read own readouts" on public.readouts
  for select to authenticated using (
    exists (select 1 from public.surveys s
            where s.id = survey_id and s.leader_id = (select auth.uid()))
  );

-- Respondents never touch the tables directly. These two functions are the
-- only way in: look up an open survey by its share link, and submit answers.
create function public.get_open_survey(p_token text)
returns table (team_name text, template_id text, template_name text, questions jsonb)
language sql
security definer set search_path = ''
stable
as $$
  select s.team_name, t.id, t.name, t.questions
  from public.surveys s
  join public.templates t on t.id = s.template_id
  where s.share_token = p_token
    and s.status = 'open'
    and (s.close_date is null or s.close_date >= current_date);
$$;

create function public.submit_response(p_token text, p_role text, p_answers jsonb)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  v_survey uuid;
begin
  if p_role not in ('leader', 'team') then
    raise exception 'invalid role';
  end if;
  if pg_column_size(p_answers) > 50000 then
    raise exception 'answers too large';
  end if;

  select id into v_survey from public.surveys
  where share_token = p_token
    and status = 'open'
    and (close_date is null or close_date >= current_date);

  if v_survey is null then
    return false;
  end if;

  insert into public.responses (survey_id, role, answers)
  values (v_survey, p_role, p_answers);
  return true;
end;
$$;

revoke all on function public.get_open_survey(text) from public;
revoke all on function public.submit_response(text, text, jsonb) from public;
grant execute on function public.get_open_survey(text) to anon, authenticated;
grant execute on function public.submit_response(text, text, jsonb) to anon, authenticated;

-- The first Team Starter.
insert into public.templates (id, name, version, description, questions) values (
  'value-starter',
  'Value Starter',
  1,
  'Find out how your team sees its customers, its value, and where the week goes.',
  $json$[
    {"id": "role", "type": "choice", "text": "Are you the team's leader or a team member?",
     "options": ["Leader", "Team member"], "required": true},
    {"id": "customers", "type": "text", "text": "Who are our most important customers?", "required": true},
    {"id": "value", "type": "text", "text": "What value do we give them?", "required": true},
    {"id": "numbers", "type": "text", "text": "What are the most important numbers we track?", "required": true},
    {"id": "high_value_work", "type": "text", "text": "In a typical week, what work creates the most value?", "required": true},
    {"id": "low_value_work", "type": "text", "text": "What work creates little or no value?", "required": true},
    {"id": "value_mix", "type": "mix",
     "text": "Split a typical week across these. They add up to 100%.",
     "parts": [
       {"id": "high", "label": "High value"},
       {"id": "medium", "label": "Medium value"},
       {"id": "low", "label": "Low value"},
       {"id": "none", "label": "No value"},
       {"id": "negative", "label": "Negative value"}
     ], "required": true},
    {"id": "decision_time", "type": "choice", "text": "How long does a typical decision take?",
     "options": ["Same day", "Within a week", "A few weeks", "Longer"], "required": true},
    {"id": "change_cadence", "type": "choice", "text": "How often does a change to how we work go live?",
     "options": ["Every week", "Every month", "Every quarter", "Rarely"], "required": true}
  ]$json$::jsonb
);
