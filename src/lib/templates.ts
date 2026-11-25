export type Question =
  | { id: string; type: "text"; text: string; required?: boolean }
  | { id: string; type: "choice"; text: string; options: string[]; required?: boolean }
  | {
      id: string;
      type: "mix";
      text: string;
      parts: { id: string; label: string }[];
      required?: boolean;
    };

export type Answers = Record<string, string | Record<string, number>>;

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
      answers[q.id] = t;
    } else if (q.type === "choice") {
      if (typeof v !== "string" || !q.options.includes(v)) {
        if (q.required) return { ok: false, error: `Please choose an answer for: ${q.text}` };
        continue;
      }
      answers[q.id] = v;
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
