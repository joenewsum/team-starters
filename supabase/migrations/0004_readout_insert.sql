-- Let a signed-in leader save readouts for their own surveys.
grant insert on public.readouts to authenticated;

create policy "leaders create readouts for own surveys" on public.readouts
  for insert to authenticated with check (
    exists (select 1 from public.surveys s
            where s.id = survey_id and s.leader_id = (select auth.uid()))
  );
