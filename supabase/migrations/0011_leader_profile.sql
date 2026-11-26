-- A short leader profile, asked once, so benchmarks can compare teams like yours.
alter table public.leaders add column if not exists function text;
alter table public.leaders add column if not exists level text;
alter table public.leaders add column if not exists industry text;
alter table public.leaders add column if not exists company_size text;
alter table public.leaders add column if not exists profile_completed_at timestamptz;
-- Each survey keeps a copy of the profile as it was when the survey was created.
alter table public.surveys add column if not exists meta jsonb;
