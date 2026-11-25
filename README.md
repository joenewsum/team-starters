# Team Starters

Free team surveys from Stratechi. A leader picks a Team Starter, shares one link with their team, and gets an AI readout. Runs at app.stratechi.com.

## Stack
- Next.js (App Router) on Vercel
- Supabase: magic-link sign-in, Postgres, row-level security
- Claude API for readouts (coming in step 5)

## Build status
1. App, sign-in, and database: done
2. Survey engine and the Value Starter template
3. Respondent flow
4. Dashboard
5. Readout: stats and AI synthesis
6. PDF download
7. Privacy, limits, and admin view
8. Test with real teams

## Setup
1. Create a Supabase project. In the SQL Editor, run `supabase/migrations/0001_init.sql` once.
2. In Supabase, go to Authentication > URL Configuration. Set Site URL to `https://app.stratechi.com` and add `http://localhost:3000/**` and `https://app.stratechi.com/**` as redirect URLs.
3. Copy `.env.example` to `.env.local` and fill in the values from Project Settings > API.
4. `npm install`, then `npm run dev`.

## Privacy
Respondents never sign in. No names, emails, or IP addresses are stored with answers. Respondents reach the database only through two functions (`get_open_survey`, `submit_response`), and each leader can read only their own surveys, responses, and readouts.
