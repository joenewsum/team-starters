-- Response cap, readout sharing, readout-ready email tracking, account delete, and Joe's admin counts.

-- 1. Cap responses per survey so a leaked link can't flood it.
create or replace function public.submit_response(p_token text, p_role text, p_answers jsonb)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  v_survey uuid;
  v_owner uuid;
begin
  if p_role not in ('leader', 'team') then
    raise exception 'invalid role';
  end if;
  if pg_column_size(p_answers) > 50000 then
    raise exception 'answers too large';
  end if;

  select id, leader_id into v_survey, v_owner from public.surveys
  where share_token = p_token
    and status = 'open'
    and (close_date is null or close_date >= current_date);

  if v_survey is null then
    return false;
  end if;

  if p_role = 'leader' then
    if auth.uid() is null or auth.uid() <> v_owner then
      raise exception 'only the survey owner can answer as the leader';
    end if;
    delete from public.responses where survey_id = v_survey and role = 'leader';
  elsif (select count(*) from public.responses where survey_id = v_survey) >= 300 then
    return false;
  end if;

  insert into public.responses (survey_id, role, answers)
  values (v_survey, p_role, p_answers);
  return true;
end;
$$;

-- 2. Share the readout with the team through its own link (off until the leader turns it on).
alter table public.surveys add column if not exists readout_share_token text unique;
alter table public.surveys add column if not exists notified_at timestamptz;

create or replace function public.get_shared_readout(p_token text)
returns table (team_name text, template_name text, stats jsonb, synthesis jsonb, created_at timestamptz)
language sql
security definer set search_path = ''
stable
as $$
  select s.team_name, t.name, r.stats, r.synthesis, r.created_at
  from public.surveys s
  join public.templates t on t.id = s.template_id
  join lateral (
    select stats, synthesis, created_at from public.readouts
    where survey_id = s.id order by created_at desc limit 1
  ) r on true
  where s.readout_share_token = p_token;
$$;
revoke all on function public.get_shared_readout(text) from public;
grant execute on function public.get_shared_readout(text) to anon, authenticated;

-- 3. Readout-ready email: the server (with the service key) asks once per survey.
create or replace function public.claim_ready_notification(p_token text)
returns table (survey_id uuid, team_name text, email text)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_survey uuid;
begin
  select s.id into v_survey from public.surveys s
  where s.share_token = p_token and s.notified_at is null
    and (select count(*) from public.responses r where r.survey_id = s.id and r.role = 'team') >= 3;
  if v_survey is null then
    return;
  end if;
  update public.surveys set notified_at = now() where id = v_survey;
  return query
    select s.id, s.team_name, l.email from public.surveys s
    join public.leaders l on l.id = s.leader_id where s.id = v_survey;
end;
$$;
revoke all on function public.claim_ready_notification(text) from public, anon, authenticated;
grant execute on function public.claim_ready_notification(text) to service_role;

-- 4. Delete my account: removes the sign-in and, through cascades, every survey,
-- answer, and readout.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 5. Joe's admin counts.
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;
insert into public.admins (email) values ('joseph.newsum@gmail.com'), ('joe@stratechi.com')
on conflict do nothing;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer set search_path = ''
stable
as $$
begin
  if not exists (select 1 from public.admins a where a.email = lower(auth.jwt() ->> 'email')) then
    raise exception 'not allowed';
  end if;
  return jsonb_build_object(
    'leaders', (select count(*) from public.leaders),
    'leaders_7d', (select count(*) from public.leaders where created_at > now() - interval '7 days'),
    'surveys', (select count(*) from public.surveys where team_name not like 'Sim:%'),
    'surveys_7d', (select count(*) from public.surveys where team_name not like 'Sim:%' and created_at > now() - interval '7 days'),
    'responses', (select count(*) from public.responses r join public.surveys s on s.id = r.survey_id where s.team_name not like 'Sim:%'),
    'readouts', (select count(*) from public.readouts r join public.surveys s on s.id = r.survey_id where s.team_name not like 'Sim:%'),
    'opted_in', (select coalesce(jsonb_agg(jsonb_build_object('email', email, 'since', created_at) order by created_at desc), '[]'::jsonb)
                 from public.leaders where wants_updates)
  );
end;
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
