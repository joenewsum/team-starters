"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { validateAnswers, type Question } from "@/lib/templates";
import { SCENARIOS, simulateTeam } from "@/lib/simulate";
import { VALUE_STARTER } from "@/lib/starters";

export type SimState = { error?: string };

export async function runSimulation(_prev: SimState, formData: FormData): Promise<SimState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) redirect("/dashboard");

  const custom = String(formData.get("custom_team") ?? "").trim();
  const teamType = custom || String(formData.get("team_type") ?? "");
  const scenarioKey = String(formData.get("scenario") ?? "aligned");
  const scenario = SCENARIOS[scenarioKey] ?? SCENARIOS.aligned;
  const size = Math.min(12, Math.max(3, Number(formData.get("size") ?? 6) || 6));
  if (!teamType) return { error: "Pick a team type or describe one." };

  const template = VALUE_STARTER;

  const label = teamType.split(/[(,]/)[0].trim().slice(0, 60);
  const { data: survey, error: insertError } = await supabase
    .from("surveys")
    .insert({
      leader_id: user.id,
      template_id: template.id,
      template_version: template.version,
      questions: template.questions,
      team_name: `Sim: ${label} (${scenarioKey.replaceAll("_", " ")})`,
    })
    .select("id, share_token")
    .single();
  if (insertError || !survey) return { error: "Couldn't create the survey. Have you run all the database updates?" };

  const questions: Question[] = template.questions;
  let respondents;
  try {
    respondents = await simulateTeam({ questions, teamType, scenario, size });
  } catch (e) {
    console.error("Simulation error", e);
    await supabase.from("surveys").delete().eq("id", survey.id);
    return { error: "The simulation couldn't be written just now. Try again in a minute." };
  }

  let saved = 0;
  for (const r of respondents) {
    const v = validateAnswers(questions, r.answers);
    if (!v.ok) continue;
    const role = v.answers.role === "Leader" ? "leader" : "team";
    const { data } = await supabase.rpc("submit_response", {
      p_token: survey.share_token,
      p_role: role,
      p_answers: v.answers,
    });
    if (data === true) saved += 1;
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/surveys/${survey.id}?sim=${saved}`);
}
