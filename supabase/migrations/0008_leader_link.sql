-- Only the survey's owner can answer as the leader, and the leader has one
-- response per survey (answering again replaces it). Everyone with the share
-- link answers as a team member.
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
  end if;

  insert into public.responses (survey_id, role, answers)
  values (v_survey, p_role, p_answers);
  return true;
end;
$$;
