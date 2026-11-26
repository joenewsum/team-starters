import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Question } from "@/lib/templates";
import { MIN_RESPONSES_FOR_READOUT } from "@/lib/site";
import { shuffled } from "@/lib/shuffle";
import { PrintButton } from "../readout/print-button";

export const metadata = { title: "All answers | Team Starters" };

type Row = { id: string; role: "leader" | "team"; answers: Record<string, unknown> };

export default function AnswersPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading the answers...</p>}>
      <Answers params={params} />
    </Suspense>
  );
}

async function Answers({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: survey }, { data: rows }] = await Promise.all([
    supabase.from("surveys").select("id, team_name, questions").eq("id", id).single(),
    supabase.from("responses").select("id, role, answers").eq("survey_id", id),
  ]);
  if (!survey) notFound();

  const all = (rows ?? []) as Row[];
  const team = all.filter((r) => r.role === "team");
  const leader = all.find((r) => r.role === "leader");
  const questions = ((survey.questions ?? []) as Question[]).filter((q) => q.id !== "role");

  const back = (
    <Link href={`/dashboard/surveys/${id}`} className="text-sm text-gray-600 hover:text-navy">
      &larr; Back to the survey
    </Link>
  );

  if (team.length < MIN_RESPONSES_FOR_READOUT) {
    return (
      <div className="mx-auto max-w-3xl">
        {back}
        <p className="mt-6 rounded-md border border-line p-6 text-gray-600">
          The answers open once at least {MIN_RESPONSES_FOR_READOUT} team members have answered.
        </p>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between print:hidden">
        {back}
        <PrintButton />
      </div>
      <header className="mt-6 border-b-4 border-gold pb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark">All answers</p>
        <h1 className="mt-1 text-4xl font-bold text-navy">{survey.team_name}</h1>
        <p className="mt-2 text-gray-600">
          {team.length} team members answered. Their answers are shuffled separately for each question
          and shown without names, so no one can be traced across questions. Your own answers are shown
          apart from the team&apos;s.
        </p>
      </header>

      {questions.map((q, n) => (
        <section key={q.id} className="mt-10 break-inside-avoid">
          <p className="text-sm font-semibold text-gold-dark">Question {n + 1}</p>
          <h2 className="mt-1 text-xl font-bold text-navy">{q.text}</h2>
          <QuestionAnswers q={q} team={team} leader={leader} surveyId={id} />
        </section>
      ))}
    </article>
  );
}

function Mine({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-md bg-cream p-3 text-sm text-navy">
      <span className="font-semibold">Your answer: </span>
      {children}
    </div>
  );
}

function Items({ items }: { items: string[] }) {
  if (!items.length) return <p className="mt-3 text-sm text-gray-500">No answers.</p>;
  return (
    <ul className="mt-3 divide-y divide-line rounded-md border border-line">
      {items.map((t, i) => (
        <li key={i} className="whitespace-pre-wrap p-3 text-gray-800">
          {t}
        </li>
      ))}
    </ul>
  );
}

function QuestionAnswers({
  q,
  team,
  leader,
  surveyId,
}: {
  q: Question;
  team: Row[];
  leader?: Row;
  surveyId: string;
}) {
  const key = (k: string) => `${surveyId}:${q.id}:${k}`;
  const mine = leader?.answers[q.id];

  if (q.type === "text") {
    const items = team.map((r) => String(r.answers[q.id] ?? "").trim()).filter(Boolean);
    return (
      <>
        <Items items={shuffled(items, key("text"))} />
        {typeof mine === "string" && mine && <Mine>{mine}</Mine>}
      </>
    );
  }

  if (q.type === "choice") {
    const counts = q.options.map((o) => [o, team.filter((r) => r.answers[q.id] === o).length] as const);
    return (
      <ul className="mt-3 space-y-1">
        {counts.map(([o, c]) => (
          <li key={o} className="flex justify-between text-gray-800">
            <span>{o}</span>
            <span className="text-gray-500">{c}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (q.type === "scale") {
    const vals = team.map((r) => r.answers[q.id]).filter((v): v is number => typeof v === "number");
    const max = Math.max(1, ...Array.from({ length: q.max - q.min + 1 }, (_, k) => vals.filter((v) => v === q.min + k).length));
    return (
      <>
        <div className="mt-4 flex items-end gap-2">
          {Array.from({ length: q.max - q.min + 1 }, (_, k) => q.min + k).map((n) => {
            const c = vals.filter((v) => v === n).length;
            return (
              <div key={n} className="flex flex-1 flex-col items-center">
                <span className="text-xs text-gray-500">{c || ""}</span>
                <div className="w-full rounded-t bg-navy" style={{ height: `${(c / max) * 80}px` }} />
                <span className="mt-1 text-xs text-gray-700">{n}</span>
              </div>
            );
          })}
        </div>
        {typeof mine === "number" && <Mine>{mine}</Mine>}
      </>
    );
  }

  if (q.type === "buckets") {
    return (
      <div className="mt-3 space-y-5">
        {q.parts.map((p) => {
          const items = team
            .map((r) => String((r.answers[q.id] as Record<string, string> | undefined)?.[p.id] ?? "").trim())
            .filter(Boolean);
          const m = (mine as Record<string, string> | undefined)?.[p.id];
          return (
            <div key={p.id}>
              <h3 className="font-semibold text-navy">{p.label}</h3>
              <Items items={shuffled(items, key(p.id))} />
              {m && <Mine>{m}</Mine>}
            </div>
          );
        })}
      </div>
    );
  }

  if (q.type === "mix") {
    const splits = shuffled(
      team.map((r) => (r.answers[q.id] ?? {}) as Record<string, number>),
      key("mix"),
    );
    return (
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              {q.parts.map((p) => (
                <th key={p.id} className="p-2 font-semibold">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {splits.map((m, i) => (
              <tr key={i}>
                {q.parts.map((p) => (
                  <td key={p.id} className="p-2 text-gray-800">
                    {m[p.id] ?? 0}%
                  </td>
                ))}
              </tr>
            ))}
            {mine !== undefined && mine !== null && typeof mine === "object" ? (
              <tr className="bg-cream font-semibold text-navy">
                {q.parts.map((p) => (
                  <td key={p.id} className="p-2">
                    {(mine as Record<string, number>)[p.id] ?? 0}%{" "}
                    {p === q.parts[0] && <span className="font-normal">(you)</span>}
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    );
  }

  // Ranked or plain lists: every item, shuffled, with its rank.
  const items = team.flatMap((r) =>
    (Array.isArray(r.answers[q.id]) ? (r.answers[q.id] as string[]) : [])
      .map((t) => String(t).trim())
      .filter(Boolean)
      .map((t, i) => (q.ranked ? `#${i + 1}  ${t}` : t)),
  );
  const m = Array.isArray(mine) ? (mine as string[]).filter(Boolean) : [];
  return (
    <>
      <Items items={shuffled(items, key("list"))} />
      {m.length > 0 && <Mine>{m.map((t, i) => (q.ranked ? `#${i + 1} ${t}` : t)).join("; ")}</Mine>}
    </>
  );
}
