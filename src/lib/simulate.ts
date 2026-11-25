import Anthropic from "@anthropic-ai/sdk";
import type { Question } from "@/lib/templates";

export const TEAM_TYPES = [
  "Recruiting team (6 recruiters and coordinators) serving hiring managers",
  "B2B sales team (8 account executives and SDRs)",
  "IT help desk and systems team supporting 600 employees",
  "In-house legal team (4 lawyers and a paralegal)",
  "Finance and FP&A team supporting business unit leaders",
  "Customer success team for a SaaS product",
  "Warehouse and distribution operations team",
  "Marketing team (content, demand gen, brand)",
  "Nursing unit at a regional hospital",
  "Product and engineering squad building a mobile app",
];

export const SCENARIOS: Record<string, string> = {
  aligned: "A healthy team. Mostly aligned on customers and value, with a few real gaps in how they measure it.",
  leader_out_of_touch:
    "The leader is more optimistic than the team. The leader scores the value high and sees most of the week as high value. The team scores lower and describes more low and no value work.",
  fractured:
    "The team doesn't agree on who its customers are or what value it creates. Answers point in different directions.",
  buried_in_admin:
    "Everyone agrees on the value, but the week is buried in meetings, reporting, approvals, and manual work.",
  new_team: "A newly formed team after a reorg. People are unsure about customers and numbers, and some answers are vague.",
  skeptical:
    "Morale is low. Several people are cynical about surveys, give short or sarcastic answers, and doubt anything will change.",
};

const PEOPLE = `Make the team a realistic mix of people, for example: a long-tenured expert, a new hire in their first three months, a high performer close to the customer, an overloaded doer, a process-minded person, a skeptic, and someone who writes very short answers. Vary writing style, length, and quality the way real survey answers vary. Some answers can be vague, misspelled, or off topic. Exactly one respondent is the leader.`;

function schemaFor(q: Question): object {
  if (q.type === "text") return { type: "string" };
  if (q.type === "choice") return { type: "string", enum: q.options };
  if (q.type === "scale") return { type: "integer", minimum: q.min, maximum: q.max };
  if (q.type === "list") return { type: "array", items: { type: "string" }, maxItems: q.count };
  const props = Object.fromEntries(
    q.parts.map((p) => [p.id, q.type === "mix" ? { type: "integer", description: `${p.label} %` } : { type: "string", description: p.label }]),
  );
  return { type: "object", properties: props, required: q.parts.map((p) => p.id) };
}

export type SimRespondent = { persona: string; answers: Record<string, unknown> };

export async function simulateTeam(input: {
  questions: Question[];
  teamType: string;
  scenario: string;
  size: number;
}): Promise<SimRespondent[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("NO_API_KEY");
  const client = new Anthropic({ apiKey });

  const answerProps = Object.fromEntries(
    input.questions.map((q) => [q.id, { ...schemaFor(q), description: q.text }]),
  );
  const tool = {
    name: "write_responses",
    description: "Write one survey response per person.",
    input_schema: {
      type: "object" as const,
      properties: {
        respondents: {
          type: "array",
          items: {
            type: "object",
            properties: {
              persona: { type: "string", description: "Short description of this person, for testing only." },
              answers: {
                type: "object",
                properties: answerProps,
                required: input.questions.filter((q) => q.required).map((q) => q.id),
              },
            },
            required: ["persona", "answers"],
          },
        },
      },
      required: ["respondents"],
    },
  };

  const prompt = `Simulate a real team answering an anonymous team survey, so we can test the survey and its readout.

Team: ${input.teamType}
Situation: ${input.scenario}
Number of people answering: ${input.size}

${PEOPLE}

Rules:
- Answer the "role" question with "Leader" for the leader and "Team member" for everyone else.
- Write answers in each person's own voice, like a real employee typing quickly.
- For any question that splits the week, each person's numbers must add up to exactly 100.
- Optional questions can be left blank by some people.

The questions:
${input.questions.map((q, i) => `${i + 1}. [${q.id}] ${q.text}`).join("\n")}`;

  const models = [process.env.ANTHROPIC_MODEL, "claude-sonnet-5-5", "claude-sonnet-5", "claude-sonnet-4-6"].filter(
    (m, i, a): m is string => Boolean(m) && a.indexOf(m) === i,
  );
  let msg: Anthropic.Message | undefined;
  let lastError: unknown;
  for (const model of models) {
    try {
      msg = await client.messages.create({
        model,
        max_tokens: 16000,
        tools: [tool],
        tool_choice: { type: "tool", name: "write_responses" },
        messages: [{ role: "user", content: prompt }],
      });
      break;
    } catch (e) {
      lastError = e;
      const err = e as { status?: number; message?: string };
      console.error(`Simulation model ${model} failed`, err.status, err.message);
      if (!(err.status === 404 || (err.status === 400 && /model/i.test(err.message ?? "")))) throw e;
    }
  }
  if (!msg) throw lastError;
  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("NO_RESPONSES");
  const out = (block.input as { respondents?: SimRespondent[] }).respondents ?? [];

  // Fix week splits that don't add to 100, the way a careful respondent would.
  for (const r of out) {
    for (const q of input.questions) {
      if (q.type !== "mix") continue;
      const m = (r.answers[q.id] ?? {}) as Record<string, number>;
      const vals = q.parts.map((p) => Math.max(0, Math.round(Number(m[p.id]) || 0)));
      const sum = vals.reduce((a, b) => a + b, 0) || 1;
      const scaled = vals.map((v) => Math.round((v / sum) * 100));
      const diff = 100 - scaled.reduce((a, b) => a + b, 0);
      scaled[scaled.indexOf(Math.max(...scaled))] += diff;
      r.answers[q.id] = Object.fromEntries(q.parts.map((p, i) => [p.id, scaled[i]]));
    }
  }
  return out;
}
