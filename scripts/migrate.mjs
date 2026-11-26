// Applies new files in supabase/migrations to the database during each deploy.
// Needs DATABASE_URL (Supabase session pooler connection string) in Vercel.
// Without it, the build skips this step, so local builds still work.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set. Skipping database updates.");
  process.exit(0);
}

// Applied by hand in the Supabase SQL Editor before this runner existed.
const BASELINE = [
  "0001_init.sql",
  "0002_value_mix_labels.sql",
  "0003_value_mix_four_parts.sql",
  "0004_readout_insert.sql",
  "0005_survey_question_snapshot.sql",
  "0006_value_starter_v2.sql",
  "0007_value_starter_v3.sql",
];

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(`create table if not exists public._migrations (
    name text primary key, applied_at timestamptz not null default now())`);
  await client.query(`alter table public._migrations enable row level security`);
  const { rows } = await client.query("select name from public._migrations");
  const done = new Set(rows.map((r) => r.name));

  if (done.size === 0) {
    const { rows: t } = await client.query("select to_regclass('public.surveys') as t");
    if (t[0].t) {
      for (const f of BASELINE) await client.query("insert into public._migrations (name) values ($1) on conflict do nothing", [f]);
      BASELINE.forEach((f) => done.add(f));
      console.log("[migrate] Recorded the hand-applied updates 0001 to 0007.");
    }
  }

  for (const f of files) {
    if (done.has(f)) continue;
    console.log(`[migrate] Applying ${f}`);
    await client.query("begin");
    try {
      await client.query(readFileSync(join(dir, f), "utf8"));
      await client.query("insert into public._migrations (name) values ($1)", [f]);
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      console.error(`[migrate] ${f} failed:`, e.message);
      process.exit(1);
    }
  }
  console.log("[migrate] Database is up to date.");
} finally {
  await client.end();
}
