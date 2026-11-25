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

export type ScaleStat = {
  id: string;
  question: string;
  min: number;
  max: number;
  teamAvg: number | null;
  teamRange: { min: number; max: number } | null;
  counts: Record<string, number>;
  leader: number | null;
};

export type Stats = {
  total: number;
  teamCount: number;
  leaderCount: number;
  mix: MixStat[];
  choices: ChoiceStat[];
  scales?: ScaleStat[];
};

export function computeStats(questions: Question[], rows: ResponseRow[]): Stats {
  const team = rows.filter((r) => r.role === "team");
  const leader = rows.find((r) => r.role === "leader") ?? null;
  const mix: MixStat[] = [];
  const choices: ChoiceStat[] = [];
  const scales: ScaleStat[] = [];

  for (const q of questions) {
    if (q.type === "scale") {
      const vals = team.map((r) => r.answers[q.id]).filter((n): n is number => typeof n === "number");
      const counts: Record<string, number> = {};
      for (let n = q.min; n <= q.max; n++) counts[n] = vals.filter((v) => v === n).length;
      const lv = leader?.answers[q.id];
      scales.push({
        id: q.id,
        question: q.text,
        min: q.min,
        max: q.max,
        teamAvg: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null,
        teamRange: vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : null,
        counts,
        leader: typeof lv === "number" ? lv : null,
      });
      continue;
    }
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
    scales,
  };
}

// The open-ended answers, grouped by question, leader kept apart from the team.
export function textAnswers(questions: Question[], rows: ResponseRow[]) {
  const out: { id: string; question: string; team: string[]; leader: string[] }[] = [];
  const collect = (id: string, question: string, pick: (r: ResponseRow) => unknown) => {
    const get = (role: "team" | "leader") =>
      rows
        .filter((r) => r.role === role)
        .map((r) => String(pick(r) ?? "").trim())
        .filter(Boolean);
    out.push({ id, question, team: get("team"), leader: get("leader") });
  };
  for (const q of questions) {
    if (q.type === "text") collect(q.id, q.text, (r) => r.answers[q.id]);
    if (q.type === "buckets") {
      for (const p of q.parts) {
        collect(`${q.id}.${p.id}`, `Work they put in the "${p.label}" bucket`, (r) =>
          (r.answers[q.id] as Record<string, string> | undefined)?.[p.id],
        );
      }
    }
  }
  return out;
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
