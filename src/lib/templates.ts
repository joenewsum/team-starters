type Base = { id: string; text: string; hint?: string; required?: boolean };
type Part = { id: string; label: string };

export type Question =
  | (Base & { type: "text" })
  | (Base & { type: "choice"; options: string[] })
  | (Base & { type: "scale"; min: number; max: number; minLabel?: string; maxLabel?: string })
  | (Base & { type: "buckets"; parts: Part[] })
  | (Base & { type: "list"; count: number; ranked?: boolean; placeholder?: string })
  | (Base & { type: "mix"; parts: Part[] });

export type Answers = Record<
  string,
  string | number | string[] | Record<string, number> | Record<string, string>
>;

// Checks answers against the template on the server, so nothing odd gets stored.
export function validateAnswers(
  questions: Question[],
  raw: unknown,
): { ok: true; answers: Answers } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Missing answers." };
  const input = raw as Record<string, unknown>;
  const answers: Answers = {};

  for (const q of questions) {
    const v = input[q.id];
    if (q.type === "text") {
      const t = typeof v === "string" ? v.trim().slice(0, 2000) : "";
      if (q.required && !t) return { ok: false, error: `Please answer: ${q.text}` };
      if (t) answers[q.id] = t;
    } else if (q.type === "choice") {
      if (typeof v !== "string" || !q.options.includes(v)) {
        if (q.required) return { ok: false, error: `Please choose an answer for: ${q.text}` };
        continue;
      }
      answers[q.id] = v;
    } else if (q.type === "scale") {
      const n = Number(v);
      if (!Number.isInteger(n) || n < q.min || n > q.max) {
        if (q.required) return { ok: false, error: `Please pick a number for: ${q.text}` };
        continue;
      }
      answers[q.id] = n;
    } else if (q.type === "list") {
      const arr = Array.isArray(v) ? v : [];
      // Keep the order people gave, so ranked lists stay ranked.
      const items = arr
        .slice(0, q.count)
        .map((x) => (typeof x === "string" ? x.trim().slice(0, 1000) : ""))
        .filter(Boolean);
      if (q.required && items.length === 0) return { ok: false, error: `Please answer: ${q.text}` };
      if (items.length) answers[q.id] = items;
    } else if (q.type === "buckets") {
      const obj = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const p of q.parts) {
        const t = typeof obj[p.id] === "string" ? (obj[p.id] as string).trim().slice(0, 1000) : "";
        if (t) out[p.id] = t;
      }
      if (q.required && Object.keys(out).length === 0) {
        return { ok: false, error: `Please fill in at least one bucket for: ${q.text}` };
      }
      answers[q.id] = out;
    } else {
      const obj = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
      const mix: Record<string, number> = {};
      let total = 0;
      for (const p of q.parts) {
        const n = Math.round(Number(obj[p.id] ?? 0));
        if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, error: "Use numbers from 0 to 100." };
        mix[p.id] = n;
        total += n;
      }
      if (total !== 100) return { ok: false, error: "Your week split needs to add up to 100%." };
      answers[q.id] = mix;
    }
  }
  return { ok: true, answers };
}
