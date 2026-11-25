import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Stats } from "@/lib/readout/stats";
import type { Synthesis, Theme } from "@/lib/readout/synthesize";
import { PrintButton } from "./print-button";

export const metadata = { title: "Readout | Team Starters" };

export default function ReadoutPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading your readout...</p>}>
      <Readout params={params} />
    </Suspense>
  );
}

async function Readout({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: survey }, { data: readout }] = await Promise.all([
    supabase.from("surveys").select("id, team_name, templates(name)").eq("id", id).single(),
    supabase
      .from("readouts")
      .select("stats, synthesis, response_count, created_at")
      .eq("survey_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!survey || !readout) notFound();

  const s = readout.synthesis as Synthesis;
  const stats = readout.stats as Stats;
  const score = stats.scales?.[0];
  const template = (survey.templates as unknown as { name: string } | null)?.name ?? "Team Starter";

  return (
    <article className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/dashboard/surveys/${id}`} className="text-sm text-gray-600 hover:text-navy">
          &larr; Back to the survey
        </Link>
        <PrintButton />
      </div>

      <header className="mt-6 border-b-4 border-gold pb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark">
          {template} readout
        </p>
        <h1 className="mt-1 text-4xl font-bold text-navy">{survey.team_name}</h1>
        <p className="mt-2 text-gray-600">
          {stats.teamCount} team member{stats.teamCount === 1 ? "" : "s"}
          {stats.leaderCount ? " and the leader" : ""} answered.{" "}
          {readout.created_at.slice(0, 10)}
        </p>
        <p className="mt-5 text-xl leading-relaxed text-navy">{s.headline}</p>
      </header>

      <Section title="Where the team lines up">
        <div className="space-y-6">
          {s.alignment.map((a) => (
            <div key={a.topic} className="rounded-md border border-line p-5 break-inside-avoid">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-navy">
                  {a.topic === "Customers" ? "Who depends on us" : a.topic === "Value" ? "The value we create" : "The numbers"}
                </h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    a.agreement === "Strong"
                      ? "bg-green-100 text-green-800"
                      : a.agreement === "Mixed"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {a.agreement} agreement
                </span>
              </div>
              <Themes items={a.team_themes} total={stats.teamCount} />
              {a.leader_view && (
                <p className="mt-3 text-sm text-gray-700">
                  <span className="font-semibold text-navy">Leader&apos;s view: </span>
                  {a.leader_view}
                </p>
              )}
              {a.gap && (
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-semibold text-gold-dark">Gap: </span>
                  {a.gap}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      {score && (
        <Section title="How they'd score our value">
          <div className="grid gap-4 sm:grid-cols-3">
            <BigStat label="Team average" value={score.teamAvg ?? "–"} sub={`out of ${score.max}`} />
            <BigStat label="Leader" value={score.leader ?? "–"} sub={`out of ${score.max}`} />
            <BigStat
              label="Team range"
              value={score.teamRange ? `${score.teamRange.min} to ${score.teamRange.max}` : "–"}
              sub="lowest to highest"
            />
          </div>
          {s.score_read && <p className="mt-4 text-gray-700">{s.score_read}</p>}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="break-inside-avoid">
              <h3 className="font-bold text-navy">Why that score</h3>
              <Themes items={s.score_reasons ?? []} total={stats.teamCount} />
            </div>
            <div className="break-inside-avoid">
              <h3 className="font-bold text-navy">What would get us to a 10</h3>
              <Themes items={s.path_to_10 ?? []} total={stats.teamCount} />
            </div>
          </div>
        </Section>
      )}

      <Section title="A draft value statement">
        <p className="rounded-md bg-cream p-5 text-lg text-navy">{s.value_statement}</p>
        {s.value_statement_options && s.value_statement_options.length > 0 && (
          <div className="mt-4 break-inside-avoid">
            <p className="text-sm font-semibold text-gray-600">Other ways to say it</p>
            <ul className="mt-2 space-y-2">
              {s.value_statement_options.map((v) => (
                <li key={v} className="rounded-md border border-line p-4 text-navy">
                  {v}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 text-sm text-gray-500 print:hidden">
          A starting point for the team meeting. The best version is the one your team writes together.
        </p>
      </Section>

      <Section title="A draft scoreboard">
        <ul className="space-y-3">
          {s.scoreboard.map((m) => (
            <li key={m.metric} className="rounded-md border border-line p-4 break-inside-avoid">
              <p className="font-semibold text-navy">{m.metric}</p>
              <p className="text-sm text-gray-700">{m.why}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Where the week goes">
        {stats.mix.map((m) => (
          <div key={m.id} className="space-y-3 break-inside-avoid">
            {m.parts.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-800">{p.label}</span>
                  <span className="text-gray-600">
                    Team {m.team[p.id]}%{m.leader ? ` · Leader ${m.leader[p.id] ?? 0}%` : ""} · Range{" "}
                    {m.range[p.id].min} to {m.range[p.id].max}%
                  </span>
                </div>
                <div className="mt-1 h-3 rounded bg-gray-100">
                  <div className="h-3 rounded bg-navy" style={{ width: `${m.team[p.id]}%` }} />
                </div>
              </div>
            ))}
          </div>
        ))}
        <p className="mt-4 text-gray-700">{s.mix_read}</p>

        {s.work_map && s.work_map.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {s.work_map.map((b) => (
              <div key={b.bucket} className="rounded-md border border-line p-4 break-inside-avoid">
                <h3 className="font-bold text-navy">{b.bucket}</h3>
                <Themes items={b.themes} total={stats.teamCount} />
              </div>
            ))}
          </div>
        )}
        {s.work_disagreements && s.work_disagreements.length > 0 && (
          <div className="mt-6 rounded-md bg-cream p-5 break-inside-avoid">
            <h3 className="font-bold text-navy">Where the team sorts the same work differently</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-800">
              {s.work_disagreements.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {s.value_moments && (
        <Section title="What creates the most value">
          <Themes items={s.value_moments} total={stats.teamCount} />
        </Section>
      )}
      {s.drag && (
        <Section title="What creates little or no value">
          <Themes items={s.drag} total={stats.teamCount} />
        </Section>
      )}

      {s.one_change && s.one_change.length > 0 && (
        <Section title="Where the team wants to start">
          <Themes items={s.one_change} total={stats.teamCount} />
        </Section>
      )}

      {stats.choices.length > 0 && s.speed_read && (
        <Section title="Speed">
          <div className="grid gap-4 sm:grid-cols-2">
            {stats.choices.map((c) => (
              <div key={c.id} className="rounded-md border border-line p-4 break-inside-avoid">
                <p className="text-sm font-semibold text-navy">{c.question}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {c.options.map((o) => (
                    <li key={o} className="flex justify-between">
                      <span className={c.leader === o ? "font-semibold text-navy" : "text-gray-700"}>
                        {o}
                        {c.leader === o ? " (leader)" : ""}
                      </span>
                      <span className="text-gray-600">{c.team[o] ?? 0}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-gray-700">{s.speed_read}</p>
        </Section>
      )}

      <Section title="Questions for your team meeting">
        <ol className="list-decimal space-y-2 pl-5 text-gray-800">
          {s.discussion_questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </Section>

      <Section title="Next steps">
        <ol className="list-decimal space-y-2 pl-5 text-gray-800">
          {s.next_steps.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 print:hidden">
          <a href="https://www.stratechi.com/team-value/" className="rounded-md border border-navy p-4 hover:bg-cream">
            <p className="font-semibold text-navy">Define the value your team creates</p>
            <p className="text-sm text-gray-600">The guide behind this readout</p>
          </a>
          <a href="https://www.stratechi.com/change-agents/" className="rounded-md border border-navy p-4 hover:bg-cream">
            <p className="font-semibold text-navy">Build a team of change agents</p>
            <p className="text-sm text-gray-600">Turn the drag into a change agenda</p>
          </a>
        </div>
      </Section>

      <footer className="mt-12 border-t border-line pt-4 text-xs text-gray-500">
        Team Starters by Stratechi · app.stratechi.com · Answers are anonymous and grouped into themes.
      </footer>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-bold text-navy">{title}</h2>
      {children}
    </section>
  );
}

function BigStat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-md border border-line p-4 text-center break-inside-avoid">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-3xl font-bold text-navy">{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}

function Themes({ items, total }: { items: Theme[]; total: number }) {
  if (!items?.length) return <p className="mt-2 text-sm text-gray-500">Not enough answers to find a theme.</p>;
  return (
    <ul className="mt-3 space-y-2">
      {items.map((t) => (
        <li key={t.theme} className="flex items-start justify-between gap-4">
          <span className="text-gray-800">{t.theme}</span>
          <span className="shrink-0 text-right text-sm text-gray-500">
            {t.mentions} of {total}
            {typeof t.ranked_first === "number" && t.ranked_first > 0 && (
              <span className="block text-xs text-gold-dark">{t.ranked_first} ranked it first</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
