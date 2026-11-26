-- Team size, so a survey can finish when everyone has answered, plus tracking
-- for the readout email that goes out when a survey finishes.
alter table public.surveys add column if not exists team_size int check (team_size between 1 and 500);
alter table public.surveys add column if not exists finishing_at timestamptz;
alter table public.surveys add column if not exists readout_sent_at timestamptz;
