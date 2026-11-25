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
      // Scale each person's split to 100% across the current parts, so a
      // response from an older version of the question still adds up.
      const shares = (r: ResponseRow) => {
        const raw = (r.answers[q.id] ?? {}) as Record<string, number>;
        const vals = q.parts.map((p) => (typeof raw[p.id] === "number" ? raw[p.id] : 0));
        const sum = vals.reduce((a, b) => a + b, 0);
        return sum > 0 ? vals.map((v) => (v / sum) * 100) : null;
      };
      const teamShares = team.map(shares).filter((v): v is number[] => v !== null);
      const avgRaw = q.parts.map((_, i) =>
        teamShares.length ? teamShares.reduce((a, v) => a + v[i], 0) / teamShares.length : 0,
      );
      const avg = Object.fromEntries(q.parts.map((p, i) => [p.id, roundTo100(avgRaw)[i]]));
      const range = Object.fromEntries(
        q.parts.map((p, i) => {
          const col = teamShares.map((v) => Math.round(v[i]));
          return [p.id, col.length ? { min: Math.min(...col), max: Math.max(...col) } : { min: 0, max: 0 }];
        }),
      );
      const leaderShares = leader ? shares(leader) : null;
      mix.push({
        id: q.id,
        question: q.text,
        parts: q.parts,
        team: avg,
        leader: leaderShares
          ? Object.fromEntries(q.parts.map((p, i) => [p.id, roundTo100(leaderShares)[i]]))
          : null,
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

// Round percentages so they still add up to exactly 100.
function roundTo100(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return values.map(() => 0);
  const floors = values.map((v) => Math.floor(v));
  let left = Math.round(total) - floors.reduce((a, b) => a + b, 0);
  const order = values
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}
