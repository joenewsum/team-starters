import type { SupabaseClient } from "@supabase/supabase-js";
import type { Question } from "@/lib/templates";
import { computeStats, textAnswers, type ResponseRow, type Stats } from "./stats";
import { synthesize, type Synthesis } from "./synthesize";

// Writes a readout from a survey's answers and saves it. Works with the
// signed-in leader's client or the server's admin client.
export async function generateReadout(
  db: SupabaseClient,
  survey: { id: string; team_name: string; questions: Question[] },
  responses: ResponseRow[],
): Promise<{ stats: Stats; synthesis: Synthesis; created_at: string }> {
  const stats = computeStats(survey.questions, responses);
  const synthesis = await synthesize({
    teamName: survey.team_name,
    stats,
    texts: textAnswers(survey.questions, responses),
  });
  const { data, error } = await db
    .from("readouts")
    .insert({ survey_id: survey.id, response_count: responses.length, stats, synthesis })
    .select("created_at")
    .single();
  if (error || !data) throw new Error("SAVE_FAILED");
  return { stats, synthesis, created_at: data.created_at };
}
