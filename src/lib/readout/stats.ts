import type { Question } from "@/lib/templates";

export type ResponseRow = { role: "leader" | "team"; answers: Record<string, unknown> };

export type ChoiceStat = {
  id: string;
  question: string;
  options: string[];
  team: Record<string, number>;
  leader: string | null;
};

export type MixStat = {
  id: string;
  question: string;
  parts: { id: string; label: string }[];
  team: Record<string, number>; // average %
  leader: Record<string, number> | null;
  range: Record<string, { min: number; max: number }>;
};

export type Stats = {
  total: number;
  teamCount: number;
  leaderCount: number;
  mix: MixStat[];
  choices: ChoiceStat[];
};

export function computeStats(questions: Question[], rows: ResponseRow[]): Stats {
  const team = rows.filter((r) => r.role === "team");
  const leader = rows.find((r) => r.role === "leader") ?? null;
  const mix: MixStat[] = [];
  const choices: ChoiceStat[] = [];

  for (const q of questions) {
    if (q.type === "mix") {
      const avg: Record<string, number> = {};
      const range: Record<string, { min: number; max: number }> = {};
      for (const p of q.parts) {
        const vals = team
          .map((r) => (r.answers[q.id] as Record<string, number> | undefined)?.[p.id])
          .filter((n): n is number => typeof n === "number");
        avg[p.id] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
        range[p.id] = vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : { min: 0, max: 0 };
      }
      mix.push({
        id: q.id,
        question: q.text,
        parts: q.parts,
        team: avg,
        leader: leader ? ((leader.answers[q.id] as Record<string, number>) ?? null) : null,
        range,
      });
    } else if (q.type === "choice" && q.id !== "role") {
      const counts: Record<string, number> = Object.fromEntries(q.options.map((o) => [o, 0]));
      for (const r of team) {
        const v = r.answers[q.id];
        if (typeof v === "string" && v in counts) counts[v] += 1;
      }
      choices.push({
        id: q.id,
        question: q.text,
        options: q.options,
        team: counts,
        leader: leader && typeof leader.answers[q.id] === "string" ? (leader.answers[q.id] as string) : null,
      });
    }
  }

  return {
    total: rows.length,
    teamCount: team.length,
    leaderCount: rows.length - team.length,
    mix,
    choices,
  };
}

// The open-ended answers, grouped by question, leader kept apart from the team.
export function textAnswers(questions: Question[], rows: ResponseRow[]) {
  return questions
    .filter((q) => q.type === "text")
    .map((q) => ({
      id: q.id,
      question: q.text,
      team: rows
        .filter((r) => r.role === "team")
        .map((r) => String(r.answers[q.id] ?? "").trim())
        .filter(Boolean),
      leader: rows
        .filter((r) => r.role === "leader")
        .map((r) => String(r.answers[q.id] ?? "").trim())
        .filter(Boolean),
    }));
}
